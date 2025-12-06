#!/bin/bash
# 运行AsyncTaskManager测试

echo "🧪 运行AsyncTaskManager单元测试..."
echo "========================================"

npx vitest run tests/unit/async/AsyncTaskManager.test.ts --reporter=verbose

echo ""
echo "========================================"
echo "✅ 测试完成"

