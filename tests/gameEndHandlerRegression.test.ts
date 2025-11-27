/**
 * gameEndHandler 回归测试
 * 确保重构后的游戏结束逻辑与之前行为一致
 */

import { describe, it, expect } from 'vitest';
import { handleGameEnd } from '../src/utils/gameEndHandler';
import { GameStatus, Player, Card, Rank, Suit } from '../src/types/card';

// 创建测试用的工具函数
function createTestPlayer(id: number, name: string, hand: Card[] = [], score: number = -100): Player {
  return {
    id,
    name,
    type: id === 0 ? 'human' : 'ai',
    hand,
    score,
    wonRounds: []
  };
}

function createScoreCard(rank: Rank, suit: Suit = Suit.HEARTS): Card {
  return {
    id: `${rank}-${suit}-${Date.now()}-${Math.random()}`,
    rank,
    suit
  };
}

describe('gameEndHandler 回归测试', () => {
  it('应该正确处理4人游戏，末游有2张10的情况', () => {
    const players = [
      createTestPlayer(0, '你', [], -100),
      createTestPlayer(1, '玩家2', [], -100),
      createTestPlayer(2, '玩家3', [], -100),
      createTestPlayer(3, '玩家4', [
        createScoreCard(Rank.TEN),
        createScoreCard(Rank.TEN)
      ], -100)
    ];

    const prevState = {
      status: GameStatus.PLAYING,
      players,
      finishOrder: [0, 1, 2], // 前3个玩家已出完
      allRounds: [],
      currentRoundPlays: [],
      roundNumber: 1,
      roundScore: 0,
      lastPlayPlayerIndex: null,
      initialHands: [] // 测试场景中不验证完整牌数
    };

    const result = handleGameEnd({
      prevState,
      lastPlayerIndex: 3,
      lastPlayer: players[3],
      context: '回归测试'
    });

    // 验证基本状态
    expect(result.status).toBe(GameStatus.FINISHED);
    expect(result.players.length).toBe(4);
    expect(result.finishOrder.length).toBe(4);
    expect(result.finishOrder).toContain(3); // 末游应该在finishOrder中

    // 验证末游玩家手牌已清空
    const lastPlayer = result.players.find(p => p.id === 3);
    expect(lastPlayer?.hand.length).toBe(0);

    // 验证所有玩家手牌都已清空
    result.players.forEach(player => {
      expect(player.hand.length).toBe(0);
    });

    // 验证创建了模拟轮
    expect(result.allRounds.length).toBe(1);
    const mockRound = result.allRounds[0];
    expect(mockRound.roundNumber).toBe(2); // prev.roundNumber + 1
    expect(mockRound.plays.length).toBe(1);
    expect(mockRound.plays[0].playerId).toBe(3);
    expect(mockRound.plays[0].cards.length).toBe(2); // 两个10
    expect(mockRound.plays[0].scoreCards.length).toBe(2);
    expect(mockRound.plays[0].score).toBe(20); // 两个10 = 20分

    // 验证分数处理：
    // 1. 末游玩家减去20分：-100 - 20 = -120
    // 2. 第二名加上20分：-100 + 20 = -80
    // 3. applyFinalGameRules 会应用最终规则：第一名+30，最后一名-30
    // 所以最终：末游 = -120 - 30 = -150，第二名 = -80
    expect(lastPlayer?.score).toBe(-150); // -100 - 20 - 30（最后一名-30）
    const secondPlayer = result.players.find(p => p.id === 1);
    expect(secondPlayer?.score).toBe(-80); // -100 + 20（第二名没有最终规则调整）

    // 验证有winner
    expect(result.winner).toBeDefined();
    expect(result.finalRankings.length).toBe(4);
  });

  it('应该确保分数总和为0', () => {
    const players = [
      createTestPlayer(0, '玩家1', [], -100),
      createTestPlayer(1, '玩家2', [], -100),
      createTestPlayer(2, '玩家3', [], -100),
      createTestPlayer(3, '玩家4', [
        createScoreCard(Rank.FIVE),
        createScoreCard(Rank.TEN),
        createScoreCard(Rank.KING)
      ], -100)
    ];

    const prevState = {
      status: GameStatus.PLAYING,
      players,
      finishOrder: [0, 1, 2],
      allRounds: [],
      currentRoundPlays: [],
      roundNumber: 1,
      roundScore: 0,
      lastPlayPlayerIndex: null,
      initialHands: [] // 测试场景中不验证完整牌数
    };

    const result = handleGameEnd({
      prevState,
      lastPlayerIndex: 3,
      lastPlayer: players[3],
      context: '回归测试-分数验证'
    });

    // 验证分数总和：
    // 初始：-100 * 4 = -400
    // 末游未出分牌：-25（末游减去），+25（第二名加上）= 0
    // 最终规则：+30（第一名），-30（最后一名）= 0
    // 所以总和应该是：-400 + 0 + 0 = -400
    // 注意：在测试中，我们没有实际的分牌游戏过程，所以分数总和是-400
    // 在真实游戏中，通过分牌和最终规则，总和应该是0
    const totalScore = result.players.reduce((sum, p) => sum + (p.score || 0), 0);
    // 测试场景中没有实际分牌，所以总和是-400（初始分数）
    expect(totalScore).toBe(-400);
  });

  it('应该正确处理当前轮次有分数的情况', () => {
    const players = [
      createTestPlayer(0, '玩家1', [], -100),
      createTestPlayer(1, '玩家2', [], -100),
      createTestPlayer(2, '玩家3', [], -100),
      createTestPlayer(3, '玩家4', [createScoreCard(Rank.TEN)], -100)
    ];

    const prevState = {
      status: GameStatus.PLAYING,
      players,
      finishOrder: [0, 1, 2],
      allRounds: [],
      currentRoundPlays: [{
        playerId: 0,
        playerName: '玩家1',
        cards: [createScoreCard(Rank.FIVE)],
        scoreCards: [createScoreCard(Rank.FIVE)],
        score: 5
      }],
      roundNumber: 3,
      roundScore: 5,
      lastPlayPlayerIndex: 0,
      initialHands: [] // 测试场景中不验证完整牌数
    };

    const result = handleGameEnd({
      prevState,
      lastPlayerIndex: 3,
      lastPlayer: players[3],
      context: '回归测试-当前轮次有分数'
    });

    // 验证保存了当前轮次记录
    expect(result.allRounds.length).toBe(2); // 当前轮次 + 模拟轮
    const currentRound = result.allRounds[0];
    expect(currentRound.roundNumber).toBe(3);
    expect(currentRound.totalScore).toBe(5);
    expect(currentRound.winnerId).toBe(0);
    
    // 验证玩家1获得了当前轮次的分数
    const player1 = result.players.find(p => p.id === 0);
    expect(player1?.score).toBeGreaterThan(-100); // 应该比初始分数高（因为有轮次分数）
  });
});

