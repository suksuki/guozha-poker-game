# 发牌体验优化计划

## 📋 需求分析

### 当前问题
1. **发牌体验不够真实**：当前只是模拟效果，没有真实抓牌的感觉
2. **缺少理牌过程**：发牌后没有自动整理排序的动画
3. **手牌显示不直观**：人类玩家看不到卡牌在牌桌上的实际显示效果
4. **发牌速度固定**：无法调整发牌间隔速度

### 用户期望
1. **真实抓牌体验**：像玩家自己抓牌一样，一张一张累积起来（比如1张10，两张...最后发完有10个）
2. **理牌动画**：发的牌一张一张整理好，可以按照从小到大排列，或者按照数字从3到2到大小王排列
3. **实际效果展示**：真实玩家可以看到卡牌在牌桌上显示的实际效果（和游戏中的手牌显示一致）
4. **可配置速度**：发牌间隔速度可以设置
5. **理牌聊天触发**：在理牌过程中触发聊天机制，比如要抓到墩了、超大牌、牌好小很失望等

## 🎯 功能设计

### 1. 真实发牌体验
- **手牌累积显示**：在发牌过程中，人类玩家的手牌区域实时显示已发的牌
- **数量递增动画**：显示"1张10"、"2张10"..."10张10"这样的累积过程
- **使用真实手牌组件**：使用和游戏中一致的手牌显示组件（`PlayerHandGrouped`）

### 2. 理牌动画
- **自动排序**：发牌过程中，每发一张牌后自动按照指定规则排序
- **排序规则选项**：
  - 从小到大（3, 4, 5...K, A, 2, 小王, 大王）
  - 从大到小（大王, 小王, 2, A, K...5, 4, 3）
  - 按数字分组（3, 3, 3...10, 10, 10...）
- **平滑动画**：排序时使用平滑的过渡动画，让玩家看到理牌过程

### 5. 理牌过程中的聊天触发
- **炸弹/墩检测**：理牌过程中检测是否形成炸弹（4-6张相同）或墩（7张及以上相同）
- **超大牌检测**：检测是否抓到超大牌（大王、小王、2、A等）
- **小牌失望**：检测手牌整体质量，如果都是小牌则触发失望反应
- **聊天触发时机**：
  - 形成炸弹时："哇，有炸弹了！"
  - 形成墩时："要抓到墩了！太爽了！"
  - 抓到超大牌时："好牌！"、"这把有戏！"
  - 手牌质量差时："牌好小..."、"这把难了"、"运气不好"
- **智能触发**：避免过于频繁，根据概率和手牌状态智能触发

### 3. 实际效果展示
- **集成真实手牌组件**：在发牌动画中使用 `PlayerHandGrouped` 组件显示人类玩家的手牌
- **实时更新**：每发一张牌，手牌区域实时更新显示
- **完整视觉体验**：玩家可以看到和游戏中完全一致的手牌显示效果

### 4. 可配置发牌速度
- **速度设置选项**：
  - 快速（50ms/张）
  - 正常（150ms/张）
  - 慢速（300ms/张）
  - 自定义（50-1000ms可调）
- **配置位置**：在 `GameConfigPanel` 中添加发牌速度选择器

## 🏗️ 技术实现方案

### 阶段1：重构发牌动画组件
**文件**：`src/components/game/DealingAnimation.tsx`

**改动**：
1. 移除当前的小预览卡片显示
2. 为人类玩家集成 `PlayerHandGrouped` 组件
3. 实时更新人类玩家的手牌显示
4. 添加手牌累积计数显示（"1张10"、"2张10"等）

### 阶段2：实现理牌动画和聊天触发
**文件**：
- `src/components/game/DealingAnimation.tsx`
- `src/utils/cardSorting.ts` (新建)
- `src/types/chat.ts`
- `src/services/chatService.ts`

**改动**：
1. 创建 `cardSorting.ts` 工具文件，实现不同的排序算法
2. 在发牌过程中，每发一张牌后自动排序
3. 使用 CSS transition 实现平滑的排序动画
4. 添加排序规则配置选项
5. 添加新的聊天事件类型：`DEALING_BOMB_FORMED`、`DEALING_DUN_FORMED`、`DEALING_HUGE_CARD`、`DEALING_POOR_HAND`
6. 在理牌过程中检测炸弹/墩、超大牌、手牌质量
7. 实现智能聊天触发逻辑

### 阶段3：添加发牌速度配置
**文件**：
- `src/components/game/GameConfigPanel.tsx`
- `src/hooks/useGameConfig.ts`
- `src/components/game/DealingAnimation.tsx`

**改动**：
1. 在 `useGameConfig` 中添加 `dealingSpeed` 状态
2. 在 `GameConfigPanel` 中添加速度选择器
3. 在 `DealingAnimation` 中使用配置的速度值

### 阶段4：优化视觉效果
**文件**：
- `src/components/game/DealingAnimation.css`
- `src/components/game/DealingAnimation.tsx`

**改动**：
1. 优化手牌区域的布局和样式
2. 添加理牌动画的 CSS 过渡效果
3. 优化累积计数的显示样式

## 📝 详细实现步骤

