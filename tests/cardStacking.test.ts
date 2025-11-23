/**
 * 卡牌叠放显示测试
 */

import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { PlayerHandGrouped } from '../src/components/game/PlayerHandGrouped';
import { Card, Suit, Rank } from '../src/types/card';

describe('卡牌叠放显示', () => {
  afterEach(() => {
    cleanup();
  });

  const createCard = (suit: Suit, rank: Rank, id: string): Card => ({
    suit,
    rank,
    id
  });

  it('应该显示叠放的卡牌', () => {
    const groupedHand = new Map<number, Card[]>();
    const cards: Card[] = [
      createCard(Suit.HEARTS, Rank.SIX, '1'),
      createCard(Suit.SPADES, Rank.SIX, '2'),
      createCard(Suit.DIAMONDS, Rank.SIX, '3'),
      createCard(Suit.CLUBS, Rank.SIX, '4'),
      createCard(Suit.HEARTS, Rank.SIX, '5'),
      createCard(Suit.SPADES, Rank.SIX, '6'),
      createCard(Suit.DIAMONDS, Rank.SIX, '7'),
      createCard(Suit.CLUBS, Rank.SIX, '8')
    ];
    groupedHand.set(Rank.SIX, cards);

    render(
      <PlayerHandGrouped
        groupedHand={groupedHand}
        selectedCards={[]}
        expandedRanks={new Set()}
        onCardClick={() => {}}
        onToggleExpand={() => {}}
      />
    );

    // 应该显示分组标题（可能有多个6，使用getAllByText）
    expect(screen.getAllByText('6').length).toBeGreaterThan(0);
    // 应该显示数量徽章（8张牌）
    const countBadge = document.querySelector('.card-count-badge');
    expect(countBadge).toBeInTheDocument();
    expect(countBadge?.textContent).toBe('8');

    // 应该显示叠放容器
    const stack = document.querySelector('.card-stack');
    expect(stack).toBeInTheDocument();
  });

  it('应该为每张牌设置正确的偏移量', () => {
    const groupedHand = new Map<number, Card[]>();
    const cards: Card[] = Array.from({ length: 5 }, (_, i) =>
      createCard(Suit.HEARTS, Rank.TEN, `card-${i}`)
    );
    groupedHand.set(Rank.TEN, cards);

    const { container } = render(
      <PlayerHandGrouped
        groupedHand={groupedHand}
        selectedCards={[]}
        expandedRanks={new Set()}
        onCardClick={() => {}}
        onToggleExpand={() => {}}
      />
    );

    // 检查叠放项（只检查当前容器的stack items）
    const stackItems = container.querySelectorAll('.card-stack-item');
    // 应该只有5张牌（Rank.TEN的5张牌）
    expect(stackItems.length).toBe(5);

    // 检查每张牌的偏移量
    // 组件使用 index * 40，然后 translateY(-${stackOffset}px)
    // 所以第一张牌（index=0）是 translateY(-0px)，第二张是 translateY(-40px)
    stackItems.forEach((item, index) => {
      const style = window.getComputedStyle(item as HTMLElement);
      const transform = style.transform;
      const expectedOffset = index * 40; // 组件使用的是 index * 40
      
      // transform 应该是 translateY(-${expectedOffset}px)，处理-0px的情况
      if (expectedOffset === 0) {
        expect(transform).toMatch(/translateY\(-?0px\)/);
      } else {
        expect(transform).toContain(`translateY(-${expectedOffset}px)`);
      }
    });
  });

  it('展开时应该显示所有牌（不叠放）', () => {
    const groupedHand = new Map<number, Card[]>();
    const cards: Card[] = [
      createCard(Suit.HEARTS, Rank.FIVE, '1'),
      createCard(Suit.SPADES, Rank.FIVE, '2'),
      createCard(Suit.DIAMONDS, Rank.FIVE, '3')
    ];
    groupedHand.set(Rank.FIVE, cards);

    render(
      <PlayerHandGrouped
        groupedHand={groupedHand}
        selectedCards={[]}
        expandedRanks={new Set([Rank.FIVE])}
        onCardClick={() => {}}
        onToggleExpand={() => {}}
      />
    );

    // 展开时应该显示 card-group-content，card-stack应该被隐藏（通过条件渲染）
    const stacks = document.querySelectorAll('.card-stack');
    const contents = document.querySelectorAll('.card-group-content');
    
    // 对于展开的rank，不应该有card-stack（因为!isExpanded为false）
    // 应该有card-group-content
    expect(contents.length).toBeGreaterThan(0);
    // 由于可能有其他未展开的rank，我们只检查当前rank的stack是否不存在
    // 实际上，由于只有Rank.FIVE且已展开，所以不应该有stack
    const fiveStacks = Array.from(stacks).filter(stack => {
      const group = stack.closest('.card-group');
      return group && group.querySelector('.card-group-content');
    });
    expect(fiveStacks.length).toBe(0);
  });

  it('应该根据牌的数量调整叠放容器高度', () => {
    const groupedHand = new Map<number, Card[]>();
    const cards: Card[] = Array.from({ length: 8 }, (_, i) =>
      createCard(Suit.HEARTS, Rank.SEVEN, `card-${i}`)
    );
    groupedHand.set(Rank.SEVEN, cards);

    render(
      <PlayerHandGrouped
        groupedHand={groupedHand}
        selectedCards={[]}
        expandedRanks={new Set()}
        onCardClick={() => {}}
        onToggleExpand={() => {}}
      />
    );

    const stack = document.querySelector('.card-stack') as HTMLElement;
    expect(stack).toBeInTheDocument();
    
    // 高度应该是 84 + (8-1) * 40 = 364px
    const expectedHeight = 84 + (8 - 1) * 40;
    expect(stack.style.height).toBe(`${expectedHeight}px`);
  });

  it('应该正确设置 z-index', () => {
    const groupedHand = new Map<number, Card[]>();
    const cards: Card[] = Array.from({ length: 4 }, (_, i) =>
      createCard(Suit.HEARTS, Rank.EIGHT, `card-${i}`)
    );
    groupedHand.set(Rank.EIGHT, cards);

    const { container } = render(
      <PlayerHandGrouped
        groupedHand={groupedHand}
        selectedCards={[]}
        expandedRanks={new Set()}
        onCardClick={() => {}}
        onToggleExpand={() => {}}
      />
    );

    const stackItems = container.querySelectorAll('.card-stack-item');
    expect(stackItems.length).toBe(4); // 应该有4张牌
    
    // 组件使用 zIndex: index + 1（第一张牌z-index=1，第二张z-index=2...）
    stackItems.forEach((item, index) => {
      const style = window.getComputedStyle(item as HTMLElement);
      const zIndex = parseInt(style.zIndex || '0');
      const expectedZIndex = index + 1; // 组件使用的是 index + 1
      
      expect(zIndex).toBe(expectedZIndex);
    });
  });

  it('应该处理多个不同rank的叠放', () => {
    const groupedHand = new Map<number, Card[]>();
    
    // 5个3
    groupedHand.set(Rank.THREE, Array.from({ length: 5 }, (_, i) =>
      createCard(Suit.HEARTS, Rank.THREE, `three-${i}`)
    ));
    
    // 3个4
    groupedHand.set(Rank.FOUR, Array.from({ length: 3 }, (_, i) =>
      createCard(Suit.HEARTS, Rank.FOUR, `four-${i}`)
    ));

    render(
      <PlayerHandGrouped
        groupedHand={groupedHand}
        selectedCards={[]}
        expandedRanks={new Set()}
        onCardClick={() => {}}
        onToggleExpand={() => {}}
      />
    );

    // 应该显示两个分组（可能有多个匹配，使用getAllByText）
    expect(screen.getAllByText('3').length).toBeGreaterThan(0);
    expect(screen.getAllByText('4').length).toBeGreaterThan(0);

    // 应该有两个叠放容器
    const stacks = document.querySelectorAll('.card-stack');
    expect(stacks.length).toBe(2);
  });
});

