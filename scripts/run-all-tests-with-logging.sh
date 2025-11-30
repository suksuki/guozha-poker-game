#!/bin/bash

# 完整测试套件运行脚本（带详细日志记录）
# 遇到问题会记录详细信息到日志，然后继续运行

set -e  # 遇到错误不立即退出，继续运行

# 配置
LOG_DIR="./test-logs"
LOG_FILE="${LOG_DIR}/test-run-$(date +%Y%m%d-%H%M%S).log"
SUMMARY_FILE="${LOG_DIR}/test-summary-$(date +%Y%m%d-%H%M%S).txt"
ERROR_LOG="${LOG_DIR}/test-errors-$(date +%Y%m%d-%H%M%S).log"

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

# 测试结果统计
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0
FAILED_TEST_NAMES=()

# 开始测试
log_info "=========================================="
log_info "开始运行完整测试套件"
log_info "=========================================="
log_info "日志文件: ${LOG_FILE}"
log_info "错误日志: ${ERROR_LOG}"
log_info "摘要文件: ${SUMMARY_FILE}"
log_info ""

# 运行测试并捕获输出
log_info "开始运行测试..."
START_TIME=$(date +%s)

# 运行所有测试，捕获输出和错误
npm run test:realtime 2>&1 | tee -a "${LOG_FILE}" | while IFS= read -r line; do
    # 检测测试结果
    if echo "$line" | grep -q "✓\|PASS"; then
        PASSED_TESTS=$((PASSED_TESTS + 1))
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
    elif echo "$line" | grep -q "✗\|FAIL\|Error"; then
        FAILED_TESTS=$((FAILED_TESTS + 1))
        TOTAL_TESTS=$((TOTAL_TESTS + 1))
        # 提取失败的测试名称
        if echo "$line" | grep -q "FAIL.*test"; then
            TEST_NAME=$(echo "$line" | sed -n 's/.*FAIL.*\([^ ]*\)/\1/p')
            FAILED_TEST_NAMES+=("$TEST_NAME")
            log_error "测试失败: ${TEST_NAME}"
        fi
    elif echo "$line" | grep -q "SKIP"; then
        SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
    fi
    
    # 实时显示进度
    echo "$line"
done

END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# 生成测试摘要
log_info ""
log_info "=========================================="
log_info "测试运行完成"
log_info "=========================================="
log_info "总测试数: ${TOTAL_TESTS}"
log_info "通过: ${PASSED_TESTS}"
log_info "失败: ${FAILED_TESTS}"
log_info "跳过: ${SKIPPED_TESTS}"
log_info "总耗时: ${DURATION}秒"
log_info ""

# 如果有失败的测试，列出详细信息
if [ ${FAILED_TESTS} -gt 0 ]; then
    log_error "=========================================="
    log_error "失败的测试列表:"
    log_error "=========================================="
    for test_name in "${FAILED_TEST_NAMES[@]}"; do
        log_error "  - ${test_name}"
    done
    log_error ""
    log_error "详细错误信息请查看: ${ERROR_LOG}"
fi

# 写入摘要文件
cat > "${SUMMARY_FILE}" << EOF
测试运行摘要
========================================
运行时间: $(date '+%Y-%m-%d %H:%M:%S')
总测试数: ${TOTAL_TESTS}
通过: ${PASSED_TESTS}
失败: ${FAILED_TESTS}
跳过: ${SKIPPED_TESTS}
总耗时: ${DURATION}秒

失败测试列表:
$(for test_name in "${FAILED_TEST_NAMES[@]}"; do echo "  - ${test_name}"; done)

详细日志: ${LOG_FILE}
错误日志: ${ERROR_LOG}
EOF

log_info "测试摘要已保存到: ${SUMMARY_FILE}"

# 如果有失败的测试，返回非零退出码
if [ ${FAILED_TESTS} -gt 0 ]; then
    log_error "测试完成，但有 ${FAILED_TESTS} 个测试失败"
    exit 1
else
    log_info "✅ 所有测试通过！"
    exit 0
fi

