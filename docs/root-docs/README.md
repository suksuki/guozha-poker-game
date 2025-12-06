# 项目根目录文档和脚本整理

## 目录结构

```
docs/root-docs/
├── README.md              # 本文件
├── startup/               # 启动和快速开始文档
│   ├── WSL-START.md
│   ├── QUICK_START.md
│   ├── START-SERVICES.md
│   └── ...
├── status/                # 项目状态和总结文档
│   ├── PROJECT_STATUS.md
│   ├── FINAL_SUMMARY.md
│   └── ...
├── tts/                   # TTS相关文档
│   ├── MeLo-TTS*.md
│   ├── TTS_CONFIG_GUIDE.md
│   └── ...
├── config/                # 配置相关文档
│   ├── 外网访问配置指南.md
│   ├── 启动说明.md
│   └── ...
├── scripts/               # 脚本文件
│   ├── start/            # 启动脚本
│   ├── install/          # 安装脚本
│   ├── test/             # 测试脚本
│   └── tools/            # 工具脚本
└── [其他技术文档]         # 其他分类的文档
```

## 文件分类说明

### startup/ - 启动文档
快速开始、启动指南、WSL启动说明等

### status/ - 状态文档
项目状态、完成报告、里程碑总结等

### tts/ - TTS文档
TTS配置、MeLo-TTS指南、TTS测试等

### config/ - 配置文档
外网访问配置、启动说明、快速参考等

### scripts/ - 脚本文件
- **start/**: 启动相关脚本（start-*.sh）
- **install/**: 安装和修复脚本（install-*.sh, fix-*.sh）
- **test/**: 测试脚本（test-*.sh, run-*.sh）
- **tools/**: 工具脚本（check-*.sh, commit-*.sh等）

## 使用说明

### 启动服务
```bash
# 推荐方式
./docs/root-docs/scripts/start/start-wsl.sh

# 或使用快捷方式（如果已创建符号链接）
./start-wsl.sh
```

### 查看文档
```bash
# 启动文档
cat docs/root-docs/startup/WSL-START.md

# TTS配置
cat docs/root-docs/tts/TTS_CONFIG_GUIDE.md
```

## 注意事项

- 所有脚本已移动到 `docs/root-docs/scripts/` 目录
- 如需在根目录使用脚本，可以创建符号链接或更新PATH
- 文档已按功能分类，便于查找和维护

