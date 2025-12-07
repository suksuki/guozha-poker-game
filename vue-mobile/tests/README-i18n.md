# i18n 测试说明

## 测试文件

### 单元测试
- `tests/unit/i18n.test.ts` - i18n 核心功能测试
- `tests/unit/settingsStore-i18n.test.ts` - SettingsStore 与 i18n 集成测试

### 集成测试
- `tests/integration/i18n-integration.test.ts` - i18n 在组件中的集成测试

## 运行测试

在 WSL 终端中运行：

```bash
# 运行所有 i18n 相关测试
npm test -- i18n

# 运行单元测试
npm test -- tests/unit/i18n.test.ts

# 运行集成测试
npm test -- tests/integration/i18n-integration.test.ts
```

## 测试覆盖

### i18n 基础功能
- ✅ 支持所有语言（中文、英文、日文、韩文）
- ✅ 正确翻译文本
- ✅ 支持嵌套键
- ✅ 语言切换功能
- ✅ localStorage 持久化

### SettingsStore 集成
- ✅ 语言设置初始化
- ✅ 语言设置更新
- ✅ localStorage 保存和加载
- ✅ 与 i18n 同步

### 组件集成
- ✅ 组件中使用 i18n
- ✅ 语言切换响应
- ✅ 多语言文本显示

## 注意事项

1. 测试需要在 WSL 环境中运行，Windows PowerShell 可能无法正确执行
2. 确保已安装所有依赖：`npm install`
3. 测试会清理 localStorage，确保测试隔离

