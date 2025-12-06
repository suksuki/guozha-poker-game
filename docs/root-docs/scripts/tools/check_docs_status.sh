#!/bin/bash
# 检查文档整理状态

cd /home/jin/guozha_poker_game

echo "════════════════════════════════════════════════════════"
echo "📊 文档整理状态检查"
echo "════════════════════════════════════════════════════════"
echo ""

echo "📁 根目录的MD文件（排除README系列）："
root_files=$(ls *.md 2>/dev/null | grep -v "^README" | grep -v "^QUICK" || true)
if [ -z "$root_files" ]; then
    echo "  (无)"
else
    echo "$root_files" | while read file; do
        echo "  - $file"
    done
fi
echo ""

echo "📁 docs/development/ 目录："
dev_count=$(ls docs/development/*.md 2>/dev/null | wc -l)
echo "  文件数: $dev_count"
ls docs/development/*.md 2>/dev/null | head -5 | sed 's/^/  /'
echo ""

echo "📁 docs/features/ 目录："
feat_count=$(ls docs/features/*.md 2>/dev/null | wc -l)
echo "  文件数: $feat_count"
ls docs/features/*.md 2>/dev/null | head -10 | sed 's/^/  /'
echo ""

echo "📁 docs/fixes/ 目录："
fixes_count=$(ls docs/fixes/*.md 2>/dev/null | wc -l)
echo "  文件数: $fixes_count"
ls docs/fixes/*.md 2>/dev/null | head -5 | sed 's/^/  /'
echo ""

echo "📁 docs/setup/ 目录："
setup_count=$(ls docs/setup/*.md 2>/dev/null | wc -l)
echo "  文件数: $setup_count"
ls docs/setup/*.md 2>/dev/null | head -5 | sed 's/^/  /'
echo ""

echo "📁 docs/testing/ 目录："
test_count=$(ls docs/testing/*.md 2>/dev/null | wc -l)
echo "  文件数: $test_count"
ls docs/testing/*.md 2>/dev/null | head -5 | sed 's/^/  /'
echo ""

echo "════════════════════════════════════════════════════════"
echo "💡 如果根目录还有文件，说明需要移动"
echo "💡 如果docs目录已有文件，说明已经移动过了"
echo "════════════════════════════════════════════════════════"
