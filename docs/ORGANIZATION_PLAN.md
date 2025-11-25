# 📁 文档整理方案

## 📋 整理目标

将项目根目录下散乱的MD文件整理到 `docs/` 目录，按功能分类。

## 📂 目录结构

```
docs/
├── README.md                    # 文档目录说明
├── INDEX.md                     # 文档索引
├── architecture/                # 架构设计文档
│   ├── COMPLETE_SYSTEM_ARCHITECTURE.md
│   └── SYSTEM_ANNOUNCEMENT_REFACTOR.md
├── development/                 # 开发计划
│   ├── DEVELOPMENT_DESIGN_PLAN.md
│   └── IDEAS_AND_DISCUSSIONS.md
├── features/                    # 功能实现文档
│   ├── MULTI_CHANNEL_*.md
│   ├── CHAT_*.md
│   ├── DIALECT_*.md
│   ├── LLM_*.md
│   └── TRAINING_DATA_GUIDE.md
├── fixes/                       # 问题修复文档
│   ├── FIX_*.md
│   ├── ELECTRON_*.md
│   └── FIXES_SUMMARY.md
├── setup/                       # 设置和配置
│   ├── GIT_SETUP.md
│   ├── INSTALL_*.md
│   └── WINDOWS_MIGRATION.md
└── testing/                     # 测试文档
    ├── TEST_*.md
    ├── MCTS_*.md
    └── REFACTOR_*.md
```

## 🔄 文件移动清单

### 开发计划 → `docs/development/`
- [x] DEVELOPMENT_DESIGN_PLAN.md
- [x] IDEAS_AND_DISCUSSIONS.md

### 功能文档 → `docs/features/`
- [x] MULTI_CHANNEL_IMPLEMENTATION.md
- [x] MULTI_CHANNEL_USAGE.md
- [x] MULTI_CHANNEL_VOICE.md
- [x] MULTI_PLAYER_CONCURRENT_SPEECH.md
- [x] CHAT_BUBBLE_SYNC_IMPLEMENTATION.md
- [x] CHAT_PERFORMANCE_OPTIMIZATION.md
- [x] CHAT_QUEUE_OPTIMIZATION.md
- [x] CHAT_SYSTEM_REFACTOR_PLAN.md
- [x] DIALECT_MAPPING_TRAINING.md
- [x] NANCHANG_DIALECT_IMPLEMENTATION.md
- [x] LLM_REQUEST_QUEUE_OPTIMIZATION.md
- [x] LLM_TRAINING_PLAN.md
- [x] TRAINING_DATA_GUIDE.md

### 架构文档 → `docs/architecture/`
- [x] COMPLETE_SYSTEM_ARCHITECTURE.md
- [x] SYSTEM_ANNOUNCEMENT_REFACTOR.md

### 修复文档 → `docs/fixes/`
- [x] FIX_AUDIO_ISSUES.md
- [x] FIX_VOICE_QUICK.md
- [x] FIX_403_ERROR.md
- [x] FIXES_SUMMARY.md
- [x] SUMMARY_FIXES.md
- [x] QUICK_FIX_AUDIO.md
- [x] SIMPLE_VOICE_FIX.md
- [x] VOICE_INSTALL_FIX.md
- [x] ELECTRON_AUDIO_FIX.md
- [x] ELECTRON_RESOURCE_FIX.md
- [x] ELECTRON_UBUNTU_ENCODING_FIX.md

### 设置文档 → `docs/setup/`
- [x] GIT_SETUP.md
- [x] GITHUB_AUTH.md
- [x] INSTALL_ELECTRON.md
- [x] ELECTRON_SETUP.md
- [x] WINDOWS_MIGRATION.md
- [x] FIX-WSL-NODE.md
- [x] fix-wsl-network.md
- [x] check-server.md
- [x] CHROME_DEBUG.md
- [x] PASTE_TOKEN_GUIDE.md

### 测试文档 → `docs/testing/`
- [x] TEST_STRATEGY.md
- [x] TEST_SUMMARY.md
- [x] TEST_SUMMARY_MCTS.md
- [x] MCTS_TRAINING_PLAN.md
- [x] MCTS_TUNING.md
- [x] MCTS_TUNING_TIME.md
- [x] DEALING_IMPROVEMENT_PLAN.md
- [x] GAME_LOGIC_REVIEW.md
- [x] I18N_PLAN.md
- [x] REFACTOR_PLAN.md
- [x] REFACTOR_STATUS.md
- [x] REFACTOR_TEST_REPORT.md

## 📝 保留在根目录的文件

以下文件保留在根目录（重要入口文档）：
- README.md - 项目主文档
- QUICK-START.md - 快速开始
- README-RUN.md - 运行说明
- README-WINDOWS.md - Windows指南

## 🚀 执行整理

运行整理脚本：
```bash
chmod +x organize_docs.sh
./organize_docs.sh
```

或手动移动文件到对应目录。

## ✅ 整理后检查

1. 检查所有文件是否已移动到正确位置
2. 更新代码中的文档引用路径
3. 更新README.md中的文档链接
4. 测试文档链接是否正常

---

**状态**：整理脚本已创建，可以执行 `./organize_docs.sh` 进行整理

