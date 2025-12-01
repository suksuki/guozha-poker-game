# 打牌系统重构 - 集成指南

## 📋 概述

本文档说明如何将新的 `useCardPlaying` Hook 集成到现有组件中，替换旧的 `usePlayerHand` 和 `useGameActions`。

## 🎯 集成步骤

### 步骤1: 替换选牌逻辑

**旧代码** (使用 `usePlayerHand`):
```typescript
import { usePlayerHand } from '../hooks/usePlayerHand';

const { selectedCards, handleCardClick, clearSelectedCards } = usePlayerHand(game);
```

**新代码** (使用 `useCardPlaying`):
```typescript
import { useCardPlaying } from '../hooks/useCardPlaying';

const humanPlayer = game.players.find(p => p.isHuman);
const cardPlaying = useCardPlaying({
  game,
  playerId: humanPlayer?.id || 0
});

// 使用 cardPlaying.selectedCards 替代 selectedCards
// 使用 cardPlaying.toggleCard 替代 handleCardClick
// 使用 cardPlaying.clearSelection 替代 clearSelectedCards
```

### 步骤2: 替换出牌逻辑

**旧代码** (使用 `useGameActions`):
```typescript
import { useGameActions } from '../hooks/useGameActions';

const gameActions = useGameActions({
  game,
  humanPlayer,
  selectedCards,
  clearSelectedCards,
  strategy: 'balanced',
  algorithm: 'mcts'
});

// 使用 gameActions.handlePlay() 出牌
// 使用 gameActions.handlePass() 要不起
// 使用 gameActions.handleSuggestPlay() 获取AI建议
```

**新代码** (使用 `useCardPlaying`):
```typescript
const cardPlaying = useCardPlaying({
  game,
  playerId: humanPlayer?.id || 0
});

// 使用 cardPlaying.playCards(selectedCards) 出牌
// 使用 cardPlaying.passCards() 要不起
// 使用 cardPlaying.suggestPlay() 获取AI建议
```

### 步骤3: 更新组件

#### CompactHandCards 组件

**旧代码**:
```typescript
<CompactHandCards
  groupedHand={groupedHand}
  selectedCards={selectedCards}
  onCardClick={handleCardClick}
/>
```

**新代码**:
```typescript
<CompactHandCards
  groupedHand={groupedHand}
  selectedCards={cardPlaying.selectedCards}
  onCardClick={(card) => cardPlaying.toggleCard(card)}
  highlightedCards={cardPlaying.highlightedCards} // 新增：高亮可出牌
/>
```

#### ActionButtons 组件

**旧代码**:
```typescript
<ActionButtons
  isPlayerTurn={isPlayerTurn}
  canPass={gameActions.canPass}
  selectedCardsCount={selectedCards.length}
  isSuggesting={gameActions.isSuggesting}
  onPlay={gameActions.handlePlay}
  onPass={gameActions.handlePass}
  onSuggest={gameActions.handleSuggestPlay}
/>
```

**新代码**:
```typescript
<ActionButtons
  isPlayerTurn={isPlayerTurn}
  canPass={cardPlaying.canPass}
  selectedCardsCount={cardPlaying.selectedCards.length}
  isSuggesting={cardPlaying.isSuggesting}
  onPlay={() => cardPlaying.playCards(cardPlaying.selectedCards)}
  onPass={cardPlaying.passCards}
  onSuggest={async () => {
    const suggestion = await cardPlaying.suggestPlay();
    if (suggestion) {
      cardPlaying.applySuggestion(suggestion);
    }
  }}
/>
```

## 🔄 完整示例

### 示例1: 简单的集成

