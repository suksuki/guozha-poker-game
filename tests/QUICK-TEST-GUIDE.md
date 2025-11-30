# 快速测试指南

## 问题：测试运行太慢

如果测试运行很慢，可能是因为：
1. 运行了所有测试（包括慢测试如MCTS微调）
2. 测试串行执行（`concurrent: false`）
3. 包含了UI和异步测试

## 解决方案

### 方法1：只运行新测试（推荐，最快）

```bash
# 只运行新创建的测试（55个测试用例，通常几秒到几十秒）
npm run test:new
```

这会只运行：
- `comprehensiveUnitTests.test.ts` (29个测试)
- `comprehensiveRegressionTests.test.ts` (19个测试)
- `integrationTests.test.ts` (7个测试)

**预计时间：10-30秒**

### 方法2：快速模式（排除慢测试）

```bash
# 使用快速模式，自动排除慢测试
TEST_FAST=true npm run test:new

# 或使用脚本
bash scripts/run-new-tests-fast.sh
```

这会排除：
- MCTS微调测试（非常慢，需要几分钟）
- UI测试
- 异步测试

### 方法3：分别运行各个测试套件

```bash
# 只运行单元测试（最快，约5-10秒）
npm run test:unit

# 只运行回归测试（约5-10秒）
npm run test:regression

# 只运行集成测试（约5-10秒）
npm run test:integration
```

### 方法4：使用测试文件模式

```bash
# 直接指定测试文件
npm run test:quick -- comprehensiveUnitTests
npm run test:quick -- comprehensiveRegressionTests
npm run test:integration
```

## 性能对比

| 命令 | 测试数量 | 预计时间 | 说明 |
|------|---------|---------|------|
| `npm run test:new` | 55个 | 10-30秒 | 只运行新测试，推荐 |
| `npm run test:unit` | 29个 | 5-10秒 | 最快 |
| `npm run test:regression` | 19个 | 5-10秒 | 快速 |
| `npm run test:integration` | 7个 | 5-10秒 | 快速 |
| `npm run test:all` | 所有测试 | 5-10分钟 | 包括慢测试，不推荐 |
| `TEST_FAST=true npm run test:new` | 55个 | 10-30秒 | 排除慢测试 |

## 如果测试仍然很慢

1. **检查是否在运行所有测试**：
   ```bash
   # 不要运行这个（会很慢）
   npm run test:all
   ```

2. **检查是否有慢测试在运行**：
   - MCTS微调测试（`mctsTuning*.test.ts`）需要几分钟
   - 这些测试会自动被 `TEST_FAST=true` 排除

3. **使用并发执行**（如果输出混乱可以接受）：
   - 修改 `vitest.config.ts` 中的 `concurrent: true`
   - 这会加快速度，但输出可能混乱

## 推荐工作流程

1. **开发时**：只运行相关测试
   ```bash
   npm run test:unit  # 修改了单元逻辑时
   ```

2. **提交前**：运行所有新测试
   ```bash
   npm run test:new  # 确保所有新测试通过
   ```

3. **完整验证**：运行所有测试（需要时间）
   ```bash
   npm run test:all  # 只在需要完整验证时运行
   ```

## 快速命令参考

```bash
# 最快 - 只运行单元测试
npm run test:unit

# 推荐 - 运行所有新测试
npm run test:new

# 快速模式 - 排除慢测试
TEST_FAST=true npm run test:new

# 完整测试 - 需要时间
npm run test:all
```

