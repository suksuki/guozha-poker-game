#!/bin/bash

# 全面测试脚本 - 持续运行模式
# 即使遇到错误也不停止，收集所有错误信息
# 用途：长时间运行的全面测试，可以离开等待测试完成

set +e  # 不因错误而退出

# 创建输出目录
OUTPUT_DIR="test-results"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
OUTPUT_FILE="${OUTPUT_DIR}/test_output_${TIMESTAMP}.log"
ERROR_FILE="${OUTPUT_DIR}/test_errors_${TIMESTAMP}.log"
SUMMARY_FILE="${OUTPUT_DIR}/test_summary_${TIMESTAMP}.txt"

mkdir -p "${OUTPUT_DIR}"

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "==========================================" | tee -a "${OUTPUT_FILE}"
echo "开始运行全面测试（持续运行模式）" | tee -a "${OUTPUT_FILE}"
echo "时间: $(date)" | tee -a "${OUTPUT_FILE}"
echo "==========================================" | tee -a "${OUTPUT_FILE}"
echo "" | tee -a "${OUTPUT_FILE}"

echo -e "${BLUE}输出文件: ${OUTPUT_FILE}${NC}"
echo -e "${BLUE}错误文件: ${ERROR_FILE}${NC}"
echo -e "${BLUE}汇总文件: ${SUMMARY_FILE}${NC}"
echo ""

# 记录开始时间
START_TIME=$(date +%s)

# 检查是否在项目根目录
if [ ! -f "package.json" ]; then
    echo -e "${RED}错误: 请在项目根目录运行此脚本${NC}" | tee -a "${OUTPUT_FILE}"
    exit 1
fi

# 运行所有测试，即使失败也继续
# 使用 --bail=0 确保不因错误而停止
# 使用 --reporter=verbose 显示详细信息
# 将标准输出和错误输出都重定向到文件

echo "==========================================" | tee -a "${OUTPUT_FILE}"
echo "运行所有测试（包括慢测试）" | tee -a "${OUTPUT_FILE}"
echo "==========================================" | tee -a "${OUTPUT_FILE}"
echo "" | tee -a "${OUTPUT_FILE}"

# 运行测试并将所有输出保存到文件
# 使用 --bail=0 确保即使失败也继续运行所有测试
# 注意：所有输出先保存到 OUTPUT_FILE，错误信息稍后从 OUTPUT_FILE 中提取
npm run test:continuous 2>&1 | tee "${OUTPUT_FILE}"

# 捕获退出码
TEST_EXIT_CODE=${PIPESTATUS[0]}

# 记录结束时间
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))
HOURS=$((DURATION / 3600))
MINUTES=$(((DURATION % 3600) / 60))
SECONDS=$((DURATION % 60))

echo "" | tee -a "${OUTPUT_FILE}"
echo "==========================================" | tee -a "${OUTPUT_FILE}"
echo "测试运行完成" | tee -a "${OUTPUT_FILE}"
echo "结束时间: $(date)" | tee -a "${OUTPUT_FILE}"
echo "总耗时: ${HOURS}小时 ${MINUTES}分钟 ${SECONDS}秒" | tee -a "${OUTPUT_FILE}"
echo "==========================================" | tee -a "${OUTPUT_FILE}"

# 从输出文件中提取错误信息
echo "" | tee -a "${SUMMARY_FILE}"
echo "==========================================" | tee -a "${SUMMARY_FILE}"
echo "测试运行汇总报告" | tee -a "${SUMMARY_FILE}"
echo "生成时间: $(date)" | tee -a "${SUMMARY_FILE}"
echo "==========================================" | tee -a "${SUMMARY_FILE}"
echo "" | tee -a "${SUMMARY_FILE}"

# 提取失败的测试用例
echo "正在提取错误信息..." | tee -a "${OUTPUT_FILE}"

# 统计测试结果（更准确的统计方式）
# vitest 输出格式示例：
#   Test Files  1 passed (1) | 1 failed (1)
#   Tests  10 passed (10) | 2 failed (2)

# 提取测试文件统计
TEST_FILES_PASSED=$(grep -oE "Test Files.*[0-9]+ passed" "${OUTPUT_FILE}" 2>/dev/null | grep -oE "[0-9]+" | head -1 || echo "0")
TEST_FILES_FAILED=$(grep -oE "Test Files.*[0-9]+ failed" "${OUTPUT_FILE}" 2>/dev/null | grep -oE "[0-9]+" | head -1 || echo "0")

