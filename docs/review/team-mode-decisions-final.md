# 团队模式游戏结束流程 - 最终设计决策

**决策日期**：2024-12-03  
**状态**：✅ 所有问题已讨论确认，准备实施

---

## 📋 核心设计决策汇总

### 决策1：统一判定标准 ✅

**规则**：使用 `teamConfig` 标志统一判定是否团队模式

**实现**：
```typescript
if (this.teamConfig) {
  // 团队模式的逻辑
} else {
  // 个人模式的逻辑
}
```

**应用范围**：游戏结束判定、接风逻辑、分数计算、UI显示、聊天系统

---

### 决策2：团队游戏结束条件 ✅

**规则**：**某个团队的所有队员出完牌 → 游戏立即结束**

**判定逻辑**：
```typescript
if (this.teamConfig) {
  for (const team of this.teamConfig.teams) {
    const teamAllFinished = team.players.every(
      pid => this.players[pid].hand.length === 0
    );
    
    if (teamAllFinished) {
      // 游戏立即结束
      shouldEndGame = true;
      break;
    }
  }
}
```

---

### 决策3：被关玩家的finishOrder排序 ✅

**规则**：按**手牌数量**排序（手牌少的排前面）

**实现**：
```typescript
// 被关的玩家排序
unfinishedPlayers.sort((a, b) => {
  // 首先按手牌数量（少的在前）
  if (a.hand.length !== b.hand.length) {
    return a.hand.length - b.hand.length;
  }
  // 手牌数量相同时，按玩家ID（小的在前）
  return a.id - b.id;
});
```

**示例**：
- 玩家1：5张牌 → finishOrder第3位
- 玩家3：8张牌 → finishOrder第4位

**理由**：手牌少说明打得更好，应该排名更前（更公平）

---

### 决策4：被关玩家的finishedRank设定 ✅

**规则**：**严格按finishOrder中的位置设定**

**实现**：
```typescript
// src/utils/gameController.ts（当前已正确实现）
const newFinishOrder = [...this.game.finishOrder, playerIndex];
const finishedRank = newFinishOrder.length; // 位置即名次
```

**示例**：
```typescript
finishOrder = [0, 2, 1, 3]

玩家0：finishedRank = 1（头游）
玩家2：finishedRank = 2
玩家1：finishedRank = 3（倒数第2，被关但手牌较少）
玩家3：finishedRank = 4（末游，被关且手牌最多）
```

**理由**：保持逻辑一致性，有区分度，计分明确

---

### 决策5：团队模式的winner设定 ✅

**规则**：添加 **winningTeamId** 字段

**实现**：
```typescript
export class Game {
  winner: number | null;            // 头游玩家索引
  winningTeamId?: number | null;    // 【新增】获胜团队ID
}

// 游戏结束时
this.setWinner(this.finishOrder[0]);  // 头游玩家

if (this.teamConfig) {
  const winnerPlayer = this.players[this.finishOrder[0]];
  this.winningTeamId = winnerPlayer.teamId ?? null;
}
```

**UI使用**：
```typescript
if (game.teamConfig && game.winningTeamId !== null) {
  // 显示：🏆 团队A获胜！头游：玩家0
} else {
  // 显示：🏆 玩家0获胜！
}
```

**理由**：语义清晰，信息完整，易于使用

---

### 决策6：队友都出完时的处理 ✅

**规则**：队友都出完时**立即结束游戏**

**实现**：
```typescript
private findNextPlayerForNewRound(winnerIndex: number | null): number | null {
  if (this.teamConfig) {
    // 1. 找队友
    for (let i = 0; i < this.players.length; i++) {
      if (player.teamId === winnerTeamId && player.hand.length > 0) {
        return i;
      }
    }
    
    // 2. 【新增】队友都出完，检查团队是否全部出完
    const team = this.teamConfig.teams.find(t => t.id === winnerTeamId);
    if (team) {
      const teamAllFinished = team.players.every(
        pid => this.players[pid].hand.length === 0
      );
      
      if (teamAllFinished) {
        return null; // 返回null触发游戏结束
      }
    }
    
    // 3. 找对手
    return findNextActivePlayer(winnerIndex, this.players, this.playerCount);
  }
}
```

