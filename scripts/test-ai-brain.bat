@echo off
REM AI Brain MCTS集成测试脚本 (Windows版本)

echo ========================================
echo    AI Brain - MCTS模块集成测试
echo ========================================
echo.

REM 检查是否在项目根目录
if not exist "package.json" (
    echo 错误: 请在项目根目录运行此脚本
    exit /b 1
)

echo 开始运行测试...
echo.

npx ts-node src/services/ai/brain/test-mcts-integration.ts

echo.
echo 测试完成！

