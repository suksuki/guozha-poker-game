# 团队模式游戏结束流程修复计划

**创建日期**：2024-12-03  
**基于**：`game-end-flow-review.md` 的review结果  
**状态**：待实施

---

## 🎯 用户确认的设计决策

### 决策1：统一使用 teamConfig 标志 ✅

**规则**：
```typescript
if (this.teamConfig) {
  // 团队模式的逻辑
} else {
  // 个人模式的逻辑
}
```

**应用范围**：
- 游戏结束判定
- 接风逻辑
- 分数计算
- UI显示
- 聊天系统
- 所有需要区分团队/个人模式的地方

---

### 决策2：团队模式游戏结束条件 ✅

**规则**：**某个团队的所有队员出完牌 → 游戏立即结束**

**实现逻辑**：
```typescript
if (this.teamConfig) {
  // 检查是否有某个团队全部出完
  for (const team of this.teamConfig.teams) {
    const teamAllFinished = team.players.every(
      pid => this.players[pid].hand.length === 0
    );
    
    if (teamAllFinished) {
      // 游戏结束！
      shouldEndGame = true;
      winningTeamId = team.id;
      break;
    }
  }
}
```

**结果**：
- ✅ 团队A全部出完 → 游戏立即结束
- ✅ 团队B可能还有1个或2个玩家未出完（关单或关双）
- ✅ 未出完的玩家自动成为末游

---

## 📋 待讨论的问题清单

### 问题1：被关玩家的finishOrder排序规则 🔴

**场景**：团队A全部出完，团队B有2个玩家被关（关双）

**当前实现**：按玩家ID排序
```typescript
// src/utils/gameEndHandler.ts:77-78
missingPlayers.sort((a, b) => a - b); // 按ID排序
```

**待讨论的选项**：
- **选项A**：按手牌数量排序（手牌少的排前面）
  - 优点：更公平，手牌少的说明打得更好
  - 缺点：需要额外计算
  
- **选项B**：按玩家ID排序（当前实现）
  - 优点：简单直接
  - 缺点：可能不够公平
  
- **选项C**：按团队分组（同队的排在一起）
  - 优点：便于理解
  - 缺点：可能不符合游戏逻辑

**您的决策**：____________

---

### 问题2：被关玩家的争上游名次显示 🔴

**场景**：关双时有2个玩家被关

**待讨论的选项**：
- **选项A**：两人并列末游
  - finishedRank = playerCount（都是最后一名）
  
- **选项B**：区分倒数第1和倒数第2
  - 按finishOrder中的位置区分
  - 倒数第2的finishedRank = playerCount - 1
  - 倒数第1的finishedRank = playerCount
  
- **选项C**：按手牌数量区分
  - 手牌少的finishedRank更小（排名更前）

**您的决策**：____________

---

### 问题3：团队模式的winner设定 🔴

**场景**：团队A全部出完获胜

**待讨论的选项**：
- **选项A**：winner = 头游玩家（finishOrder[0]）
  - 符合当前代码结构
  - 可能需要额外记录winningTeamId
  
- **选项B**：winner = 获胜团队ID
  - 需要修改winner的类型定义
  - 或者使用负数区分（-1 = 团队1，-2 = 团队2）
  
- **选项C**：同时记录 winner（个人）和 winningTeamId（团队）
  - 最清晰的方案
  - 需要在Game类中添加winningTeamId字段

**您的决策**：____________

---

### 问题4：队友都出完时的接风处理 🔴

**场景**：
1. 玩家0（团队A）赢得一轮，需要接风
2. 玩家0的队友（玩家2）也已经出完
3. 此时团队A全部出完

**待讨论的选项**：
- **选项A**：立即结束游戏
  - 优点：符合"团队出完即结束"的规则
  - 缺点：可能不给对手机会出最后的牌
  
- **选项B**：继续找对手接风，但标记为"等待结束"
  - 优点：对手可以出最后的牌
  - 缺点：逻辑复杂，可能不必要
  
- **选项C**：立即结束游戏，但允许对手"放弃"出牌
  - 优点：兼顾公平和效率
  - 缺点：需要额外的UI交互

