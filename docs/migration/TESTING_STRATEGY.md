# 迁移测试策略文档

## 📋 测试层级划分

```
┌─────────────────────────────────────────┐
│        回归测试 (Regression Tests)      │
│   验证新架构与旧系统行为一致             │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│        集成测试 (Integration Tests)      │
│   验证模块间协作、数据流                 │
└─────────────────────────────────────────┘
                    ↑
┌─────────────────────────────────────────┐
│        单元测试 (Unit Tests)             │
│   验证单个函数、类的功能                 │
└─────────────────────────────────────────┘
```

---

## 🎯 测试目标

### 1. 单元测试目标
- ✅ 覆盖率 ≥ 90%
- ✅ 所有纯函数100%覆盖
- ✅ 所有边界条件覆盖
- ✅ 所有错误场景覆盖

### 2. 集成测试目标
- ✅ 关键数据流完整覆盖
- ✅ 模块间接口验证
- ✅ 异步调用链验证
- ✅ 状态同步验证

### 3. 回归测试目标
- ✅ 核心功能行为一致
- ✅ 边界场景结果一致
- ✅ 性能不降低
- ✅ 内存占用不增加

---

## 📊 测试计划矩阵

### Phase 1: 基础设施层测试

#### 1.1 AsyncTaskManager 单元测试

**测试文件**: `tests/unit/async/AsyncTaskManager.test.ts`

```typescript
describe('AsyncTaskManager', () => {
  // 基础功能测试
  describe('基础执行', () => {
    test('应该成功执行简单任务', async () => {
      // 验收标准：
      // 1. 任务执行成功
      // 2. result.success === true
      // 3. result.data正确
    });
    
    test('应该记录执行时长', async () => {
      // 验收标准：
      // 1. result.duration > 0
      // 2. duration误差 < 10ms
    });
  });
  
  // 超时测试
  describe('超时控制', () => {
    test('应该在超时后抛出TimeoutError', async () => {
      // 验收标准：
      // 1. 在timeout时间后抛出错误
      // 2. 错误类型为TimeoutError
      // 3. result.timedOut === true
    });
    
    test('应该在超时前正常完成', async () => {
      // 验收标准：
      // 1. 任务在timeout前完成
      // 2. 不抛出错误
      // 3. result.timedOut === false
    });
  });
  
  // 重试测试
  describe('重试机制', () => {
    test('应该在失败后重试指定次数', async () => {
      // 验收标准：
      // 1. 调用次数 = retryCount + 1
      // 2. result.retries === retryCount
    });
    
    test('应该使用指数退避延迟', async () => {
      // 验收标准：
      // 1. 第1次重试延迟 = baseDelay
      // 2. 第2次重试延迟 = baseDelay * backoff
      // 3. 第n次重试延迟 = baseDelay * backoff^(n-1)
    });
    
    test('应该在某次重试成功后停止', async () => {
      // 验收标准：
      // 1. 不继续重试
      // 2. result.success === true
      // 3. result.retries < maxRetries
    });
  });
  
  // 取消测试
  describe('取消机制', () => {
    test('应该支持通过AbortSignal取消任务', async () => {
      // 验收标准：
      // 1. 抛出CancellationError
      // 2. result.cancelled === true
      // 3. 任务立即停止
    });
    
    test('应该在任务开始前检测取消', async () => {
      // 验收标准：
      // 1. 任务不执行
      // 2. 立即抛出CancellationError
    });
  });
  
  // 降级测试
  describe('降级策略', () => {
    test('应该在主任务失败后执行降级函数', async () => {
      // 验收标准：
      // 1. 主任务执行且失败
      // 2. 降级函数执行
      // 3. result.fromFallback === true
      // 4. result.success === true
    });
    
    test('应该在降级也失败后抛出FallbackFailedError', async () => {
      // 验收标准：
      // 1. 错误类型为FallbackFailedError
      // 2. error包含原始错误和降级错误
    });
    
    test('降级函数也应该支持超时', async () => {
      // 验收标准：
      // 1. 降级函数超时后抛出错误
      // 2. 使用fallbackTimeout配置
    });
  });
  
  // 指标测试
  describe('指标收集', () => {
    test('应该正确记录成功指标', async () => {
      // 验收标准：
      // 1. successCount增加
      // 2. avgDuration更新
      // 3. successRate正确
    });
    
    test('应该正确记录失败指标', async () => {
      // 验收标准：
      // 1. failureCount增加
      // 2. lastError记录
      // 3. successRate正确
    });
    
    test('应该按任务名分类记录指标', async () => {
      // 验收标准：
      // 1. taskMetrics包含各任务
      // 2. 每个任务独立计数
    });
  });
  
  // 并发测试
  describe('并发处理', () => {
    test('应该支持同时执行多个任务', async () => {
      // 验收标准：
      // 1. 所有任务都执行
      // 2. 任务互不干扰
      // 3. 结果正确
    });
    
    test('应该正确追踪活跃任务数', async () => {
      // 验收标准：
      // 1. 任务开始时计数增加
      // 2. 任务结束时计数减少
      // 3. 最终计数为0
    });
  });
  
  // 边界测试
  describe('边界情况', () => {
    test('应该处理0毫秒超时', async () => {
      // 验收标准：
      // 1. 立即超时
      // 2. 行为正确
    });
    
    test('应该处理超大重试次数', async () => {
      // 验收标准：
      // 1. 不崩溃
      // 2. 最终正确失败
    });
    
    test('应该处理空的降级函数', async () => {
      // 验收标准：
      // 1. 不崩溃
      // 2. 抛出原始错误
    });
  });
});
```

