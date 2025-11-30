@echo off
REM 快速运行新测试脚本（Windows版本）

echo ==========================================
echo 快速运行新测试套件（排除慢测试）
echo ==========================================
echo.

REM 检查是否在项目根目录
if not exist "package.json" (
    echo 错误: 请在项目根目录运行此脚本
    exit /b 1
)

echo 运行新测试（快速模式，排除慢测试）...
echo.

REM 使用 TEST_FAST=true 来排除慢测试
set TEST_FAST=true
call npm run test:new

if %errorlevel% neq 0 (
    echo.
    echo 部分测试失败
    exit /b 1
)

echo.
echo ==========================================
echo 测试完成！
echo ==========================================

