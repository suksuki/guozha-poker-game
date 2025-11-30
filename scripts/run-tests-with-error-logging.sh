#!/bin/bash

# 测试运行脚本（带详细错误日志记录）
# 记录所有失败测试用例的详细信息，包括错误堆栈

set -uo pipefail  # 移除 -e，允许脚本继续执行即使测试失败

# 配置
LOG_DIR="./test-logs"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
LOG_FILE="${LOG_DIR}/test-run-${TIMESTAMP}.log"
ERROR_LOG="${LOG_DIR}/test-errors-${TIMESTAMP}.log"
SUMMARY_FILE="${LOG_DIR}/test-summary-${TIMESTAMP}.txt"
JSON_OUTPUT="${LOG_DIR}/test-results-${TIMESTAMP}.json"

# 创建日志目录
mkdir -p "${LOG_DIR}"

# 日志函数
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_error() {
    log "ERROR" "$@" | tee -a "${ERROR_LOG}"
}

log_info() {
    log "INFO" "$@"
}

log_warn() {
    log "WARN" "$@"
}

# 清理函数
cleanup() {
    log_info "清理临时文件..."
    [ -f "${JSON_OUTPUT}" ] && rm -f "${JSON_OUTPUT}"
}

trap cleanup EXIT

# 开始测试
log_info "=========================================="
log_info "开始运行测试套件（带详细错误记录）"
log_info "=========================================="
log_info "日志文件: ${LOG_FILE}"
log_info "错误日志: ${ERROR_LOG}"
log_info "摘要文件: ${SUMMARY_FILE}"
log_info "JSON 输出: ${JSON_OUTPUT}"
log_info ""

# 运行测试并同时输出到控制台和日志文件
log_info "开始运行测试..."
START_TIME=$(date +%s)

# 使用 vitest 的 JSON reporter 获取结构化数据，同时使用 verbose reporter 显示详细输出
# 注意：即使测试失败（退出码非0），也要继续执行错误提取
npm run test:realtime 2>&1 | tee "${LOG_FILE}" | while IFS= read -r line; do
    # 实时显示进度
    echo "$line"
done || true  # 即使测试失败也继续执行

# 同时运行一次 JSON reporter 来获取结构化数据（用于错误分析）
log_info ""
log_info "正在收集测试结果详情..."
npm test -- --reporter=json --reporter=verbose --run 2>&1 | tee -a "${LOG_FILE}" > "${JSON_OUTPUT}" || true

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 从日志文件中提取失败的测试用例
log_info ""
log_info "正在分析测试结果..."

# 提取失败的测试用例
FAILED_TESTS=()
FAILED_TEST_DETAILS=()