**预期结果**:
- ✅ 所有测试通过
- ✅ 覆盖率 ≥ 95%
- ✅ 执行时间 < 5秒

---

#### 1.2 ServiceHealthChecker 单元测试

**测试文件**: `tests/unit/async/ServiceHealthChecker.test.ts`

```typescript
describe('ServiceHealthChecker', () => {
  describe('服务注册', () => {
    test('应该成功注册服务');
    test('应该立即执行首次健康检查');
    test('应该设置定时检查');
  });
  
  describe('健康检查', () => {
    test('健康服务应该标记为HEALTHY');
    test('失败1-2次应该标记为DEGRADED');
    test('失败3次以上应该标记为UNAVAILABLE');
    test('恢复后应该重置失败计数');
  });
  
  describe('超时处理', () => {
    test('健康检查超时应该标记为失败');
    test('超时时间应该可配置');
  });
  
  describe('状态查询', () => {
    test('应该正确返回服务状态');
    test('应该返回所有服务健康信息');
    test('未注册的服务应该返回UNAVAILABLE');
  });
  
  describe('清理', () => {
    test('注销服务应该停止定时检查');
    test('cleanup应该清理所有定时器');
  });
});
```

---

#### 1.3 GameState 单元测试

**测试文件**: `tests/unit/state/GameState.test.ts`

```typescript
describe('GameState', () => {
  describe('不可变性', () => {
    test('updatePlayer应该返回新对象', () => {
      // 验收标准：
      // 1. oldState !== newState
      // 2. oldState.players !== newState.players
      // 3. oldState.players[i] 保持不变
    });
    
    test('原始状态应该不被修改', () => {
      // 验收标准：
      // 1. 所有更新后原状态不变
      // 2. 深度检查所有属性
    });
    
    test('应该支持链式更新', () => {
      // 验收标准：
      // 1. state.updateX().updateY() 正确工作
      // 2. 每步都返回新对象
    });
  });
  
  describe('状态更新', () => {
    test('updatePlayer应该正确更新玩家');
    test('updateStatus应该更新游戏状态');
    test('addRound应该添加新轮次');
    test('updateCurrentPlayer应该更新当前玩家');
    test('addToFinishOrder应该添加到完成列表');
  });
  
  describe('事件发射', () => {
    test('状态变化应该发出事件');
    test('事件应该包含正确的数据');
    test('多个监听器应该都收到事件');
  });
  
  describe('快照功能', () => {
    test('toSnapshot应该导出完整状态');
    test('fromSnapshot应该恢复状态');
    test('快照往返应该保持一致');
  });
  
  describe('边界情况', () => {
    test('应该拒绝无效的玩家索引');
    test('应该处理空玩家列表');
    test('应该处理重复添加到完成列表');
  });
});
```

---