### Step 1: 添加新的聊天事件类型
```typescript
// src/types/chat.ts
export enum ChatEventType {
  // ... 现有类型
  DEALING_BOMB_FORMED = 'dealing_bomb_formed', // 理牌时形成炸弹
  DEALING_DUN_FORMED = 'dealing_dun_formed',   // 理牌时形成墩
  DEALING_HUGE_CARD = 'dealing_huge_card',     // 理牌时抓到超大牌
  DEALING_POOR_HAND = 'dealing_poor_hand'      // 理牌时手牌质量差
}
```

### Step 2: 创建排序工具函数
```typescript
// src/utils/cardSorting.ts
export type SortOrder = 'asc' | 'desc' | 'grouped';
export function sortCards(cards: Card[], order: SortOrder): Card[];
```

### Step 3: 创建理牌聊天触发函数
```typescript
// src/services/chatService.ts
async triggerSortingReaction(
  player: Player, 
  hand: Card[], 
  newlyDealtCard: Card,
  context?: ChatContext
): Promise<void> {
  // 检测炸弹/墩
  const rankGroups = groupCardsByRank(hand);
  for (const [rank, cards] of rankGroups) {
    if (cards.length >= 7) {
      await this.triggerEventChat(player, ChatEventType.DEALING_DUN_FORMED, context);
      return;
    } else if (cards.length >= 4) {
      await this.triggerEventChat(player, ChatEventType.DEALING_BOMB_FORMED, context);
      return;
    }
  }
  
  // 检测超大牌
  if (newlyDealtCard.suit === Suit.JOKER || 
      newlyDealtCard.rank === Rank.TWO || 
      newlyDealtCard.rank === Rank.ACE) {
    await this.triggerEventChat(player, ChatEventType.DEALING_HUGE_CARD, context);
    return;
  }
  
  // 评估手牌质量（如果手牌已经发了一半以上）
  if (hand.length >= 20) {
    const handValue = evaluateHandValue(hand);
    if (handValue < threshold) {
      await this.triggerEventChat(player, ChatEventType.DEALING_POOR_HAND, context);
    }
  }
}
```

### Step 4: 重构 DealingAnimation 组件
- 移除 `player-cards-preview` 显示
- 为人类玩家添加真实的手牌显示区域
- 集成 `PlayerHandGrouped` 组件
- 实现实时手牌更新逻辑

### Step 5: 添加理牌动画和聊天触发
- 每发一张牌后，触发排序
- 使用 React state 管理排序状态
- 添加 CSS transition 实现平滑动画
- 在排序后调用 `triggerSortingReaction` 检测并触发聊天
- 检测炸弹/墩：使用 `getCardType` 函数检测手牌中是否有炸弹或墩
- 检测超大牌：检测是否抓到大小王、2、A等
- 评估手牌质量：计算手牌整体价值，判断是否是小牌
- 触发聊天：根据检测结果触发相应的聊天事件（避免过于频繁）

### Step 6: 添加速度配置
- 在配置面板添加速度选择器
- 传递速度配置到 DealingAnimation
- 使用配置的速度值控制发牌间隔

### Step 7: 优化UI/UX
- 调整布局，确保手牌显示清晰
- 添加累积计数显示
- 优化动画效果

## 🧪 测试计划

1. **单元测试**：
   - 测试排序函数的各种排序规则
   - 测试发牌速度配置

2. **集成测试**：
   - 测试发牌动画与手牌显示的集成
   - 测试理牌动画的流畅性

3. **用户体验测试**：
   - 验证发牌体验的真实感
   - 验证理牌动画的视觉效果
   - 验证不同速度下的体验

## 📊 预期效果

1. **发牌体验**：玩家可以看到自己的手牌一张一张累积，就像真实抓牌一样
2. **理牌过程**：每发一张牌后，手牌自动整理排序，动画流畅自然
3. **视觉效果**：手牌显示和游戏中完全一致，玩家可以提前看到自己的牌型
4. **可配置性**：玩家可以根据自己的喜好调整发牌速度
5. **聊天互动**：理牌过程中，玩家会因为抓到好牌而兴奋，因为牌差而失望，增强游戏趣味性

## ⚠️ 注意事项

1. **性能优化**：理牌动画可能涉及大量 DOM 操作，需要注意性能
2. **状态管理**：确保发牌状态和游戏状态的正确同步
3. **兼容性**：确保新的手牌显示组件在不同屏幕尺寸下正常显示
4. **用户体验**：理牌动画不应该太慢，影响游戏体验
5. **聊天频率控制**：理牌过程中的聊天触发需要控制频率，避免过于频繁影响体验
6. **检测准确性**：炸弹/墩检测需要准确，避免误判
7. **手牌质量评估**：需要合理的手牌质量评估算法，准确判断手牌好坏

## 🎨 UI/UX 设计要点

1. **手牌区域**：应该占据足够的空间，清晰显示所有手牌
2. **累积计数**：可以显示在每张牌上，或者显示在分组标题上
3. **理牌动画**：应该平滑自然，让玩家感受到理牌的过程
4. **速度控制**：提供直观的速度选择器，让玩家快速调整
5. **聊天显示**：理牌过程中的聊天应该及时显示，但不要遮挡手牌区域
6. **触发时机**：聊天触发应该自然，在合适的时机（如形成炸弹、抓到好牌时）触发

