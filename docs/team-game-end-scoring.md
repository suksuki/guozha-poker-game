# 团队模式游戏结束分数计算流程

**最后更新**：2024-12-03  
**状态**：已实现并测试通过

---

## 游戏结束判定（新增）

### 判定规则 ✅
**某个团队的所有队员都出完牌 → 游戏立即结束**

**实现位置**：`src/utils/Game.ts:983-1020`

```typescript
if (this.teamConfig) {
  // 团队模式：检查是否有整个团队出完
  for (const team of this.teamConfig.teams) {
    const teamAllFinished = team.players.every(
      pid => this.players[pid].hand.length === 0
    );
    
    if (teamAllFinished) {
      shouldEndGame = true;
      break;
    }
  }
}
```

### 被关玩家处理 ✅
**排序规则**：按手牌数量排序（手牌少的排名更前）

**实现**：
```typescript
const unfinishedPlayers = this.players.filter(p => p.hand.length > 0);

unfinishedPlayers.sort((a, b) => {
  if (a.hand.length !== b.hand.length) {
    return a.hand.length - b.hand.length; // 手牌少的在前
  }
  return a.id - b.id; // 相同时按ID
});

unfinishedPlayers.forEach(p => {
  this.addToFinishOrder(p.id);
});
```

**finishedRank设定**：严格按finishOrder中的位置

### 获胜团队记录 ✅
**新增字段**：`Game.winningTeamId: number | null`

```typescript
// 游戏结束时设置
if (this.teamConfig) {
  const winnerPlayer = this.players[this.finishOrder[0]];
  this.winningTeamId = winnerPlayer.teamId ?? null;
}
```

---

## 分数计算步骤

### 第1步：计算每个玩家的游戏过程分数
- 手牌分：wonRounds 累加
- 墩分：(自己墩 × 30 × 其他玩家数) - (别人总墩 × 30)
- **游戏过程总分** = 手牌分 + 墩分

### 第2步：分数转移（只转移手牌分）
1. **最后一名惩罚**：最后一名的手牌分 → 第一名
2. **包揽奖励**（如果第一、二名在同一团队）：
   - 落后团队所有手牌分 → 第一名
   - 排除已在最后一名惩罚中转移的
3. **第二名保留**：第二名保留自己的手牌分

### 第3步：计算每个玩家的最终分数
```
玩家最终分数 = 手牌分（转移后） + 墩分 - 100（基本分）
```

### 第4步：计算团队最终分数
```
团队最终分数 = Σ(队员最终分数)
```

### 第5步：应用团队规则
- 获胜团队：+30分
- 失败团队：-30分

### 第6步：验证
- 所有玩家最终分数之和 = 0
- 所有团队最终分数之和 = 0

## 示例

### 初始状态（游戏结束时）
- 玩家0：手牌分20，墩6个（墩分=180×3-9×30=540-270=270）
- 玩家1：手牌分10，墩3个
- 玩家2：手牌分5，墩4个
- 玩家3：手牌分8，墩2个

### 分数转移
- 最后一名（玩家3）的手牌分8 → 玩家0
- 包揽奖励（假设玩家0、2同队）：玩家1的手牌分10 → 玩家0

转移后手牌分：
- 玩家0：20 + 8 + 10 = 38
- 玩家1：0
- 玩家2：5
- 玩家3：0

### 最终分数
- 玩家0：38 + 270 - 100 = 208
- 玩家1：0 + 墩分 - 100
- 玩家2：5 + 墩分 - 100
- 玩家3：0 + 墩分 - 100

团队分数：
- 团队0：玩家0 + 玩家2 + 30（获胜）
- 团队1：玩家1 + 玩家3 - 30（失败）

总和验证：
- 所有玩家总分 = 手牌分总和（捡到的400分，已转移） + 墩分总和（0，零和博弈） - 400（基本分） + 30 - 30（最终规则） = 0 ✅

---

## 实现状态

✅ **已完成** (2024-12-03)
- 游戏结束判定（团队全部出完）
- 被关玩家排序（按手牌数量）
- finishedRank设定（按位置）
- winningTeamId字段
- 队友接风逻辑
- 所有测试通过

📄 **相关文档**：
- `docs/review/game-end-flow-review.md` - 完整Review
- `docs/review/team-mode-decisions-final.md` - 设计决策
- `docs/review/team-mode-implementation-complete.md` - 实施报告

