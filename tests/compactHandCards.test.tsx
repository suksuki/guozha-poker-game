/**
 * 紧凑型手牌组件测试
 * 测试手牌显示、选择、展开等功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CompactHandCards } from '../src/components/game/CompactHandCards';
import { Card, Suit, Rank } from '../src/types/card';

// Mock CardComponent
vi.mock('../src/components/CardComponent', () => ({
  CardComponent: ({ card, selected, onClick }: any) => (
    <div
      data-testid={`card-${card.id}`}
      data-selected={selected}
      onClick={onClick}
      className={`mock-card ${selected ? 'selected' : ''}`}
    >
      {card.rank}-{card.suit}
    </div>
  )
}));

// Mock i18n
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe('紧凑型手牌组件测试', () => {
  // 创建测试用的卡片
  const createCard = (id: number, rank: number, suit: Suit = Suit.SPADES): Card => ({
    id: `card-${id}`,
    rank: rank as Rank,
    suit,
    type: 'single' as any
  });

  // 创建分组手牌
  const createGroupedHand = (groups: { rank: number; count: number }[]): Map<number, Card[]> => {
    const map = new Map<number, Card[]>();
    let cardId = 1;
    groups.forEach(({ rank, count }) => {
      const cards: Card[] = [];
      for (let i = 0; i < count; i++) {
        cards.push(createCard(cardId++, rank));
      }
      map.set(rank, cards);
    });
    return map;
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('基本渲染', () => {
    it('应该渲染空状态', () => {
      const groupedHand = new Map<number, Card[]>();
      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      expect(container.querySelector('.compact-hand-empty')).toBeTruthy();
    });

    it('应该渲染分组手牌', () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 2 },
        { rank: 5, count: 1 }
      ]);

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      const groups = container.querySelectorAll('.compact-card-group');
      expect(groups.length).toBe(2);
    });

    it('应该按点数排序显示', () => {
      const groupedHand = createGroupedHand([
        { rank: 10, count: 1 },
        { rank: 3, count: 1 },
        { rank: 7, count: 1 }
      ]);

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      const groups = Array.from(container.querySelectorAll('.compact-card-group'));
      // 验证顺序：3, 7, 10
      expect(groups.length).toBe(3);
    });
  });

  describe('紧凑模式显示', () => {
    it('应该显示叠放卡片', () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 3 }
      ]);

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      const stack = container.querySelector('.compact-card-stack');
      expect(stack).toBeTruthy();
    });

    it('应该显示数量徽章（多张牌时）', () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 5 }
      ]);

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      const badge = container.querySelector('.compact-count-badge');
      expect(badge).toBeTruthy();
      expect(badge?.textContent).toBe('5');
    });

    it('不应该显示数量徽章（单张牌时）', () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 1 }
      ]);

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      const badge = container.querySelector('.compact-count-badge');
      expect(badge).toBeFalsy();
    });
  });

  describe('展开/收起功能', () => {
    it('应该能够展开卡片组', async () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 3 }
      ]);

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      // 初始应该是紧凑模式
      expect(container.querySelector('.compact-card-stack')).toBeTruthy();
      expect(container.querySelector('.compact-card-expanded')).toBeFalsy();

      // 点击展开
      const stack = container.querySelector('.compact-card-stack');
      fireEvent.click(stack!);

      await waitFor(() => {
        expect(container.querySelector('.compact-card-expanded')).toBeTruthy();
      });
    });

    it('应该能够收起卡片组', async () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 3 }
      ]);

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      // 先展开
      const stack = container.querySelector('.compact-card-stack');
      fireEvent.click(stack!);

      await waitFor(() => {
        expect(container.querySelector('.compact-card-expanded')).toBeTruthy();
      });

      // 再收起
      const collapseBtn = container.querySelector('.collapse-btn');
      fireEvent.click(collapseBtn!);

      await waitFor(() => {
        expect(container.querySelector('.compact-card-stack')).toBeTruthy();
        expect(container.querySelector('.compact-card-expanded')).toBeFalsy();
      });
    });

    it('展开时应该显示所有卡片', async () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 5 }
      ]);

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      // 展开
      const stack = container.querySelector('.compact-card-stack');
      fireEvent.click(stack!);

      await waitFor(() => {
        const cards = container.querySelectorAll('.expanded-card-item');
        expect(cards.length).toBe(5);
      });
    });

    it('展开时应该显示点数标签和数量', async () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 3 }
      ]);

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      // 展开
      const stack = container.querySelector('.compact-card-stack');
      fireEvent.click(stack!);

      await waitFor(() => {
        const rankLabel = container.querySelector('.rank-label');
        const countLabel = container.querySelector('.count-label');
        expect(rankLabel).toBeTruthy();
        expect(countLabel).toBeTruthy();
        expect(countLabel?.textContent).toContain('3张');
      });
    });
  });

  describe('卡片选择', () => {
    it('应该能够点击卡片选择', () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 2 }
      ]);
      const onCardClick = vi.fn();
      const cards = Array.from(groupedHand.values())[0];

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={onCardClick}
        />
      );

      // 展开以便点击
      const stack = container.querySelector('.compact-card-stack');
      fireEvent.click(stack!);

      waitFor(() => {
        const cardElement = screen.getByTestId(`card-${cards[0].id}`);
        fireEvent.click(cardElement);
        expect(onCardClick).toHaveBeenCalledWith(cards[0]);
      });
    });

    it('应该显示选中状态', () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 2 }
      ]);
      const cards = Array.from(groupedHand.values())[0];
      const selectedCards = [cards[0]];

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={selectedCards}
          onCardClick={vi.fn()}
        />
      );

      // 展开查看
      const stack = container.querySelector('.compact-card-stack');
      fireEvent.click(stack!);

      waitFor(() => {
        const selectedCard = screen.getByTestId(`card-${cards[0].id}`);
        expect(selectedCard.getAttribute('data-selected')).toBe('true');
      });
    });

    it('应该显示选中指示器（紧凑模式）', () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 2 }
      ]);
      const cards = Array.from(groupedHand.values())[0];
      const selectedCards = [cards[0]];

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={selectedCards}
          onCardClick={vi.fn()}
        />
      );

      const indicator = container.querySelector('.selected-indicator');
      expect(indicator).toBeTruthy();
      expect(indicator?.textContent).toBe('1');
    });

    it('应该显示选中数量（展开模式）', async () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 3 }
      ]);
      const cards = Array.from(groupedHand.values())[0];
      const selectedCards = [cards[0], cards[1]];

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={selectedCards}
          onCardClick={vi.fn()}
        />
      );

      // 展开
      const stack = container.querySelector('.compact-card-stack');
      fireEvent.click(stack!);

      await waitFor(() => {
        const selectedLabel = container.querySelector('.selected-label');
        expect(selectedLabel).toBeTruthy();
        expect(selectedLabel?.textContent).toContain('已选2');
      });
    });

    it('选中卡片应该有has-selected类', () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 2 }
      ]);
      const cards = Array.from(groupedHand.values())[0];
      const selectedCards = [cards[0]];

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={selectedCards}
          onCardClick={vi.fn()}
        />
      );

      const group = container.querySelector('.compact-card-group');
      expect(group?.classList.contains('has-selected')).toBe(true);
    });
  });

  describe('悬停效果', () => {
    it('悬停时应该添加hovered类', () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 2 }
      ]);

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      const group = container.querySelector('.compact-card-group');
      
      fireEvent.mouseEnter(group!);
      expect(group?.classList.contains('hovered')).toBe(true);

      fireEvent.mouseLeave(group!);
      expect(group?.classList.contains('hovered')).toBe(false);
    });
  });

  describe('回调函数', () => {
    it('应该调用onToggleExpand回调', () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 2 }
      ]);
      const onToggleExpand = vi.fn();

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
          onToggleExpand={onToggleExpand}
        />
      );

      const stack = container.querySelector('.compact-card-stack');
      fireEvent.click(stack!);

      waitFor(() => {
        expect(onToggleExpand).toHaveBeenCalledWith(3);
      });
    });

    it('onToggleExpand应该是可选的', () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 2 }
      ]);

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      const stack = container.querySelector('.compact-card-stack');
      // 应该不会报错
      expect(() => fireEvent.click(stack!)).not.toThrow();
    });
  });

  describe('多组卡片', () => {
    it('应该能够同时展开多个组', async () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 2 },
        { rank: 5, count: 3 },
        { rank: 7, count: 1 }
      ]);

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      const stacks = container.querySelectorAll('.compact-card-stack');
      expect(stacks.length).toBe(3);

      // 展开第一组
      fireEvent.click(stacks[0]);
      await waitFor(() => {
        expect(container.querySelectorAll('.compact-card-expanded').length).toBe(1);
      });

      // 展开第二组
      fireEvent.click(stacks[1]);
      await waitFor(() => {
        expect(container.querySelectorAll('.compact-card-expanded').length).toBe(2);
      });
    });

    it('应该独立管理每组的展开状态', async () => {
      const groupedHand = createGroupedHand([
        { rank: 3, count: 2 },
        { rank: 5, count: 3 }
      ]);

      const { container } = render(
        <CompactHandCards
          groupedHand={groupedHand}
          selectedCards={[]}
          onCardClick={vi.fn()}
        />
      );

      const stacks = container.querySelectorAll('.compact-card-stack');
      
      // 展开第一组
      fireEvent.click(stacks[0]);
      await waitFor(() => {
        expect(container.querySelectorAll('.compact-card-expanded').length).toBe(1);
      });

      // 收起第一组
      const collapseBtn = container.querySelector('.collapse-btn');
      fireEvent.click(collapseBtn!);
      
      await waitFor(() => {
        expect(container.querySelectorAll('.compact-card-expanded').length).toBe(0);
      });

      // 展开第二组
      fireEvent.click(stacks[1]);
      await waitFor(() => {
        expect(container.querySelectorAll('.compact-card-expanded').length).toBe(1);
      });
    });
  });
});

