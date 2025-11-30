# 持续测试运行指南

## 📋 概述

当你需要进行全面测试，但测试时间很长时，可以使用持续测试模式。这种模式的特点：

- ✅ **即使测试失败也不会停止** - 继续运行所有测试用例
- ✅ **自动收集所有错误信息** - 保存到文件中供后续分析
- ✅ **生成详细报告** - 包含统计信息和错误汇总
- ✅ **可以离开等待** - 测试会在后台运行，完成后查看结果

## 🚀 快速开始

### 在 WSL/Linux 环境中

```bash
# 进入项目目录
cd ~/guozha_poker_game

# 给脚本执行权限（首次运行）
chmod +x scripts/run-full-tests-continuous.sh

# 运行全面测试（持续模式）
bash scripts/run-full-tests-continuous.sh
```

### 在 Windows 环境中

```cmd
# 进入项目目录
cd guozha_poker_game

# 运行全面测试（持续模式）
scripts\run-full-tests-continuous.bat
```

或者直接双击 `scripts\run-full-tests-continuous.bat` 文件。

## 📁 输出文件说明

测试完成后，会在 `test-results/` 目录下生成以下文件：

### 1. `test_output_YYYYMMDD_HHMMSS.log`
- **完整测试输出** - 包含所有测试的详细输出
- 用途：查看完整的测试执行过程

### 2. `test_errors_YYYYMMDD_HHMMSS.log`
- **错误详情** - 只包含失败测试的错误信息
- 用途：快速查看所有错误

### 3. `test_summary_YYYYMMDD_HHMMSS.txt`
- **汇总报告** - 测试统计、通过/失败数量、耗时等
- 用途：快速了解测试结果概览

### 文件命名格式
文件名包含时间戳（格式：`YYYYMMDD_HHMMSS`），例如：
- `test_output_20241215_143025.log` - 2024年12月15日 14:30:25 生成的输出

## 📊 使用流程

### 步骤 1：启动测试

运行测试脚本：

```bash
bash scripts/run-full-tests-continuous.sh
```

### 步骤 2：离开等待（可选）

测试开始运行后，你可以：
- 去吃饭 🍽️
- 去做其他事情
- 测试会自动运行并完成

### 步骤 3：查看结果

测试完成后，查看生成的文件：

```bash
# 查看汇总报告（推荐先看这个）
cat test-results/test_summary_*.txt

# 查看错误详情
cat test-results/test_errors_*.log

# 查看完整输出
cat test-results/test_output_*.log
```

### 步骤 4：分析错误

将所有错误信息复制给我，我会帮你修复：

1. 打开 `test_errors_*.log` 文件
2. 复制所有内容
3. 发给我分析

## 🔍 查看最新的测试结果

如果需要查看最新的测试结果，可以使用以下命令：

```bash
# 查看最新的汇总报告
ls -t test-results/test_summary_*.txt | head -1 | xargs cat

# 查看最新的错误日志
ls -t test-results/test_errors_*.log | head -1 | xargs cat

# 查看最新的完整输出
ls -t test-results/test_output_*.log | head -1 | xargs less
```

## ⚙️ 工作原理

### 测试配置

持续测试模式使用了以下配置：

- `--bail=0` - 即使测试失败也继续运行所有测试
- `--reporter=verbose` - 显示详细的测试输出
- `--run` - 运行一次后退出（非 watch 模式）

### 错误收集

脚本会自动：
1. 运行所有测试（包括慢测试）
2. 捕获所有输出（标准输出和错误输出）
3. 提取失败测试的错误信息
4. 生成统计报告

## 📝 示例输出

### 测试运行中

```
==========================================
开始运行全面测试（持续运行模式）
时间: 2024-12-15 14:30:25
==========================================

输出文件: test-results/test_output_20241215_143025.log
错误文件: test-results/test_errors_20241215_143025.log
汇总文件: test-results/test_summary_20241215_143025.txt

==========================================
运行所有测试（包括慢测试）
==========================================

[... 测试运行中 ...]
```

### 测试完成后

```
==========================================
测试运行完成
结束时间: 2024-12-15 15:45:12
总耗时: 1小时 14分钟 47秒
==========================================

==========================================
✗ 部分测试失败（3个）
请查看以下文件获取详细信息：
  - 完整输出: test-results/test_output_20241215_143025.log
  - 错误详情: test-results/test_errors_20241215_143025.log
  - 汇总报告: test-results/test_summary_20241215_143025.txt
==========================================
```

### 汇总报告示例

```
==========================================
测试运行汇总报告
生成时间: 2024-12-15 15:45:12
==========================================

失败的测试用例:
FAIL tests/example.test.ts > 测试某个功能
FAIL tests/another.test.ts > 测试另一个功能

==========================================
统计信息
==========================================
通过的测试: 67
失败的测试: 3
总耗时: 1小时 14分钟 47秒
退出码: 1
```

## 💡 最佳实践

### 1. 清理旧的结果文件

在运行新测试前，可以清理旧的结果文件：

```bash
# 清理所有旧的结果文件
rm -rf test-results/*

# 或者只保留最近的文件
find test-results -type f -mtime +7 -delete
```

### 2. 监控测试进度

如果需要监控测试进度，可以在另一个终端中：

```bash
# 实时查看最新输出
tail -f test-results/test_output_*.log

# 实时查看错误
tail -f test-results/test_errors_*.log
```

### 3. 运行特定类型的测试

如果需要运行特定类型的测试，可以修改脚本中的命令：

```bash
# 只运行快速测试
npm run test:fast

# 只运行慢测试
npm run test:slow-only

# 运行所有测试
npm run test:continuous
```

## ⚠️ 注意事项

1. **测试时间** - 全面测试可能需要 30-60 分钟或更长
2. **磁盘空间** - 测试输出文件可能较大，确保有足够空间
3. **不要中断** - 除非必要，不要中断测试运行
4. **查看错误文件** - 测试完成后，先查看 `test_errors_*.log` 快速了解失败情况

## 🔗 相关文档

- [测试分类指南](../tests/TEST_CATEGORIES.md) - 了解测试类型和标签
- [测试工作流计划](./TEST_WORKFLOW_EXECUTION_PLAN.md) - 测试更新工作流
- [测试总结](../tests/TEST-SUMMARY.md) - 测试套件总结

## 🐛 故障排除

### 问题：脚本无法执行

**解决方案：**
```bash
chmod +x scripts/run-full-tests-continuous.sh
```

### 问题：找不到 npm 命令

**解决方案：**
确保已安装 Node.js 和 npm，并在项目目录中运行。

### 问题：测试一直运行但没有输出

**解决方案：**
检查 `test-results/` 目录是否有新的日志文件生成，可能需要等待一段时间。

### 问题：磁盘空间不足

**解决方案：**
清理旧的测试结果文件或增加磁盘空间。

