# AI Brain 测试指南

## 快速测试

### 方法1: 使用npm命令

```bash
npm run test:ai-brain
```

### 方法2: 直接运行测试文件

```bash
# Windows
npx ts-node src/services/ai/brain/test-mcts-integration.ts

# Linux/Mac
npx ts-node src/services/ai/brain/test-mcts-integration.ts
```

### 方法3: 使用脚本

```bash
# Windows
scripts\test-ai-brain.bat

# Linux/Mac
./scripts/test-ai-brain.sh
```

## 测试内容

### 测试1: MCTS模块基础功能
测试MCTS决策模块是否能够：
- 正常初始化
- 通过健康检查
- 分析游戏局面
- 生成决策建议

### 测试2: AIBrain集成MCTS模块
测试AI Brain是否能够：
- 创建和初始化
- 注册MCTS模块
- 做出决策
- 记录指标

### 测试3: 多轮决策测试
测试连续多轮决策的：
- 性能稳定性
- 平均响应时间
- 决策一致性

### 测试4: 不同配置测试
测试不同AI性格配置：
- 激进型
- 保守型
- 平衡型

## 预期输出

成功的测试输出应该类似：

```
┌─────────────────────────────────────────┐
│   AI Brain - MCTS模块集成测试           │
└─────────────────────────────────────────┘

=== 测试1: MCTS模块基础功能 ===

✓ MCTS模块初始化成功
✓ 健康检查: 通过

测试手牌: 9张
开始分析...

✓ 分析完成 (耗时: XXXms)
  - 建议数量: 1
  - 置信度: 85.0%
  - 推理: MCTS模拟XXX次，计算耗时XXms

最佳建议:
  - 动作类型: play
  - 评分: 0.8
  - 置信度: 85.0%
  - 推理: MCTS经过XXX次模拟，认为这是最优出牌
  - 出牌数量: 1张

✓ MCTS模块关闭成功

... (更多测试输出)

┌─────────────────────────────────────────┐
│              测试总结                    │
└─────────────────────────────────────────┘

通过: 4/4

🎉 所有测试通过！MCTS模块集成成功！
```

## 常见问题

### 问题1: 找不到模块

**错误信息：**
```
Cannot find module 'xxx'
```

**解决方案：**
确保已安装依赖：
```bash
npm install
```

### 问题2: 类型错误

**错误信息：**
```
Type 'xxx' is not assignable to type 'yyy'
```

**解决方案：**
1. 检查TypeScript版本
2. 运行类型检查：`npm run build`
3. 查看错误信息，修复类型不匹配

### 问题3: MCTS返回null

**可能原因：**
- 手牌为空
- 无法出牌（要不起）
- 配置错误

**解决方案：**
- 检查测试数据
- 查看MCTS日志
- 调整迭代次数

### 问题4: 测试超时

**解决方案：**
减少MCTS迭代次数：
```typescript
{
  options: {
    iterations: 300  // 从1000降低到300
  }
}
```

## 性能基准

在正常配置下（1000次迭代），预期性能：

- **单次决策时间**: 200-800ms
- **MCTS模块分析**: 150-600ms
- **Brain决策融合**: 50-200ms

如果性能显著偏离这些值，请检查：
1. CPU负载
2. 迭代次数设置
3. 是否有其他进程占用资源

## 下一步

测试通过后，可以：

1. **集成到游戏** - 参考 `INTEGRATION_GUIDE.md`
2. **添加新模块** - 实现LLM或规则引擎模块
3. **收集数据** - 启用数据收集器
4. **性能优化** - 调整配置和参数

## 调试技巧

### 启用详细日志

在测试文件中添加：
```typescript
import { Logger } from './utils/Logger';

const logger = new Logger({ level: 'debug' });
```

### 查看模块状态

```typescript
const state = brain.getState();
console.log('Brain状态:', JSON.stringify(state, null, 2));
```

### 单独测试某个功能

直接调用单个测试函数：
```typescript
import { testMCTSModuleBasic } from './test-mcts-integration';

testMCTSModuleBasic().then(console.log);
```

## 贡献

如果发现问题或有改进建议，请：
1. 记录详细的错误信息
2. 提供复现步骤
3. 提交Issue或Pull Request

---

祝测试顺利！🚀