**理由**：符合"团队全部出完即结束"的规则，逻辑清晰

---

### 决策7：关单/关双提前提示 ✅

**规则**：**不提供提前提示**（先专注核心功能）

**理由**：
- ✅ 保持游戏策略性
- ✅ 实现简单
- ✅ 符合传统玩法
- 🟡 未来可作为可选功能添加

---

## 🎯 实施任务清单

### 第1步：修改Game类的游戏结束判定 ⚠️⚠️⚠️

**文件**：`src/utils/Game.ts`  
**位置**：line 979-1045

**修改内容**：
1. 添加团队模式判定逻辑
2. 实现被关玩家按手牌数量排序
3. 正确处理团队和个人模式

**具体代码**：
```typescript
// 检查是否出完牌
if (updatedPlayer.hand.length === 0) {
  this.addToFinishOrder(playerIndex);
  
  // 检查游戏是否应该结束
  let shouldEndGame = false;
  
  if (this.teamConfig) {
    // 【团队模式】检查是否有整个团队出完
    for (const team of this.teamConfig.teams) {
      const teamAllFinished = team.players.every(
        pid => this.players[pid].hand.length === 0
      );
      
      if (teamAllFinished) {
        shouldEndGame = true;
        break;
      }
    }
    
    // 如果游戏结束，处理被关的玩家
    if (shouldEndGame) {
      const unfinishedPlayers = this.players.filter(
        p => p.hand.length > 0
      );
      
      // 【决策3】按手牌数量排序
      unfinishedPlayers.sort((a, b) => {
        if (a.hand.length !== b.hand.length) {
          return a.hand.length - b.hand.length;
        }
        return a.id - b.id;
      });
      
      // 添加到finishOrder
      unfinishedPlayers.forEach(p => {
        if (!this.finishOrder.includes(p.id)) {
          this.addToFinishOrder(p.id);
        }
      });
    }
  } else {
    // 【个人模式】只剩1个玩家
    const remainingPlayers = this.players.filter(p => p.hand.length > 0);
    
    if (remainingPlayers.length === 1) {
      shouldEndGame = true;
      
      const lastPlayerIndex = remainingPlayers[0].id;
      if (!this.finishOrder.includes(lastPlayerIndex)) {
        this.addToFinishOrder(lastPlayerIndex);
      }
    }
  }
  
  if (shouldEndGame) {
    // 结束当前轮次
    // 计算最终排名
    // 设置winner和winningTeamId
    // ...
  }
}
```

---

### 第2步：添加winningTeamId字段 ⚠️⚠️

**文件**：`src/utils/Game.ts`

**修改内容**：

#### 2.1 添加字段定义
```typescript
export class Game {
  // ... 现有字段
  winner: number | null;
  winningTeamId?: number | null;  // 【新增】获胜团队ID
}
```

#### 2.2 初始化时设置
```typescript
constructor(config: GameSetupConfig) {
  // ...
  this.winner = null;
  this.winningTeamId = null;  // 【新增】
}

reset() {
  // ...
  this.winner = null;
  this.winningTeamId = null;  // 【新增】
}
```

#### 2.3 游戏结束时设置
```typescript
// 在游戏结束逻辑中（line 1024附近）
this.setWinner(this.finishOrder[0]);

// 【新增】设置获胜团队
if (this.teamConfig) {
  const winnerPlayer = this.players[this.finishOrder[0]];
  this.winningTeamId = winnerPlayer.teamId ?? null;
} else {
  this.winningTeamId = null;
}
```

---

### 第3步：队友接风时的游戏结束检查 ⚠️⚠️

**文件**：`src/utils/Game.ts`  
**位置**：line 628-664

