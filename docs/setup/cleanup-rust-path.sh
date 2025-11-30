#!/bin/bash
# 清理 shell 配置文件中的 Rust PATH 配置

echo "=========================================="
echo "清理 Rust PATH 配置"
echo "=========================================="
echo ""

# 要检查的文件列表
SHELL_FILES=(
    "$HOME/.bashrc"
    "$HOME/.zshrc"
    "$HOME/.profile"
    "$HOME/.bash_profile"
)

CLEANED=false

for file in "${SHELL_FILES[@]}"; do
    if [ -f "$file" ]; then
        if grep -q '\.cargo' "$file" 2>/dev/null; then
            echo "在 $(basename $file) 中找到 Rust 配置:"
            grep '\.cargo' "$file"
            echo ""
            read -p "是否删除这些配置? (y/N): " response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                # 创建备份
                cp "$file" "${file}.backup.$(date +%Y%m%d_%H%M%S)"
                
                # 删除包含 .cargo 的行
                sed -i '/\.cargo/d' "$file"
                
                echo "✅ 已从 $(basename $file) 中删除 Rust 配置（已创建备份）"
                CLEANED=true
            else
                echo "跳过 $(basename $file)"
            fi
            echo ""
        fi
    fi
done

if [ "$CLEANED" = false ]; then
    echo "未找到需要清理的 Rust 配置"
else
    echo "=========================================="
    echo "✅ 清理完成！"
    echo "=========================================="
    echo ""
    echo "注意: 需要重新打开终端或运行以下命令使更改生效:"
    echo "  source ~/.bashrc  # 如果使用 bash"
    echo "  source ~/.zshrc   # 如果使用 zsh"
    echo ""
fi