**您的决策**：____________

---

### 问题5：关单/关双的触发时机明确化 🟡

**当前实现**：
- 判定在游戏结束后的清算阶段
- 根据未出完的玩家数量判定

**是否需要**：
- [ ] 在游戏过程中预判（如"即将关单"的提示）
- [ ] 在游戏结束判定中就区分关单/关双
- [ ] 保持当前设计（清算阶段判定）

**您的决策**：____________

---

## 📋 实施任务分解

### 阶段1：团队模式游戏结束判定 ⚠️⚠️⚠️

#### 任务1.1：修改 Game.ts 中的游戏结束判定
**文件**：`src/utils/Game.ts`
**行数**：979-1045
**修改内容**：
```typescript
// 在 playCards 方法中，玩家出完牌后
if (updatedPlayer.hand.length === 0) {
  this.addToFinishOrder(playerIndex);
  
  // 检查游戏是否应该结束
  let shouldEndGame = false;
  
  if (this.teamConfig) {
    // 团队模式：检查是否有整个团队出完
    for (const team of this.teamConfig.teams) {
      const teamAllFinished = team.players.every(
        pid => this.players[pid].hand.length === 0
      );
      
      if (teamAllFinished) {
        shouldEndGame = true;
        // 记录获胜团队（可选）
        break;
      }
    }
    
    // 如果游戏结束，处理被关的玩家
    if (shouldEndGame) {
      // 将所有未出完的玩家加入finishOrder
      const unfinishedPlayers = this.players.filter(
        p => p.hand.length > 0
      );
      
      // 排序规则（待定）
      // 选项A：按手牌数量
      unfinishedPlayers.sort((a, b) => a.hand.length - b.hand.length);
      // 选项B：按玩家ID
      // unfinishedPlayers.sort((a, b) => a.id - b.id);
      
      unfinishedPlayers.forEach(p => {
        if (!this.finishOrder.includes(p.id)) {
          this.addToFinishOrder(p.id);
        }
      });
    }
  } else {
    // 个人模式：只剩1个玩家
    const remainingPlayers = this.players.filter(p => p.hand.length > 0);
    
    if (remainingPlayers.length === 1) {
      shouldEndGame = true;
      
      // 将最后一个玩家加入finishOrder
      const lastPlayerIndex = remainingPlayers[0].id;
      if (!this.finishOrder.includes(lastPlayerIndex)) {
        this.addToFinishOrder(lastPlayerIndex);
      }
    }
  }
  
  if (shouldEndGame) {
    // 结束当前轮次并计算最终排名
    // ... 现有的游戏结束逻辑
  }
}
```

**测试点**：
- [ ] 团队A全部出完，游戏正确结束
- [ ] 被关的玩家正确加入finishOrder
- [ ] finishOrder的顺序正确
- [ ] 最终排名和分数计算正确

---

#### 任务1.2：在队友接风逻辑中添加游戏结束检查
**文件**：`src/utils/Game.ts`
**行数**：628-664
**修改内容**：
```typescript
private findNextPlayerForNewRound(winnerIndex: number | null): number | null {
  if (this.teamConfig) {
    const winnerTeamId = winner?.teamId;
    
    if (winnerTeamId !== null && winnerTeamId !== undefined) {
      // 找队友中还有牌的玩家
      for (let i = 0; i < this.players.length; i++) {
        const player = this.players[i];
        if (player.teamId === winnerTeamId && player.hand.length > 0) {
          return i; // 找到队友，返回
        }
      }
      
      // 【新增】队友都出完了，检查整个团队是否都出完
      const team = this.teamConfig.teams.find(t => t.id === winnerTeamId);
      if (team) {
        const teamAllFinished = team.players.every(
          pid => this.players[pid].hand.length === 0
        );
        
        if (teamAllFinished) {
          // 整个团队出完，应该结束游戏
          // 返回null，让调用方触发游戏结束逻辑
          return null;
        }
      }
    }
    
    // 队友都出完了（但游戏未结束），顺时针找对手
    return findNextActivePlayer(winnerIndex, this.players, this.playerCount);
  } else {
    // 个人模式
    return findNextActivePlayer(winnerIndex, this.players, this.playerCount);
  }
}
```

