# 简化选牌系统设计

## 📋 当前问题分析

### 问题1: 操作复杂
- 需要展开牌组才能选择
- 需要点击单张卡片
- 容易误选或漏选
- 界面状态混乱（展开/收起状态）

### 问题2: 逻辑复杂
- 需要跟踪每张Card对象的id
- 需要处理展开/收起状态
- 需要处理单张卡片的选择状态
- 状态同步容易出错

### 问题3: 不符合游戏特性
- **关键点**: 游戏没有花色区别，只有点数区别
- 实际上只需要选择"某个点数要出几张"
- 不需要关心具体是哪张Card对象

## 🎯 简化方案设计

### 核心思路
**按点数选择张数，而不是选择具体的Card对象**

### 数据结构设计

```typescript
// 新的选牌状态：按点数记录选择的张数
interface RankSelection {
  rank: number;      // 点数（3-17）
  count: number;     // 选择的张数
}

// 选牌状态：Map<rank, count>
type SelectionState = Map<number, number>;
```

### UI设计

#### 方案A: 加减按钮（推荐）
```
┌─────────────────────────────┐
│  9  [−]  3  [+]  (共7张)    │
│  ┌─────────────────────┐   │
│  │  [9] [9] [9]        │   │  ← 显示选中的牌（可选）
│  └─────────────────────┘   │
└─────────────────────────────┘
```

#### 方案B: 滑块
```
┌─────────────────────────────┐
│  9  [━━━━━━●━━━━]  3/7      │
└─────────────────────────────┘
```

#### 方案C: 直接输入
```
┌─────────────────────────────┐
│  9  [___3___] / 7           │
└─────────────────────────────┘
```

**推荐方案A**，因为：
- 操作直观
- 移动端友好
- 不需要精确输入

### 交互设计

#### 基本操作
1. **点击 + 按钮**: 增加该点数的选择张数
2. **点击 - 按钮**: 减少该点数的选择张数
3. **快速选择**: 双击可以快速选择全部或清空

#### 智能提示
- 高亮可出牌的点数组合
- 显示当前选择的牌型（如果有）
- 显示是否合法

#### 视觉反馈
- 已选择的点数：高亮显示
- 选择数量：显示在按钮旁边
- 可出牌提示：绿色边框或背景

## 💻 实现方案

### 1. 新的Hook设计

```typescript
// src/hooks/useSimplifiedCardSelection.ts

interface UseSimplifiedCardSelectionResult {
  // 选牌状态：Map<rank, count>
  selection: Map<number, number>;
  
  // 操作函数
  selectRank: (rank: number, count: number) => void;
  increaseRank: (rank: number) => void;
  decreaseRank: (rank: number) => void;
  toggleRank: (rank: number) => void;  // 切换：全选/全不选
  clearSelection: () => void;
  
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
  // 选牌状态：Map<rank, count>
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
  
  // 增加某个点数的选择
  const increaseRank = useCallback((rank: number) => {
    setSelection(prev => {
      const newSelection = new Map(prev);
      const currentCount = newSelection.get(rank) || 0;
      const maxCount = groupedHand.get(rank)?.length || 0;
      
      if (currentCount < maxCount) {
        newSelection.set(rank, currentCount + 1);
      }
      return newSelection;
    });
  }, [groupedHand]);
  
  // 减少某个点数的选择
  const decreaseRank = useCallback((rank: number) => {
    setSelection(prev => {
      const newSelection = new Map(prev);
      const currentCount = newSelection.get(rank) || 0;
      
      if (currentCount > 0) {
        if (currentCount === 1) {
          newSelection.delete(rank);
        } else {
          newSelection.set(rank, currentCount - 1);
        }
      }
      return newSelection;
    });
  }, []);
  
  // 切换：全选/全不选
  const toggleRank = useCallback((rank: number) => {
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
  
  // 直接设置某个点数的选择数量
  const selectRank = useCallback((rank: number, count: number) => {
    setSelection(prev => {
      const newSelection = new Map(prev);
      const maxCount = groupedHand.get(rank)?.length || 0;
      const clampedCount = Math.max(0, Math.min(count, maxCount));
      
      if (clampedCount === 0) {
        newSelection.delete(rank);
      } else {
        newSelection.set(rank, clampedCount);
      }
      return newSelection;
    });
  }, [groupedHand]);
  
  // 清空选择
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
    selectRank,
    increaseRank,
    decreaseRank,
    toggleRank,
    clearSelection,
    getSelectedCards,
    validateSelection,
    getPlayableRanks
  };
}
```

### 2. 新的组件设计