**修改内容**：
```typescript
private findNextPlayerForNewRound(winnerIndex: number | null): number | null {
  if (this.teamConfig) {
    const winnerTeamId = winner?.teamId;
    
    if (winnerTeamId !== null && winnerTeamId !== undefined) {
      // 1. 找队友
      for (let i = 0; i < this.players.length; i++) {
        const player = this.players[i];
        if (player.teamId === winnerTeamId && player.hand.length > 0) {
          return i;
        }
      }
      
      // 2. 【新增】队友都出完了，检查团队是否全部出完
      const team = this.teamConfig.teams.find(t => t.id === winnerTeamId);
      if (team) {
        const teamAllFinished = team.players.every(
          pid => this.players[pid].hand.length === 0
        );
        
        if (teamAllFinished) {
          // 整个团队出完，返回null表示游戏应该结束
          return null;
        }
      }
    }
    
    // 3. 队友都出完了（但游戏未结束），找对手
    return findNextActivePlayer(winnerIndex, this.players, this.playerCount);
  } else {
    // 个人模式
    return findNextActivePlayer(winnerIndex, this.players, this.playerCount);
  }
}
```

**调用方处理**：
```typescript
// src/utils/Game.ts:1178 附近
const nextPlayerIndex = this.findNextPlayerForNewRound(winnerIndex);

if (nextPlayerIndex !== null) {
  // 创建新轮次，继续游戏
  const newRound = Round.createNew(...);
  this.addRound(newRound);
  await this.playNextTurn(nextPlayerIndex);
} else {
  // 【新增】nextPlayerIndex为null → 游戏应该结束
  // 触发游戏结束逻辑（与line 979-1045中的逻辑合并）
  this.updateStatus(GameStatus.FINISHED);
  this.calculateFinalRankings();
  
  // 设置winner和winningTeamId
  this.setWinner(this.finishOrder[0]);
  if (this.teamConfig) {
    const winnerPlayer = this.players[this.finishOrder[0]];
    this.winningTeamId = winnerPlayer.teamId ?? null;
  }
  
  this.triggerUpdate();
}
```

---

### 第4步：更新测试用例 ⚠️

**文件**：`tests/teamScoring.test.ts`

**需要修复的测试**：
1. 使用新的API `applyTeamFinalRules` 而不是旧的 `calculateTeamRankings`
2. 添加团队模式游戏结束判定测试
3. 添加关单/关双场景测试
4. 添加被关玩家排序测试

---

## 📊 设计决策总表

| 问题 | 决策 | 方案 | 状态 |
|------|------|------|------|
| 判定标准 | 统一使用teamConfig | - | ✅ 确认 |
| 游戏结束条件 | 团队全部出完即结束 | - | ✅ 确认 |
| 被关玩家排序 | 按手牌数量排序 | 方案A | ✅ 确认 |
| finishedRank设定 | 严格按finishOrder位置 | 方案A | ✅ 确认 |
| winner设定 | 添加winningTeamId字段 | 方案A | ✅ 确认 |
| 队友出完处理 | 立即结束游戏 | 方案A | ✅ 确认 |
| 提前提示 | 不提供（先专注核心） | 方案A | ✅ 确认 |

---

## 🎯 完整实施方案

### 修改点1：Game类字段添加

**位置**：`src/utils/Game.ts:65-95`

```typescript
export class Game {
  // ========== 排名相关 ==========
  winner: number | null;
  winningTeamId?: number | null;  // 【新增】获胜团队ID（团队模式）
  finishOrder: number[];
  finalRankings?: PlayerRanking[];
  teamRankings?: TeamRanking[];
  
  // ========== 团队模式 ==========
  teamConfig?: TeamConfig | null;
}
```

**初始化**：
```typescript
constructor(config: GameSetupConfig) {
  this.winner = null;
  this.winningTeamId = null;  // 【新增】
}

reset() {
  this.winner = null;
  this.winningTeamId = null;  // 【新增】
}
```

