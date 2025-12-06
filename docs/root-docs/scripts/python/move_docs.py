#!/usr/bin/env python3
"""
整理MD文件到docs目录
"""
import os
import shutil
from pathlib import Path

# 项目根目录
ROOT = Path(__file__).parent

# 文件映射：源文件 -> 目标目录
FILE_MAPPINGS = {
    # 开发计划
    'DEVELOPMENT_DESIGN_PLAN.md': 'docs/development/',
    'IDEAS_AND_DISCUSSIONS.md': 'docs/development/',
    
    # 功能文档 - 多声道
    'MULTI_CHANNEL_IMPLEMENTATION.md': 'docs/features/',
    'MULTI_CHANNEL_USAGE.md': 'docs/features/',
    'MULTI_CHANNEL_VOICE.md': 'docs/features/',
    'MULTI_PLAYER_CONCURRENT_SPEECH.md': 'docs/features/',
    
    # 功能文档 - 聊天
    'CHAT_BUBBLE_SYNC_IMPLEMENTATION.md': 'docs/features/',
    'CHAT_PERFORMANCE_OPTIMIZATION.md': 'docs/features/',
    'CHAT_QUEUE_OPTIMIZATION.md': 'docs/features/',
    'CHAT_SYSTEM_REFACTOR_PLAN.md': 'docs/features/',
    
    # 功能文档 - 方言
    'DIALECT_MAPPING_TRAINING.md': 'docs/features/',
    'NANCHANG_DIALECT_IMPLEMENTATION.md': 'docs/features/',
    
    # 功能文档 - LLM
    'LLM_REQUEST_QUEUE_OPTIMIZATION.md': 'docs/features/',
    'LLM_TRAINING_PLAN.md': 'docs/features/',
    'TRAINING_DATA_GUIDE.md': 'docs/features/',
    
    # 架构文档
    'COMPLETE_SYSTEM_ARCHITECTURE.md': 'docs/architecture/',
    'SYSTEM_ANNOUNCEMENT_REFACTOR.md': 'docs/architecture/',
    
    # 修复文档
    'FIX_403_ERROR.md': 'docs/fixes/',
    'FIX_AUDIO_ISSUES.md': 'docs/fixes/',
    'FIX_VOICE_QUICK.md': 'docs/fixes/',
    'FIXES_SUMMARY.md': 'docs/fixes/',
    'SUMMARY_FIXES.md': 'docs/fixes/',
    'QUICK_FIX_AUDIO.md': 'docs/fixes/',
    'SIMPLE_VOICE_FIX.md': 'docs/fixes/',
    'VOICE_INSTALL_FIX.md': 'docs/fixes/',
    'ELECTRON_AUDIO_FIX.md': 'docs/fixes/',
    'ELECTRON_RESOURCE_FIX.md': 'docs/fixes/',
    'ELECTRON_UBUNTU_ENCODING_FIX.md': 'docs/fixes/',
    
    # 设置文档
    'GIT_SETUP.md': 'docs/setup/',
    'GITHUB_AUTH.md': 'docs/setup/',
    'INSTALL_ELECTRON.md': 'docs/setup/',
    'ELECTRON_SETUP.md': 'docs/setup/',
    'WINDOWS_MIGRATION.md': 'docs/setup/',
    'FIX-WSL-NODE.md': 'docs/setup/',
    'fix-wsl-network.md': 'docs/setup/',
    'check-server.md': 'docs/setup/',
    'CHROME_DEBUG.md': 'docs/setup/',
    'PASTE_TOKEN_GUIDE.md': 'docs/setup/',
    
    # 测试文档
    'TEST_STRATEGY.md': 'docs/testing/',
    'TEST_SUMMARY.md': 'docs/testing/',
    'TEST_SUMMARY_MCTS.md': 'docs/testing/',
    'MCTS_TRAINING_PLAN.md': 'docs/testing/',
    'MCTS_TUNING.md': 'docs/testing/',
    'MCTS_TUNING_TIME.md': 'docs/testing/',
    'DEALING_IMPROVEMENT_PLAN.md': 'docs/testing/',
    'GAME_LOGIC_REVIEW.md': 'docs/testing/',
    'I18N_PLAN.md': 'docs/testing/',
    'REFACTOR_PLAN.md': 'docs/testing/',
    'REFACTOR_STATUS.md': 'docs/testing/',
    'REFACTOR_TEST_REPORT.md': 'docs/testing/',
}

def move_files():
    """移动文件到对应目录"""
    moved = 0
    skipped = 0
    
    for filename, target_dir in FILE_MAPPINGS.items():
        source = ROOT / filename
        target = ROOT / target_dir / filename
        
        if source.exists():
            # 确保目标目录存在
            target.parent.mkdir(parents=True, exist_ok=True)
            
            # 如果目标文件已存在，跳过
            if target.exists():
                print(f'⚠️  跳过 {filename} (目标文件已存在)')
                skipped += 1
                continue
            
            # 移动文件
            try:
                shutil.move(str(source), str(target))
                print(f'✅ 移动 {filename} -> {target_dir}')
                moved += 1
            except Exception as e:
                print(f'❌ 移动失败 {filename}: {e}')
        else:
            print(f'⚠️  文件不存在: {filename}')
            skipped += 1
    
    print(f'\n📊 统计: 移动 {moved} 个文件, 跳过 {skipped} 个文件')

if __name__ == '__main__':
    move_files()

