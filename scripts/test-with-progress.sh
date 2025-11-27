#!/bin/bash
# 带进度显示的测试脚本

echo "🚀 开始运行测试..."
echo ""

# 使用time命令显示总耗时
time npm test -- "$@" --reporter=verbose --run

echo ""
echo "✅ 测试完成！"

