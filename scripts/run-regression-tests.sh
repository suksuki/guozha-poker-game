#!/bin/bash

# 回归测试后台运行脚本
# 用法: ./scripts/run-regression-tests.sh [test-pattern]

TEST_PATTERN=${1:-"regression|dealingSortingRegression|chatServiceRegression|chatAndVoiceRegression"}

echo "🚀 开始运行回归测试: $TEST_PATTERN"
echo "📝 测试结果将保存到: tests/results/regression-$(date +%Y%m%d-%H%M%S).log"
echo ""

# 创建结果目录
mkdir -p tests/results

# 运行测试并保存结果
npm test -- "$TEST_PATTERN" 2>&1 | tee "tests/results/regression-$(date +%Y%m%d-%H%M%S).log"

echo ""
echo "✅ 测试完成！结果已保存到 tests/results/ 目录"

