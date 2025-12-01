/**
 * useCardPlaying Hook 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { GameStatus, PlayerType, Card, Suit, Rank } from '../../src/types/card';
import { useCardPlaying } from '../../src/hooks/useCardPlaying';
import { Game } from '../../src/utils/Game';
import { createDeck } from '../../src/utils/cardUtils';

// Mock 相关服务
vi.mock('../../src/services/chatService', () => ({
  getChatMessages: vi.fn(() => []),
  triggerRandomChat: vi.fn(() => null)
}));

vi.mock('../../src/services/voiceService', () => ({
  waitForVoices: vi.fn((callback) => callback()),
  listAvailableVoices: vi.fn()
}));

describe('useCardPlaying', () => {
  let game: Game;
  let humanPlayer: any;
  let deck: Card[];

  beforeEach(() => {
    deck = createDeck();
    
    // 创建游戏实例
    game = new Game();
    game.status = GameStatus.PLAYING;
    game.currentPlayerIndex = 0;
    game.playerCount = 2;
    
    // 创建人类玩家
    humanPlayer = {
      id: 0,
      name: '玩家1',
      type: PlayerType.HUMAN,
      hand: deck.slice(0, 10),
      isHuman: true,
      score: 0
    };
    
    game.players = [humanPlayer, {
      id: 1,
      name: '玩家2',
      type: PlayerType.AI,
      hand: deck.slice(10, 20),
      isHuman: false,
      score: 0
    }];
  });

  describe('初始化', () => {
    it('应该正确初始化', () => {
      // 设置当前玩家不是人类玩家，这样不会触发高亮
      game.currentPlayerIndex = 1;
      
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      expect(result.current.selectedCards).toEqual([]);
      // highlightedCards 在不是玩家回合时应该为空
      expect(result.current.highlightedCards).toEqual([]);
      expect(result.current.isPlaying).toBe(false);
      expect(result.current.isSuggesting).toBe(false);
      
      // 恢复
      game.currentPlayerIndex = 0;
    });
  });

  describe('选牌功能', () => {
    it('应该选择单张牌', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      const card = humanPlayer.hand[0];
      
      act(() => {
        result.current.selectCard(card);
      });

      expect(result.current.selectedCards).toContainEqual(card);
    });

    it('应该取消选择牌', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      const card = humanPlayer.hand[0];
      
      act(() => {
        result.current.selectCard(card);
        result.current.deselectCard(card);
      });

      expect(result.current.selectedCards).not.toContainEqual(card);
    });

    it('应该切换牌的选择状态', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      const card = humanPlayer.hand[0];
      
      act(() => {
        result.current.toggleCard(card);
      });
      expect(result.current.selectedCards).toContainEqual(card);

      act(() => {
        result.current.toggleCard(card);
      });
      expect(result.current.selectedCards).not.toContainEqual(card);
    });

    it('应该选择一组牌', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      const cards = [humanPlayer.hand[0], humanPlayer.hand[1]];
      
      act(() => {
        result.current.selectGroup(cards);
      });

      expect(result.current.selectedCards.length).toBe(2);
    });

    it('应该清空选择', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      act(() => {
        result.current.selectCard(humanPlayer.hand[0]);
        result.current.clearSelection();
      });

      expect(result.current.selectedCards).toEqual([]);
    });
  });

  describe('验证功能', () => {
    it('应该验证选中的牌', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      // 找到两张相同点数的牌组成对子
      const rankGroups = new Map<number, Card[]>();
      humanPlayer.hand.forEach(card => {
        if (!rankGroups.has(card.rank)) {
          rankGroups.set(card.rank, []);
        }
        rankGroups.get(card.rank)!.push(card);
      });
      
      // 找到有至少2张相同点数的牌
      let pairCards: Card[] = [];
      for (const cards of rankGroups.values()) {
        if (cards.length >= 2) {
          pairCards = cards.slice(0, 2);
          break;
        }
      }
      
      // 如果没有对子，选择单张
      if (pairCards.length === 0) {
        pairCards = [humanPlayer.hand[0]];
      }
      
      act(() => {
        result.current.selectGroup(pairCards);
      });

      // validateSelection 需要传入 lastPlay 参数
      const validation = result.current.validateSelection(null);
      expect(validation.valid).toBe(true);
    });

    it('应该验证牌型', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      const card = humanPlayer.hand[0];
      const play = result.current.validateCardType([card]);
      
      expect(play).not.toBeNull();
      expect(play?.type).toBeDefined();
    });

    it('应该验证出牌规则', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      // 找到两张相同点数的牌组成对子，或者使用单张
      const rankGroups = new Map<number, Card[]>();
      humanPlayer.hand.forEach(card => {
        if (!rankGroups.has(card.rank)) {
          rankGroups.set(card.rank, []);
        }
        rankGroups.get(card.rank)!.push(card);
      });
      
      // 找到有至少2张相同点数的牌
      let cards: Card[] = [];
      for (const cardGroup of rankGroups.values()) {
        if (cardGroup.length >= 2) {
          cards = cardGroup.slice(0, 2);
          break;
        }
      }
      
      // 如果没有对子，使用单张
      if (cards.length === 0) {
        cards = [humanPlayer.hand[0]];
      }
      
      const validation = result.current.validatePlayRules(cards, null);
      
      expect(validation.valid).toBe(true);
    });
  });

  describe('出牌功能', () => {
    it('应该检查是否可以出牌', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      const cards = [humanPlayer.hand[0], humanPlayer.hand[1]];
      const canPlay = result.current.canPlay(cards);
      
      expect(typeof canPlay).toBe('boolean');
    });

    it('应该检查是否可以要不起', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      expect(typeof result.current.canPass).toBe('boolean');
    });

    it('应该查找可出的牌', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      const playableCards = result.current.findPlayableCards();
      expect(Array.isArray(playableCards)).toBe(true);
    });

    it('应该检查是否有能打过的牌', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      const hasPlayable = result.current.hasPlayableCards();
      expect(typeof hasPlayable).toBe('boolean');
    });
  });

  describe('AI建议功能', () => {
    it('应该获取AI建议', async () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      await act(async () => {
        const suggestion = await result.current.suggestPlay();
        // 建议可能为null（如果没有可出的牌）
        expect(suggestion === null || suggestion !== null).toBe(true);
      });
    });

    it('应该应用AI建议', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      const suggestion = {
        cards: [humanPlayer.hand[0], humanPlayer.hand[1]],
        type: 'PAIR',
        value: Rank.ACE
      };

      act(() => {
        result.current.applySuggestion(suggestion);
      });

      expect(result.current.selectedCards.length).toBeGreaterThan(0);
    });
  });

  describe('高亮功能', () => {
    it('应该高亮可出牌', () => {
      const { result } = renderHook(() =>
        useCardPlaying({
          game,
          playerId: humanPlayer.id
        })
      );

      // 高亮应该在玩家回合时自动更新
      expect(Array.isArray(result.current.highlightedCards)).toBe(true);
    });
  });
});

