# i18n 框架测试文档

## 概述

本文档说明如何测试新 i18n 框架的各个功能模块。

## 测试套件

### 1. 单元测试

#### 配置系统测试

```bash
npm run test:quick -- i18nFramework -t "配置系统"
```

测试内容：
- 命名空间构建和解析
- 资源路径生成
- 默认配置验证

#### 翻译管理器测试

```bash
npm run test:quick -- i18nFramework -t "翻译管理器"
```

测试内容：
- 管理器初始化
- 翻译获取
- 语言切换
- 事件监听

#### 资源加载器测试

```bash
npm run test:quick -- i18nFramework -t "资源加载器"
```

测试内容：
- 加载器初始化
- 资源路径解析
- 缓存管理

### 2. Hooks 测试

#### 组件翻译 Hook

```bash
npm run test:quick -- i18nFramework -t "useComponentTranslation"
```

测试内容：
- Hook 返回值的正确性
- 命名空间生成
- 翻译函数功能

#### 功能翻译 Hook

```bash
npm run test:quick -- i18nFramework -t "useFeatureTranslation"
```

测试内容：
- Hook 返回值
- 功能命名空间
- 翻译正确性

#### 共享翻译 Hook

```bash
npm run test:quick -- i18nFramework -t "useSharedTranslation"
```

测试内容：
- Hook 返回值
- 共享命名空间
- 翻译功能

#### 语言切换 Hook

```bash
npm run test:quick -- i18nFramework -t "useLanguage"
```

测试内容：
- 当前语言获取
- 语言切换功能
- 支持的语言列表

### 3. 集成测试

```bash
npm run test:quick -- i18nFramework -t "集成测试"
```

测试内容：
- 与现有 i18n 系统的兼容性
- 多语言切换
- 翻译资源加载

### 4. 向后兼容测试

```bash
npm run test:quick -- i18n.test
```

验证现有 i18n 测试仍然通过，确保向后兼容性。

## 运行所有测试

```bash
# 运行新框架测试
npm run test:quick -- i18nFramework

# 运行所有 i18n 相关测试
npm run test:quick -- i18n

# 运行完整测试套件
npm run test:quick
```

## 测试覆盖范围

| 模块 | 测试数量 | 状态 |
|------|---------|------|
| 配置系统 | 4 | ✅ |
| 翻译管理器 | 6 | ✅ |
| 资源加载器 | 3 | ✅ |
| Hooks | 8 | ✅ |
| 集成测试 | 5 | ✅ |
| 命名空间映射 | 3 | ✅ |
| **总计** | **30** | ✅ |

## 测试最佳实践

### 1. 隔离测试

每个测试应该是独立的，不依赖其他测试的状态。

### 2. 清理状态

在 `beforeEach` 和 `afterEach` 中清理测试状态：

```typescript
beforeEach(async () => {
  localStorage.removeItem('i18nextLng');
  await i18n.changeLanguage('zh-CN');
});
```

### 3. 异步处理

对于涉及语言切换的测试，使用适当的等待机制：

```typescript
await i18n.changeLanguage('en-US');
await new Promise(resolve => setTimeout(resolve, 20));
```

### 4. Mock 和 Spy

使用 Vitest 的 mock 功能测试复杂交互：

```typescript
const spy = vi.spyOn(manager, 'changeLanguage');
await manager.changeLanguage('en-US');
expect(spy).toHaveBeenCalled();
```

## 故障排除

### 测试失败常见原因

1. **语言未切换**: 等待时间不够，增加延迟
2. **资源未加载**: 确保翻译文件存在
3. **Hook 初始化失败**: 检查 React 测试环境配置

### 调试技巧

```typescript
// 添加调试输出
console.log('Current language:', i18n.language);
console.log('Translation:', i18n.t('game:title'));

// 使用 vi.fn() 跟踪调用
const fn = vi.fn();
manager.onLanguageChange(fn);
```

## 持续集成

在 CI/CD 中运行测试：

```yaml
# 示例 GitHub Actions
- name: Run i18n tests
  run: npm run test:quick -- i18nFramework
```

## 相关文档

- [测试总结](../tests/i18nFramework-test-summary.md)
- [使用指南](./i18n-framework-usage.md)
- [迁移指南](./i18n-migration-guide.md)