```typescript
// src/components/game/SimplifiedHandCards.tsx

interface SimplifiedHandCardsProps {
  groupedHand: Map<number, Card[]>;
  selection: Map<number, number>;
  playableRanks: number[];
  onIncrease: (rank: number) => void;
  onDecrease: (rank: number) => void;
  onToggle: (rank: number) => void;
}

export const SimplifiedHandCards: React.FC<SimplifiedHandCardsProps> = ({
  groupedHand,
  selection,
  playableRanks,
  onIncrease,
  onDecrease,
  onToggle
}) => {
  const getRankDisplay = (rank: number): string => {
    const rankMap: { [key: number]: string } = {
      3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
      11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
      16: '小', 17: '大'
    };
    return rankMap[rank] || String(rank);
  };
  
  const sortedRanks = useMemo(() => {
    return Array.from(groupedHand.keys()).sort((a, b) => a - b);
  }, [groupedHand]);
  
  return (
    <div className="simplified-hand-container">
      {sortedRanks.map(rank => {
        const cards = groupedHand.get(rank) || [];
        const totalCount = cards.length;
        const selectedCount = selection.get(rank) || 0;
        const isPlayable = playableRanks.includes(rank);
        const rankDisplay = getRankDisplay(rank);
        
        return (
          <div
            key={rank}
            className={`simplified-rank-group ${selectedCount > 0 ? 'has-selected' : ''} ${isPlayable ? 'playable' : ''}`}
          >
            {/* 点数标签 */}
            <div className="rank-label">{rankDisplay}</div>
            
            {/* 控制按钮 */}
            <div className="rank-controls">
              <button
                className="btn-decrease"
                onClick={() => onDecrease(rank)}
                disabled={selectedCount === 0}
                title="减少"
              >
                −
              </button>
              
              <div className="count-display">
                <span className="selected-count">{selectedCount}</span>
                <span className="total-count">/ {totalCount}</span>
              </div>
              
              <button
                className="btn-increase"
                onClick={() => onIncrease(rank)}
                disabled={selectedCount >= totalCount}
                title="增加"
              >
                +
              </button>
            </div>
            
            {/* 快速选择按钮（双击全选/全不选） */}
            <button
              className="btn-toggle"
              onClick={() => onToggle(rank)}
              title={selectedCount === totalCount ? "取消全选" : "全选"}
            >
              {selectedCount === totalCount ? "全不选" : "全选"}
            </button>
            
            {/* 可选：显示选中的牌（预览） */}
            {selectedCount > 0 && (
              <div className="selected-preview">
                {cards.slice(0, selectedCount).map((card, index) => (
                  <CardComponent
                    key={card.id}
                    card={card}
                    selected={true}
                    size="small"
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

### 3. 样式设计

```css
/* src/components/game/SimplifiedHandCards.css */

.simplified-hand-container {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 16px;
}

.simplified-rank-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid #ddd;
  border-radius: 8px;
  background: white;
  min-width: 120px;
  transition: all 0.2s;
}

.simplified-rank-group.has-selected {
  border-color: #4CAF50;
  background: #f0f8f0;
}

.simplified-rank-group.playable {
  border-color: #2196F3;
  box-shadow: 0 0 8px rgba(33, 150, 243, 0.3);
}

.rank-label {
  font-size: 24px;
  font-weight: bold;
  color: #333;
}

.rank-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.btn-decrease,
.btn-increase {
  width: 36px;
  height: 36px;
  border: 2px solid #ddd;
  border-radius: 50%;
  background: white;
  font-size: 24px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-decrease:hover:not(:disabled),
.btn-increase:hover:not(:disabled) {
  background: #f0f0f0;
  border-color: #999;
}

.btn-decrease:disabled,
.btn-increase:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.count-display {
  display: flex;
  align-items: baseline;
  gap: 4px;
  min-width: 50px;
  text-align: center;
}

.selected-count {
  font-size: 20px;
  font-weight: bold;
  color: #4CAF50;
}

.total-count {
  font-size: 14px;
  color: #999;
}

.btn-toggle {
  padding: 6px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  background: white;
  cursor: pointer;
  font-size: 12px;
  transition: all 0.2s;
}

.btn-toggle:hover {
  background: #f0f0f0;
}

.selected-preview {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  max-width: 100%;
}
```

## ✅ 优势分析

### 1. 操作简化
- ✅ 不需要展开/收起
- ✅ 不需要点击单张卡片
- ✅ 只需要点击 + / - 按钮
- ✅ 操作直观明了

### 2. 逻辑简化
- ✅ 状态简单：只需要 Map<rank, count>
- ✅ 不需要跟踪Card对象id
- ✅ 不需要处理展开状态
- ✅ 状态同步简单

### 3. 符合游戏特性
- ✅ 游戏没有花色区别
- ✅ 只需要选择点数张数
- ✅ 更符合实际游戏逻辑

### 4. 用户体验提升
- ✅ 操作更快
- ✅ 不容易出错
- ✅ 界面更清晰
- ✅ 移动端友好

## 🔄 迁移方案

### 阶段1: 并行运行
- 保留旧的选牌系统
- 添加新的简化选牌系统
- 通过配置切换

### 阶段2: 逐步迁移
- 默认使用新的简化选牌系统
- 保留旧系统作为备选
- 收集用户反馈

### 阶段3: 完全替换
- 移除旧的选牌系统
- 只保留新的简化选牌系统

## 📊 对比

| 特性 | 当前系统 | 简化系统 |
|------|---------|---------|
| 操作步骤 | 展开→点击多张卡片 | 点击 + / - 按钮 |
| 状态复杂度 | 高（Card对象数组） | 低（Map<rank, count>） |
| 界面复杂度 | 高（展开/收起） | 低（直接显示） |
| 错误率 | 高 | 低 |
| 移动端友好 | 中 | 高 |
| 符合游戏特性 | 中 | 高 |

## 🎯 实施建议

### 优先级
1. **高优先级**: 实现基本的加减按钮功能
2. **中优先级**: 添加快速选择（全选/全不选）
3. **低优先级**: 添加预览、智能提示等增强功能

### 实施步骤
1. 创建 `useSimplifiedCardSelection` Hook
2. 创建 `SimplifiedHandCards` 组件
3. 集成到 `MultiPlayerGameBoard`
4. 添加配置选项（新旧系统切换）
5. 测试和优化
6. 收集反馈
7. 完全替换

## 💬 讨论要点

1. **UI设计**: 是否采用加减按钮方案？还是有其他更好的方案？
2. **预览功能**: 是否需要显示选中的牌预览？
3. **智能提示**: 是否需要高亮可出牌的点数？
4. **快速操作**: 是否需要快捷键支持？
5. **移动端**: 是否需要特殊的移动端优化？

