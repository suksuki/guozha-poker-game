#!/bin/bash

echo "=== 安装语音引擎（修复版）==="
echo ""

# 更新包列表
echo "1. 更新包列表..."
sudo apt-get update

# 安装基础语音引擎
echo ""
echo "2. 安装基础语音引擎..."
sudo apt-get install -y speech-dispatcher espeak espeak-data

# 尝试安装中文语音包（可能不存在）
echo ""
echo "3. 尝试安装中文语音包..."
if sudo apt-get install -y espeak-data-zh 2>/dev/null; then
    echo "   ✅ 中文语音包已安装"
else
    echo "   ⚠️  中文语音包不可用，但espeak仍然可以工作"
    echo "   可以尝试安装其他中文TTS..."
    
    # 尝试安装festival（备选）
    if sudo apt-get install -y festival festvox-cmu-us-slt-hts 2>/dev/null; then
        echo "   ✅ festival已安装（备选TTS）"
    else
        echo "   ⚠️  festival也不可用，继续使用espeak"
    fi
fi

# 启动speech-dispatcher
echo ""
echo "4. 启动speech-dispatcher..."
if pgrep -x speech-dispatcher >/dev/null; then
    echo "   ✅ speech-dispatcher已经在运行"
else
    speech-dispatcher -d 2>/dev/null
    sleep 1
    if pgrep -x speech-dispatcher >/dev/null; then
        echo "   ✅ speech-dispatcher已启动"
    else
        echo "   ⚠️  speech-dispatcher启动失败，请手动运行: speech-dispatcher -d"
    fi
fi

# 验证安装
echo ""
echo "5. 验证安装..."
if command -v espeak >/dev/null 2>&1; then
    echo "   ✅ espeak已安装"
    echo "   测试espeak（应该听到声音）..."
    espeak "test" 2>/dev/null
    echo ""
    echo "   测试中文（可能发音不够标准，但应该能工作）..."
    espeak -v zh "测试" 2>/dev/null || espeak "测试" 2>/dev/null
else
    echo "   ❌ espeak未安装"
fi

echo ""
echo "=== 安装完成 ==="
echo ""
echo "注意：即使没有espeak-data-zh，espeak仍然可以工作，"
echo "只是中文发音可能不够标准。"
echo ""
echo "下一步："
echo "1. 重启Electron应用: ./start-electron.sh"
echo "2. 在开发者工具控制台检查语音数量"
echo ""

