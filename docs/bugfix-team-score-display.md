# Bug 修复：团队游戏结束后分数不显示

## 修复日期
2025-12-03

## 问题描述

用户报告：团队游戏结束后，查看排名界面：
- ❌ 没有显示团队分数
- ❌ 没有显示清算分数（手牌分转移、关单/关双惩罚等）
- ❌ 看起来游戏没有感知到这是团队模式

## 根本原因

在 `src/utils/gameController.ts` 的 `calculateFinalScoresAndRankings()` 方法中：

```typescript
// 团队模式处理
const teamResult = applyTeamFinalRules(
  this.game.teamConfig.teams,
  this.game.finishOrder,
  this.game.players,
  this.game.teamConfig
);

// 只更新了团队配置和排名
this.game.teamConfig.teams = teamResult.teams;
this.game.updateTeamRankings(teamResult.rankings);

// ❌ 问题：没有更新 this.game.players
// teamResult.finalPlayers 包含了清算后的分数（finalScore, adjustedHandScore）
// 但这些数据没有被应用到 game.players
```

### 数据流

```
applyTeamFinalRules()
  ↓
返回 { teams, rankings, finalPlayers }
  ↓
finalPlayers 包含：
  - player.finalScore (清算后的最终分数)
  - player.adjustedHandScore (转移后的手牌分)
  - player.score (原始手牌分，保持不变)
  ↓
❌ 这些数据没有更新到 game.players
  ↓
TeamResultScreen 读取 game.players
  ↓
❌ 没有 finalScore 和 adjustedHandScore
  ↓
❌ 显示为空或默认值
```

## 修复方案

在 `src/utils/gameController.ts:318` 添加玩家数据更新：

```typescript
// 更新团队分数
this.game.teamConfig.teams = teamResult.teams;

// 更新团队排名
this.game.updateTeamRankings(teamResult.rankings);

// ✅ 修复：更新玩家数据（包含清算后的分数）
this.game.players = teamResult.finalPlayers;
```

同时修改返回值：

```typescript
return {
  updatedPlayers: teamResult.finalPlayers,  // ✅ 返回更新后的玩家数据
  finalRankings: [],
  teamRankings: teamResult.rankings
};
```

## 修复后的数据流

```
applyTeamFinalRules()
  ↓
返回 { teams, rankings, finalPlayers }
  ↓
✅ 更新 game.players = finalPlayers
  ↓
TeamResultScreen 读取 game.players
  ↓
✅ 读取到 finalScore 和 adjustedHandScore
  ↓
✅ 正确显示清算分数
```

## 清算分数显示

### 团队总分
- 所有队员的 `finalScore` 相加
- `finalScore = (adjustedHandScore + dunScore) - 100`

### 队员详细分数
对每个队员显示：
1. **原始手牌分** (`player.score`)
2. **转移后手牌分** (`player.adjustedHandScore`)
   - 如果与原始不同，显示为 "→ 转移后: X"
3. **墩分** (`dunScore`)
4. **最终分数** (`finalScore`)
   - 红色：负分
   - 绿色：正分

## 验证

### 测试场景1：正常结束
```
4人团队模式
- 玩家0(你) 和 玩家2 是队友
- 玩家1 和 玩家3 是队友

结束顺序: [0, 1, 2, 3]
- 第一名：玩家0 (你的团队)
- 最后一名：玩家3 (对手团队)

预期显示：
- 团队1总分：正数（你的团队获胜）
- 团队2总分：负数（对手团队）
- 每个队员都显示清算分数
```

### 测试场景2：关单
```
结束顺序: [0, 1, 2]
- 玩家3 未出完 (关单)

预期显示：
- 玩家3的手牌分转移给玩家0
- 玩家3扣30分，玩家0加30分
- 玩家3的剩余分牌给玩家1
- 团队分数正确计算
```

### 测试场景3：关双
```
结束顺序: [0, 1]
- 玩家2 和 玩家3 未出完 (关双)

预期显示：
- 玩家2和3的手牌分都转移给玩家0
- 玩家2和3各扣15分，玩家0加30分
- 玩家2和3的剩余分牌给玩家1
- 团队分数正确计算
```

## 相关文件

- `src/utils/gameController.ts` - 修复位置
- `src/utils/teamScoring.ts` - 团队分数计算逻辑
- `src/components/game/TeamResultScreen.tsx` - 结果显示UI
- `docs/team-game-end-scoring.md` - 团队清算规则文档

## 影响范围

- ✅ 团队模式游戏结束后的分数显示
- ✅ TeamResultScreen 组件的数据来源
- ❌ 不影响个人模式
- ❌ 不影响游戏进行中的逻辑

## 回归风险

低风险：
- 只修改了团队模式的数据更新逻辑
- 个人模式的代码路径完全独立
- 现有测试应该能捕获任何回归问题