#### 1.4 StateManager 单元测试

**测试文件**: `tests/unit/state/StateManager.test.ts`

```typescript
describe('StateManager', () => {
  describe('动作执行', () => {
    test('应该通过模块处理动作');
    test('应该更新状态');
    test('应该发出状态变化事件');
    test('应该记录到历史');
  });
  
  describe('错误处理', () => {
    test('执行失败应该不更新状态');
    test('应该发出错误事件');
    test('应该抛出原始错误');
  });
  
  describe('历史管理', () => {
    test('应该记录状态历史');
    test('应该支持撤销');
    test('历史应该有最大限制');
  });
  
  describe('批量执行', () => {
    test('应该按顺序执行多个动作');
    test('某个失败应该中断后续');
  });
});
```

---

### Phase 2: 业务模块单元测试

#### 2.1 RoundModule 单元测试

**测试文件**: `tests/unit/modules/RoundModule.test.ts`

```typescript
describe('RoundModule', () => {
  describe('processPlay - 出牌处理', () => {
    test('应该正确处理有效出牌', () => {
      // 验收标准：
      // 1. 返回新的round和state
      // 2. 玩家手牌减少
      // 3. lastPlay更新
      // 4. 当前玩家切换
    });
    
    test('应该拒绝无效牌型', () => {
      // 验收标准：
      // 1. 抛出错误
      // 2. 状态不变
    });
    
    test('应该拒绝打不过的牌', () => {
      // 验收标准：
      // 1. 抛出错误
      // 2. 状态不变
    });
    
    test('应该在玩家出完牌后添加到完成列表', () => {
      // 验收标准：
      // 1. finishOrder包含该玩家
      // 2. 玩家排名正确
    });
    
    test('首次出牌应该允许任意牌型', () => {
      // 验收标准：
      // 1. lastPlay为null时可出任意牌
    });
  });
  
  describe('processPass - 要不起处理', () => {
    test('应该正确处理要不起');
    test('应该切换到下一个玩家');
    test('应该在所有人都pass后触发接风');
  });
  
  describe('checkRoundEnd - 轮次结束检查', () => {
    test('接风后应该结束轮次');
    test('应该正确计算轮次分数');
    test('应该创建新轮次');
    test('应该重置lastPlay');
  });
  
  describe('纯函数特性', () => {
    test('相同输入应该产生相同输出', () => {
      // 验收标准：
      // 1. 多次调用结果一致
      // 2. 深度相等
    });
    
    test('不应该修改输入参数', () => {
      // 验收标准：
      // 1. oldRound不变
      // 2. oldState不变
      // 3. cards不变
    });
  });
  
  describe('边界情况', () => {
    test('应该处理最后一个玩家出牌');
    test('应该处理所有玩家都没牌');
    test('应该处理连续要不起');
  });
});
```

**关键回归测试对比**:
```typescript
describe('RoundModule 回归测试', () => {
  test('与旧Round.processPlay行为一致', () => {
    // 对比100个随机场景
    for (let i = 0; i < 100; i++) {
      const scenario = generateRandomScenario();
      
      // 旧实现
      const oldResult = oldRound.processPlay(scenario);
      
      // 新实现
      const newResult = RoundModule.processPlay(scenario);
      
      // 深度对比
      expect(newResult).toDeepEqual(oldResult);
    }
  });
});
```

---

#### 2.2 ScoreModule 单元测试

**测试文件**: `tests/unit/modules/ScoreModule.test.ts`

```typescript
describe('ScoreModule', () => {
  describe('allocateScore - 分数分配', () => {
    test('应该给获胜者加分');
    test('应该记录获胜轮次');
    test('团队模式应该给团队加分');
  });
  
  describe('calculateFinalScores - 最终计分', () => {
    test('头游应该加30分');
    test('末游应该减30分');
    test('末游手牌分数应该转移');
    test('墩分应该正确计算');
  });
  
  describe('calculateRanking - 排名计算', () => {
    test('应该按手牌数量排序');
    test('手牌数量相同时按完成顺序');
    test('分数相同时保持原顺序');
  });
  
  describe('回归测试', () => {
    test('与gameRules.calculateFinalRankings行为一致', () => {
      // 1000个随机场景对比
    });
    
    test('与gameController.allocateRoundScore行为一致');
  });
});
```