```typescript
import { useCardPlaying } from '../hooks/useCardPlaying';
import { SimplifiedHandCards } from './game/SimplifiedHandCards';
import { ActionButtons } from './game/ActionButtons';

function GameComponent({ game }: { game: Game }) {
  const humanPlayer = game.players.find(p => p.isHuman);
  
  if (!humanPlayer) return null;
  
  const cardPlaying = useCardPlaying({
    game,
    playerId: humanPlayer.id
  });

  return (
    <>
      <SimplifiedHandCards
        groupedHand={groupedHand}
        selectedCards={cardPlaying.selectedCards}
        highlightedCards={cardPlaying.highlightedCards}
        onCardClick={(card) => cardPlaying.toggleCard(card)}
      />
      
      <ActionButtons
        isPlayerTurn={game.currentPlayerIndex === humanPlayer.id}
        canPass={cardPlaying.canPass}
        selectedCardsCount={cardPlaying.selectedCards.length}
        isSuggesting={cardPlaying.isSuggesting}
        onPlay={async () => {
          const result = await cardPlaying.playCards(cardPlaying.selectedCards);
          if (!result.success) {
            alert(result.error || '出牌失败');
          }
        }}
        onPass={cardPlaying.passCards}
        onSuggest={async () => {
          const suggestion = await cardPlaying.suggestPlay();
          if (suggestion) {
            cardPlaying.applySuggestion(suggestion);
          }
        }}
      />
    </>
  );
}
```

### 示例2: 带验证的集成

```typescript
function GameComponent({ game }: { game: Game }) {
  const humanPlayer = game.players.find(p => p.isHuman);
  const cardPlaying = useCardPlaying({
    game,
    playerId: humanPlayer?.id || 0
  });

  const handlePlay = async () => {
    // 先验证
    const validation = cardPlaying.validateSelection();
    if (!validation.valid) {
      alert(validation.error || '选牌不合法');
      return;
    }

    // 再出牌
    const result = await cardPlaying.playCards(cardPlaying.selectedCards);
    if (!result.success) {
      alert(result.error || '出牌失败');
    }
  };

  return (
    <ActionButtons
      onPlay={handlePlay}
      // ... 其他 props
    />
  );
}
```

### 示例3: 使用多个AI建议

```typescript
function GameComponent({ game }: { game: Game }) {
  const cardPlaying = useCardPlaying({
    game,
    playerId: humanPlayer.id
  });

  const handleMultipleSuggestions = async () => {
    const suggestions = await cardPlaying.suggestMultiple([
      { strategy: 'aggressive' },
      { strategy: 'conservative' },
      { strategy: 'balanced' }
    ]);

    // 显示多个建议供用户选择
    if (suggestions.length > 0) {
      // 应用第一个建议
      cardPlaying.applySuggestion(suggestions[0]);
    }
  };

  return (
    <button onClick={handleMultipleSuggestions}>
      获取多个AI建议
    </button>
  );
}
```

## ✅ 迁移检查清单

### 选牌功能
- [ ] 替换 `usePlayerHand` 为 `useCardPlaying`
- [ ] 更新 `selectedCards` 的获取方式
- [ ] 更新 `handleCardClick` 为 `toggleCard`
- [ ] 更新 `clearSelectedCards` 为 `clearSelection`
- [ ] 添加 `highlightedCards` 支持（可选，但推荐）

### 出牌功能
- [ ] 替换 `useGameActions` 为 `useCardPlaying`
- [ ] 更新 `handlePlay` 为 `playCards`
- [ ] 更新 `handlePass` 为 `passCards`
- [ ] 更新 `canPass` 的获取方式
- [ ] 添加错误处理

### AI建议功能
- [ ] 更新 `handleSuggestPlay` 为 `suggestPlay`
- [ ] 使用 `applySuggestion` 应用建议
- [ ] 更新 `isSuggesting` 状态

### 验证功能
- [ ] 使用 `validateSelection` 验证选牌
- [ ] 使用 `validatePlayRules` 验证出牌
- [ ] 使用 `canPlay` 检查是否可以出牌

## 🚨 注意事项

1. **向后兼容**: 新 Hook 与旧代码可以并存，可以逐步迁移
2. **状态同步**: `useCardPlaying` 内部管理选牌状态，不需要外部状态
3. **错误处理**: 新 Hook 返回详细的错误信息，需要适当处理
4. **性能**: 新 Hook 使用了 `useMemo` 和 `useCallback` 优化性能

## 📚 相关文档

- [详细设计文档](./card-playing-system-refactor.md)
- [实施步骤文档](./card-playing-implementation-steps.md)
- [API 文档](../../src/services/cardPlaying/README.md)

