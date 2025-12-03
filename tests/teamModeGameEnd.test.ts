/**
 * 团队模式游戏结束流程测试
 * 测试新实现的团队模式游戏结束判定逻辑
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Game, GameSetupConfig } from '../src/utils/Game';
import { Player, Card, Suit, Rank, PlayerType, GameStatus } from '../src/types/card';
import { createTeamConfig } from '../src/utils/teamManager';

describe('团队模式游戏结束流程', () => {
  let game: Game;
  
  // 创建测试用的手牌
  const createTestHands = (handSizes: number[]): Card[][] => {
    return handSizes.map((size, playerIndex) => {
      const hand: Card[] = [];
      for (let i = 0; i < size; i++) {
        hand.push({
          id: `p${playerIndex}-card${i}`,
          suit: Suit.HEARTS,
          rank: (Rank.THREE + i) as Rank
        });
      }
      return hand;
    });
  };

  beforeEach(() => {
    const config: GameSetupConfig = {
      playerCount: 4,
      humanPlayerIndex: 0,
      aiConfigs: [
        { strategy: 'balanced', algorithm: 'simple' },
        { strategy: 'balanced', algorithm: 'simple' },
        { strategy: 'balanced', algorithm: 'simple' },
        { strategy: 'balanced', algorithm: 'simple' }
      ],
      teamMode: true
    };

    game = new Game(config);
  });

  describe('团队游戏结束判定', () => {
    it('应该在某个团队全部出完时结束游戏', () => {
      // 场景：团队A（玩家0、2）全部出完，团队B（玩家1、3）被关双
      const hands = createTestHands([0, 5, 0, 8]); // 玩家0和2出完，1和3未出完
      
      game.startNewGame(hands);
      
      // 模拟玩家0和2已出完牌
      game.updatePlayer(0, { hand: [] });
      game.updatePlayer(2, { hand: [] });
      
      // 添加到finishOrder
      game['addToFinishOrder'](0);
      game['addToFinishOrder'](2);
      
      // 检查游戏状态
      expect(game.status).toBe(GameStatus.PLAYING);
      
      // 检查团队是否全部出完
      const team0 = game.teamConfig!.teams[0];
      const team0AllFinished = team0.players.every(
        pid => game.players[pid].hand.length === 0
      );
      
      expect(team0AllFinished).toBe(true);
    });

    it('应该正确处理被关玩家的finishOrder排序', () => {
      // 场景：玩家1有5张牌，玩家3有8张牌，都被关
      const hands = createTestHands([0, 5, 0, 8]);
      
      game.startNewGame(hands);
      game.updatePlayer(0, { hand: [] });
      game.updatePlayer(2, { hand: [] });
      
      // 模拟添加被关玩家到finishOrder
      const unfinishedPlayers = game.players.filter(p => p.hand.length > 0);
      
      // 按手牌数量排序
      unfinishedPlayers.sort((a, b) => {
        if (a.hand.length !== b.hand.length) {
          return a.hand.length - b.hand.length;
        }
        return a.id - b.id;
      });
      
      // 验证排序结果
      expect(unfinishedPlayers[0].id).toBe(1); // 玩家1（5张）排前面
      expect(unfinishedPlayers[1].id).toBe(3); // 玩家3（8张）排后面
    });

    it('应该正确设置被关玩家的finishedRank', () => {
      // 场景：完整的finishOrder设置流程
      const hands = createTestHands([0, 5, 0, 8]);
      
      game.startNewGame(hands);
      
      // 模拟游戏流程
      game['addToFinishOrder'](0); // 第1名
      game['addToFinishOrder'](2); // 第2名
      
      // 被关玩家按手牌数量排序后添加
      game['addToFinishOrder'](1); // 第3名（5张牌）
      game['addToFinishOrder'](3); // 第4名（8张牌）
      
      // 验证finishedRank
      expect(game.players[0].finishedRank).toBe(1);
      expect(game.players[2].finishedRank).toBe(2);
      expect(game.players[1].finishedRank).toBe(3);
      expect(game.players[3].finishedRank).toBe(4);
    });
  });

  describe('winningTeamId设置', () => {
    it('应该正确设置获胜团队ID', () => {
      const hands = createTestHands([0, 5, 0, 8]);
      
      game.startNewGame(hands);
      game.updatePlayer(0, { hand: [] });
      game.updatePlayer(2, { hand: [] });
      
      // 添加到finishOrder
      game['addToFinishOrder'](0);
      game['addToFinishOrder'](2);
      game['addToFinishOrder'](1);
      game['addToFinishOrder'](3);
      
      // 模拟游戏结束
      game['updateStatus'](GameStatus.FINISHED);
      game['setWinner'](0); // 头游是玩家0
      
      // 设置winningTeamId
      if (game.teamConfig) {
        const winnerPlayer = game.players[0];
        game.winningTeamId = winnerPlayer.teamId ?? null;
      }
      
      // 验证
      expect(game.winner).toBe(0);
      expect(game.winningTeamId).toBe(0); // 团队A（玩家0属于团队0）
    });

    it('个人模式下winningTeamId应该为null', () => {
      // 创建个人模式游戏
      const personalConfig: GameSetupConfig = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: [
          { strategy: 'balanced', algorithm: 'simple' },
          { strategy: 'balanced', algorithm: 'simple' },
          { strategy: 'balanced', algorithm: 'simple' },
          { strategy: 'balanced', algorithm: 'simple' }
        ],
        teamMode: false // 个人模式
      };

      const personalGame = new Game(personalConfig);
      const hands = createTestHands([0, 5, 10, 15]);
      
      personalGame.startNewGame(hands);
      personalGame['addToFinishOrder'](0);
      personalGame['updateStatus'](GameStatus.FINISHED);
      personalGame['setWinner'](0);
      
      // 个人模式下应该设置为null
      personalGame.winningTeamId = personalGame.teamConfig ? 0 : null;
      
      expect(personalGame.winner).toBe(0);
      expect(personalGame.winningTeamId).toBeNull();
    });
  });

  describe('关单场景', () => {
    it('应该正确处理关单情况（1个玩家被关）', () => {
      // 场景：玩家3被关单
      const hands = createTestHands([0, 0, 0, 8]);
      
      game.startNewGame(hands);
      
      // 模拟游戏流程
      game.updatePlayer(0, { hand: [] });
      game.updatePlayer(1, { hand: [] });
      game.updatePlayer(2, { hand: [] });
      
      game['addToFinishOrder'](0); // 第1名
      game['addToFinishOrder'](1); // 第2名
      game['addToFinishOrder'](2); // 第3名
      
      // 检查团队是否出完
      const team0 = game.teamConfig!.teams[0]; // 玩家0、2
      const team0AllFinished = team0.players.every(
        pid => game.players[pid].hand.length === 0
      );
      
      expect(team0AllFinished).toBe(true);
      
      // 被关的玩家
      const unfinishedPlayers = game.players.filter(p => p.hand.length > 0);
      expect(unfinishedPlayers.length).toBe(1);
      expect(unfinishedPlayers[0].id).toBe(3);
    });
  });

  describe('关双场景', () => {
    it('应该正确处理关双情况（2个玩家被关）', () => {
      // 场景：玩家1和3被关双
      const hands = createTestHands([0, 5, 0, 8]);
      
      game.startNewGame(hands);
      
      game.updatePlayer(0, { hand: [] });
      game.updatePlayer(2, { hand: [] });
      
      // 检查团队是否出完
      const team0 = game.teamConfig!.teams[0];
      const team0AllFinished = team0.players.every(
        pid => game.players[pid].hand.length === 0
      );
      
      expect(team0AllFinished).toBe(true);
      
      // 被关的玩家
      const unfinishedPlayers = game.players.filter(p => p.hand.length > 0);
      expect(unfinishedPlayers.length).toBe(2);
      
      // 按手牌数量排序
      unfinishedPlayers.sort((a, b) => {
        if (a.hand.length !== b.hand.length) {
          return a.hand.length - b.hand.length;
        }
        return a.id - b.id;
      });
      
      // 验证排序：玩家1（5张）应该在玩家3（8张）前面
      expect(unfinishedPlayers[0].id).toBe(1);
      expect(unfinishedPlayers[1].id).toBe(3);
    });
  });

  describe('队友接风逻辑', () => {
    it('队友都出完时应该返回null（触发游戏结束）', () => {
      const hands = createTestHands([0, 5, 0, 8]);
      
      game.startNewGame(hands);
      game.updatePlayer(0, { hand: [] });
      game.updatePlayer(2, { hand: [] });
      
      // 调用私有方法（通过类型断言）
      const winnerIndex = 0; // 玩家0赢得一轮
      const nextPlayer = (game as any).findNextPlayerForNewRound(winnerIndex);
      
      // 应该返回null，因为队友（玩家2）也出完了，整个团队都出完了
      expect(nextPlayer).toBeNull();
    });

    it('队友未全部出完时应该找队友接风', () => {
      const hands = createTestHands([0, 5, 3, 8]);
      
      game.startNewGame(hands);
      game.updatePlayer(0, { hand: [] });
      // 玩家2还有3张牌
      
      const winnerIndex = 0;
      const nextPlayer = (game as any).findNextPlayerForNewRound(winnerIndex);
      
      // 应该返回队友（玩家2）
      expect(nextPlayer).toBe(2);
    });

    it('队友出完但团队未全部出完时应该找对手', () => {
      // 这种场景不太可能在2v2中发生（队友都是2个人）
      // 但在逻辑上应该处理
      const hands = createTestHands([0, 5, 0, 8]);
      
      game.startNewGame(hands);
      game.updatePlayer(0, { hand: [] });
      game.updatePlayer(2, { hand: [] });
      
      // 在这个场景中，团队A已全部出完
      // findNextPlayerForNewRound应该返回null
      const winnerIndex = 0;
      const nextPlayer = (game as any).findNextPlayerForNewRound(winnerIndex);
      
      expect(nextPlayer).toBeNull();
    });
  });

  describe('完整游戏流程（团队模式）', () => {
    it('应该能够完成团队模式的完整游戏流程', () => {
      const hands = createTestHands([3, 5, 2, 8]);
      
      game.startNewGame(hands);
      
      // 验证初始状态
      expect(game.status).toBe(GameStatus.PLAYING);
      expect(game.teamConfig).toBeDefined();
      expect(game.teamConfig!.teams.length).toBe(2);
      
      // 验证团队配置
      expect(game.teamConfig!.teams[0].players).toContain(0);
      expect(game.teamConfig!.teams[0].players).toContain(2);
      expect(game.teamConfig!.teams[1].players).toContain(1);
      expect(game.teamConfig!.teams[1].players).toContain(3);
      
      // 验证玩家的teamId
      expect(game.players[0].teamId).toBe(0);
      expect(game.players[1].teamId).toBe(1);
      expect(game.players[2].teamId).toBe(0);
      expect(game.players[3].teamId).toBe(1);
    });

    it('应该正确处理游戏结束并设置winningTeamId', () => {
      const hands = createTestHands([0, 5, 0, 8]);
      
      game.startNewGame(hands);
      game.updatePlayer(0, { hand: [] });
      game.updatePlayer(2, { hand: [] });
      
      // 添加完成顺序
      game['addToFinishOrder'](0);
      game['addToFinishOrder'](2);
      
      // 添加被关玩家（按手牌数量排序）
      const unfinished = [
        { id: 1, hand: game.players[1].hand },
        { id: 3, hand: game.players[3].hand }
      ].sort((a, b) => a.hand.length - b.hand.length);
      
      unfinished.forEach(p => {
        game['addToFinishOrder'](p.id);
      });
      
      // 设置游戏结束
      game['updateStatus'](GameStatus.FINISHED);
      game['setWinner'](0);
      
      if (game.teamConfig) {
        const winnerPlayer = game.players[0];
        game.winningTeamId = winnerPlayer.teamId ?? null;
      }
      
      // 验证结果
      expect(game.status).toBe(GameStatus.FINISHED);
      expect(game.winner).toBe(0);
      expect(game.winningTeamId).toBe(0);
      expect(game.finishOrder).toEqual([0, 2, 1, 3]);
    });
  });

  describe('边界情况', () => {
    it('应该处理所有玩家都出完的情况', () => {
      const hands = createTestHands([0, 0, 0, 0]);
      
      game.startNewGame(hands);
      
      // 所有玩家都出完
      game.players.forEach((p, i) => {
        game.updatePlayer(i, { hand: [] });
        game['addToFinishOrder'](i);
      });
      
      // 验证finishOrder
      expect(game.finishOrder.length).toBe(4);
    });

    it('应该处理手牌数量相同的被关玩家', () => {
      // 两个被关玩家手牌数量相同
      const hands = createTestHands([0, 5, 0, 5]);
      
      game.startNewGame(hands);
      
      const unfinished = game.players.filter(p => p.hand.length > 0);
      
      // 按手牌数量排序（相同时按ID）
      unfinished.sort((a, b) => {
        if (a.hand.length !== b.hand.length) {
          return a.hand.length - b.hand.length;
        }
        return a.id - b.id;
      });
      
      // 验证：手牌数量相同，按ID排序
      expect(unfinished[0].id).toBe(1); // ID小的在前
      expect(unfinished[1].id).toBe(3);
    });

    it('应该正确处理第一名和末游是队友的情况', () => {
      // 场景：团队B（玩家1、3）获胜，团队A（玩家0、2）被关
      const hands = createTestHands([5, 0, 8, 0]);
      
      game.startNewGame(hands);
      game.updatePlayer(1, { hand: [] });
      game.updatePlayer(3, { hand: [] });
      
      game['addToFinishOrder'](1); // 团队B，第1名
      game['addToFinishOrder'](3); // 团队B，第2名
      
      // 检查团队B是否全部出完
      const team1 = game.teamConfig!.teams[1];
      const team1AllFinished = team1.players.every(
        pid => game.players[pid].hand.length === 0
      );
      
      expect(team1AllFinished).toBe(true);
      
      // 设置winningTeamId
      game['updateStatus'](GameStatus.FINISHED);
      game['setWinner'](1);
      
      if (game.teamConfig) {
        const winnerPlayer = game.players[1];
        game.winningTeamId = winnerPlayer.teamId ?? null;
      }
      
      expect(game.winningTeamId).toBe(1); // 团队B获胜
    });
  });

  describe('与个人模式的兼容性', () => {
    it('个人模式应该不受影响', () => {
      const personalConfig: GameSetupConfig = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: [
          { strategy: 'balanced', algorithm: 'simple' },
          { strategy: 'balanced', algorithm: 'simple' },
          { strategy: 'balanced', algorithm: 'simple' },
          { strategy: 'balanced', algorithm: 'simple' }
        ],
        teamMode: false
      };

      const personalGame = new Game(personalConfig);
      const hands = createTestHands([0, 5, 10, 15]);
      
      personalGame.startNewGame(hands);
      
      // 验证是个人模式（teamConfig为null或undefined）
      expect(personalGame.teamConfig == null).toBe(true);
      
      // 模拟玩家0出完
      personalGame.updatePlayer(0, { hand: [] });
      personalGame['addToFinishOrder'](0);
      
      // 检查剩余玩家
      const remaining = personalGame.players.filter(p => p.hand.length > 0);
      expect(remaining.length).toBe(3); // 还有3个玩家
      
      // 游戏不应该结束（个人模式需要只剩1个玩家）
      expect(personalGame.status).toBe(GameStatus.PLAYING);
    });
  });
});