# 从详细日志中提取失败信息（使用更精确的模式）
while IFS= read -r line; do
    # 匹配失败的测试用例（多种格式）
    if echo "$line" | grep -qE "FAIL|✗|×|❌"; then
        # 提取测试名称（处理多种格式）
        TEST_NAME=""
        
        # 格式1: FAIL  tests/xxx.test.ts > describe > it
        if echo "$line" | grep -qE "FAIL[[:space:]]+tests/"; then
            TEST_NAME=$(echo "$line" | sed -E 's/.*FAIL[[:space:]]+([^>]+)>[[:space:]]*([^>]+)>[[:space:]]*([^|]+).*/\1 > \2 > \3/' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        # 格式2: ✗  tests/xxx.test.ts > describe > it
        elif echo "$line" | grep -qE "[✗×❌][[:space:]]+tests/"; then
            TEST_NAME=$(echo "$line" | sed -E 's/.*[✗×❌][[:space:]]+([^>]+)>[[:space:]]*([^>]+)>[[:space:]]*([^|]+).*/\1 > \2 > \3/' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        # 格式3: 简单的测试名称
        else
            TEST_NAME=$(echo "$line" | sed -E 's/.*(FAIL|[✗×❌])[[:space:]]+([^|]+).*/\2/' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        fi
        
        if [ -n "$TEST_NAME" ] && [[ ! " ${FAILED_TESTS[@]} " =~ " ${TEST_NAME} " ]]; then
            FAILED_TESTS+=("$TEST_NAME")
        fi
    fi
done < "${LOG_FILE}"

# 从 JSON 输出中提取更详细的错误信息（如果存在）
if [ -f "${JSON_OUTPUT}" ] && command -v jq &> /dev/null; then
    log_info "使用 jq 解析 JSON 结果..."
    
    # 提取失败的测试用例及其错误详情
    jq -r '.testResults[] | select(.status == "failed") | "\(.name)|\(.message // "无错误信息")|\(.duration // 0)"' "${JSON_OUTPUT}" 2>/dev/null | while IFS='|' read -r name message duration; do
        if [ -n "$name" ]; then
            FAILED_TEST_DETAILS+=("$name|$message|$duration")
        fi
    done || log_warn "无法解析 JSON 输出（可能需要安装 jq）"
fi

# 从日志文件中提取错误堆栈
extract_error_stack() {
    local test_name="$1"
    local error_lines=()
    local capture=false
    local line_count=0
    local max_lines=100
    
    # 转义特殊字符用于 grep
    local escaped_name=$(echo "$test_name" | sed 's/[[\.*^$()+?{|]/\\&/g')
    
    while IFS= read -r line; do
        # 检测错误开始（匹配测试名称）
        if echo "$line" | grep -qE "(FAIL|[✗×❌]).*${escaped_name}" || \
           echo "$line" | grep -qE "Error.*${escaped_name}" || \
           (echo "$line" | grep -qE "TypeError|AssertionError|ReferenceError" && [ "$capture" = false ]); then
            capture=true
            error_lines=("$line")
            line_count=1
            continue
        fi
        
        # 如果在错误块中，收集行
        if [ "$capture" = true ]; then
            error_lines+=("$line")
            line_count=$((line_count + 1))
            
            # 检测错误块结束条件
            # 1. 达到最大行数
            if [ $line_count -ge $max_lines ]; then
                break
            fi
            
            # 2. 遇到下一个测试用例（PASS 或新的 FAIL）
            if echo "$line" | grep -qE "^[[:space:]]*PASS[[:space:]]+|^[[:space:]]*✓[[:space:]]+|^[[:space:]]*FAIL[[:space:]]+tests/" && \
               ! echo "$line" | grep -qE "${escaped_name}"; then
                # 移除最后一行（因为它是下一个测试的开始）
                unset 'error_lines[-1]'
                break
            fi
            
            # 3. 遇到测试套件分隔符
            if echo "$line" | grep -qE "^[[:space:]]*Test Files[[:space:]]+|^[[:space:]]*Test Suites[[:space:]]+|^[[:space:]]*Tests[[:space:]]+"; then
                break
            fi
        fi
    done < "${LOG_FILE}"
    
    # 输出错误堆栈
    if [ ${#error_lines[@]} -gt 0 ]; then
        printf '%s\n' "${error_lines[@]}"
    fi
}

# 生成详细的错误日志
log_error "=========================================="
log_error "失败的测试用例详细信息"
log_error "=========================================="
log_error ""

FAILED_COUNT=0
for test_name in "${FAILED_TESTS[@]}"; do
    FAILED_COUNT=$((FAILED_COUNT + 1))
    log_error ""
    log_error "----------------------------------------"
    log_error "[${FAILED_COUNT}] 失败测试: ${test_name}"
    log_error "----------------------------------------"
    
    # 提取该测试的错误堆栈
    ERROR_STACK=$(extract_error_stack "$test_name")
    if [ -n "$ERROR_STACK" ]; then
        echo "$ERROR_STACK" | tee -a "${ERROR_LOG}"
    else
        # 如果无法提取，尝试从日志中搜索相关错误
        grep -A 30 "FAIL.*${test_name}\|✗.*${test_name}\|×.*${test_name}" "${LOG_FILE}" | head -n 50 | tee -a "${ERROR_LOG}" || true
    fi
    
    log_error ""
done

# 统计测试结果
TOTAL_TESTS=$(grep -cE "PASS|✓|FAIL|✗|×" "${LOG_FILE}" 2>/dev/null || echo "0")
PASSED_TESTS=$(grep -cE "PASS|✓" "${LOG_FILE}" 2>/dev/null || echo "0")
FAILED_COUNT=${#FAILED_TESTS[@]}
SKIPPED_TESTS=$(grep -cE "SKIP|SKIPPED" "${LOG_FILE}" 2>/dev/null || echo "0")

# 生成测试摘要
log_info ""
log_info "=========================================="
log_info "测试运行完成"
log_info "=========================================="
log_info "总测试数: ${TOTAL_TESTS}"
log_info "通过: ${PASSED_TESTS}"
log_info "失败: ${FAILED_COUNT}"
log_info "跳过: ${SKIPPED_TESTS}"
log_info "总耗时: ${DURATION}秒"
log_info ""

# 写入摘要文件
cat > "${SUMMARY_FILE}" << EOF
测试运行摘要
========================================
运行时间: $(date '+%Y-%m-%d %H:%M:%S')
总测试数: ${TOTAL_TESTS}
通过: ${PASSED_TESTS}
失败: ${FAILED_COUNT}
跳过: ${SKIPPED_TESTS}
总耗时: ${DURATION}秒

失败测试列表 (${FAILED_COUNT} 个):
$(for i in "${!FAILED_TESTS[@]}"; do echo "  $((i+1)). ${FAILED_TESTS[$i]}"; done)

详细日志: ${LOG_FILE}
错误日志: ${ERROR_LOG}
JSON 结果: ${JSON_OUTPUT}
EOF

log_info "测试摘要已保存到: ${SUMMARY_FILE}"

# 如果有失败的测试，显示提示
if [ ${FAILED_COUNT} -gt 0 ]; then
    log_error ""
    log_error "=========================================="
    log_error "发现 ${FAILED_COUNT} 个失败的测试用例"
    log_error "=========================================="
    log_error "详细错误信息已保存到: ${ERROR_LOG}"
    log_error "查看错误日志: cat ${ERROR_LOG}"
    log_error ""
    exit 1
else
    log_info "✅ 所有测试通过！"
    exit 0
fi

