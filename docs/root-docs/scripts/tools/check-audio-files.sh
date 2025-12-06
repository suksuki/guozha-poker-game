#!/bin/bash

echo "=== 检查音频文件 ==="
echo ""

if [ ! -d "public/sounds" ]; then
    echo "❌ public/sounds 目录不存在"
    exit 1
fi

echo "音频文件列表："
echo ""

total_size=0
valid_files=0
invalid_files=0

for file in public/sounds/*.{aiff,mp3,wav} 2>/dev/null; do
    if [ -f "$file" ]; then
        size=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
        total_size=$((total_size + size))
        
        # 检查文件大小（正常音频文件应该 > 10KB）
        if [ "$size" -lt 10240 ]; then
            echo "⚠️  $file - ${size} bytes (太小，可能是占位文件)"
            invalid_files=$((invalid_files + 1))
        else
            echo "✅ $file - ${size} bytes"
            valid_files=$((valid_files + 1))
        fi
        
        # 检查文件类型
        file_type=$(file "$file" 2>/dev/null | cut -d: -f2)
        echo "   类型: $file_type"
    fi
done

echo ""
echo "统计："
echo "  有效文件: $valid_files"
echo "  无效/占位文件: $invalid_files"
echo "  总大小: $((total_size / 1024)) KB"

if [ "$invalid_files" -gt 0 ]; then
    echo ""
    echo "⚠️  发现占位文件或损坏文件！"
    echo "   这些文件需要从 public/sounds/README.md 中下载"
    echo "   或者使用 public/sounds/download-guide.txt 中的指南"
fi

