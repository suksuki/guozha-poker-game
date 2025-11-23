/**
 * 卡牌叠放显示测试
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PlayerHandGrouped } from '../src/components/game/PlayerHandGrouped';
import { Card, Suit, Rank } from '../src/types/card';

describe('卡牌叠放显示', () => {
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

    // 应该显示分组标题
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('8')).toBeInTheDocument(); // 数量徽章

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

    render(
      <PlayerHandGrouped
        groupedHand={groupedHand}
        selectedCards={[]}
        expandedRanks={new Set()}
        onCardClick={() => {}}
        onToggleExpand={() => {}}
      />
    );

    // 检查叠放项
    const stackItems = document.querySelectorAll('.card-stack-item');
    expect(stackItems.length).toBe(5);

    // 检查每张牌的偏移量
    stackItems.forEach((item, index) => {
      const style = window.getComputedStyle(item as HTMLElement);
      const transform = style.transform;
      const expectedOffset = -index * 40;
      
      // transform 应该是 translateY(${expectedOffset}px)
      expect(transform).toContain(`translateY(${expectedOffset}px)`);
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

    // 展开时应该显示 card-group-content，而不是 card-stack
    const stack = document.querySelector('.card-stack');
    const content = document.querySelector('.card-group-content');
    
    expect(stack).not.toBeInTheDocument();
    expect(content).toBeInTheDocument();
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

    render(
      <PlayerHandGrouped
        groupedHand={groupedHand}
        selectedCards={[]}
        expandedRanks={new Set()}
        onCardClick={() => {}}
        onToggleExpand={() => {}}
      />
    );

    const stackItems = document.querySelectorAll('.card-stack-item');
    
    stackItems.forEach((item, index) => {
      const style = window.getComputedStyle(item as HTMLElement);
      const zIndex = parseInt(style.zIndex || '0');
      const expectedZIndex = cards.length - index;
      
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

    // 应该显示两个分组
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();

    // 应该有两个叠放容器
    const stacks = document.querySelectorAll('.card-stack');
    expect(stacks.length).toBe(2);
  });
});

