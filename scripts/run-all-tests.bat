@echo off
REM 完整的测试运行脚本（Windows版本）
REM 在WSL或Windows环境下运行所有测试

echo ==========================================
echo 开始运行完整测试套件
echo ==========================================
echo.

REM 检查是否在项目根目录
if not exist "package.json" (
    echo 错误: 请在项目根目录运行此脚本
    exit /b 1
)

REM 检查Node.js是否安装
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到Node.js，请先安装Node.js
    exit /b 1
)

REM 检查npm是否安装
where npm >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未找到npm，请先安装npm
    exit /b 1
)

echo 检查依赖...
if not exist "node_modules" (
    echo 安装依赖...
    call npm install
)

echo.
echo ==========================================
echo 1. 运行单元测试
echo ==========================================
call npm run test:quick -- comprehensiveUnitTests
if %errorlevel% neq 0 (
    echo 单元测试失败
    exit /b 1
)
echo 单元测试通过

echo.
echo ==========================================
echo 2. 运行回归测试
echo ==========================================
call npm run test:quick -- comprehensiveRegressionTests
if %errorlevel% neq 0 (
    echo 回归测试失败
    exit /b 1
)
echo 回归测试通过

echo.
echo ==========================================
echo 3. 运行集成测试
echo ==========================================
call npm run test:quick -- integrationTests
if %errorlevel% neq 0 (
    echo 集成测试失败
    exit /b 1
)
echo 集成测试通过

echo.
echo ==========================================
echo 4. 运行所有现有测试
echo ==========================================
call npm run test:all
if %errorlevel% neq 0 (
    echo 部分测试失败
    exit /b 1
)
echo 所有测试通过

echo.
echo ==========================================
echo 所有测试完成！
echo ==========================================

