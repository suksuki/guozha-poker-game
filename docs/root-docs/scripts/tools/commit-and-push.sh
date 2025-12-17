#!/bin/bash

# 提交并推送代码到GitHub

echo "检查Git状态..."
git status

echo ""
echo "添加所有更改的文件..."
git add .

echo ""
echo "提交更改..."
git commit -m "实现轮次记录功能：显示当前轮次出牌记录和历史轮次查看

- 添加轮次出牌记录（RoundPlayRecord）和轮次记录（RoundRecord）
- 实现轮次分数分配：一轮结束后，分数分配给最后出牌的人
- 在UI中显示当前轮次的所有出牌记录，分牌高亮显示
- 在玩家信息中显示历史轮次记录，包括轮次号和得分
- 添加轮次记录功能的单元测试和回归测试
- 修复游戏状态初始化问题，确保所有字段正确初始化"

echo ""
echo "推送到远程仓库..."
git push

echo ""
echo "完成！"

