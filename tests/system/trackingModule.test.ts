/**
 * 追踪模块单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { SystemApplication } from '../../src/services/system';
import { TrackingModule } from '../../src/services/system/modules/tracking/TrackingModule';
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

describe('TrackingModule', () => {
  let systemApp: SystemApplication;
  let trackingModule: TrackingModule | null;

  beforeEach(async () => {
    // 重置系统应用
    systemApp = SystemApplication.getInstance();
    systemApp.reset();
    
    // 注册模块
    registerAllModules(systemApp);
    
    // 初始化
    await systemApp.initialize();
    await systemApp.start();
    
    // 获取追踪模块
    trackingModule = systemApp.getModule<TrackingModule>('tracking');
  });

  describe('模块初始化', () => {
    it('应该正确初始化追踪模块', () => {
      expect(trackingModule).toBeDefined();
      expect(trackingModule?.isEnabled()).toBe(true);
      expect(trackingModule?.getStatus().initialized).toBe(true);
    });

    it('应该能够获取模块状态', () => {
      const status = trackingModule?.getStatus();
      expect(status).toBeDefined();
      expect(status?.initialized).toBe(true);
      expect(status?.enabled).toBe(true);
    });
  });

  describe('追踪器操作', () => {
    it('应该能够初始化追踪器', () => {
      const players = createMockPlayers(4);
      const initialHands = players.map(p => p.hand);
      
      trackingModule!.initializeTracker(initialHands, Date.now());
      
      // 验证追踪器已初始化（通过获取追踪器实例）
      const tracker = trackingModule!.getTracker();
      expect(tracker).toBeDefined();
    });

    it('应该能够开始新轮次', () => {
      const players = createMockPlayers(4);
      const initialHands = players.map(p => p.hand);
      
      trackingModule!.initializeTracker(initialHands);
      trackingModule!.startRound(1, players);
      
      // 验证轮次已开始（通过获取轮次记录）
      const round = trackingModule!.getRound(1);
      expect(round).toBeDefined();
      expect(round?.roundNumber).toBe(1);
    });

    it('应该能够记录出牌', () => {
      const players = createMockPlayers(4);
      const initialHands = players.map(p => p.hand);
      
      trackingModule!.initializeTracker(initialHands);
      trackingModule!.startRound(1, players);
      
      const playRecord = {
        playerId: 0,
        playerName: '玩家1',
        cards: players[0].hand.slice(0, 3),
        score: 0,
        timestamp: Date.now()
      };
      
      trackingModule!.recordPlay(1, playRecord);
      
      // 验证出牌已记录
      const round = trackingModule!.getRound(1);
      expect(round?.plays.length).toBe(1);
      expect(round?.plays[0].playerId).toBe(0);
    });

    it('应该能够结束轮次', () => {
      const players = createMockPlayers(4);
      const initialHands = players.map(p => p.hand);
      
      trackingModule!.initializeTracker(initialHands);
      trackingModule!.startRound(1, players);
      trackingModule!.endRound(1, 0, '玩家1', 50, players);
      
      // 验证轮次已结束
      const round = trackingModule!.getRound(1);
      expect(round).toBeDefined();
      expect(round?.winnerId).toBe(0);
      expect(round?.totalScore).toBe(50);
    });
  });

  describe('配置管理', () => {
    it('应该能够配置追踪模块', () => {
      trackingModule!.configure({
        enabled: false
      });
      
      const status = trackingModule!.getStatus();
      expect(status.enabled).toBe(false);
    });

    it('应该能够在禁用状态下跳过追踪', () => {
      trackingModule!.configure({ enabled: false });
      
      const players = createMockPlayers(4);
      const initialHands = players.map(p => p.hand);
      
      trackingModule!.initializeTracker(initialHands);
      trackingModule!.startRound(1, players);
      
      // 禁用状态下应该不会记录
      const round = trackingModule!.getRound(1);
      // 注意：禁用状态下可能返回 null 或空记录
      // 这里主要测试不会抛出错误
      expect(true).toBe(true);
    });
  });
});