---

### 修改点2：游戏结束判定逻辑（核心）

**位置**：`src/utils/Game.ts:976-1045`

**完整修改**：
```typescript
// 检查是否出完牌
if (updatedPlayer.hand.length === 0) {
  this.addToFinishOrder(playerIndex);
  
  // ========== 游戏结束判定 ==========
  let shouldEndGame = false;
  
  if (this.teamConfig) {
    // 【团队模式】检查是否有整个团队出完
    for (const team of this.teamConfig.teams) {
      const teamAllFinished = team.players.every(
        pid => this.players[pid].hand.length === 0
      );
      
      if (teamAllFinished) {
        shouldEndGame = true;
        break;
      }
    }
    
    // 如果游戏结束，处理被关的玩家
    if (shouldEndGame) {
      const unfinishedPlayers = this.players.filter(
        p => p.hand.length > 0
      );
      
      // 【决策3】按手牌数量排序
      unfinishedPlayers.sort((a, b) => {
        if (a.hand.length !== b.hand.length) {
          return a.hand.length - b.hand.length;
        }
        return a.id - b.id;
      });
      
      // 添加到finishOrder（自动设置finishedRank）
      unfinishedPlayers.forEach(p => {
        if (!this.finishOrder.includes(p.id)) {
          this.addToFinishOrder(p.id);
        }
      });
    }
  } else {
    // 【个人模式】只剩1个玩家
    const remainingPlayers = this.players.filter(p => p.hand.length > 0);
    
    if (remainingPlayers.length === 1) {
      shouldEndGame = true;
      
      const lastPlayerIndex = remainingPlayers[0].id;
      if (!this.finishOrder.includes(lastPlayerIndex)) {
        this.addToFinishOrder(lastPlayerIndex);
      }
    }
  }
  
  // ========== 游戏结束处理 ==========
  if (shouldEndGame) {
    // 结束当前轮次（如果还没结束）
    if (!updatedRound.isEnded()) {
      const lastPlayPlayerIndex = updatedRound.getLastPlayPlayerIndex();
      const winnerIndex = lastPlayPlayerIndex !== null ? lastPlayPlayerIndex : playerIndex;
      const endResult = updatedRound.end(this.players, this.playerCount, winnerIndex);
      
      // 分配轮次分数
      if (endResult.winnerIndex !== null) {
        this.controller.allocateRoundScore(
          updatedRound.roundNumber,
          endResult.roundScore,
          endResult.winnerIndex,
          this.players,
          updatedRound.toRecord()
        );
      }
      
      this.updateRound(this.currentRoundIndex, updatedRound);
    }
    
    // 结束游戏
    this.updateStatus(GameStatus.FINISHED);
    this.calculateFinalRankings();
    
    // 【决策5】设置winner和winningTeamId
    this.setWinner(this.finishOrder[0]);
    
    if (this.teamConfig) {
      const winnerPlayer = this.players[this.finishOrder[0]];
      this.winningTeamId = winnerPlayer.teamId ?? null;
    } else {
      this.winningTeamId = null;
    }
    
    // 记录累积分数
    if (this.finalRankings && this.finishOrder.length > 0) {
      const gameEndTime = Date.now();
      cumulativeScoreService.recordGameScore(
        this.gameId,
        this.gameStartTime,
        gameEndTime,
        this.players,
        this.finalRankings,
        this.finishOrder,
        this.finishOrder[0]
      );
    }
    
    this.triggerUpdate();
    return true;
  }
}
```

---

### 修改点3：队友接风逻辑添加结束检查

**位置**：`src/utils/Game.ts:628-664`

**完整修改**：见上文"决策6"的实现代码

---

### 修改点4：处理findNextPlayerForNewRound返回null的情况

**位置**：`src/utils/Game.ts:1178-1213`

