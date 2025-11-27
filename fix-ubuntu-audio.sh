#!/bin/bash

echo "=== Ubuntu Electron 音频和语音修复脚本 ==="
echo ""

# 检查语音合成引擎
echo "1. 检查语音合成引擎..."
if command -v espeak &> /dev/null; then
    echo "   ✅ espeak 已安装"
    espeak --version | head -1 | sed 's/^/   /'
else
    echo "   ⚠️  espeak 未安装"
fi

if systemctl --user is-active --quiet speech-dispatcher 2>/dev/null || pgrep -x speech-dispatcher > /dev/null; then
    echo "   ✅ speech-dispatcher 正在运行"
else
    echo "   ⚠️  speech-dispatcher 未运行"
fi

# 检查音频文件
echo ""
echo "2. 检查音频文件..."
if [ -d "public/sounds" ]; then
    file_count=$(find public/sounds -type f \( -name "*.aiff" -o -name "*.mp3" \) | wc -l)
    echo "   找到 $file_count 个音频文件:"
    find public/sounds -type f \( -name "*.aiff" -o -name "*.mp3" \) | head -5 | sed 's/^/   /'
    
    # 检查文件大小
    echo ""
    echo "   文件大小:"
    find public/sounds -type f \( -name "*.aiff" -o -name "*.mp3" \) -exec ls -lh {} \; | awk '{print "   " $5 " " $9}' | head -5
else
    echo "   ⚠️  public/sounds 目录不存在"
fi

# 检查ffmpeg（用于音频转换）
echo ""
echo "3. 检查音频工具..."
if command -v ffmpeg &> /dev/null; then
    echo "   ✅ ffmpeg 已安装"
    ffmpeg -version | head -1 | sed 's/^/   /'
else
    echo "   ⚠️  ffmpeg 未安装（用于音频格式转换）"
fi

# 检查音频系统
echo ""
echo "4. 检查音频系统..."
if command -v pulseaudio &> /dev/null; then
    if pulseaudio --check; then
        echo "   ✅ PulseAudio 正在运行"
    else
        echo "   ⚠️  PulseAudio 未运行"
    fi
else
    echo "   ⚠️  PulseAudio 未安装"
fi

echo ""
echo "=== 修复建议 ==="
echo ""

# 语音合成修复
if ! command -v espeak &> /dev/null || ! systemctl --user is-active --quiet speech-dispatcher 2>/dev/null; then
    echo "1. 安装语音合成引擎:"
    echo "   sudo apt-get update"
    echo "   sudo apt-get install speech-dispatcher espeak espeak-data espeak-data-zh"
    echo "   systemctl --user start speech-dispatcher"
    echo ""
fi

# 音频文件检查
if [ ! -d "public/sounds" ] || [ $(find public/sounds -type f \( -name "*.aiff" -o -name "*.mp3" \) | wc -l) -eq 0 ]; then
    echo "2. 音频文件缺失，请检查:"
    echo "   - public/sounds/ 目录是否存在"
    echo "   - 音频文件是否已下载"
    echo "   参考: public/sounds/README.md"
    echo ""
fi

# 音频格式转换
if command -v ffmpeg &> /dev/null && [ -d "public/sounds" ]; then
    aiff_count=$(find public/sounds -name "*.aiff" | wc -l)
    mp3_count=$(find public/sounds -name "*.mp3" | wc -l)
    
    if [ $aiff_count -gt 0 ] && [ $mp3_count -eq 0 ]; then
        echo "3. 建议将AIFF格式转换为MP3（更好的兼容性）:"
        echo "   cd public/sounds"
        echo "   for file in *.aiff; do"
        echo "     ffmpeg -i \"\$file\" \"\${file%.aiff}.mp3\""
        echo "   done"
        echo ""
    fi
fi

echo "=== 检查完成 ==="
echo ""
echo "详细说明请参考: ELECTRON_AUDIO_FIX.md"

