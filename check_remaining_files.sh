#!/bin/bash
# 检查根目录还有哪些MD文件需要移动

cd /home/jin/guozha_poker_game

echo "════════════════════════════════════════════════════════"
echo "📋 检查根目录剩余的MD文件"
echo "════════════════════════════════════════════════════════"
echo ""

# 需要移动的文件列表
files_to_move=(
    # 开发计划
    "DEVELOPMENT_DESIGN_PLAN.md"
    "IDEAS_AND_DISCUSSIONS.md"
    
    # 功能文档 - 多声道
    "MULTI_CHANNEL_IMPLEMENTATION.md"
    "MULTI_CHANNEL_USAGE.md"
    "MULTI_CHANNEL_VOICE.md"
    "MULTI_PLAYER_CONCURRENT_SPEECH.md"
    
    # 功能文档 - 聊天
    "CHAT_BUBBLE_SYNC_IMPLEMENTATION.md"
    "CHAT_PERFORMANCE_OPTIMIZATION.md"
    "CHAT_QUEUE_OPTIMIZATION.md"
    "CHAT_SYSTEM_REFACTOR_PLAN.md"
    
    # 功能文档 - 方言
    "DIALECT_MAPPING_TRAINING.md"
    "NANCHANG_DIALECT_IMPLEMENTATION.md"
    
    # 功能文档 - LLM
    "LLM_REQUEST_QUEUE_OPTIMIZATION.md"
    "LLM_TRAINING_PLAN.md"
    "TRAINING_DATA_GUIDE.md"
    
    # 架构文档
    "COMPLETE_SYSTEM_ARCHITECTURE.md"
    "SYSTEM_ANNOUNCEMENT_REFACTOR.md"
    
    # 修复文档
    "FIX_403_ERROR.md"
    "FIX_AUDIO_ISSUES.md"
    "FIX_VOICE_QUICK.md"
    "FIXES_SUMMARY.md"
    "SUMMARY_FIXES.md"
    "QUICK_FIX_AUDIO.md"
    "SIMPLE_VOICE_FIX.md"
    "VOICE_INSTALL_FIX.md"
    "ELECTRON_AUDIO_FIX.md"
    "ELECTRON_RESOURCE_FIX.md"
    "ELECTRON_UBUNTU_ENCODING_FIX.md"
    
    # 设置文档
    "GIT_SETUP.md"
    "GITHUB_AUTH.md"
    "INSTALL_ELECTRON.md"
    "ELECTRON_SETUP.md"
    "WINDOWS_MIGRATION.md"
    "FIX-WSL-NODE.md"
    "fix-wsl-network.md"
    "check-server.md"
    "CHROME_DEBUG.md"
    "PASTE_TOKEN_GUIDE.md"
    
    # 测试文档
    "TEST_STRATEGY.md"
    "TEST_SUMMARY.md"
    "TEST_SUMMARY_MCTS.md"
    "MCTS_TRAINING_PLAN.md"
    "MCTS_TUNING.md"
    "MCTS_TUNING_TIME.md"
    "DEALING_IMPROVEMENT_PLAN.md"
    "GAME_LOGIC_REVIEW.md"
    "I18N_PLAN.md"
    "REFACTOR_PLAN.md"
    "REFACTOR_STATUS.md"
    "REFACTOR_TEST_REPORT.md"
)

echo "检查以下文件是否在根目录："
echo ""

found_count=0
not_found_count=0

for file in "${files_to_move[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✅ 找到: $file"
        ((found_count++))
    else
        echo "  ⚠️  未找到: $file (可能已移动)"
        ((not_found_count++))
    fi
done

echo ""
echo "════════════════════════════════════════════════════════"
echo "📊 统计："
echo "  找到: $found_count 个文件（需要移动）"
echo "  未找到: $not_found_count 个文件（可能已移动）"
echo "════════════════════════════════════════════════════════"

if [ $found_count -eq 0 ]; then
    echo ""
    echo "✨ 太好了！所有文件都已经整理完成！"
    echo ""
    echo "📁 查看整理结果："
    echo "  bash check_docs_status.sh"
fi

