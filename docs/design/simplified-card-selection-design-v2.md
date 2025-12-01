# 简化选牌系统设计 V2（最终方案）

## 📋 需求确认

1. ✅ **点击增加**: 不需要加减按钮，直接点击点数就增加选择数量（可以取消）
2. ✅ **小预览**: 显示当前选取的牌，叠放效果，不需要花色（如6个9显示6张9叠在一起），可以取消
3. ✅ **智能高亮**: 高亮可出牌的点数
4. ✅ **双击全选**: 双击可以全选/全不选该点数

## 🎯 设计方案

### UI布局

```
┌─────────────────────────────────────────────┐
│  点数区域（可点击，高亮可出牌）              │
│  ┌─────┐  ┌─────┐  ┌─────┐  ┌─────┐        │
│  │  9  │  │ 10 │  │  J  │  │  Q  │  ...   │
│  │ (7) │  │ (5)│  │ (3) │  │ (2) │        │
│  └─────┘  └─────┘  └─────┘  └─────┘        │
│    ↑        ↑        ↑        ↑            │
│  点击增加  点击增加  点击增加  点击增加     │
│  双击全选  双击全选  双击全选  双击全选     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  选中预览区域（叠放效果）                   │
│  ┌─────┐  ┌─────┐  ┌─────┐                │
│  │  9  │  │  9  │  │ 10  │  ...           │
│  │  9  │  │  9  │  │ 10  │                │
│  │  9  │  │  9  │  │     │                │
│  │  9  │  │     │  │     │                │
│  └─────┘  └─────┘  └─────┘                │
│    ×6       ×4       ×2                    │
│  [取消]   [取消]   [取消]                  │
└─────────────────────────────────────────────┘
```

### 交互设计

#### 1. 点数区域
- **单击**: 增加该点数的选择数量（如果已选满，则取消选择）
- **双击**: 全选/全不选该点数
- **视觉反馈**:
  - 可出牌的点数：绿色边框/背景高亮
  - 已选择的点数：显示选择数量，背景色变化
  - 未选择的点数：正常显示

#### 2. 预览区域
- **显示**: 选中的牌以叠放效果显示（不需要花色）
- **取消**: 每个预览卡片组有取消按钮
- **叠放效果**: 同点数的牌叠在一起，显示数量

## 💻 实现方案

### 1. Hook设计

