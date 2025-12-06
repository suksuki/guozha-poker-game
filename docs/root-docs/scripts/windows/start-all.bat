@echo off
REM 启动APP和Piper TTS服务
echo ==========================================
echo 🚀 正在启动所有服务...
echo ==========================================
echo.

REM 启动Piper TTS服务（在后台运行）
echo 📢 启动Piper TTS服务（端口5000）...
start "Piper TTS Server" wsl -d Ubuntu -e bash -c "cd /home/jin/guozha_poker_game && bash start-piper-tts.sh"

REM 等待一下让Piper TTS服务启动
timeout /t 3 /nobreak >nul

REM 启动开发服务器（在新的窗口中）
echo 🌐 启动开发服务器（端口3000）...
start "Development Server" wsl -d Ubuntu -e bash -c "cd /home/jin/guozha_poker_game && bash start.sh"

echo.
echo ==========================================
echo ✅ 所有服务正在启动中...
echo ==========================================
echo.
echo 📍 开发服务器: http://localhost:3000
echo 📍 Piper TTS服务: http://localhost:5000
echo.
echo 💡 提示: 关闭命令窗口将停止对应的服务
echo.
pause

