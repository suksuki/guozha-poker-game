#!/bin/bash

# 快速检查最新的测试结果

LOG_DIR="./test-logs"

echo "=========================================="
echo "检查最新的测试结果"
echo "=========================================="
echo ""

# 查找最新的日志文件
LATEST_LOG=$(ls -t ${LOG_DIR}/test-run-*.log 2>/dev/null | head -1)
LATEST_ERROR=$(ls -t ${LOG_DIR}/test-errors-*.log 2>/dev/null | head -1)
LATEST_SUMMARY=$(ls -t ${LOG_DIR}/test-summary-*.txt 2>/dev/null | head -1)

if [ -z "$LATEST_LOG" ]; then
    echo "❌ 未找到测试日志文件"
    echo "请先运行: ./scripts/run-tests-with-error-logging.sh"
    exit 1
fi

echo "📋 最新日志文件: $LATEST_LOG"
echo ""

# 检查是否有错误日志
if [ -n "$LATEST_ERROR" ]; then
    echo "❌ 错误日志: $LATEST_ERROR"
    ERROR_COUNT=$(grep -c "失败测试:" "$LATEST_ERROR" 2>/dev/null || echo "0")
    echo "   失败测试数量: $ERROR_COUNT"
    echo ""
else
    echo "✅ 未找到错误日志（可能所有测试都通过了）"
    echo ""
fi

# 显示摘要
if [ -n "$LATEST_SUMMARY" ]; then
    echo "📊 测试摘要:"
    echo "----------------------------------------"
    cat "$LATEST_SUMMARY"
    echo ""
else
    echo "⚠️  未找到摘要文件"
    echo ""
fi

# 检查测试结果
echo "🔍 快速检查测试结果:"
echo "----------------------------------------"
PASSED=$(grep -cE "PASS|✓" "$LATEST_LOG" 2>/dev/null || echo "0")
FAILED=$(grep -cE "FAIL|✗|×" "$LATEST_LOG" 2>/dev/null || echo "0")

echo "通过: $PASSED"
echo "失败: $FAILED"
echo ""

if [ "$FAILED" -gt 0 ]; then
    echo "❌ 发现失败的测试！"
    echo ""
    echo "查看详细错误:"
    if [ -n "$LATEST_ERROR" ]; then
        echo "  cat $LATEST_ERROR"
    else
        echo "  grep -A 20 'FAIL\\|✗\\|×' $LATEST_LOG"
    fi
else
    echo "✅ 所有测试通过！"
fi