```typescript
// src/hooks/useSimplifiedCardSelection.ts

interface UseSimplifiedCardSelectionResult {
  // 选牌状态：Map<rank, count>
  selection: Map<number, number>;
  
  // 操作函数
  clickRank: (rank: number) => void;        // 单击：增加选择
  doubleClickRank: (rank: number) => void;  // 双击：全选/全不选
  cancelRank: (rank: number) => void;       // 取消某个点数的选择
  clearSelection: () => void;               // 清空所有选择
  
  // 获取选中的Card对象（用于出牌）
  getSelectedCards: () => Card[];
  
  // 验证和提示
  validateSelection: () => ValidationResult;
  getPlayableRanks: () => number[];  // 可出牌的点数
}

export function useSimplifiedCardSelection(
  game: Game,
  humanPlayer: Player | undefined
): UseSimplifiedCardSelectionResult {
  const [selection, setSelection] = useState<Map<number, number>>(new Map());
  
  // 按点数分组的手牌
  const groupedHand = useMemo(() => {
    if (!humanPlayer) return new Map<number, Card[]>();
    const groups = new Map<number, Card[]>();
    humanPlayer.hand.forEach(card => {
      const rank = card.rank;
      if (!groups.has(rank)) {
        groups.set(rank, []);
      }
      groups.get(rank)!.push(card);
    });
    return groups;
  }, [humanPlayer?.hand]);
  
  // 单击：增加选择（如果已选满，则取消）
  const clickRank = useCallback((rank: number) => {
    setSelection(prev => {
      const newSelection = new Map(prev);
      const currentCount = newSelection.get(rank) || 0;
      const maxCount = groupedHand.get(rank)?.length || 0;
      
      if (currentCount >= maxCount) {
        // 已选满，取消选择
        newSelection.delete(rank);
      } else {
        // 增加选择
        newSelection.set(rank, currentCount + 1);
      }
      return newSelection;
    });
  }, [groupedHand]);
  
  // 双击：全选/全不选
  const doubleClickRank = useCallback((rank: number) => {
    setSelection(prev => {
      const newSelection = new Map(prev);
      const currentCount = newSelection.get(rank) || 0;
      const maxCount = groupedHand.get(rank)?.length || 0;
      
      if (currentCount === maxCount) {
        // 全选 → 全不选
        newSelection.delete(rank);
      } else {
        // 全不选 → 全选
        newSelection.set(rank, maxCount);
      }
      return newSelection;
    });
  }, [groupedHand]);
  
  // 取消某个点数的选择
  const cancelRank = useCallback((rank: number) => {
    setSelection(prev => {
      const newSelection = new Map(prev);
      newSelection.delete(rank);
      return newSelection;
    });
  }, []);
  
  // 清空所有选择
  const clearSelection = useCallback(() => {
    setSelection(new Map());
  }, []);
  
  // 获取选中的Card对象（用于出牌）
  const getSelectedCards = useCallback((): Card[] => {
    const selectedCards: Card[] = [];
    const hand = humanPlayer?.hand || [];
    
    selection.forEach((count, rank) => {
      const cardsOfRank = hand.filter(c => c.rank === rank);
      // 选择前count张（不需要关心具体是哪张，因为没花色区别）
      selectedCards.push(...cardsOfRank.slice(0, count));
    });
    
    return selectedCards;
  }, [selection, humanPlayer?.hand]);
  
  // 验证选择
  const validateSelection = useCallback((): ValidationResult => {
    const selectedCards = getSelectedCards();
    // 使用现有的验证逻辑
    return validateCardSelection(selectedCards, game);
  }, [getSelectedCards, game]);
  
  // 获取可出牌的点数
  const getPlayableRanks = useCallback((): number[] => {
    const lastPlay = getLastPlay(game);
    const hand = humanPlayer?.hand || [];
    
    // 使用现有的findPlayableCards逻辑
    const playableCards = findPlayableCards(hand, lastPlay);
    
    // 提取可出牌的点数
    const playableRanks = new Set<number>();
    playableCards.forEach(cards => {
      cards.forEach(card => {
        playableRanks.add(card.rank);
      });
    });
    
    return Array.from(playableRanks);
  }, [game, humanPlayer?.hand]);
  
  return {
    selection,
    clickRank,
    doubleClickRank,
    cancelRank,
    clearSelection,
    getSelectedCards,
    validateSelection,
    getPlayableRanks
  };
}
```

### 2. 组件设计

