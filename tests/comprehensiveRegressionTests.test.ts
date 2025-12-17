/**
 * 完整的回归测试套件
 * 确保已修复的bug不会再次出现
 * 
 * 重构说明：
 * - 使用 testFactories 模块减少重复代码
 * - 统一测试数据创建方式
 * - 增加更多边界情况测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CardType, PlayerType, GameStatus, Rank, Suit } from '../src/types/card';
import { Game, GameSetupConfig } from '../src/utils/Game';
import { Round } from '../src/utils/Round';
import {
  createDeck,
  dealCards,
  canPlayCards,
  canBeat,
  calculateCardsScore,
  calculateDunCount,
  calculateDunScore,
  hasPlayableCards
} from '../src/utils/cardUtils';
import { GameController } from '../src/utils/gameController';
import { handleDunScoring, updatePlayerAfterPlay } from '../src/utils/playManager';

// 导入测试工厂
import {
  createCard,
  createSameRankCards,
  createPlayer,
  createPlayers,
  createGame,
  createBomb,
  createDun,
} from './testFactories';

describe('完整回归测试套件', () => {
  // =====================================================
  // 发牌随机性回归测试
  // =====================================================
  describe('发牌随机性回归测试', () => {
    it('发牌应该是随机的，不应该每次都一样', () => {
      const hands1 = dealCards(4);
      const hands2 = dealCards(4);

      // 至少有一个玩家的手牌顺序不同
      let hasDifferent = false;
      for (let i = 0; i < 4; i++) {
        const hand1 = hands1[i];
        const hand2 = hands2[i];
        if (hand1.some((card, index) => card.id !== hand2[index]?.id)) {
          hasDifferent = true;
          break;
        }
      }
      expect(hasDifferent).toBe(true);
    });

    it('发牌后不应该自动排序（保持随机顺序）', () => {
      const hands = dealCards(4);

      // 检查手牌数量正确
      hands.forEach(hand => {
        expect(hand.length).toBeGreaterThan(0);
      });

      // 检查总牌数正确（4副牌 = 216张）
      const totalCards = hands.reduce((sum, hand) => sum + hand.length, 0);
      expect(totalCards).toBe(216);
    });

    it('多次发牌应该产生不同的结果', () => {
      const allHands: ReturnType<typeof dealCards>[] = [];
      for (let i = 0; i < 5; i++) {
        allHands.push(dealCards(4));
      }

      // 至少有两组手牌不同
      let hasDifferent = false;
      outer: for (let i = 0; i < allHands.length - 1; i++) {
        for (let j = i + 1; j < allHands.length; j++) {
          const hands1 = allHands[i];
          const hands2 = allHands[j];
          for (let k = 0; k < 4; k++) {
            if (hands1[k].some((card, idx) => card.id !== hands2[k][idx]?.id)) {
              hasDifferent = true;
              break outer;
            }
          }
        }
      }
      expect(hasDifferent).toBe(true);
    });

    it('发牌应该确保每个玩家有54张牌', () => {
      const hands = dealCards(4);
      hands.forEach((hand, index) => {
        expect(hand.length).toBe(54);
      });
    });
  });

  // =====================================================
  // 牌型识别回归测试
  // =====================================================
  describe('牌型识别回归测试', () => {
    it('应该正确识别所有合法牌型（不会误判）', () => {
      // 单张
      const single = canPlayCards([createCard(Suit.SPADES, Rank.THREE)]);
      expect(single?.type).toBe(CardType.SINGLE);

      // 对子
      const pair = canPlayCards(createSameRankCards(Rank.THREE, 2));
      expect(pair?.type).toBe(CardType.PAIR);

      // 三张
      const triple = canPlayCards(createSameRankCards(Rank.THREE, 3));
      expect(triple?.type).toBe(CardType.TRIPLE);

      // 炸弹（4张）
      const bomb4 = canPlayCards(createBomb(Rank.THREE, 4));
      expect(bomb4?.type).toBe(CardType.BOMB);

      // 炸弹（5张）
      const bomb5 = canPlayCards(createBomb(Rank.THREE, 5));
      expect(bomb5?.type).toBe(CardType.BOMB);

      // 炸弹（6张）
      const bomb6 = canPlayCards(createBomb(Rank.THREE, 6));
      expect(bomb6?.type).toBe(CardType.BOMB);

      // 墩（7张）
      const dun = canPlayCards(createDun(Rank.THREE, 7));
      expect(dun?.type).toBe(CardType.DUN);

      // 墩（8张）
      const dun8 = canPlayCards(createDun(Rank.THREE, 8));
      expect(dun8?.type).toBe(CardType.DUN);
    });

    it('应该拒绝不合法的牌型组合（不会误接受）', () => {
      // 不同点数的牌
      const invalid1 = canPlayCards([
        createCard(Suit.SPADES, Rank.THREE),
        createCard(Suit.HEARTS, Rank.FOUR),
        createCard(Suit.DIAMONDS, Rank.FIVE)
      ]);
      expect(invalid1).toBeNull();

      // 只有一张牌的对子
      const invalid2 = canPlayCards([createCard(Suit.SPADES, Rank.THREE)]);
      expect(invalid2?.type).not.toBe(CardType.PAIR);

      // 三张不同点数的牌
      const invalid3 = canPlayCards([
        createCard(Suit.SPADES, Rank.THREE),
        createCard(Suit.HEARTS, Rank.FOUR),
        createCard(Suit.DIAMONDS, Rank.FIVE)
      ]);
      expect(invalid3).toBeNull();
    });

    it('应该正确处理空牌组', () => {
      const empty = canPlayCards([]);
      expect(empty).toBeNull();
    });
  });

  // =====================================================
  // 牌型比较回归测试
  // =====================================================
  describe('牌型比较回归测试', () => {
    it('应该正确比较牌的大小（不会出现错误的大小关系）', () => {
      const three = canPlayCards([createCard(Suit.SPADES, Rank.THREE)]);
      const four = canPlayCards([createCard(Suit.SPADES, Rank.FOUR)]);
      const two = canPlayCards([createCard(Suit.SPADES, Rank.TWO)]);

      expect(three).not.toBeNull();
      expect(four).not.toBeNull();
      expect(two).not.toBeNull();

      // 4 > 3
      expect(canBeat(four!, three!)).toBe(true);
      expect(canBeat(three!, four!)).toBe(false);

      // 2 > 4 (2是最大的单牌)
      expect(canBeat(two!, four!)).toBe(true);
      expect(canBeat(four!, two!)).toBe(false);

      // 2 > 3
      expect(canBeat(two!, three!)).toBe(true);
      expect(canBeat(three!, two!)).toBe(false);
    });

    it('应该正确处理炸弹压过普通牌型（不会出现炸弹被普通牌压过）', () => {
      const single = canPlayCards([createCard(Suit.SPADES, Rank.TWO)]);
      const bomb = canPlayCards(createBomb(Rank.THREE, 4));

      expect(single).not.toBeNull();
      expect(bomb).not.toBeNull();

      // 炸弹应该能压过单张
      expect(canBeat(bomb!, single!)).toBe(true);
      // 单张不应该能压过炸弹
      expect(canBeat(single!, bomb!)).toBe(false);
    });

    it('应该正确处理更大的炸弹压过小炸弹（不会出现小炸弹压过大炸弹）', () => {
      const bomb4 = canPlayCards(createBomb(Rank.THREE, 4));
      const bomb5 = canPlayCards(createBomb(Rank.FOUR, 5));

      expect(bomb4).not.toBeNull();
      expect(bomb5).not.toBeNull();

      // 5张炸弹应该能压过4张炸弹
      expect(canBeat(bomb5!, bomb4!)).toBe(true);
      // 4张炸弹不应该能压过5张炸弹
      expect(canBeat(bomb4!, bomb5!)).toBe(false);
    });

    it('应该正确处理墩压过所有牌型（不会出现其他牌型压过墩）', () => {
      const single = canPlayCards([createCard(Suit.SPADES, Rank.TWO)]);
      const bomb = canPlayCards(createBomb(Rank.THREE, 6));
      const dun = canPlayCards(createDun(Rank.FOUR, 7));

      expect(single).not.toBeNull();
      expect(bomb).not.toBeNull();
      expect(dun).not.toBeNull();

      // 墩应该能压过单张
      expect(canBeat(dun!, single!)).toBe(true);
      expect(canBeat(single!, dun!)).toBe(false);

      // 墩应该能压过炸弹
      expect(canBeat(dun!, bomb!)).toBe(true);
      expect(canBeat(bomb!, dun!)).toBe(false);
    });

    it('应该正确处理对子的比较', () => {
      const pairThree = canPlayCards(createSameRankCards(Rank.THREE, 2));
      const pairFour = canPlayCards(createSameRankCards(Rank.FOUR, 2));
      const pairTwo = canPlayCards(createSameRankCards(Rank.TWO, 2));

      expect(pairThree).not.toBeNull();
      expect(pairFour).not.toBeNull();
      expect(pairTwo).not.toBeNull();

      expect(canBeat(pairFour!, pairThree!)).toBe(true);
      expect(canBeat(pairTwo!, pairFour!)).toBe(true);
      expect(canBeat(pairThree!, pairFour!)).toBe(false);
    });
  });

  // =====================================================
  // 分数计算回归测试
  // =====================================================
  describe('分数计算回归测试', () => {
    it('应该正确计算分牌的分值（不会出现计算错误）', () => {
      const five = createCard(Suit.SPADES, Rank.FIVE);
      const ten = createCard(Suit.HEARTS, Rank.TEN);
      const king = createCard(Suit.DIAMONDS, Rank.KING);
      const three = createCard(Suit.CLUBS, Rank.THREE);

      expect(calculateCardsScore([five])).toBe(5);
      expect(calculateCardsScore([ten])).toBe(10);
      expect(calculateCardsScore([king])).toBe(10);
      expect(calculateCardsScore([three])).toBe(0);

      // 组合分牌
      expect(calculateCardsScore([five, ten, king])).toBe(25);
    });

    it('应该正确计算墩的数量（不会出现计算错误）', () => {
      expect(calculateDunCount(6)).toBe(0); // 少于7张不是墩
      expect(calculateDunCount(7)).toBe(1);
      expect(calculateDunCount(8)).toBe(2);
      expect(calculateDunCount(9)).toBe(4);
      expect(calculateDunCount(10)).toBe(8);
      expect(calculateDunCount(11)).toBe(16);
      expect(calculateDunCount(12)).toBe(32);
      expect(calculateDunCount(13)).toBe(64);
    });

    it('应该正确计算墩的分数（不会出现分配错误）', () => {
      // 4人游戏，1墩
      const result1 = calculateDunScore(1, 4, 0);
      expect(result1.dunPlayerScore).toBe(90);  // 3个其他玩家 × 30分 × 1墩
      expect(result1.otherPlayersScore).toBe(30); // 30分 × 1墩

      // 4人游戏，2墩
      const result2 = calculateDunScore(2, 4, 0);
      expect(result2.dunPlayerScore).toBe(180); // 3个其他玩家 × 30分 × 2墩
      expect(result2.otherPlayersScore).toBe(60); // 30分 × 2墩

      // 3人游戏，1墩
      const result3 = calculateDunScore(1, 3, 0);
      expect(result3.dunPlayerScore).toBe(60);  // 2个其他玩家 × 30分 × 1墩
      expect(result3.otherPlayersScore).toBe(30); // 30分 × 1墩
    });

    it('应该正确计算多张相同分牌的总分', () => {
      const fives = [
        createCard(Suit.SPADES, Rank.FIVE),
        createCard(Suit.HEARTS, Rank.FIVE),
        createCard(Suit.DIAMONDS, Rank.FIVE),
        createCard(Suit.CLUBS, Rank.FIVE),
      ];
      expect(calculateCardsScore(fives)).toBe(20); // 4 × 5
    });
  });

  // =====================================================
  // 游戏状态回归测试
  // =====================================================
  describe('游戏状态回归测试', () => {
    it('游戏初始化后应该处于正确的状态', () => {
      const game = createGame();
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      game.updateStatus(GameStatus.PLAYING);
      const firstRound = Round.createNew(1);
      game.addRound(firstRound);

      expect(game.status).toBe(GameStatus.PLAYING);
      expect(game.players.length).toBe(4);
      expect(game.rounds.length).toBeGreaterThan(0);
      expect(game.currentRoundIndex).toBeGreaterThanOrEqual(0);
    });

    it('轮次应该正确创建和结束', () => {
      const round = Round.createNew(1);
      expect(round.isInProgress()).toBe(true);
      expect(round.isEnded()).toBe(false);

      const players = createPlayers();
      const result = round.end(players, 4, 0);
      expect(round.isEnded()).toBe(true);
      expect(round.isInProgress()).toBe(false);
      expect(result.winnerIndex).toBe(0);
    });

    it('游戏状态转换应该正确', () => {
      const game = createGame();

      expect(game.status).toBe(GameStatus.WAITING);

      game.updateStatus(GameStatus.PLAYING);
      expect(game.status).toBe(GameStatus.PLAYING);

      game.updateStatus(GameStatus.FINISHED);
      expect(game.status).toBe(GameStatus.FINISHED);
    });
  });

  // =====================================================
  // 分数分配回归测试
  // =====================================================
  describe('分数分配回归测试', () => {
    it('轮次分数应该正确分配给获胜玩家', () => {
      const game = createGame();
      const controller = game['controller'];
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      controller.initializeGame(players, -100);

      const roundRecord = {
        roundNumber: 1,
        startTime: Date.now(),
        endTime: Date.now(),
        plays: [],
        totalScore: 25,
        winnerId: 0,
        winnerName: '玩家1'
      };

      const updatedPlayers = controller.allocateRoundScore(1, 25, 0, players, roundRecord);

      // 获胜玩家应该获得25分
      expect(updatedPlayers[0].score).toBe(-75); // -100 + 25
      // 其他玩家分数不变
      expect(updatedPlayers[1].score).toBe(-100);
      expect(updatedPlayers[2].score).toBe(-100);
      expect(updatedPlayers[3].score).toBe(-100);
    });

    it('墩的分数应该正确分配给所有玩家', () => {
      const players = createPlayers();
      const dunCards = createDun(Rank.THREE, 7);
      const play = canPlayCards(dunCards);

      expect(play).not.toBeNull();
      expect(play?.type).toBe(CardType.DUN);

      const result = handleDunScoring(players, 0, dunCards, 4, play!, undefined);

      // 其他玩家分数保持不变
      expect(result.updatedPlayers[1].score).toBe(0);
      expect(result.updatedPlayers[2].score).toBe(0);
      expect(result.updatedPlayers[3].score).toBe(0);
      expect(result.dunScore).toBe(90);

      // 验证出墩玩家的 dunCount 被正确更新
      expect(result.updatedPlayers[0].dunCount).toBe(1);

      // score 保持不变
      const updatedPlayer0 = updatePlayerAfterPlay(result.updatedPlayers[0], dunCards, result.dunScore);
      expect(updatedPlayer0.score).toBe(0);
    });

    it('多轮分数应该正确累积', () => {
      const game = createGame();
      const controller = game['controller'];
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      controller.initializeGame(players, 0); // 从0分开始

      // 第一轮：玩家0获得25分
      controller.allocateRoundScore(1, 25, 0, game.players, {
        roundNumber: 1,
        startTime: Date.now(),
        endTime: Date.now(),
        plays: [],
        totalScore: 25,
        winnerId: 0,
        winnerName: '玩家1'
      });

      // 第二轮：玩家1获得30分
      controller.allocateRoundScore(2, 30, 1, game.players, {
        roundNumber: 2,
        startTime: Date.now(),
        endTime: Date.now(),
        plays: [],
        totalScore: 30,
        winnerId: 1,
        winnerName: '玩家2'
      });

      // 检查 game.players 中的分数（controller 更新的是 game.players）
      expect(game.players[0].score).toBe(25);
      expect(game.players[1].score).toBe(30);
      expect(game.players[2].score).toBe(0);
      expect(game.players[3].score).toBe(0);
    });
  });

  // =====================================================
  // 边界情况回归测试
  // =====================================================
  describe('边界情况回归测试', () => {
    it('空手牌应该正确处理', () => {
      const player = createPlayer(0, '玩家1', []);
      expect(player.hand.length).toBe(0);
      expect(hasPlayableCards(player.hand, null)).toBe(false);
    });

    it('只有一张牌时应该能出牌', () => {
      const singleCard = [createCard(Suit.SPADES, Rank.THREE)];
      const play = canPlayCards(singleCard);
      expect(play).not.toBeNull();
      expect(play?.type).toBe(CardType.SINGLE);
    });

    it('最大墩数应该正确处理', () => {
      // 测试最大可能的墩数（13张相同点数的牌）
      const maxDun = createSameRankCards(Rank.THREE, 13);
      const play = canPlayCards(maxDun);
      expect(play).not.toBeNull();
      expect(play?.type).toBe(CardType.DUN);

      const dunCount = calculateDunCount(13);
      expect(dunCount).toBeGreaterThan(0);
      expect(dunCount).toBe(64); // 2^6
    });

    it('零分轮次应该正确处理', () => {
      const game = createGame();
      const controller = game['controller'];
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      controller.initializeGame(players, 0);

      controller.allocateRoundScore(1, 0, 0, players, {
        roundNumber: 1,
        startTime: Date.now(),
        endTime: Date.now(),
        plays: [],
        totalScore: 0,
        winnerId: 0,
        winnerName: '玩家1'
      });

      // 零分轮次所有玩家分数不变
      expect(players[0].score).toBe(0);
      expect(players[1].score).toBe(0);
    });

    it('负分应该正确处理', () => {
      const game = createGame();
      const controller = game['controller'];
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      controller.initializeGame(players, -100);

      // 检查 game.players 中的分数（controller 更新的是 game.players）
      expect(game.players[0].score).toBe(-100);
      expect(game.players[1].score).toBe(-100);
    });
  });
});
