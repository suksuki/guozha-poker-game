# 启动APP和Piper TTS服务 (通过WSL)
# 使用方法: .\start-app-with-piper.ps1
#
# 注意：此脚本会在WSL中启动Piper TTS服务，然后在当前PowerShell中启动前端开发服务器

Write-Host "==========================================" -ForegroundColor Green
Write-Host "🚀 启动APP和Piper TTS服务 (WSL方式)" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# 检查WSL是否可用
Write-Host "🔍 检查WSL环境..." -ForegroundColor Cyan
try {
    $wslVersion = wsl --list --verbose 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "WSL不可用"
    }
    Write-Host "✅ WSL环境检查通过" -ForegroundColor Green
} catch {
    Write-Host "❌ 错误: WSL不可用或未安装" -ForegroundColor Red
    Write-Host "💡 请先安装WSL: https://docs.microsoft.com/zh-cn/windows/wsl/install" -ForegroundColor Yellow
    exit 1
}

# 获取项目路径（转换为WSL路径）
$projectPath = (Get-Location).Path
$wslPath = $projectPath -replace '^([A-Z]):', '/mnt/$1' -replace '\\', '/' -replace '^/', ''

Write-Host "📁 项目路径 (WSL): $wslPath" -ForegroundColor Cyan
Write-Host ""

# 检查端口是否被占用
Write-Host "🔍 检查端口状态..." -ForegroundColor Cyan
$port5000 = Get-NetTCPConnection -LocalPort 5000 -ErrorAction SilentlyContinue
$port3000 = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue

if ($port5000) {
    Write-Host "⚠️  警告: 端口 5000 已被占用，Piper TTS服务可能已在运行" -ForegroundColor Yellow
} else {
    Write-Host "📢 启动Piper TTS服务（端口5000）..." -ForegroundColor Green
    
    # 在WSL中启动Piper TTS服务（后台运行）
    $piperScript = "cd '$wslPath' && source venv-piper/bin/activate && python scripts/piper-tts-server.py > /tmp/piper-tts.log 2>&1"
    Start-Process -NoNewWindow -FilePath "wsl" -ArgumentList "bash", "-c", $piperScript
    
    # 等待服务启动
    Write-Host "⏳ 等待Piper TTS服务启动..." -ForegroundColor Yellow
    $maxAttempts = 30
    $attempt = 0
    $serviceReady = $false
    
    while ($attempt -lt $maxAttempts) {
        Start-Sleep -Seconds 1
        try {
            $healthCheck = wsl bash -c "curl -s http://localhost:5000/health" 2>$null
            if ($healthCheck -match "ok" -or $healthCheck -match '"status"') {
                $serviceReady = $true
                break
            }
        } catch {
            # 继续等待
        }
        $attempt++
    }
    
    if ($serviceReady) {
        Write-Host "✅ Piper TTS服务已就绪！" -ForegroundColor Green
        $healthResponse = wsl bash -c "curl -s http://localhost:5000/health"
        Write-Host "健康状态:" -ForegroundColor Cyan
        Write-Host $healthResponse
    } else {
        Write-Host "⚠️  Piper TTS服务启动超时，但将继续启动前端..." -ForegroundColor Yellow
        Write-Host "💡 请检查WSL日志: wsl bash -c 'cat /tmp/piper-tts.log'" -ForegroundColor Cyan
    }
}

Write-Host ""

if ($port3000) {
    Write-Host "⚠️  警告: 端口 3000 已被占用" -ForegroundColor Yellow
    $continue = Read-Host "是否继续启动？(y/N)"
    if ($continue -ne "y" -and $continue -ne "Y") {
        exit 1
    }
}

Write-Host ""
Write-Host "==========================================" -ForegroundColor Green
Write-Host "🚀 启动前端开发服务器..." -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host "📱 APP将在 http://localhost:3000 启动" -ForegroundColor Cyan
Write-Host ""
Write-Host "按 Ctrl+C 停止所有服务" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""

# 启动前端开发服务器
npm run dev

