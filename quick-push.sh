#!/bin/bash
# 快速推送脚本 - 使用环境变量方式

echo "=== GitHub 推送脚本 ==="
echo ""
echo "请按照以下步骤操作："
echo "1. 在 GitHub 创建 Personal Access Token"
echo "2. 复制你的 token"
echo ""
read -p "请输入你的 GitHub Personal Access Token: " GITHUB_TOKEN

if [ -z "$GITHUB_TOKEN" ]; then
    echo "错误: Token 不能为空"
    exit 1
fi

# 设置远程仓库
echo ""
echo "配置远程仓库..."
git remote remove origin 2>/dev/null
git remote add origin https://suksuki:${GITHUB_TOKEN}@github.com/suksuki/guozha-poker-game.git

# 推送
echo ""
echo "推送到 GitHub..."
git push -u origin main

# 清除 token（安全考虑）
unset GITHUB_TOKEN

echo ""
echo "完成！"
echo "注意: Token 已从内存中清除"

