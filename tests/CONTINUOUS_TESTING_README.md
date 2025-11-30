# 持续测试运行快速参考

## 🚀 一键运行全面测试

### WSL/Linux

```bash
bash scripts/run-full-tests-continuous.sh
```

### Windows

```cmd
scripts\run-full-tests-continuous.bat
```

## 📁 查看结果

测试完成后，在 `test-results/` 目录查看：

1. **`test_summary_*.txt`** - 快速查看统计和失败列表
2. **`test_errors_*.log`** - 查看所有错误详情
3. **`test_output_*.log`** - 查看完整输出

## 💡 使用场景

- ✅ 需要运行全面测试（包括慢测试）
- ✅ 测试时间很长（30-60分钟）
- ✅ 可以离开等待测试完成
- ✅ 需要收集所有错误信息

## 📝 特点

- **不因错误停止** - 即使测试失败也继续运行所有测试
- **自动收集错误** - 所有错误信息自动保存到文件
- **生成详细报告** - 包含统计、错误列表等

## 📖 详细文档

查看 [完整使用指南](../docs/testing/CONTINUOUS_TESTING_GUIDE.md) 了解更多。

