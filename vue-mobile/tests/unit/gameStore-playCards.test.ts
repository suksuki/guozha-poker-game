/**
 * Vue Mobile GameStore - 出牌功能单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '../../src/stores/gameStore';
import type { Card } from '../../../src/types/card';

describe('GameStore - 出牌功能', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  describe('初始化游戏', () => {
    it('应该创建4个玩家', () => {
      const store = useGameStore();
      store.startGame();
      
      expect(store.players.length).toBe(4);
      expect(store.players[0].isHuman).toBe(true);
      expect(store.players[1].isHuman).toBe(false);
      expect(store.players[2].isHuman).toBe(false);
      expect(store.players[3].isHuman).toBe(false);
    });

    it('应该为每个玩家发牌', () => {
      const store = useGameStore();
      store.startGame();
      
      store.players.forEach((player, index) => {
        expect(player.hand.length).toBeGreaterThan(0);
        console.log(`玩家${index} 手牌数: ${player.hand.length}`);
      });
    });

    it('应该创建第一个回合', () => {
      const store = useGameStore();
      store.startGame();
      
      expect(store.gameState?.rounds.length).toBe(1);
      expect(store.currentRound).toBeDefined();
    });

    it('应该设置正确的游戏状态', () => {
      const store = useGameStore();
      expect(store.status).toBe('waiting');
      
      store.startGame();
      expect(store.status).toBe('playing');
    });
  });

  describe('出牌功能', () => {
    it('应该能出单张牌', async () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      const cardToPlay = [humanPlayer.hand[0]];
      
      const initialHandCount = humanPlayer.hand.length;
      const result = await store.playCards(cardToPlay);
      
      expect(result.success).toBe(true);
      expect(store.humanPlayer!.hand.length).toBe(initialHandCount - 1);
    });

    it('应该能出对子', async () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      // 找两张相同点数的牌
      const hand = humanPlayer.hand;
      let pair: Card[] = [];
      
      for (let i = 0; i < hand.length - 1; i++) {
        for (let j = i + 1; j < hand.length; j++) {
          if (hand[i].rank === hand[j].rank) {
            pair = [hand[i], hand[j]];
            break;
          }
        }
        if (pair.length === 2) break;
      }
      
      if (pair.length === 2) {
        const initialHandCount = humanPlayer.hand.length;
        const result = await store.playCards(pair);
        
        expect(result.success).toBe(true);
        expect(store.humanPlayer!.hand.length).toBe(initialHandCount - 2);
      }
    });

    it('出牌后应该移到下一个玩家', () => {
      const store = useGameStore();
      store.startGame();
      
      const initialPlayerIndex = store.currentPlayerIndex;
      const humanPlayer = store.humanPlayer!;
      const cardToPlay = [humanPlayer.hand[0]];
      
      store.playCards(cardToPlay);
      
      expect(store.currentPlayerIndex).not.toBe(initialPlayerIndex);
    });

    it('出牌后应该更新回合数据', () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      const cardToPlay = [humanPlayer.hand[0]];
      
      const initialPlayCount = store.currentRound?.plays.length || 0;
      store.playCards(cardToPlay);
      
      expect(store.currentRound?.plays.length).toBe(initialPlayCount + 1);
      expect(store.currentRound?.lastPlay).toBeDefined();
    });

    it('应该拒绝空牌', async () => {
      const store = useGameStore();
      store.startGame();
      
      const result = await store.playCards([]);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('无效牌型');
    });

    it('应该拒绝无效牌型', async () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      // 尝试出三张不同点数的牌（无效组合）
      const invalidCards = humanPlayer.hand.slice(0, 3).filter((card, index, arr) => 
        arr.findIndex(c => c.rank === card.rank) === index
      );
      
      if (invalidCards.length === 3) {
        const result = await store.playCards(invalidCards);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('不要功能', () => {
    it('首家不能不要', async () => {
      const store = useGameStore();
      store.startGame();
      
      const result = await store.pass();
      
      // 首家出牌时不能不要
      expect(result.success).toBe(false);
    });

    it('有上家出牌后可以不要', async () => {
      const store = useGameStore();
      store.startGame();
      
      // 先出一张牌
      const humanPlayer = store.humanPlayer!;
      await store.playCards([humanPlayer.hand[0]]);
      
      // 现在应该可以不要了（如果是人类玩家的回合）
      if (store.currentPlayerIndex === 0) {
        const result = await store.pass();
        expect(result).toBeDefined();
      }
    });
  });

  describe('游戏结束检测', () => {
    it('玩家出完所有牌后应该记录排名', async () => {
      const store = useGameStore();
      store.startGame();
      
      const humanPlayer = store.humanPlayer!;
      const initialFinishOrder = store.gameState?.finishOrder.length || 0;
      
      // 模拟出完所有牌
      while (humanPlayer.hand.length > 0) {
        const result = await store.playCards([humanPlayer.hand[0]]);
        if (!result.success) break;
      }
      
      if (humanPlayer.hand.length === 0) {
        expect(store.gameState?.finishOrder.length).toBeGreaterThan(initialFinishOrder);
      }
    });
  });

  describe('AI自动出牌', () => {
    it.skip('AI玩家应该自动出牌（需要真实环境测试）', async () => {
      // 此测试需要真实的异步环境，暂时跳过
    });
  });

  describe('托管功能', () => {
    it('应该能开启和关闭托管', () => {
      const store = useGameStore();
      
      expect(store.isAutoPlay).toBe(false);
      
      store.toggleAutoPlay();
      expect(store.isAutoPlay).toBe(true);
      
      store.toggleAutoPlay();
      expect(store.isAutoPlay).toBe(false);
    });

    it.skip('托管时AI应该帮人类玩家出牌（需要真实环境测试）', async () => {
      // 此测试需要真实的异步环境，暂时跳过
    });
  });

  describe('AI推荐', () => {
    it('应该能获取AI推荐', () => {
      const store = useGameStore();
      store.startGame();
      
      const recommendation = store.getAIRecommendation();
      
      // 应该返回推荐或null
      expect(recommendation === null || typeof recommendation === 'object').toBe(true);
      
      if (recommendation) {
        expect(Array.isArray(recommendation.cards)).toBe(true);
      }
    });
  });
});