---

### Phase 3: 集成测试

#### 3.1 状态管理集成测试

**测试文件**: `tests/integration/state/StateManagement.test.ts`

```typescript
describe('状态管理集成', () => {
  describe('完整出牌流程', () => {
    test('应该完成玩家出牌到AI出牌的完整流程', async () => {
      // 场景：
      // 1. 初始化游戏
      // 2. 玩家出牌
      // 3. 状态更新
      // 4. 轮到AI
      // 5. AI决策
      // 6. AI出牌
      // 7. 状态更新
      
      // 验收标准：
      // 1. 每步状态正确
      // 2. 事件顺序正确
      // 3. 最终状态一致
    });
  });
  
  describe('多轮游戏流程', () => {
    test('应该正确处理完整游戏', async () => {
      // 场景：从开始到结束
      // 验收标准：
      // 1. 多轮次正确切换
      // 2. 分数正确累积
      // 3. 游戏正确结束
      // 4. 排名正确
    });
  });
  
  describe('异常场景', () => {
    test('应该处理中途取消');
    test('应该处理快速连续操作');
    test('应该处理并发操作');
  });
});
```

---

#### 3.2 异步调用链集成测试

**测试文件**: `tests/integration/async/AsyncChain.test.ts`

```typescript
describe('异步调用链集成', () => {
  describe('LLM + TTS 完整流程', () => {
    test('应该完成聊天生成和语音播放', async () => {
      // 场景：
      // 1. 请求聊天消息
      // 2. LLM生成文本
      // 3. TTS合成语音
      // 4. 播放音频
      
      // 验收标准：
      // 1. 文本正确生成
      // 2. 音频正确合成
      // 3. 播放完成
      // 4. 总耗时 < 20秒
    });
    
    test('LLM超时时应该使用降级', async () => {
      // 场景：模拟LLM超时
      // 验收标准：
      // 1. 使用降级文本
      // 2. TTS仍然工作
      // 3. 不崩溃
    });
    
    test('TTS失败时应该优雅降级', async () => {
      // 场景：模拟TTS失败
      // 验收标准：
      // 1. 文本仍然显示
      // 2. 不阻塞游戏
    });
  });
  
  describe('AI决策 + 执行流程', () => {
    test('应该完成AI决策并执行', async () => {
      // 场景：
      // 1. 轮到AI
      // 2. 调用MCTS
      // 3. 返回决策
      // 4. 执行出牌
      // 5. 更新状态
      
      // 验收标准：
      // 1. 决策合理
      // 2. 执行成功
      // 3. 状态正确
    });
  });
  
  describe('服务健康管理', () => {
    test('服务不可用时应该正确处理', async () => {
      // 场景：
      // 1. 标记LLM服务为不可用
      // 2. 请求聊天
      // 3. 应该立即使用降级
      
      // 验收标准：
      // 1. 不尝试调用LLM
      // 2. 直接使用降级
      // 3. 不等待超时
    });
  });
});
```

---

#### 3.3 Central Brain 集成测试

**测试文件**: `tests/integration/brain/CentralBrain.test.ts`

```typescript
describe('CentralBrain 集成', () => {
  describe('完整游戏流程', () => {
    test('应该管理完整游戏从开始到结束', async () => {
      // 场景：4人游戏完整流程
      // 验收标准：
      // 1. 正确初始化
      // 2. 调度正确
      // 3. AI决策正确
      // 4. 聊天正常
      // 5. 数据收集正常
      // 6. 游戏正确结束
    });
  });
  
  describe('数据收集', () => {
    test('应该收集完整的训练数据', async () => {
      // 验收标准：
      // 1. 每次决策都记录
      // 2. 状态快照完整
      // 3. 数据格式正确
      // 4. 可导出
    });
  });
  
  describe('性能', () => {
    test('AI决策时间应该 < 2秒', async () => {
      // 验收标准：
      // 1. 95%的决策 < 2秒
      // 2. 99%的决策 < 5秒
    });
    
    test('应该支持快速游戏', async () => {
      // 场景：连续100局快速游戏
      // 验收标准：
      // 1. 不崩溃
      // 2. 内存稳定
      // 3. 性能不降低
    });
  });
});
```

