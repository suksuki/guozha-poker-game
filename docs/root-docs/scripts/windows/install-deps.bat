@echo off
echo 正在安装项目依赖...
echo.

REM 检查 Node.js 是否安装
where node >nul 2>&1
if %ERRORLEVEL% NEQ 0 (
    echo 错误: 未找到 Node.js，请先安装 Node.js
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)

echo 清理旧的 node_modules...
if exist "node_modules" (
    rmdir /s /q node_modules
)

echo 清理旧的 package-lock.json...
if exist "package-lock.json" (
    del package-lock.json
)

echo 安装依赖...
call npm install

if %ERRORLEVEL% EQU 0 (
    echo.
    echo 依赖安装成功！
) else (
    echo.
    echo 依赖安装失败，请检查错误信息
)

pause

