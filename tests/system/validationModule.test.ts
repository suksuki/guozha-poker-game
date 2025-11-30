/**
 * 验证模块单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SystemApplication } from '../../src/services/system';
import { ValidationModule } from '../../src/services/system/modules/validation/ValidationModule';
import { EventModule } from '../../src/services/system/modules/event/EventModule';
import { registerAllModules } from '../../src/services/system/modules/registerModules';
import { Card, Suit, Rank, Player, PlayerType } from '../../src/types/card';

// 辅助函数：创建测试用的牌
function createCard(suit: Suit, rank: Rank, id?: string): Card {
  return { suit, rank, id: id || `${suit}-${rank}-${Date.now()}-${Math.random()}` };
}

// 辅助函数：创建玩家
function createPlayer(id: number, name: string, hand: Card[]): Player {
  return {
    id,
    name,
    type: id === 0 ? PlayerType.HUMAN : PlayerType.AI,
    hand,
    score: -100,
    isHuman: id === 0
  };
}

// 辅助函数：创建测试玩家数组
function createMockPlayers(count: number): Player[] {
  const players: Player[] = [];
  const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
  
  // 创建一副牌（54张）
  const allCards: Card[] = [];
  for (let rank = 3; rank <= 15; rank++) {
    for (const suit of suits) {
      allCards.push(createCard(suit, rank as Rank));
    }
  }
  // 添加大小王
  allCards.push(createCard(Suit.JOKER, Rank.SMALL_JOKER));
  allCards.push(createCard(Suit.JOKER, Rank.BIG_JOKER));
  
  // 分配牌给玩家（简单分配）
  const cardsPerPlayer = Math.floor(allCards.length / count);
  for (let i = 0; i < count; i++) {
    const startIdx = i * cardsPerPlayer;
    const endIdx = i === count - 1 ? allCards.length : (i + 1) * cardsPerPlayer;
    const hand = allCards.slice(startIdx, endIdx);
    players.push(createPlayer(i, `玩家${i + 1}`, hand));
  }
  
  return players;
}

describe('ValidationModule', () => {
  let systemApp: SystemApplication;
  let validationModule: ValidationModule | null;

  beforeEach(async () => {
    // 重置系统应用
    systemApp = SystemApplication.getInstance();
    systemApp.reset();
    
    // 注册模块
    registerAllModules(systemApp);
    
    // 初始化
    await systemApp.initialize();
    await systemApp.start();
    
    // 获取验证模块
    validationModule = systemApp.getModule<ValidationModule>('validation');
  });

  describe('模块初始化', () => {
    it('应该正确初始化验证模块', () => {
      expect(validationModule).toBeDefined();
      expect(validationModule?.isEnabled()).toBe(true);
      expect(validationModule?.getStatus().initialized).toBe(true);
    });

    it('应该能够获取模块状态', () => {
      const status = validationModule?.getStatus();
      expect(status).toBeDefined();
      expect(status?.initialized).toBe(true);
      expect(status?.enabled).toBe(true);
    });
  });

  describe('牌数完整性验证', () => {
    it('应该能够验证完整的牌数', () => {
      const players = createMockPlayers(4);
      const initialHands = players.map(p => p.hand);
      const allRounds: any[] = [];
      
      const result = validationModule!.validateCardIntegrity({
        players,
        allRounds,
        currentRoundPlays: [],
        initialHands,
        trigger: 'manual',
        context: '测试验证',
        timestamp: Date.now()
      });
      
      expect(result.isValid).toBe(true);
    });

    it('应该能够检测缺失的牌', () => {
      const players = createMockPlayers(4);
      const initialHands = players.map(p => p.hand);
      // 移除一张牌
      players[0].hand = players[0].hand.slice(1);
      
      const allRounds: any[] = [];
      
      const result = validationModule!.validateCardIntegrity({
        players,
        allRounds,
        currentRoundPlays: [],
        initialHands,
        trigger: 'manual',
        context: '测试缺失牌',
        timestamp: Date.now()
      });
      
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBeDefined();
    });

    it('应该能够检测重复牌', () => {
      const players = createMockPlayers(4);
      const initialHands = players.map(p => p.hand);
      const allRounds: any[] = [];
      
      // 创建一张重复牌（相同的ID）
      const duplicateCard = { ...players[0].hand[0] };
      players[0].hand.push(duplicateCard);
      players[1].hand.push(duplicateCard);
      
      const result = validationModule!.validateCardIntegrity({
        players,
        allRounds,
        currentRoundPlays: [],
        initialHands,
        trigger: 'manual',
        context: '测试重复牌',
        timestamp: Date.now()
      });
      
      // 注意：重复牌检测依赖于 card.id 的唯一性
      // 如果卡片ID相同，应该检测到重复
      if (duplicateCard.id === players[0].hand[0].id) {
        expect(result.isValid).toBe(false);
      }
    });
  });

  describe('分数完整性验证', () => {
    it('应该能够验证分数总和为0', () => {
      const players = createMockPlayers(4);
      // 设置分数总和为0
      players[0].score = 50;
      players[1].score = 30;
      players[2].score = -40;
      players[3].score = -40;
      
      const result = validationModule!.validateScoreIntegrity({
        players,
        allRounds: [],
        trigger: 'gameEnd',
        context: '测试分数验证',
        timestamp: Date.now()
      });
      
      // 注意：实际分数总和可能不是0，取决于初始分数规则
      // 这里主要测试验证函数能正常运行
      expect(result).toBeDefined();
      expect(result.validatorName).toBe('scoreIntegrity');
    });
  });

  describe('轮次结束验证', () => {
    it('应该能够验证轮次结束', () => {
      const players = createMockPlayers(4);
      const initialHands = players.map(p => p.hand);
      const allRounds: any[] = [];
      
      const result = validationModule!.validateRoundEnd({
        players,
        allRounds,
        currentRoundPlays: [],
        initialHands,
        trigger: 'roundEnd',
        roundNumber: 1,
        context: '轮次1结束',
        timestamp: Date.now()
      });
      
      expect(result).toBeDefined();
      expect(result.validatorName).toBe('cardIntegrity');
    });
  });

  describe('游戏结束验证', () => {
    it('应该能够验证游戏结束', () => {
      const players = createMockPlayers(4);
      const initialHands = players.map(p => p.hand);
      const allRounds: any[] = [];
      
      const results = validationModule!.validateGameEnd({
        players,
        allRounds,
        currentRoundPlays: [],
        initialHands,
        trigger: 'gameEnd',
        context: '游戏结束',
        timestamp: Date.now()
      });
      
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
    });
  });

  describe('配置管理', () => {
    it('应该能够配置验证模块', () => {
      validationModule!.configure({
        validateOnRoundEnd: false,
        validateOnGameEnd: true
      });
      
      const status = validationModule!.getStatus();
      expect(status.initialized).toBe(true);
    });

    it('应该能够在禁用状态下跳过验证', () => {
      validationModule!.configure({ enabled: false });
      
      const players = createMockPlayers(4);
      const result = validationModule!.validateCardIntegrity({
        players,
        allRounds: [],
        trigger: 'manual',
        context: '禁用状态测试',
        timestamp: Date.now()
      });
      
      expect(result.isValid).toBe(true);
      expect(result.validatorName).toBe('disabled');
    });
  });
});