**测试点**：
- [ ] 队友出完后正确检查游戏是否结束
- [ ] 返回null时游戏正确结束
- [ ] 不影响个人模式的逻辑

---

### 阶段2：明确被关玩家处理规则 ⚠️

#### 任务2.1：确定并实现被关玩家排序规则
**待讨论**：见"问题1"

#### 任务2.2：确定被关玩家的名次显示
**待讨论**：见"问题2"

---

### 阶段3：完善测试用例 ⚠️

#### 任务3.1：更新 teamScoring.test.ts

**需要修复的测试**：
- `应该正确转移手牌分（包揽场景）`
- `获胜团队应该 +30分，失败团队 -30分（无包揽）`
- `应该正确处理未出完手牌的分数`

**原因**：测试调用的API已变化
- 旧API：`calculateTeamRankings` 返回 `{ rankings, scoreAdjustments }`
- 新API：只返回 `TeamRanking[]`
- 应该使用：`applyTeamFinalRules` 进行完整的清算

#### 任务3.2：添加新的测试用例

**需要添加的测试**：
1. **团队模式游戏结束判定测试**
   - 团队A全部出完，游戏结束
   - 团队B有玩家被关
   - finishOrder正确记录

2. **关单场景测试**
   - 1个玩家被关
   - 分数正确转移
   - finishedRank正确设置

3. **关双场景测试**
   - 2个玩家被关
   - 分数正确转移
   - finishedRank正确设置

4. **队友接风测试**
   - 队友优先接风
   - 队友出完后找对手
   - 整个团队出完时正确结束

---

### 阶段4：文档更新 

#### 任务4.1：更新设计文档
**文件**：`docs/team-game-end-scoring.md`

**需要添加**：
- 团队模式游戏结束的触发条件
- 被关玩家的finishOrder排序规则
- 队友接风时的游戏结束检查

#### 任务4.2：更新README_SCORING.md
**文件**：`src/services/README_SCORING.md`

**需要更新**：
- 初始分数从-100改为0
- 添加团队模式的计分说明

---

## 🔍 需要进一步讨论的细节问题

### 问题集合1：被关玩家的处理

#### Q1.1：被关玩家在finishOrder中的排序
**场景**：关双，玩家1和玩家3都被关
- 玩家1还有5张牌
- 玩家3还有8张牌

**选项**：
- A. 按手牌数量：finishOrder = [..., 1, 3]（1手牌少，排前面）
- B. 按玩家ID：finishOrder = [..., 1, 3]（ID小的在前）
- C. 按团队：如果1和3是队友，排在一起

**建议**：选项A（按手牌数量）更合理

#### Q1.2：被关玩家的finishedRank
**场景**：4人游戏，2个玩家被关

**选项**：
- A. 并列末游：finishedRank都是4
- B. 区分：一个3，一个4
- C. 特殊标记：finishedRank = null（表示被关）

**建议**：选项B（区分），按finishOrder中的顺序

---

### 问题集合2：游戏结束的边界情况

#### Q2.1：团队同时出完
**场景**：玩家0（团队A）和玩家1（团队B）同时出完最后一张牌

**可能吗**：不可能，因为是轮流出牌

**结论**：不需要处理

#### Q2.2：接风玩家是被关玩家
**场景**：
1. 玩家0（团队A）出牌并赢得一轮
2. 需要接风，但玩家0的队友已出完
3. 找到对手玩家1接风
4. 但此时团队A已全部出完，游戏应该结束

**问题**：玩家1还有机会接风吗？

**选项**：
- A. 立即结束游戏（不给玩家1接风机会）
- B. 允许玩家1接风一次，然后结束

**建议**：选项A（立即结束）

#### Q2.3：关单但第一名和被关玩家是队友
**场景**：
1. 团队A：玩家0（已出完，第1名）、玩家2（被关，第4名）
2. 团队B：玩家1（已出完，第2名）、玩家3（已出完，第3名）

