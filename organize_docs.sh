#!/bin/bash
# 整理MD文件到docs目录
# 使用方法：在WSL终端中执行: bash organize_docs.sh

echo "📁 开始整理MD文件..."
echo "当前目录: $(pwd)"

# 进入项目目录（如果不在项目目录）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "项目目录: $(pwd)"
echo ""

# 创建目录结构
echo "📂 创建目录结构..."
mkdir -p docs/{development,features,fixes,setup,testing,architecture}
echo "✅ 目录创建完成"
echo ""

# 统计变量
moved_count=0
not_found_count=0

# 移动文件的函数
move_file() {
    local filename=$1
    local target_dir=$2
    
    if [ -f "$filename" ]; then
        if mv "$filename" "$target_dir" 2>/dev/null; then
            echo "  ✅ $filename -> $target_dir"
            ((moved_count++))
        else
            echo "  ❌ 移动失败: $filename (权限问题?)"
            ((not_found_count++))
        fi
    else
        # 检查是否已经在目标目录
        if [ -f "$target_dir/$filename" ]; then
            echo "  ℹ️  $filename (已在 $target_dir/)"
        else
            echo "  ⚠️  $filename (文件不存在)"
            ((not_found_count++))
        fi
    fi
}

# 开发计划
echo "📝 移动开发计划文档..."
move_file "DEVELOPMENT_DESIGN_PLAN.md" "docs/development/"
move_file "IDEAS_AND_DISCUSSIONS.md" "docs/development/"
echo ""

# 功能文档 - 多声道
echo "🎵 移动多声道语音文档..."
move_file "MULTI_CHANNEL_IMPLEMENTATION.md" "docs/features/"
move_file "MULTI_CHANNEL_USAGE.md" "docs/features/"
move_file "MULTI_CHANNEL_VOICE.md" "docs/features/"
move_file "MULTI_PLAYER_CONCURRENT_SPEECH.md" "docs/features/"
echo ""

# 功能文档 - 聊天
echo "💬 移动聊天系统文档..."
move_file "CHAT_BUBBLE_SYNC_IMPLEMENTATION.md" "docs/features/"
move_file "CHAT_PERFORMANCE_OPTIMIZATION.md" "docs/features/"
move_file "CHAT_QUEUE_OPTIMIZATION.md" "docs/features/"
move_file "CHAT_SYSTEM_REFACTOR_PLAN.md" "docs/features/"
echo ""

# 功能文档 - 方言
echo "🗣️ 移动方言支持文档..."
move_file "DIALECT_MAPPING_TRAINING.md" "docs/features/"
move_file "NANCHANG_DIALECT_IMPLEMENTATION.md" "docs/features/"
echo ""

# 功能文档 - LLM
echo "🤖 移动LLM相关文档..."
move_file "LLM_REQUEST_QUEUE_OPTIMIZATION.md" "docs/features/"
move_file "LLM_TRAINING_PLAN.md" "docs/features/"
move_file "TRAINING_DATA_GUIDE.md" "docs/features/"
echo ""

# 架构文档
echo "🏗️ 移动架构设计文档..."
move_file "COMPLETE_SYSTEM_ARCHITECTURE.md" "docs/architecture/"
move_file "SYSTEM_ANNOUNCEMENT_REFACTOR.md" "docs/architecture/"
echo ""

# 修复文档
echo "🔧 移动问题修复文档..."
move_file "FIX_403_ERROR.md" "docs/fixes/"
move_file "FIX_AUDIO_ISSUES.md" "docs/fixes/"
move_file "FIX_VOICE_QUICK.md" "docs/fixes/"
move_file "FIXES_SUMMARY.md" "docs/fixes/"
move_file "SUMMARY_FIXES.md" "docs/fixes/"
move_file "QUICK_FIX_AUDIO.md" "docs/fixes/"
move_file "SIMPLE_VOICE_FIX.md" "docs/fixes/"
move_file "VOICE_INSTALL_FIX.md" "docs/fixes/"
move_file "ELECTRON_AUDIO_FIX.md" "docs/fixes/"
move_file "ELECTRON_RESOURCE_FIX.md" "docs/fixes/"
move_file "ELECTRON_UBUNTU_ENCODING_FIX.md" "docs/fixes/"
echo ""

# 设置文档
echo "⚙️ 移动设置配置文档..."
move_file "GIT_SETUP.md" "docs/setup/"
move_file "GITHUB_AUTH.md" "docs/setup/"
move_file "INSTALL_ELECTRON.md" "docs/setup/"
move_file "ELECTRON_SETUP.md" "docs/setup/"
move_file "WINDOWS_MIGRATION.md" "docs/setup/"
move_file "FIX-WSL-NODE.md" "docs/setup/"
move_file "fix-wsl-network.md" "docs/setup/"
move_file "check-server.md" "docs/setup/"
move_file "CHROME_DEBUG.md" "docs/setup/"
move_file "PASTE_TOKEN_GUIDE.md" "docs/setup/"
echo ""

# 测试文档
echo "🧪 移动测试文档..."
move_file "TEST_STRATEGY.md" "docs/testing/"
move_file "TEST_SUMMARY.md" "docs/testing/"
move_file "TEST_SUMMARY_MCTS.md" "docs/testing/"
move_file "MCTS_TRAINING_PLAN.md" "docs/testing/"
move_file "MCTS_TUNING.md" "docs/testing/"
move_file "MCTS_TUNING_TIME.md" "docs/testing/"
move_file "DEALING_IMPROVEMENT_PLAN.md" "docs/testing/"
move_file "GAME_LOGIC_REVIEW.md" "docs/testing/"
move_file "I18N_PLAN.md" "docs/testing/"
move_file "REFACTOR_PLAN.md" "docs/testing/"
move_file "REFACTOR_STATUS.md" "docs/testing/"
move_file "REFACTOR_TEST_REPORT.md" "docs/testing/"
echo ""

echo "════════════════════════════════════════════════════════"
echo "✨ 文件整理完成！"
echo "════════════════════════════════════════════════════════"
echo ""
echo "📊 统计结果："
echo "  ✅ 成功移动: $moved_count 个文件"
echo "  ⚠️  未找到: $not_found_count 个文件（可能已移动或不存在）"
echo ""
echo "📁 整理后的目录结构："
echo "  📁 docs/development/  - 开发计划 ($(ls docs/development/*.md 2>/dev/null | wc -l) 个文件)"
echo "  📁 docs/features/     - 功能实现 ($(ls docs/features/*.md 2>/dev/null | wc -l) 个文件)"
echo "  📁 docs/architecture/ - 架构设计 ($(ls docs/architecture/*.md 2>/dev/null | wc -l) 个文件)"
echo "  📁 docs/fixes/        - 问题修复 ($(ls docs/fixes/*.md 2>/dev/null | wc -l) 个文件)"
echo "  📁 docs/setup/        - 设置配置 ($(ls docs/setup/*.md 2>/dev/null | wc -l) 个文件)"
echo "  📁 docs/testing/      - 测试文档 ($(ls docs/testing/*.md 2>/dev/null | wc -l) 个文件)"
echo ""
echo "💡 提示：根目录保留的文档："
echo "  - README.md"
echo "  - QUICK-START.md"
echo "  - README-RUN.md"
echo "  - README-WINDOWS.md"
echo ""
