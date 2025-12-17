/**
 * 完整的单元测试套件
 * 覆盖所有核心模块的功能测试
 * 
 * 重构说明：
 * - 使用 testFactories 模块减少重复代码
 * - 统一测试数据创建方式
 * - 改进测试组织结构
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { CardType, PlayerType, GameStatus, Rank, Suit } from '../src/types/card';
import { Game, GameSetupConfig } from '../src/utils/Game';
import { Round } from '../src/utils/Round';
import { GameController } from '../src/utils/gameController';
import {
  createDeck,
  dealCards,
  canPlayCards,
  canBeat,
  isScoreCard,
  getCardScore,
  calculateCardsScore,
  calculateDunCount,
  calculateDunScore,
  hasPlayableCards
} from '../src/utils/cardUtils';
import { handleDunScoring, updatePlayerAfterPlay } from '../src/utils/playManager';

// 导入测试工厂
import {
  createCard,
  createSameRankCards,
  createScoreCards,
  createPlayer,
  createHumanPlayer,
  createPlayers,
  createGame,
  createRound,
  DEFAULT_GAME_CONFIG,
  createBomb,
  createDun,
} from './testFactories';

describe('完整单元测试套件', () => {
  // =====================================================
  // cardUtils 模块测试
  // =====================================================
  describe('cardUtils 模块测试', () => {
    describe('牌组创建和洗牌', () => {
      it('应该创建包含54张牌的完整牌组', () => {
        const deck = createDeck();
        expect(deck.length).toBe(54);

        // 检查包含大小王
        const jokers = deck.filter(card => card.suit === Suit.JOKER);
        expect(jokers.length).toBe(2);

        // 检查包含4种花色，每种13张
        const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
        suits.forEach(suit => {
          const cards = deck.filter(card => card.suit === suit);
          expect(cards.length).toBe(13);
        });
      });

      it('洗牌应该改变牌的顺序', () => {
        const deck1 = createDeck();
        const deck2 = createDeck();

        // 由于创建时已经随机，两次创建应该不同
        let hasDifferent = false;
        for (let i = 0; i < deck1.length; i++) {
          if (deck1[i].id !== deck2[i]?.id) {
            hasDifferent = true;
            break;
          }
        }
        expect(hasDifferent).toBe(true);
      });

      it('发牌应该给每个玩家相同数量的牌（4人游戏）', () => {
        const hands = dealCards(4);
        expect(hands.length).toBe(4);

        // 检查每个玩家都有牌（每人54张）
        hands.forEach(hand => {
          expect(hand.length).toBe(54);
        });

        // 检查总数是216张（4副牌）
        const totalCards = hands.reduce((sum, hand) => sum + hand.length, 0);
        expect(totalCards).toBe(216);
      });
    });

    describe('分牌识别', () => {
      it('应该正确识别分牌（5、10、K）', () => {
        const five = createCard(Suit.SPADES, Rank.FIVE);
        const ten = createCard(Suit.HEARTS, Rank.TEN);
        const king = createCard(Suit.DIAMONDS, Rank.KING);
        const three = createCard(Suit.CLUBS, Rank.THREE);

        expect(isScoreCard(five)).toBe(true);
        expect(isScoreCard(ten)).toBe(true);
        expect(isScoreCard(king)).toBe(true);
        expect(isScoreCard(three)).toBe(false);
      });

      it('应该正确计算单张牌的分值', () => {
        const five = createCard(Suit.SPADES, Rank.FIVE);
        const ten = createCard(Suit.HEARTS, Rank.TEN);
        const king = createCard(Suit.DIAMONDS, Rank.KING);
        const three = createCard(Suit.CLUBS, Rank.THREE);

        expect(getCardScore(five)).toBe(5);
        expect(getCardScore(ten)).toBe(10);
        expect(getCardScore(king)).toBe(10);
        expect(getCardScore(three)).toBe(0);
      });

      it('应该正确计算一组牌的总分值', () => {
        const cards = [
          createCard(Suit.SPADES, Rank.FIVE),
          createCard(Suit.HEARTS, Rank.TEN),
          createCard(Suit.DIAMONDS, Rank.KING),
          createCard(Suit.CLUBS, Rank.THREE)
        ];
        expect(calculateCardsScore(cards)).toBe(25); // 5 + 10 + 10 + 0
      });

      it('应该正确计算多张相同分牌的总分值', () => {
        const scoreCards = createScoreCards(true); // 5 + 10 + 10 = 25
        expect(calculateCardsScore(scoreCards)).toBe(25);
      });
    });

    describe('牌型识别', () => {
      it('应该正确识别单张', () => {
        const play = canPlayCards([createCard(Suit.SPADES, Rank.THREE)]);
        expect(play).not.toBeNull();
        expect(play?.type).toBe(CardType.SINGLE);
      });

      it('应该正确识别对子', () => {
        const cards = createSameRankCards(Rank.THREE, 2);
        const play = canPlayCards(cards);
        expect(play).not.toBeNull();
        expect(play?.type).toBe(CardType.PAIR);
      });

      it('应该正确识别三张', () => {
        const cards = createSameRankCards(Rank.THREE, 3);
        const play = canPlayCards(cards);
        expect(play).not.toBeNull();
        expect(play?.type).toBe(CardType.TRIPLE);
      });

      it('应该正确识别炸弹（4张）', () => {
        const cards = createBomb(Rank.THREE, 4);
        const play = canPlayCards(cards);
        expect(play).not.toBeNull();
        expect(play?.type).toBe(CardType.BOMB);
      });

      it('应该正确识别炸弹（5张）', () => {
        const cards = createBomb(Rank.THREE, 5);
        const play = canPlayCards(cards);
        expect(play).not.toBeNull();
        expect(play?.type).toBe(CardType.BOMB);
      });

      it('应该正确识别炸弹（6张）', () => {
        const cards = createBomb(Rank.THREE, 6);
        const play = canPlayCards(cards);
        expect(play).not.toBeNull();
        expect(play?.type).toBe(CardType.BOMB);
      });

      it('应该正确识别墩（7张）', () => {
        const cards = createDun(Rank.THREE, 7);
        const play = canPlayCards(cards);
        expect(play).not.toBeNull();
        expect(play?.type).toBe(CardType.DUN);
      });

      it('应该正确识别墩（8张）', () => {
        const cards = createDun(Rank.THREE, 8);
        const play = canPlayCards(cards);
        expect(play).not.toBeNull();
        expect(play?.type).toBe(CardType.DUN);
      });

      it('应该拒绝不合法的牌型', () => {
        const invalidCards = [
          createCard(Suit.SPADES, Rank.THREE),
          createCard(Suit.HEARTS, Rank.FOUR),
          createCard(Suit.DIAMONDS, Rank.FIVE)
        ];
        const play = canPlayCards(invalidCards);
        expect(play).toBeNull();
      });
    });

    describe('牌型比较', () => {
      it('应该正确比较单张牌的大小', () => {
        const three = canPlayCards([createCard(Suit.SPADES, Rank.THREE)]);
        const four = canPlayCards([createCard(Suit.SPADES, Rank.FOUR)]);
        const two = canPlayCards([createCard(Suit.SPADES, Rank.TWO)]);

        expect(three).not.toBeNull();
        expect(four).not.toBeNull();
        expect(two).not.toBeNull();

        expect(canBeat(four!, three!)).toBe(true);
        expect(canBeat(two!, four!)).toBe(true);
        expect(canBeat(two!, three!)).toBe(true);
      });

      it('应该正确处理炸弹压过普通牌型', () => {
        const single = canPlayCards([createCard(Suit.SPADES, Rank.TWO)]);
        const bomb = canPlayCards(createBomb(Rank.THREE, 4));

        expect(single).not.toBeNull();
        expect(bomb).not.toBeNull();
        expect(canBeat(bomb!, single!)).toBe(true);
      });

      it('应该正确处理更大的炸弹压过小炸弹', () => {
        const bomb4 = canPlayCards(createBomb(Rank.THREE, 4));
        const bomb5 = canPlayCards(createBomb(Rank.FOUR, 5));

        expect(bomb4).not.toBeNull();
        expect(bomb5).not.toBeNull();
        expect(canBeat(bomb5!, bomb4!)).toBe(true);
      });

      it('应该正确处理墩压过所有牌型', () => {
        const single = canPlayCards([createCard(Suit.SPADES, Rank.TWO)]);
        const bomb = canPlayCards(createBomb(Rank.THREE, 6));
        const dun = canPlayCards(createDun(Rank.FOUR, 7));

        expect(single).not.toBeNull();
        expect(bomb).not.toBeNull();
        expect(dun).not.toBeNull();
        expect(canBeat(dun!, single!)).toBe(true);
        expect(canBeat(dun!, bomb!)).toBe(true);
      });

      it('应该正确处理相同张数但不同点数的炸弹比较', () => {
        const bombThree = canPlayCards(createBomb(Rank.THREE, 4));
        const bombFour = canPlayCards(createBomb(Rank.FOUR, 4));
        const bombTwo = canPlayCards(createBomb(Rank.TWO, 4));

        expect(bombThree).not.toBeNull();
        expect(bombFour).not.toBeNull();
        expect(bombTwo).not.toBeNull();

        expect(canBeat(bombFour!, bombThree!)).toBe(true);
        expect(canBeat(bombTwo!, bombFour!)).toBe(true);
      });
    });

    describe('墩的计算', () => {
      it('应该正确计算墩的数量', () => {
        expect(calculateDunCount(6)).toBe(0); // 少于7张不是墩
        expect(calculateDunCount(7)).toBe(1);  // 7张 = 1墩 (2^0)
        expect(calculateDunCount(8)).toBe(2);  // 8张 = 2墩 (2^1)
        expect(calculateDunCount(9)).toBe(4);  // 9张 = 4墩 (2^2)
        expect(calculateDunCount(10)).toBe(8); // 10张 = 8墩 (2^3)
        expect(calculateDunCount(11)).toBe(16); // 11张 = 16墩 (2^4)
      });

      it('应该正确计算墩的分数（4人游戏）', () => {
        // 4人游戏，1墩
        const result1 = calculateDunScore(1, 4, 0);
        expect(result1.dunPlayerScore).toBe(90);  // 3个其他玩家 × 30分 × 1墩
        expect(result1.otherPlayersScore).toBe(30); // 30分 × 1墩

        // 4人游戏，2墩
        const result2 = calculateDunScore(2, 4, 0);
        expect(result2.dunPlayerScore).toBe(180); // 3个其他玩家 × 30分 × 2墩
        expect(result2.otherPlayersScore).toBe(60); // 30分 × 2墩
      });

      it('应该正确计算墩的分数（3人游戏）', () => {
        const result = calculateDunScore(1, 3, 0);
        expect(result.dunPlayerScore).toBe(60);  // 2个其他玩家 × 30分 × 1墩
        expect(result.otherPlayersScore).toBe(30); // 30分 × 1墩
      });
    });
  });

  // =====================================================
  // Round 类测试
  // =====================================================
  describe('Round 类测试', () => {
    let round: Round;

    beforeEach(() => {
      round = createRound();
    });

    it('应该正确创建新轮次', () => {
      expect(round.roundNumber).toBe(1);
      expect(round.isInProgress()).toBe(true);
      expect(round.isEnded()).toBe(false);
      expect(round.getTotalScore()).toBe(0);
      expect(round.getPlayCount()).toBe(0);
    });

    it('应该正确记录出牌', () => {
      const cards = createSameRankCards(Rank.THREE, 1);
      const play = canPlayCards(cards);
      expect(play).not.toBeNull();

      const playRecord = {
        playerId: 0,
        playerName: '测试玩家',
        cards: cards,
        scoreCards: [],
        score: 0
      };

      round.recordPlay(playRecord, play!);
      expect(round.getPlayCount()).toBe(1);
      expect(round.getLastPlay()).toEqual(play);
    });

    it('应该正确计算轮次总分', () => {
      // 使用单张分牌来测试分数计算
      const scoreCard1 = createCard(Suit.SPADES, Rank.FIVE);
      const play1 = canPlayCards([scoreCard1]);
      expect(play1).not.toBeNull();

      const playRecord1 = {
        playerId: 0,
        playerName: '测试玩家1',
        cards: [scoreCard1],
        scoreCards: [scoreCard1],
        score: 5
      };

      round.recordPlay(playRecord1, play1!);
      expect(round.getTotalScore()).toBe(5);

      const scoreCard2 = createCard(Suit.DIAMONDS, Rank.KING);
      const play2 = canPlayCards([scoreCard2]);
      expect(play2).not.toBeNull();

      const playRecord2 = {
        playerId: 1,
        playerName: '测试玩家2',
        cards: [scoreCard2],
        scoreCards: [scoreCard2],
        score: 10
      };

      round.recordPlay(playRecord2, play2!);
      expect(round.getTotalScore()).toBe(15);
    });

    it('应该正确结束轮次', () => {
      const players = createPlayers();
      const result = round.end(players, 4, 0);
      expect(round.isEnded()).toBe(true);
      expect(round.isInProgress()).toBe(false);
      expect(result.winnerIndex).toBe(0);
    });

    it('应该正确转换为记录格式', () => {
      const players = createPlayers();
      round.end(players, 4, 0);
      const record = round.toRecord();

      expect(record.roundNumber).toBe(1);
      expect(record.plays).toBeDefined();
      expect(record.winnerId).toBe(0);
    });
  });

  // =====================================================
  // GameController 类测试
  // =====================================================
  describe('GameController 类测试', () => {
    let game: Game;
    let controller: GameController;

    beforeEach(() => {
      game = createGame();
      controller = game['controller'];
    });

    it('应该正确初始化游戏', () => {
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      controller.initializeGame(players, -100);

      expect(game.players.length).toBe(4);
      game.players.forEach(player => {
        expect(player.score).toBe(-100);
      });
    });

    it('应该正确分配轮次分数', () => {
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
      expect(updatedPlayers[0].score).toBe(-75); // -100 + 25
    });

    it('应该正确处理零分轮次', () => {
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      controller.initializeGame(players, -100);

      const roundRecord = {
        roundNumber: 1,
        startTime: Date.now(),
        endTime: Date.now(),
        plays: [],
        totalScore: 0,
        winnerId: 0,
        winnerName: '玩家1'
      };

      const updatedPlayers = controller.allocateRoundScore(1, 0, 0, players, roundRecord);
      expect(updatedPlayers[0].score).toBe(-100); // 无变化
    });
  });

  // =====================================================
  // playManager 模块测试
  // =====================================================
  describe('playManager 模块测试', () => {
    it('应该正确处理墩的计分', () => {
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

    it('应该正确处理多墩（8张）的计分', () => {
      const players = createPlayers();
      const dunCards = createDun(Rank.FIVE, 8); // 8张 = 2墩
      const play = canPlayCards(dunCards);

      expect(play).not.toBeNull();
      expect(play?.type).toBe(CardType.DUN);

      const result = handleDunScoring(players, 0, dunCards, 4, play!, undefined);

      // 8张 = 2墩，每墩从其他3个玩家各扣30分
      expect(result.dunScore).toBe(180); // 3 × 30 × 2
      expect(result.updatedPlayers[0].dunCount).toBe(2);
    });

    it('应该正确更新玩家出牌后的手牌', () => {
      const hand = [
        createCard(Suit.SPADES, Rank.THREE),
        createCard(Suit.HEARTS, Rank.FOUR),
        createCard(Suit.DIAMONDS, Rank.FIVE)
      ];
      const player = createPlayer(0, '玩家1', hand);
      const cardsToPlay = [hand[0], hand[1]];

      const updatedPlayer = updatePlayerAfterPlay(player, cardsToPlay, 0);
      expect(updatedPlayer.hand.length).toBe(1);
      expect(updatedPlayer.hand[0]).toEqual(hand[2]);
    });

    it('应该正确处理出完所有牌的情况', () => {
      const hand = [createCard(Suit.SPADES, Rank.THREE)];
      const player = createPlayer(0, '玩家1', hand);

      const updatedPlayer = updatePlayerAfterPlay(player, hand, 0);
      expect(updatedPlayer.hand.length).toBe(0);
    });
  });

  // =====================================================
  // Game 类集成测试
  // =====================================================
  describe('Game 类集成测试', () => {
    let game: Game;

    beforeEach(() => {
      game = createGame();
    });

    it('应该正确初始化游戏', () => {
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      game.updateStatus(GameStatus.PLAYING);
      const firstRound = Round.createNew(1);
      game.addRound(firstRound);

      expect(game.status).toBe(GameStatus.PLAYING);
      expect(game.players.length).toBe(4);
      expect(game.rounds.length).toBeGreaterThan(0);
    });

    it('应该正确创建新轮次', () => {
      const players = createPlayers(true);

      game.initialize(players, players.map(p => p.hand));
      const firstRound = Round.createNew(1);
      game.addRound(firstRound);

      const currentRound = game.getCurrentRound();
      expect(currentRound).not.toBeUndefined();
      expect(currentRound?.roundNumber).toBe(1);
    });

    it('应该正确更新玩家状态', () => {
      const players = createPlayers(true);
      game.initialize(players, players.map(p => p.hand));

      game.updatePlayer(0, { score: 50 });
      expect(game.players[0].score).toBe(50);
    });

    it('应该正确处理游戏状态转换', () => {
      expect(game.status).toBe(GameStatus.WAITING);

      game.updateStatus(GameStatus.PLAYING);
      expect(game.status).toBe(GameStatus.PLAYING);

      game.updateStatus(GameStatus.FINISHED);
      expect(game.status).toBe(GameStatus.FINISHED);
    });
  });

  // =====================================================
  // 边界情况测试
  // =====================================================
  describe('边界情况测试', () => {
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
      const maxDun = createSameRankCards(Rank.THREE, 13);
      const play = canPlayCards(maxDun);
      expect(play).not.toBeNull();
      expect(play?.type).toBe(CardType.DUN);

      const dunCount = calculateDunCount(13);
      expect(dunCount).toBeGreaterThan(0);
      expect(dunCount).toBe(64); // 2^6
    });

    it('空牌组应该返回null', () => {
      const play = canPlayCards([]);
      expect(play).toBeNull();
    });
  });
});