**问题**：第一名和被关玩家是队友，是否还算关单？

**当前实现**：
```typescript
// src/utils/teamScoring.ts:213
const isTeammate = firstPlayerTeamId !== null && firstPlayerTeamId === lastPlayerTeamId;
if (!isTeammate) {
  // 只有不是队友才进行手牌分转移和惩罚
}
```

**结论**：✅ 已正确处理，不算关单，跳过惩罚

---

### 问题集合3：分数清算的特殊情况

#### Q3.1：所有玩家都出完（无被关玩家）
**场景**：4个玩家都正常出完，没有被关

**处理**：
- ✅ isGuanDan = false, isGuanShuang = false
- ✅ 只进行正常的手牌分转移（最后一名→第一名）
- ✅ 无额外惩罚

**结论**：当前逻辑正确

#### Q3.2：被关的都是同一个团队
**场景**：团队A全部出完，团队B的2个玩家都被关

**处理**：
- ✅ 判定为关双
- ✅ 团队B的两个玩家各扣15分
- ✅ 第一名（团队A）+30分

**结论**：符合预期

---

## 📐 修复实施顺序建议

### 第1步：团队模式游戏结束判定 ⚠️⚠️⚠️
**优先级**：最高（核心功能缺失）

**子任务**：
1. 讨论并确认：被关玩家排序规则（问题1.1）
2. 讨论并确认：被关玩家名次显示（问题1.2）
3. 讨论并确认：团队winner设定（问题3）
4. 实现代码修改
5. 编写测试用例
6. 运行测试验证

**预计工作量**：4-6小时

---

### 第2步：队友接风时的游戏结束检查 ⚠️⚠️
**优先级**：高（防止逻辑错误）

**子任务**：
1. 讨论并确认：队友出完时的处理（问题4）
2. 实现代码修改
3. 编写测试用例
4. 运行测试验证

**预计工作量**：2-3小时

---

### 第3步：更新测试用例 ⚠️
**优先级**：中（质量保证）

**子任务**：
1. 修复 `tests/teamScoring.test.ts` 的API调用
2. 添加新的团队模式测试
3. 添加关单/关双测试
4. 运行完整测试套件

**预计工作量**：3-4小时

---

### 第4步：文档更新
**优先级**：低（维护性）

**子任务**：
1. 更新 `README_SCORING.md`
2. 更新 `team-game-end-scoring.md`
3. 添加团队模式游戏结束判定的说明

**预计工作量**：1-2小时

---

## 🎯 当前状态

### 已确认的设计决策 ✅
1. ✅ 统一使用 teamConfig 标志判定团队模式
2. ✅ 团队模式下，某个团队全部出完即结束游戏

### 待讨论的问题 🔴
1. 🔴 被关玩家的finishOrder排序规则
2. 🔴 被关玩家的finishedRank设置
3. 🔴 团队模式的winner设定
4. 🔴 队友都出完时的接风处理
5. 🟡 关单/关双的提前提示（可选）

### 待实施的任务 📋
1. 📋 修改Game.ts游戏结束判定
2. 📋 添加队友接风的游戏结束检查
3. 📋 更新测试用例
4. 📋 更新文档

---

## 📝 讨论记录

### 2024-12-03 初次讨论

**用户决策**：
1. ✅ 在game里面设置teamconfig标志，统一通过这个来判定是否团队游戏
2. ✅ 团队情况下，某个团队的所有队员出完牌，游戏结束

**待继续讨论**：
- 被关玩家的排序规则
- 其他细节问题

**下一步**：一个一个讨论剩余问题

---

## 🔗 相关文档

- `docs/review/game-end-flow-review.md` - 完整Review报告
- `docs/team-game-end-scoring.md` - 团队分数清算流程
- `docs/game/finishOrder-importance.md` - finishOrder的重要性
- `docs/review/team-scoring-and-chat-redesign.md` - 团队计分设计
- `src/services/README_SCORING.md` - 计分系统文档

---

**文档状态**：进行中  
**最后更新**：2024-12-03

