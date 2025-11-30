@echo off
REM 全面测试脚本 - 持续运行模式（Windows版本）
REM 即使遇到错误也不停止，收集所有错误信息
REM 用途：长时间运行的全面测试，可以离开等待测试完成

setlocal enabledelayedexpansion

REM 创建输出目录
set OUTPUT_DIR=test-results
set TIMESTAMP=%date:~0,4%%date:~5,2%%date:~8,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%
set OUTPUT_FILE=%OUTPUT_DIR%\test_output_%TIMESTAMP%.log
set ERROR_FILE=%OUTPUT_DIR%\test_errors_%TIMESTAMP%.log
set SUMMARY_FILE=%OUTPUT_DIR%\test_summary_%TIMESTAMP%.txt

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo ========================================== >> "%OUTPUT_FILE%"
echo 开始运行全面测试（持续运行模式） >> "%OUTPUT_FILE%"
echo 时间: %date% %time% >> "%OUTPUT_FILE%"
echo ========================================== >> "%OUTPUT_FILE%"
echo. >> "%OUTPUT_FILE%"

echo 输出文件: %OUTPUT_FILE%
echo 错误文件: %ERROR_FILE%
echo 汇总文件: %SUMMARY_FILE%
echo.

REM 记录开始时间
set START_TIME=%time%

REM 检查是否在项目根目录
if not exist "package.json" (
    echo 错误: 请在项目根目录运行此脚本
    exit /b 1
)

echo ========================================== >> "%OUTPUT_FILE%"
echo 运行所有测试（包括慢测试） >> "%OUTPUT_FILE%"
echo ========================================== >> "%OUTPUT_FILE%"
echo. >> "%OUTPUT_FILE%"

REM 运行测试并将所有输出保存到文件
REM 使用 --bail=0 确保即使失败也继续运行所有测试
echo 正在运行测试，请稍候...
call npm run test:continuous >> "%OUTPUT_FILE%" 2>&1

REM 捕获退出码
set TEST_EXIT_CODE=%ERRORLEVEL%

REM 记录结束时间
set END_TIME=%time%

echo. >> "%OUTPUT_FILE%"
echo ========================================== >> "%OUTPUT_FILE%"
echo 测试运行完成 >> "%OUTPUT_FILE%"
echo 结束时间: %date% %time% >> "%OUTPUT_FILE%"
echo ========================================== >> "%OUTPUT_FILE%"

REM 生成汇总报告
echo. > "%SUMMARY_FILE%"
echo ========================================== >> "%SUMMARY_FILE%"
echo 测试运行汇总报告 >> "%SUMMARY_FILE%"
echo 生成时间: %date% %time% >> "%SUMMARY_FILE%"
echo ========================================== >> "%SUMMARY_FILE%"
echo. >> "%SUMMARY_FILE%"

echo 正在提取错误信息...

REM 统计测试结果（简化版，Windows的findstr功能有限）
findstr /C:"FAIL" /C:"failed" /C:"Error:" "%OUTPUT_FILE%" > nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo 有测试失败
    echo 失败的测试用例: >> "%SUMMARY_FILE%"
    findstr /C:"FAIL" /C:"failed" /C:"Error:" "%OUTPUT_FILE%" >> "%SUMMARY_FILE%"
) else (
    echo 所有测试通过
)

echo. >> "%SUMMARY_FILE%"
echo ========================================== >> "%SUMMARY_FILE%"
echo 统计信息 >> "%SUMMARY_FILE%"
echo ========================================== >> "%SUMMARY_FILE%"
echo 退出码: %TEST_EXIT_CODE% >> "%SUMMARY_FILE%"
echo. >> "%SUMMARY_FILE%"

REM 将完整的错误信息提取到错误文件
echo ========================================== > "%ERROR_FILE%"
echo 测试错误详情 >> "%ERROR_FILE%"
echo 生成时间: %date% %time% >> "%ERROR_FILE%"
echo ========================================== >> "%ERROR_FILE%"
echo. >> "%ERROR_FILE%"

findstr /C:"FAIL" /C:"failed" /C:"Error:" /C:"✗" "%OUTPUT_FILE%" >> "%ERROR_FILE%" 2>nul

echo.
echo ==========================================
if %TEST_EXIT_CODE% equ 0 (
    echo 所有测试通过！
) else (
    echo 部分测试失败
    echo 请查看以下文件获取详细信息：
    echo   - 完整输出: %OUTPUT_FILE%
    echo   - 错误详情: %ERROR_FILE%
    echo   - 汇总报告: %SUMMARY_FILE%
)
echo ==========================================

REM 即使有错误也返回成功（因为这是持续运行模式）
exit /b 0