---

### Phase 4: 回归测试

#### 4.1 核心功能回归测试

**测试文件**: `tests/regression/CoreFeatures.test.ts`

```typescript
describe('核心功能回归测试', () => {
  // 测试数据：从旧系统导出的1000局游戏记录
  const gameRecords = loadGameRecords('game-records-1000.json');
  
  describe('出牌逻辑回归', () => {
    test('新旧系统出牌结果一致', () => {
      gameRecords.forEach(record => {
        record.rounds.forEach(round => {
          round.plays.forEach(play => {
            // 旧系统
            const oldResult = oldSystem.canPlayCards(play.cards);
            
            // 新系统
            const newResult = cardUtils.canPlayCards(play.cards);
            
            // 对比
            expect(newResult).toDeepEqual(oldResult);
          });
        });
      });
    });
    
    test('新旧系统压牌判断一致', () => {
      // 类似上面，对比所有压牌场景
    });
  });
  
  describe('计分逻辑回归', () => {
    test('新旧系统最终分数一致', () => {
      gameRecords.forEach(record => {
        // 旧系统
        const oldScores = oldGameController.calculateFinalScores(record);
        
        // 新系统
        const newScores = ScoreModule.calculateFinalScores(record);
        
        // 对比（允许浮点误差）
        expect(newScores).toBeCloseTo(oldScores, 2);
      });
    });
    
    test('新旧系统排名一致', () => {
      // 对比所有排名结果
    });
  });
  
  describe('AI决策回归', () => {
    test('相同输入应该产生相同决策', () => {
      // 对于确定性场景（非随机）
      // MCTS结果应该一致
    });
    
    test('AI决策质量不降低', () => {
      // 通过自我对弈测试
      // 新AI vs 旧AI
      // 胜率应该 ≥ 45%（允许误差）
    });
  });
  
  describe('完整游戏回归', () => {
    test('重放1000局游戏应该得到相同结果', () => {
      let matchCount = 0;
      
      gameRecords.forEach((record, index) => {
        // 使用相同的初始状态和随机种子
        const newResult = replayGameWithNewSystem(record);
        
        // 对比关键结果
        if (
          newResult.winner === record.winner &&
          scoresMatch(newResult.scores, record.scores) &&
          rankingsMatch(newResult.rankings, record.rankings)
        ) {
          matchCount++;
        } else {
          console.warn(`Game ${index} mismatch:`, {
            old: record,
            new: newResult
          });
        }
      });
      
      // 验收标准：至少98%一致
      const matchRate = matchCount / gameRecords.length;
      expect(matchRate).toBeGreaterThanOrEqual(0.98);
    });
  });
});
```

---

#### 4.2 性能回归测试

**测试文件**: `tests/regression/Performance.test.ts`

```typescript
describe('性能回归测试', () => {
  describe('执行速度', () => {
    test('单次出牌处理时间不应增加', () => {
      // 旧系统基准：< 10ms
      // 新系统目标：< 10ms
    });
    
    test('AI决策时间不应增加', () => {
      // 旧系统基准：MCTS 500次迭代 < 1500ms
      // 新系统目标：< 1500ms
    });
    
    test('完整游戏时间不应增加', () => {
      // 旧系统基准：4人游戏 < 5分钟
      // 新系统目标：< 5分钟
    });
  });
  
  describe('内存占用', () => {
    test('游戏状态大小不应显著增加', () => {
      // 旧系统基准：< 5MB
      // 新系统目标：< 6MB（允许20%增长）
    });
    
    test('不应该有内存泄漏', () => {
      // 运行100局游戏
      // 内存应该保持稳定
    });
  });
  
  describe('渲染性能', () => {
    test('UI帧率不应降低', () => {
      // Vue 3目标：≥ 30fps
    });
  });
});
```

---

## 📝 测试执行计划

### Week 1: 基础设施测试
```bash
# Day 1-2: AsyncTaskManager
npm run test:unit -- AsyncTaskManager
目标：所有测试通过，覆盖率 ≥ 95%

# Day 3-4: ServiceHealthChecker
npm run test:unit -- ServiceHealthChecker
目标：所有测试通过，覆盖率 ≥ 90%

# Day 5-6: GameState + StateManager
npm run test:unit -- state/
目标：所有测试通过，覆盖率 ≥ 95%

# Day 7: 集成测试
npm run test:integration -- state/
目标：状态管理集成测试通过
```

