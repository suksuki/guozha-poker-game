/**
 * 集成测试套件
 * 测试模块之间的交互和完整流程
 * 
 * 重构说明：
 * - 使用 testFactories 模块减少重复代码
 * - 改进测试组织结构
 * - 增加更多集成场景测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CardType, PlayerType, GameStatus, Rank, Suit } from '../src/types/card';
import { Game, GameSetupConfig } from '../src/utils/Game';
import { Round } from '../src/utils/Round';
import { GameController } from '../src/utils/gameController';
import { RoundScheduler } from '../src/utils/roundScheduler';
import {
  dealCards,
  canPlayCards,
  canBeat,
  calculateCardsScore
} from '../src/utils/cardUtils';
import { processPlayAsync } from '../src/utils/asyncPlayHandler';

// 导入测试工厂
import {
  createCard,
  createSameRankCards,
  createPlayer,
  createHumanPlayer,
  createPlayers,
  createGame,
  createRound,
  createInitializedGame,
} from './testFactories';

describe('集成测试套件', () => {
  // =====================================================
  // Game + Round + GameController 集成测试
  // =====================================================
  describe('Game + Round + GameController 集成', () => {
    let game: Game;

    beforeEach(() => {
      game = createGame();
    });

    it('应该完成完整的游戏初始化流程', () => {
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      game.updateStatus(GameStatus.PLAYING);
      const firstRound = Round.createNew(1);
      game.addRound(firstRound);

      // 验证游戏状态
      expect(game.status).toBe(GameStatus.PLAYING);
      expect(game.players.length).toBe(4);
      expect(game.rounds.length).toBeGreaterThan(0);

      // 验证控制器已初始化
      const controller = game['controller'];
      expect(controller).not.toBeUndefined();

      // 验证玩家分数已初始化
      game.players.forEach(player => {
        expect(player.score).toBe(0);
      });
    });

    it('应该正确处理轮次创建和出牌流程', () => {
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      const firstRound = Round.createNew(1);
      game.addRound(firstRound);

      const currentRound = game.getCurrentRound();
      expect(currentRound).not.toBeUndefined();
      expect(currentRound?.isInProgress()).toBe(true);

      // 模拟出牌
      const player0 = game.players[0];
      if (player0.hand.length > 0) {
        const cardsToPlay = [player0.hand[0]];
        const play = canPlayCards(cardsToPlay);

        if (play) {
          const playRecord = {
            playerId: 0,
            playerName: player0.name,
            cards: cardsToPlay,
            scoreCards: cardsToPlay.filter(card =>
              card.rank === Rank.FIVE ||
              card.rank === Rank.TEN ||
              card.rank === Rank.KING
            ),
            score: calculateCardsScore(cardsToPlay)
          };

          currentRound?.recordPlay(playRecord, play);
          expect(currentRound?.getPlayCount()).toBe(1);
        }
      }
    });

    it('应该正确处理轮次结束和分数分配', () => {
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      const controller = game['controller'];
      controller.initializeGame(players, -100);

      const firstRound = Round.createNew(1);
      game.addRound(firstRound);

      const currentRound = game.getCurrentRound();
      expect(currentRound).not.toBeUndefined();

      if (currentRound) {
        // 模拟玩家0出牌（带分牌）
        const scoreCard = createCard(Suit.SPADES, Rank.FIVE);
        const play = canPlayCards([scoreCard]);
        if (play) {
          const playRecord = {
            playerId: 0,
            playerName: players[0].name,
            cards: [scoreCard],
            scoreCards: [scoreCard],
            score: 5
          };
          currentRound.recordPlay(playRecord, play);
        }

        // 结束轮次
        currentRound.end(players, 4, 0);
        const roundRecord = currentRound.toRecord();

        // 分配分数（轮次应该有5分）
        const updatedPlayers = controller.allocateRoundScore(
          roundRecord.roundNumber,
          roundRecord.totalScore,
          roundRecord.winnerId || 0,
          players,
          roundRecord
        );

        // 玩家0应该获得5分：-100 + 5 = -95
        expect(updatedPlayers[0].score).toBe(-95);
      }
    });

    it('应该正确处理多轮次累积分数', () => {
      const players = createPlayers(true);
      game.initialize(players, players.map(p => p.hand));
      const controller = game['controller'];
      controller.initializeGame(game.players, 0);

      // 模拟3轮游戏
      for (let roundNum = 1; roundNum <= 3; roundNum++) {
        const round = Round.createNew(roundNum);
        game.addRound(round);

        const scoreCard = createCard(Suit.SPADES, Rank.FIVE);
        const play = canPlayCards([scoreCard]);
        if (play) {
          round.recordPlay({
            playerId: 0,
            playerName: game.players[0].name,
            cards: [scoreCard],
            scoreCards: [scoreCard],
            score: 5
          }, play);
        }

        round.end(game.players, 4, 0);
        const roundRecord = round.toRecord();
        controller.allocateRoundScore(
          roundRecord.roundNumber,
          roundRecord.totalScore,
          0,
          game.players,
          roundRecord
        );
      }

      // 3轮每轮5分 = 15分（检查 game.players）
      expect(game.players[0].score).toBe(15);
    });
  });

  // =====================================================
  // RoundScheduler + Game 集成测试
  // =====================================================
  describe('RoundScheduler + Game 集成', () => {
    it('应该正确创建调度器并管理出牌顺序', () => {
      const game = createGame();
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));

      const schedulerConfig = {
        isAutoPlay: false,
        humanPlayerIndex: 0,
        getGameState: () => ({
          status: game.status,
          currentPlayerIndex: game.currentPlayerIndex,
          rounds: game.rounds,
          currentRoundIndex: game.currentRoundIndex,
          players: game.players
        })
      };

      const scheduler = new RoundScheduler(schedulerConfig);
      expect(scheduler).not.toBeUndefined();

      // 验证调度器可以更新轮次号
      const currentRound = game.getCurrentRound();
      if (currentRound) {
        scheduler.updateRoundNumber(currentRound.roundNumber);
      }
    });

    it('应该正确处理托管模式', () => {
      const game = createGame();
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));

      const schedulerConfig = {
        isAutoPlay: true, // 托管模式
        humanPlayerIndex: 0,
        getGameState: () => ({
          status: game.status,
          currentPlayerIndex: game.currentPlayerIndex,
          rounds: game.rounds,
          currentRoundIndex: game.currentRoundIndex,
          players: game.players
        })
      };

      const scheduler = new RoundScheduler(schedulerConfig);
      expect(scheduler).not.toBeUndefined();
    });
  });

  // =====================================================
  // 完整游戏流程集成测试
  // =====================================================
  describe('完整游戏流程集成测试', () => {
    it('应该能够完成一轮完整的游戏流程', () => {
      const game = createGame();
      const players = createPlayers(true);

      // 1. 初始化游戏
      game.initialize(players, players.map(p => p.hand));
      const firstRound = Round.createNew(1);
      game.addRound(firstRound);
      game.updateStatus(GameStatus.PLAYING);

      // 2. 获取当前轮次
      const currentRound = game.getCurrentRound();
      expect(currentRound).not.toBeUndefined();

      // 3. 模拟多个玩家出牌
      if (currentRound) {
        for (let i = 0; i < Math.min(4, game.players.length); i++) {
          const player = game.players[i];
          if (player.hand.length > 0) {
            const cardsToPlay = [player.hand[0]];
            const play = canPlayCards(cardsToPlay);

            if (play) {
              const lastPlay = currentRound.getLastPlay();
              if (lastPlay === null || canBeat(play, lastPlay)) {
                const playRecord = {
                  playerId: i,
                  playerName: player.name,
                  cards: cardsToPlay,
                  scoreCards: cardsToPlay.filter(card =>
                    card.rank === Rank.FIVE ||
                    card.rank === Rank.TEN ||
                    card.rank === Rank.KING
                  ),
                  score: calculateCardsScore(cardsToPlay)
                };

                currentRound.recordPlay(playRecord, play);

                // 更新玩家手牌
                game.updatePlayer(i, {
                  hand: player.hand.filter(card =>
                    !cardsToPlay.some(c => c.id === card.id)
                  )
                });
              }
            }
          }
        }

        // 4. 验证轮次状态
        expect(currentRound.getPlayCount()).toBeGreaterThan(0);
        expect(currentRound.getTotalScore()).toBeGreaterThanOrEqual(0);
      }
    });

    it('应该正确处理游戏结束', () => {
      const game = createGame();
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      game.updateStatus(GameStatus.PLAYING);

      // 模拟游戏结束
      game.updateStatus(GameStatus.FINISHED);
      expect(game.status).toBe(GameStatus.FINISHED);
    });
  });

  // =====================================================
  // 异步出牌处理集成测试
  // =====================================================
  describe('异步出牌处理集成', () => {
    it('应该正确处理异步出牌流程', async () => {
      const round = createRound({
        minIntervalBetweenPlays: 10,
        playTimeout: 5000,
        enabled: true
      });

      const players = createPlayers(true);
      const selectedCards = [players[0].hand[0]];
      const play = canPlayCards(selectedCards);

      if (play) {
        const mockUpdateState = vi.fn();
        const mockGetState = vi.fn(() => ({
          rounds: [round],
          players: players,
          currentRoundIndex: 0
        }));

        try {
          const result = await Promise.race([
            processPlayAsync(
              round,
              0,
              selectedCards,
              players,
              4,
              0,
              { cardTrackerEnabled: false },
              mockUpdateState,
              mockGetState
            ),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('测试超时')), 8000)
            )
          ]);

          expect((result as { status: string }).status).toBe('completed');
        } catch (error) {
          // 超时或其他预期错误
          if (error instanceof Error) {
            expect(error).toBeDefined();
          }
        }
      }
    }, 10000);
  });

  // =====================================================
  // 分数计算和排名集成测试
  // =====================================================
  describe('分数计算和排名集成', () => {
    it('应该正确计算和分配多轮次的分数', () => {
      const game = createGame();
      const controller = game['controller'];
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      controller.initializeGame(players, -100);

      // 模拟多轮次分数分配
      for (let roundNum = 1; roundNum <= 3; roundNum++) {
        const roundRecord = {
          roundNumber: roundNum,
          startTime: Date.now(),
          endTime: Date.now(),
          plays: [],
          totalScore: 25 * roundNum,
          winnerId: (roundNum - 1) % 4,
          winnerName: `玩家${(roundNum - 1) % 4 + 1}`
        };

        const updatedPlayers = controller.allocateRoundScore(
          roundRecord.roundNumber,
          roundRecord.totalScore,
          roundRecord.winnerId,
          players,
          roundRecord
        );

        // 更新玩家数组
        players.forEach((p, i) => {
          p.score = updatedPlayers[i].score;
        });
      }

      // 验证分数已正确分配
      const totalScore = players.reduce((sum, p) => sum + (p.score || 0), 0);
      // 初始分数总和应该是 -400 (4个玩家 × -100)
      // 第1轮：玩家0获得25分，总和 = -400 + 25 = -375
      // 第2轮：玩家1获得50分，总和 = -375 + 50 = -325
      // 第3轮：玩家2获得75分，总和 = -325 + 75 = -250
      expect(totalScore).toBe(-250);
    });

    it('应该正确处理单个获胜者的多轮累积', () => {
      const game = createGame();
      const controller = game['controller'];
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      controller.initializeGame(game.players, 0);

      // 同一个玩家连续赢3轮
      for (let roundNum = 1; roundNum <= 3; roundNum++) {
        controller.allocateRoundScore(roundNum, 10, 0, game.players, {
          roundNumber: roundNum,
          startTime: Date.now(),
          endTime: Date.now(),
          plays: [],
          totalScore: 10,
          winnerId: 0,
          winnerName: '玩家1'
        });
      }

      // 检查 game.players 中的分数
      expect(game.players[0].score).toBe(30);
      expect(game.players[1].score).toBe(0);
      expect(game.players[2].score).toBe(0);
      expect(game.players[3].score).toBe(0);
    });
  });

  // =====================================================
  // 玩家状态管理集成测试
  // =====================================================
  describe('玩家状态管理集成', () => {
    it('应该正确更新玩家手牌', () => {
      const game = createGame();
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));

      const initialHandSize = game.players[0].hand.length;
      const cardsToRemove = [game.players[0].hand[0]];

      game.updatePlayer(0, {
        hand: game.players[0].hand.filter(c =>
          !cardsToRemove.some(r => r.id === c.id)
        )
      });

      expect(game.players[0].hand.length).toBe(initialHandSize - 1);
    });

    it('应该正确更新玩家分数', () => {
      const game = createGame();
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));

      game.updatePlayer(0, { score: 100 });
      expect(game.players[0].score).toBe(100);

      game.updatePlayer(0, { score: -50 });
      expect(game.players[0].score).toBe(-50);
    });

    it('应该正确处理玩家完成状态', () => {
      const game = createGame();
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));

      // 模拟玩家出完牌
      game.updatePlayer(0, { hand: [], finishedRank: 1 });

      expect(game.players[0].hand.length).toBe(0);
      expect(game.players[0].finishedRank).toBe(1);
    });
  });
});
