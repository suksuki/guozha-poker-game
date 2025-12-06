#!/bin/bash

echo "=== Ubuntu Electron 编码修复脚本 ==="
echo ""

# 检查语言环境
echo "1. 检查当前语言环境..."
locale | grep -E "LANG|LC_ALL|LC_CTYPE" || echo "  警告: 未找到语言环境设置"
echo ""

# 检查中文字体
echo "2. 检查中文字体..."
if command -v fc-list &> /dev/null; then
    font_count=$(fc-list :lang=zh | wc -l)
    if [ $font_count -gt 0 ]; then
        echo "   找到 $font_count 个中文字体:"
        fc-list :lang=zh | head -3 | sed 's/^/   /'
    else
        echo "   ⚠️  未找到中文字体，建议安装:"
        echo "   sudo apt-get install fonts-noto-cjk"
    fi
else
    echo "   ⚠️  fc-list 命令不可用，无法检查字体"
fi
echo ""

# 检查语言包
echo "3. 检查中文语言包..."
if dpkg -l | grep -q language-pack-zh; then
    echo "   ✅ 已安装中文语言包"
    dpkg -l | grep language-pack-zh | head -2 | sed 's/^/   /'
else
    echo "   ⚠️  未找到中文语言包，建议安装:"
    echo "   sudo apt-get install language-pack-zh-hans language-pack-zh-hans-base"
fi
echo ""

# 设置环境变量（当前会话）
echo "4. 设置当前会话的环境变量..."
export LANG=zh_CN.UTF-8
export LC_ALL=zh_CN.UTF-8
export LC_CTYPE=zh_CN.UTF-8
echo "   LANG=$LANG"
echo "   LC_ALL=$LC_ALL"
echo "   LC_CTYPE=$LC_CTYPE"
echo ""

# 检查系统语言环境配置
echo "5. 检查系统语言环境配置..."
if [ -f /etc/default/locale ]; then
    echo "   /etc/default/locale 内容:"
    cat /etc/default/locale | sed 's/^/   /'
    if ! grep -q "zh_CN.UTF-8" /etc/default/locale; then
        echo "   ⚠️  系统语言环境未设置为中文，建议修改 /etc/default/locale"
    fi
else
    echo "   ⚠️  /etc/default/locale 文件不存在"
fi
echo ""

echo "=== 修复建议 ==="
echo ""
echo "如果发现编码问题，请按以下步骤操作:"
echo ""
echo "1. 安装中文语言包:"
echo "   sudo apt-get update"
echo "   sudo apt-get install language-pack-zh-hans language-pack-zh-hans-base"
echo ""
echo "2. 安装中文字体:"
echo "   sudo apt-get install fonts-noto-cjk"
echo ""
echo "3. 设置系统语言环境（需要root权限）:"
echo "   sudo nano /etc/default/locale"
echo "   添加以下内容:"
echo "   LANG=zh_CN.UTF-8"
echo "   LC_ALL=zh_CN.UTF-8"
echo "   LC_CTYPE=zh_CN.UTF-8"
echo ""
echo "4. 重新登录或重启系统使设置生效"
echo ""
echo "5. 使用修复后的启动脚本:"
echo "   ./start-electron.sh"
echo ""
echo "=== 检查完成 ==="