**当前代码**：
```typescript
if (nextPlayerIndex !== null) {
  // 创建新轮次
} else {
  // 只触发更新
  this.triggerUpdate();
}
```

**需要修改为**：
```typescript
if (nextPlayerIndex !== null) {
  // 创建新轮次，继续游戏
  const newRound = Round.createNew(...);
  this.addRound(newRound);
  await this.playNextTurn(nextPlayerIndex);
} else {
  // 【新增】nextPlayerIndex为null有两种情况：
  // 1. 所有玩家都出完（个人模式）- 游戏已在上面结束
  // 2. 整个团队出完（团队模式）- 需要在这里结束游戏
  
  // 检查游戏是否已经结束
  if (this.status !== GameStatus.FINISHED) {
    // 还没结束，触发游戏结束逻辑
    // 这种情况发生在队友接风时
    
    // 处理被关的玩家
    if (this.teamConfig) {
      const unfinishedPlayers = this.players.filter(p => p.hand.length > 0);
      
      unfinishedPlayers.sort((a, b) => {
        if (a.hand.length !== b.hand.length) {
          return a.hand.length - b.hand.length;
        }
        return a.id - b.id;
      });
      
      unfinishedPlayers.forEach(p => {
        if (!this.finishOrder.includes(p.id)) {
          this.addToFinishOrder(p.id);
        }
      });
    }
    
    // 结束游戏
    this.updateStatus(GameStatus.FINISHED);
    this.calculateFinalRankings();
    this.setWinner(this.finishOrder[0]);
    
    if (this.teamConfig) {
      const winnerPlayer = this.players[this.finishOrder[0]];
      this.winningTeamId = winnerPlayer.teamId ?? null;
    }
  }
  
  this.triggerUpdate();
}
```

---

## 📝 代码修改文件清单

| 文件 | 修改内容 | 优先级 |
|------|---------|--------|
| `src/utils/Game.ts` | 添加winningTeamId字段 | ⚠️⚠️⚠️ |
| `src/utils/Game.ts` | 修改游戏结束判定（line 976-1045） | ⚠️⚠️⚠️ |
| `src/utils/Game.ts` | 修改队友接风逻辑（line 628-664） | ⚠️⚠️ |
| `src/utils/Game.ts` | 处理null返回值（line 1178-1213） | ⚠️⚠️ |
| `tests/teamScoring.test.ts` | 修复API调用 | ⚠️ |
| `tests/teamScoring.test.ts` | 添加新测试 | ⚠️ |

---

## ✅ 验证清单

### 团队模式游戏结束
- [ ] 团队A全部出完，游戏正确结束
- [ ] 团队B被关，玩家正确加入finishOrder
- [ ] 被关玩家按手牌数量排序
- [ ] finishedRank正确设定
- [ ] winningTeamId正确设置

### 关单场景
- [ ] 1个玩家被关
- [ ] 被关玩家finishedRank = playerCount
- [ ] 关单惩罚正确计算（-30分）
- [ ] 分数转移正确

### 关双场景
- [ ] 2个玩家被关
- [ ] 被关玩家按手牌数量排序
- [ ] finishedRank正确（3和4，不是都是4）
- [ ] 关双惩罚正确计算（各-15分）
- [ ] 分数转移正确

### 队友接风
- [ ] 队友优先接风
- [ ] 队友出完后检查团队状态
- [ ] 团队全部出完时返回null
- [ ] 游戏正确结束

### 个人模式（回归测试）
- [ ] 个人模式不受影响
- [ ] 游戏结束判定仍然正确
- [ ] finishOrder和finishedRank正确

---

## 🚀 开始实施

**准备工作**：
- ✅ 所有设计决策已确认
- ✅ 实施方案已明确
- ✅ 代码修改点已标注
- ✅ 验证清单已准备

**下一步**：
1. 开始修改代码
2. 运行测试验证
3. 完善文档

---

**决策确认人**：用户  
**文档编写人**：AI Assistant  
**状态**：✅ 决策完成，准备实施

