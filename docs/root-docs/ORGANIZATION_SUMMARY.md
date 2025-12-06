# 根目录文件整理总结

## 整理日期
2024-12-19

## 整理内容

### 已移动的文件

#### 启动文档 → `docs/root-docs/startup/`
- WSL-START.md, WSL-START-GUIDE.md, WSL-START-QUICK.md
- QUICK_START.md, QUICK-START.md, QUICK-START-WSL.md
- START-SERVICES.md, START_AI_CONTROL.md, START-WSL.md
- README-RUN.md, README-WINDOWS.md, README_MIGRATION.md

#### 项目状态文档 → `docs/root-docs/status/`
- PROJECT_STATUS.md, PROJECT_SHOWCASE.md
- FINAL_SUMMARY.md, FINAL_STATUS.md, FINAL_COMPLETION_REPORT.md
- MISSION_ACCOMPLISHED.md, SESSION_COMPLETE.md
- ULTIMATE_SUMMARY.md, NEW_ARCHITECTURE_VERIFIED.md

#### TTS文档 → `docs/root-docs/tts/`
- MeLo-TTS*.md (所有MeLo-TTS相关文档)
- TTS_CONFIG_GUIDE.md, TTS_TEST_GUIDE.md
- README-MeLo-TTS.md

#### 配置文档 → `docs/root-docs/config/`
- 外网访问配置指南.md, 外网访问-快速参考.md
- 外网访问配置-115.93.10.51.md
- 启动说明.md, 在0.13上启动TTS.md
- 快速参考-MeLo-TTS.md, 快速启动MeLo-TTS.md
- 选择合适的MeLo-TTS版本.md
- dblife.com域名配置方案.md

#### 启动脚本 → `docs/root-docs/scripts/start/`
- start.sh, start-all.sh, start-all-services.sh
- start-wsl.sh, start-wsl-dev.sh
- start-app-and-piper.sh, start-app-with-piper.sh
- start-electron.sh, start-ollama.sh, start-piper-tts.sh

#### 安装脚本 → `docs/root-docs/scripts/install/`
- install-*.sh (所有安装脚本)
- fix-*.sh (所有修复脚本)
- clean-and-install.sh

#### 测试脚本 → `docs/root-docs/scripts/test/`
- test-*.sh (所有测试脚本)
- run-*.sh (所有运行脚本)

#### 工具脚本 → `docs/root-docs/scripts/tools/`
- check-*.sh (所有检查脚本)
- commit-and-push.sh, do-commit-push.sh, quick-push.sh
- remove-console-logs.sh, restart-*.sh
- monitor-*.sh, debug-*.sh, verify_*.sh, organize_*.sh

#### Windows脚本 → `docs/root-docs/scripts/windows/`
- *.bat - Windows批处理脚本（start-*.bat, run-*.bat, install-*.bat）
- *.ps1 - PowerShell脚本

#### Python脚本 → `docs/root-docs/scripts/python/`
- start-melo-tts-server.py - 启动MeLo TTS服务器
- move_docs.py - 文档移动工具

#### 测试文件 → `docs/root-docs/test-files/`
- audio/ - 音频测试文件（*.wav）
- json/ - JSON测试文件和测试结果（test-*.json, merged-tests-*.test.ts）
- logs/ - 测试日志目录

#### 临时文件 → `docs/root-docs/temp-files/`
- leep 5 - Git diff输出文件
- package.json.update - package.json备份文件

#### 其他技术文档 → `docs/root-docs/`
- ACHIEVEMENT_SHOWCASE.md
- AI_*.md (所有AI相关文档)
- AUDIO_*.md (所有音频相关文档)
- CARD_GLOW_OPTIMIZATION.md
- CONSOLE_CLEANUP_SUMMARY.md
- GIT_COMMANDS.md
- LLM_*.md (所有LLM相关文档)
- LOG_CLEANUP_PLAN.md
- REFACTOR_PLAN.md
- REMAINING_WORK_PLAN.md
- CODE_REFACTOR_PROGRESS.md
- design.md

### 保留在根目录的文件

以下文件保留在项目根目录（重要项目文档）：
- **README.md** - 项目主文档
- **CHANGELOG.md** - 更新日志
- **CONTRIBUTING.md** - 贡献指南

## 目录结构

```
项目根目录/
├── README.md                    # 项目主文档（保留）
├── CHANGELOG.md                 # 更新日志（保留）
├── CONTRIBUTING.md              # 贡献指南（保留）
│
└── docs/
    └── root-docs/               # 整理后的根目录文档和脚本
        ├── README.md            # 整理说明
        ├── ORGANIZATION_SUMMARY.md  # 整理总结（本文件）
        ├── startup/             # 启动文档
        ├── status/              # 状态文档
        ├── tts/                 # TTS文档
        ├── config/              # 配置文档
└── scripts/             # 脚本文件
    ├── start/           # 启动脚本
    ├── install/        # 安装脚本
    ├── test/           # 测试脚本
    ├── tools/          # 工具脚本
    ├── windows/        # Windows脚本（.bat, .ps1）
    └── python/         # Python脚本
├── test-files/         # 测试文件
│   ├── audio/         # 音频测试文件
│   ├── json/          # JSON测试文件
│   └── logs/          # 测试日志
└── temp-files/         # 临时文件
```

## 使用说明

### 运行脚本

如果需要从根目录运行脚本，可以：

1. **使用完整路径**：
   ```bash
   ./docs/root-docs/scripts/start/start-wsl.sh
   ```

2. **创建符号链接**（推荐）：
   ```bash
   ln -s docs/root-docs/scripts/start/start-wsl.sh start-wsl.sh
   ```

3. **添加到PATH**：
   ```bash
   export PATH=$PATH:$(pwd)/docs/root-docs/scripts/start
   ```

### 查看文档

```bash
# 启动文档
cat docs/root-docs/startup/WSL-START.md

# TTS配置
cat docs/root-docs/tts/TTS_CONFIG_GUIDE.md

# 项目状态
cat docs/root-docs/status/PROJECT_STATUS.md
```

## 统计

- **移动的MD文件**: 约50+个
- **移动的SH文件**: 约30+个
- **移动的BAT文件**: 约5个
- **移动的PS1文件**: 1个
- **移动的PY文件**: 2个
- **移动的测试文件**: 约10+个（.wav, .json, .test.ts）
- **移动的临时文件**: 2个
- **总计**: 约126个文件已整理

## 后续建议

1. 考虑为常用脚本创建符号链接到根目录
2. 更新所有文档中的脚本路径引用
3. 考虑将部分脚本移动到 `scripts/` 目录（如果已有该目录）

