#!/bin/bash
# 批量移除console日志的脚本
# 使用sed安全地移除console调用

echo "========================================="
echo "🧹 开始清理console日志..."
echo "========================================="

# 统计清理前的日志数量
echo "📊 清理前统计："
BEFORE_COUNT=$(grep -r "console\." src --include="*.ts" --include="*.tsx" | wc -l)
echo "   总计: $BEFORE_COUNT 个console调用"

# 备份标记
echo ""
echo "💾 建议先提交当前更改或创建分支"
echo "   git stash 或 git commit -am 'backup before console cleanup'"
echo ""
read -p "是否继续清理？(y/n) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ 已取消清理"
    exit 1
fi

echo ""
echo "🚀 开始清理..."

# 使用Perl进行更安全的清理（比sed更强大）
# 这会移除整行包含console调用的代码

find src -type f \( -name "*.ts" -o -name "*.tsx" \) -not -path "*/node_modules/*" | while read file; do
    # 移除包含console的完整行
    # 保留在字符串或注释中的console
    perl -i -ne 'print unless /^\s*console\.(log|warn|error|debug|info|trace)\(/' "$file"
done

echo ""
echo "✅ 清理完成！"
echo ""

# 统计清理后的日志数量
echo "📊 清理后统计："
AFTER_COUNT=$(grep -r "console\." src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l || echo "0")
echo "   剩余: $AFTER_COUNT 个console调用"
REMOVED=$((BEFORE_COUNT - AFTER_COUNT))
echo "   已移除: $REMOVED 个console调用"

echo ""
echo "========================================="
echo "✅ 完成！请检查代码并测试功能"
echo "========================================="
echo ""
echo "💡 下一步："
echo "   1. 检查git diff查看更改"
echo "   2. 运行测试验证功能"
echo "   3. 提交更改"

