#!/bin/bash

echo "=== 安装Ubuntu语音合成引擎 ==="
echo ""
echo "这将安装speech-dispatcher和espeak，使Electron应用能够使用语音合成功能"
echo ""

# 检查是否以root权限运行
if [ "$EUID" -eq 0 ]; then 
   echo "请不要使用sudo运行此脚本，脚本会在需要时自动请求权限"
   exit 1
fi

# 更新包列表
echo "1. 更新包列表..."
sudo apt-get update

# 安装语音合成引擎
echo ""
echo "2. 安装语音合成引擎..."
sudo apt-get install -y speech-dispatcher espeak espeak-data

# 安装中文语音包
echo ""
echo "3. 安装中文语音包..."
sudo apt-get install -y espeak-data-zh || echo "   ⚠️  中文语音包可能不可用，尝试安装其他中文TTS..."

# 尝试安装其他中文TTS
if ! dpkg -l | grep -q espeak-data-zh; then
    echo "   尝试安装festival中文语音..."
    sudo apt-get install -y festival festvox-cmu-us-slt-hts || echo "   ⚠️  festival不可用"
fi

# 启动speech-dispatcher
echo ""
echo "4. 启动speech-dispatcher..."
if systemctl --user is-active --quiet speech-dispatcher 2>/dev/null; then
    echo "   ✅ speech-dispatcher已经在运行"
else
    # 尝试启动用户服务
    systemctl --user start speech-dispatcher 2>/dev/null || {
        echo "   尝试直接启动speech-dispatcher..."
        speech-dispatcher -d 2>/dev/null || {
            echo "   ⚠️  无法启动speech-dispatcher，可能需要手动启动"
            echo "   请运行: speech-dispatcher -d"
        }
    }
fi

# 验证安装
echo ""
echo "5. 验证安装..."
if command -v espeak &> /dev/null; then
    echo "   ✅ espeak已安装:"
    espeak --version | head -1 | sed 's/^/      /'
else
    echo "   ❌ espeak未安装"
fi

if pgrep -x speech-dispatcher > /dev/null || systemctl --user is-active --quiet speech-dispatcher 2>/dev/null; then
    echo "   ✅ speech-dispatcher正在运行"
else
    echo "   ⚠️  speech-dispatcher未运行，请手动启动:"
    echo "      speech-dispatcher -d"
fi

# 测试语音
echo ""
echo "6. 测试语音合成..."
if command -v espeak &> /dev/null; then
    echo "   测试espeak（应该听到'测试'）..."
    espeak -v zh "测试" 2>/dev/null || echo "   ⚠️  espeak测试失败"
else
    echo "   ⚠️  无法测试，espeak未安装"
fi

echo ""
echo "=== 安装完成 ==="
echo ""
echo "下一步："
echo "1. 重启Electron应用: ./start-electron.sh"
echo "2. 在开发者工具控制台运行以下代码验证："
echo ""
echo "   const voices = window.speechSynthesis.getVoices();"
echo "   console.log('可用语音数量:', voices.length);"
echo "   if (voices.length > 0) {"
echo "     const utterance = new SpeechSynthesisUtterance('测试语音');"
echo "     utterance.lang = 'zh-CN';"
echo "     window.speechSynthesis.speak(utterance);"
echo "   }"
echo ""