### Week 2: 业务模块测试
```bash
# Day 1-3: RoundModule
npm run test:unit -- RoundModule
npm run test:regression -- RoundModule
目标：单元测试 + 回归测试通过

# Day 4-5: ScoreModule
npm run test:unit -- ScoreModule
npm run test:regression -- ScoreModule
目标：单元测试 + 回归测试通过

# Day 6-7: 其他模块
npm run test:unit -- modules/
目标：所有模块测试通过
```

### Week 3-4: 集成和回归
```bash
# Week 3: 集成测试
npm run test:integration
目标：所有集成测试通过

# Week 4: 完整回归
npm run test:regression
目标：98%以上行为一致，性能不降低
```

---

## ✅ 验收标准

### 代码质量标准
- ✅ 单元测试覆盖率 ≥ 90%
- ✅ 关键路径覆盖率 = 100%
- ✅ 所有纯函数覆盖率 = 100%
- ✅ 所有测试通过
- ✅ 无console.error
- ✅ Linter无错误

### 功能正确性标准
- ✅ 核心功能回归测试 ≥ 98%一致
- ✅ 边界场景测试100%通过
- ✅ 错误场景正确处理

### 性能标准
- ✅ 单次操作性能不降低
- ✅ 整体游戏时间不增加 > 10%
- ✅ 内存占用不增加 > 20%
- ✅ 无内存泄漏

### 可维护性标准
- ✅ 测试代码清晰易读
- ✅ 测试有明确注释
- ✅ 失败原因易于定位
- ✅ 测试执行速度快（总时间 < 5分钟）

---

## 🔄 持续测试流程

### 每次提交前
```bash
npm run test:quick  # 快速测试（< 30秒）
npm run lint        # 代码检查
```

### 每个PR前
```bash
npm run test:unit      # 所有单元测试
npm run test:integration  # 集成测试
```

### 每周
```bash
npm run test:regression   # 完整回归测试
npm run test:performance  # 性能测试
```

### 发布前
```bash
npm run test:all       # 所有测试
npm run test:coverage  # 覆盖率报告
npm run test:e2e       # 端到端测试（如果有）
```

---

## 📊 测试报告模板

### 单元测试报告
```markdown
## 单元测试报告 - [模块名] - [日期]

### 测试概况
- 总测试数：XXX
- 通过：XXX
- 失败：XXX
- 跳过：XXX
- 覆盖率：XX%

### 失败详情
[如果有失败，详细列出]

### 性能指标
- 测试执行时间：XX秒
- 平均单个测试：XXms

### 改进建议
[如果有]
```

### 回归测试报告
```markdown
## 回归测试报告 - [日期]

### 总体结果
- 测试场景数：1000
- 完全一致：XXX (XX%)
- 可接受差异：XXX (XX%)
- 不一致：XXX (XX%)

### 不一致分析
[详细分析每个不一致的情况]

### 性能对比
|指标|旧系统|新系统|变化|
|----|------|------|-----|
|单次出牌|XXms|XXms|+/-XX%|
|AI决策|XXms|XXms|+/-XX%|
|完整游戏|XXs|XXs|+/-XX%|

### 结论
[是否通过，需要什么改进]
```

---

## 🎯 测试里程碑

### Milestone 1: 基础设施测试完成
- [ ] AsyncTaskManager测试 100%
- [ ] ServiceHealthChecker测试 100%
- [ ] GameState测试 100%
- [ ] StateManager测试 100%
- [ ] 集成测试通过

### Milestone 2: 业务模块测试完成
- [ ] RoundModule测试 100%
- [ ] ScoreModule测试 100%
- [ ] 其他模块测试 100%
- [ ] 回归测试 ≥ 98%

### Milestone 3: 完整回归通过
- [ ] 核心功能回归 ≥ 98%
- [ ] 性能回归通过
- [ ] 所有测试通过
- [ ] 准备发布

---

**最后更新**: 2024-12-05
**维护者**: 开发团队

