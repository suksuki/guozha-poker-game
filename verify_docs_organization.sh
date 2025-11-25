#!/bin/bash
# 验证文档整理结果

cd /home/jin/guozha_poker_game

echo "════════════════════════════════════════════════════════"
echo "✅ 文档整理验证"
echo "════════════════════════════════════════════════════════"
echo ""

# 检查各个目录的文件数量
echo "📊 各目录文件统计："
echo ""

dev_count=$(find docs/development -maxdepth 1 -name "*.md" 2>/dev/null | wc -l)
feat_count=$(find docs/features -maxdepth 1 -name "*.md" 2>/dev/null | wc -l)
arch_count=$(find docs/architecture -maxdepth 1 -name "*.md" 2>/dev/null | wc -l)
fixes_count=$(find docs/fixes -maxdepth 1 -name "*.md" 2>/dev/null | wc -l)
setup_count=$(find docs/setup -maxdepth 1 -name "*.md" 2>/dev/null | wc -l)
test_count=$(find docs/testing -maxdepth 1 -name "*.md" 2>/dev/null | wc -l)

echo "  📁 docs/development/  - $dev_count 个文件"
echo "  📁 docs/features/     - $feat_count 个文件"
echo "  📁 docs/architecture/ - $arch_count 个文件"
echo "  📁 docs/fixes/        - $fixes_count 个文件"
echo "  📁 docs/setup/        - $setup_count 个文件"
echo "  📁 docs/testing/      - $test_count 个文件"
echo ""

total=$((dev_count + feat_count + arch_count + fixes_count + setup_count + test_count))
echo "  📈 总计: $total 个文档文件"
echo ""

# 检查根目录是否还有需要移动的文件
echo "📋 检查根目录是否还有需要移动的文件："
echo ""

root_md_files=$(ls *.md 2>/dev/null | grep -v "^README" | grep -v "^QUICK" || true)

if [ -z "$root_md_files" ]; then
    echo "  ✅ 根目录很干净！只剩下应该保留的文件："
    echo "     - README.md"
    echo "     - QUICK-START.md"
    echo "     - README-RUN.md"
    echo "     - README-WINDOWS.md"
    echo ""
    echo "✨ 文档整理完成！所有文件都已分类到 docs/ 目录下！"
else
    echo "  ⚠️  根目录还有以下文件可能需要移动："
    echo "$root_md_files" | while read file; do
        echo "     - $file"
    done
    echo ""
    echo "💡 如果需要移动这些文件，可以运行: bash organize_docs.sh"
fi

echo ""
echo "════════════════════════════════════════════════════════"