```typescript
// src/components/game/SimplifiedHandCards.tsx

import React, { useMemo, useCallback, useState } from 'react';
import { Card } from '../../types/card';
import { CardComponent } from '../CardComponent';
import { useSimplifiedCardSelection } from '../../hooks/useSimplifiedCardSelection';
import { Game } from '../../utils/Game';
import './SimplifiedHandCards.css';

interface SimplifiedHandCardsProps {
  game: Game;
  humanPlayer: Player | undefined;
}

export const SimplifiedHandCards: React.FC<SimplifiedHandCardsProps> = ({
  game,
  humanPlayer
}) => {
  const {
    selection,
    clickRank,
    doubleClickRank,
    cancelRank,
    clearSelection,
    getSelectedCards,
    getPlayableRanks
  } = useSimplifiedCardSelection(game, humanPlayer);
  
  // 按点数分组的手牌
  const groupedHand = useMemo(() => {
    if (!humanPlayer) return new Map<number, Card[]>();
    const groups = new Map<number, Card[]>();
    humanPlayer.hand.forEach(card => {
      const rank = card.rank;
      if (!groups.has(rank)) {
        groups.set(rank, []);
      }
      groups.get(rank)!.push(card);
    });
    return groups;
  }, [humanPlayer?.hand]);
  
  const playableRanks = getPlayableRanks();
  const sortedRanks = useMemo(() => {
    return Array.from(groupedHand.keys()).sort((a, b) => a - b);
  }, [groupedHand]);
  
  const getRankDisplay = (rank: number): string => {
    const rankMap: { [key: number]: string } = {
      3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
      11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
      16: '小', 17: '大'
    };
    return rankMap[rank] || String(rank);
  };
  
  // 处理单击（延迟处理，用于区分单击和双击）
  const [clickTimers, setClickTimers] = useState<Map<number, NodeJS.Timeout>>(new Map());
  
  const handleRankClick = useCallback((rank: number) => {
    const timer = setTimeout(() => {
      clickRank(rank);
      setClickTimers(prev => {
        const newTimers = new Map(prev);
        newTimers.delete(rank);
        return newTimers;
      });
    }, 300); // 300ms延迟，用于区分单击和双击
    
    setClickTimers(prev => {
      const newTimers = new Map(prev);
      const existingTimer = newTimers.get(rank);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      newTimers.set(rank, timer);
      return newTimers;
    });
  }, [clickRank]);
  
  const handleRankDoubleClick = useCallback((rank: number) => {
    // 清除单击定时器
    const timer = clickTimers.get(rank);
    if (timer) {
      clearTimeout(timer);
      setClickTimers(prev => {
        const newTimers = new Map(prev);
        newTimers.delete(rank);
        return newTimers;
      });
    }
    
    // 执行双击操作
    doubleClickRank(rank);
  }, [doubleClickRank, clickTimers]);
  
  // 获取预览数据（按点数分组的选择）
  const previewData = useMemo(() => {
    const preview: Array<{ rank: number; count: number; cards: Card[] }> = [];
    const hand = humanPlayer?.hand || [];
    
    selection.forEach((count, rank) => {
      const cardsOfRank = hand.filter(c => c.rank === rank);
      if (cardsOfRank.length > 0) {
        preview.push({
          rank,
          count,
          cards: cardsOfRank.slice(0, count)
        });
      }
    });
    
    return preview.sort((a, b) => a.rank - b.rank);
  }, [selection, humanPlayer?.hand]);
  
  return (
    <div className="simplified-hand-wrapper">
      {/* 点数选择区域 */}
      <div className="rank-selection-area">
        <div className="rank-selection-grid">
          {sortedRanks.map(rank => {
            const cards = groupedHand.get(rank) || [];
            const totalCount = cards.length;
            const selectedCount = selection.get(rank) || 0;
            const isPlayable = playableRanks.includes(rank);
            const rankDisplay = getRankDisplay(rank);
            const hasSelected = selectedCount > 0;
            
            return (
              <div
                key={rank}
                className={`rank-item ${hasSelected ? 'has-selected' : ''} ${isPlayable ? 'playable' : ''}`}
                onClick={() => handleRankClick(rank)}
                onDoubleClick={() => handleRankDoubleClick(rank)}
                title={`单击增加选择，双击全选/全不选 (${totalCount}张)`}
              >
                <div className="rank-label">{rankDisplay}</div>
                <div className="rank-count">
                  {hasSelected ? (
                    <span className="selected-count">{selectedCount}</span>
                  ) : (
                    <span className="total-count">{totalCount}</span>
                  )}
                </div>
                {hasSelected && (
                  <div className="selected-indicator">✓</div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* 选中预览区域 */}
      {previewData.length > 0 && (
        <div className="selection-preview-area">
          <div className="preview-header">
            <span>已选择 ({getSelectedCards().length}张)</span>
            <button
              className="btn-clear-all"
              onClick={clearSelection}
              title="清空所有选择"
            >
              清空
            </button>
          </div>
          <div className="preview-cards">
            {previewData.map(({ rank, count, cards }) => {
              const rankDisplay = getRankDisplay(rank);
              const firstCard = cards[0]; // 取第一张作为代表（不需要花色）
              
              return (
                <div
                  key={rank}
                  className="preview-group"
                >
                  <div className="preview-stack">
                    {/* 叠放效果：显示多张牌 */}
                    {cards.map((card, index) => (
                      <div
                        key={card.id}
                        className="preview-card-stacked"
                        style={{
                          transform: `translateY(${-index * 8}px)`,
                          zIndex: index + 1
                        }}
                      >
                        <CardComponent
                          card={firstCard} // 所有牌都显示相同的点数（不需要花色）
                          selected={true}
                          size="small"
                        />
                      </div>
                    ))}
                    {/* 数量标签 */}
                    <div className="preview-count-badge">{count}</div>
                  </div>
                  {/* 取消按钮 */}
                  <button
                    className="btn-cancel-rank"
                    onClick={() => cancelRank(rank)}
                    title={`取消选择 ${rankDisplay}`}
                  >
                    ×
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
```