# 提取测试用例统计
TESTS_PASSED=$(grep -oE "Tests.*[0-9]+ passed" "${OUTPUT_FILE}" 2>/dev/null | grep -oE "[0-9]+" | head -1 || echo "0")
TESTS_FAILED=$(grep -oE "Tests.*[0-9]+ failed" "${OUTPUT_FILE}" 2>/dev/null | grep -oE "[0-9]+" | head -1 || echo "0")

# 如果无法从标准格式提取，使用备用方法
if [ "${TESTS_PASSED}" = "0" ] && [ "${TESTS_FAILED}" = "0" ]; then
    TESTS_PASSED=$(grep -c "✓\|PASS\|passed" "${OUTPUT_FILE}" 2>/dev/null || echo "0")
    TESTS_FAILED=$(grep -c "✗\|FAIL\|failed" "${OUTPUT_FILE}" 2>/dev/null || echo "0")
fi

# 提取所有失败信息（更精确的匹配）
echo "失败的测试用例:" | tee -a "${SUMMARY_FILE}"
grep -E "FAIL|✗|FAILED|Test.*failed|Error:" "${OUTPUT_FILE}" | head -50 | tee -a "${SUMMARY_FILE}"

echo "" | tee -a "${SUMMARY_FILE}"
echo "==========================================" | tee -a "${SUMMARY_FILE}"
echo "统计信息" | tee -a "${SUMMARY_FILE}"
echo "==========================================" | tee -a "${SUMMARY_FILE}"
echo "测试文件: ${TEST_FILES_PASSED} 通过 | ${TEST_FILES_FAILED} 失败" | tee -a "${SUMMARY_FILE}"
echo "测试用例: ${TESTS_PASSED} 通过 | ${TESTS_FAILED} 失败" | tee -a "${SUMMARY_FILE}"
echo "总耗时: ${HOURS}小时 ${MINUTES}分钟 ${SECONDS}秒" | tee -a "${SUMMARY_FILE}"
echo "退出码: ${TEST_EXIT_CODE}" | tee -a "${SUMMARY_FILE}"
echo "" | tee -a "${SUMMARY_FILE}"

# 将完整的错误信息提取到错误文件
echo "==========================================" > "${ERROR_FILE}"
echo "测试错误详情" >> "${ERROR_FILE}"
echo "生成时间: $(date)" >> "${ERROR_FILE}"
echo "==========================================" >> "${ERROR_FILE}"
echo "" >> "${ERROR_FILE}"

# 提取所有错误相关的行及其上下文（更精确的匹配）
# 匹配失败测试的完整错误信息块
grep -B 3 -A 15 -E "FAIL|✗|FAILED|Error:|AssertionError|TypeError|ReferenceError|Test.*failed" "${OUTPUT_FILE}" >> "${ERROR_FILE}" 2>/dev/null

# 如果没有找到错误，添加提示
if [ ! -s "${ERROR_FILE}" ] || [ $(wc -l < "${ERROR_FILE}" 2>/dev/null || echo 0) -lt 10 ]; then
    echo "未找到错误信息，或者所有测试都通过了。" >> "${ERROR_FILE}"
fi

echo "" | tee -a "${OUTPUT_FILE}"
echo "==========================================" | tee -a "${OUTPUT_FILE}"
if [ ${TEST_EXIT_CODE} -eq 0 ]; then
    echo -e "${GREEN}✓ 所有测试通过！${NC}" | tee -a "${OUTPUT_FILE}"
else
    echo -e "${RED}✗ 部分测试失败（${TEST_FILES_FAILED}个测试文件，${TESTS_FAILED}个测试用例）${NC}" | tee -a "${OUTPUT_FILE}"
    echo -e "${YELLOW}请查看以下文件获取详细信息：${NC}" | tee -a "${OUTPUT_FILE}"
    echo -e "${YELLOW}  - 完整输出: ${OUTPUT_FILE}${NC}" | tee -a "${OUTPUT_FILE}"
    echo -e "${YELLOW}  - 错误详情: ${ERROR_FILE}${NC}" | tee -a "${OUTPUT_FILE}"
    echo -e "${YELLOW}  - 汇总报告: ${SUMMARY_FILE}${NC}" | tee -a "${OUTPUT_FILE}"
fi
echo "==========================================" | tee -a "${OUTPUT_FILE}"

# 显示汇总信息
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}测试完成汇总${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "完整输出: ${OUTPUT_FILE}"
echo -e "错误详情: ${ERROR_FILE}"
echo -e "汇总报告: ${SUMMARY_FILE}"
echo -e "${BLUE}========================================${NC}"

# 即使有错误也返回成功（因为这是持续运行模式）
exit 0