### 3. 样式设计

```css
/* src/components/game/SimplifiedHandCards.css */

.simplified-hand-wrapper {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 点数选择区域 */
.rank-selection-area {
  width: 100%;
}

.rank-selection-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.rank-item {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-width: 60px;
  min-height: 80px;
  padding: 12px 8px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  user-select: none;
}

.rank-item:hover {
  border-color: #999;
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.rank-item.has-selected {
  border-color: #4CAF50;
  background: #f0f8f0;
}

.rank-item.playable {
  border-color: #2196F3;
  box-shadow: 0 0 12px rgba(33, 150, 243, 0.4);
  animation: playable-pulse 2s infinite;
}

@keyframes playable-pulse {
  0%, 100% {
    box-shadow: 0 0 12px rgba(33, 150, 243, 0.4);
  }
  50% {
    box-shadow: 0 0 20px rgba(33, 150, 243, 0.6);
  }
}

.rank-label {
  font-size: 28px;
  font-weight: bold;
  color: #333;
  margin-bottom: 4px;
}

.rank-count {
  font-size: 14px;
  color: #666;
}

.rank-count .selected-count {
  color: #4CAF50;
  font-weight: bold;
  font-size: 16px;
}

.rank-count .total-count {
  color: #999;
}

.selected-indicator {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 20px;
  height: 20px;
  background: #4CAF50;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
}

/* 选中预览区域 */
.selection-preview-area {
  border-top: 2px solid #eee;
  padding-top: 16px;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: bold;
  color: #333;
}

.btn-clear-all {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-clear-all:hover {
  background: #f0f0f0;
  border-color: #999;
}

.preview-cards {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}

.preview-group {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.preview-stack {
  position: relative;
  width: 60px;
  height: 84px; /* 根据叠放效果计算 */
}

.preview-card-stacked {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}

.preview-count-badge {
  position: absolute;
  bottom: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  background: #4CAF50;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  z-index: 100;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.btn-cancel-rank {
  width: 24px;
  height: 24px;
  border: 1px solid #ddd;
  border-radius: 50%;
  background: white;
  color: #999;
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-cancel-rank:hover {
  background: #ff4444;
  color: white;
  border-color: #ff4444;
}
```

## ✅ 功能清单

- [x] 单击点数增加选择
- [x] 双击点数全选/全不选
- [x] 选中预览（叠放效果）
- [x] 取消单个点数选择
- [x] 清空所有选择
- [x] 智能高亮可出牌点数
- [x] 显示选择数量
- [x] 不需要花色显示

## 🎯 下一步

1. 实现 `useSimplifiedCardSelection` Hook
2. 实现 `SimplifiedHandCards` 组件
3. 集成到 `MultiPlayerGameBoard`
4. 测试和优化

