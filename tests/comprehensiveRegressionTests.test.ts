/**
 * 完整的回归测试套件
 * 确保已修复的bug不会再次出现
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Card, Suit, Rank, CardType, PlayerType, GameStatus } from '../src/types/card';
import { Game, GameSetupConfig } from '../src/utils/Game';
import { Round } from '../src/utils/Round';
import {
  createDeck,
  shuffleDeck,
  dealCards,
  canPlayCards,
  canBeat,
  isScoreCard,
  calculateCardsScore,
  calculateDunCount,
  calculateDunScore,
  hasPlayableCards
} from '../src/utils/cardUtils';
import { GameController } from '../src/utils/gameController';
import { handleDunScoring, updatePlayerAfterPlay } from '../src/utils/playManager';

// 辅助函数
function createCard(suit: Suit, rank: Rank, id?: string): Card {
  return { suit, rank, id: id || `${suit}-${rank}-${Math.random()}` };
}

function createSameRankCards(rank: Rank, count: number): Card[] {
  const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
  const cards: Card[] = [];
  for (let i = 0; i < count; i++) {
    cards.push(createCard(suits[i % 4], rank, `${rank}-${i}`));
  }
  return cards;
}

function createPlayer(id: number, name: string, hand: Card[], type: PlayerType = PlayerType.AI) {
  return {
    id,
    name,
    type,
    hand,
    score: -100,
    isHuman: type === PlayerType.HUMAN
  };
}

describe('完整回归测试套件', () => {
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
      
      // 注意：dealCards会为每个玩家创建一副牌（54张），所以4人游戏总共216张牌
      // 检查总牌数正确
      const totalCards = hands.reduce((sum, hand) => sum + hand.length, 0);
      expect(totalCards).toBe(216);
    });

    it('多次发牌应该产生不同的结果', () => {
      const allHands: Card[][][] = [];
      for (let i = 0; i < 5; i++) {
        allHands.push(dealCards(4));
      }
      
      // 至少有两组手牌不同
      let hasDifferent = false;
      for (let i = 0; i < allHands.length - 1; i++) {
        for (let j = i + 1; j < allHands.length; j++) {
          const hands1 = allHands[i];
          const hands2 = allHands[j];
          for (let k = 0; k < 4; k++) {
            if (hands1[k].some((card, idx) => card.id !== hands2[k][idx]?.id)) {
              hasDifferent = true;
              break;
            }
          }
          if (hasDifferent) break;
        }
        if (hasDifferent) break;
      }
      expect(hasDifferent).toBe(true);
    });
  });

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
      const bomb4 = canPlayCards(createSameRankCards(Rank.THREE, 4));
      expect(bomb4?.type).toBe(CardType.BOMB);

      // 炸弹（5张）
      const bomb5 = canPlayCards(createSameRankCards(Rank.THREE, 5));
      expect(bomb5?.type).toBe(CardType.BOMB);

      // 炸弹（6张）
      const bomb6 = canPlayCards(createSameRankCards(Rank.THREE, 6));
      expect(bomb6?.type).toBe(CardType.BOMB);

      // 墩（7张）
      const dun = canPlayCards(createSameRankCards(Rank.THREE, 7));
      expect(dun?.type).toBe(CardType.DUN);

      // 墩（8张）
      const dun8 = canPlayCards(createSameRankCards(Rank.THREE, 8));
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
  });

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
      const bomb = canPlayCards(createSameRankCards(Rank.THREE, 4));

      expect(single).not.toBeNull();
      expect(bomb).not.toBeNull();
      
      // 炸弹应该能压过单张
      expect(canBeat(bomb!, single!)).toBe(true);
      // 单张不应该能压过炸弹
      expect(canBeat(single!, bomb!)).toBe(false);
    });

    it('应该正确处理更大的炸弹压过小炸弹（不会出现小炸弹压过大炸弹）', () => {
      const bomb4 = canPlayCards(createSameRankCards(Rank.THREE, 4));
      const bomb5 = canPlayCards(createSameRankCards(Rank.FOUR, 5));

      expect(bomb4).not.toBeNull();
      expect(bomb5).not.toBeNull();
      
      // 5张炸弹应该能压过4张炸弹
      expect(canBeat(bomb5!, bomb4!)).toBe(true);
      // 4张炸弹不应该能压过5张炸弹
      expect(canBeat(bomb4!, bomb5!)).toBe(false);
    });

    it('应该正确处理墩压过所有牌型（不会出现其他牌型压过墩）', () => {
      const single = canPlayCards([createCard(Suit.SPADES, Rank.TWO)]);
      const bomb = canPlayCards(createSameRankCards(Rank.THREE, 6));
      const dun = canPlayCards(createSameRankCards(Rank.FOUR, 7));

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
  });

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
  });

  describe('游戏状态回归测试', () => {
    it('游戏初始化后应该处于正确的状态', () => {
      const config: GameSetupConfig = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: [
          { strategy: 'balanced' },
          { strategy: 'balanced' },
          { strategy: 'balanced' }
        ]
      };
      const game = new Game(config);

      const players = [
        createPlayer(0, '玩家1', [], PlayerType.HUMAN),
        createPlayer(1, '玩家2', []),
        createPlayer(2, '玩家3', []),
        createPlayer(3, '玩家4', [])
      ];
      const hands = dealCards(4);
      players.forEach((p, i) => {
        p.hand = hands[i];
      });

      game.initialize(players, hands);
      // initialize后状态是WAITING，需要手动设置状态并创建第一轮
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

      const players = [
        createPlayer(0, '测试玩家', []),
        createPlayer(1, '玩家2', []),
        createPlayer(2, '玩家3', []),
        createPlayer(3, '玩家4', [])
      ];
      const result = round.end(players, 4, 0);
      expect(round.isEnded()).toBe(true);
      expect(round.isInProgress()).toBe(false);
      expect(result.winnerIndex).toBe(0);
    });
  });

  describe('分数分配回归测试', () => {
    it('轮次分数应该正确分配给获胜玩家', () => {
      const config: GameSetupConfig = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: [
          { strategy: 'balanced' },
          { strategy: 'balanced' },
          { strategy: 'balanced' }
        ]
      };
      const game = new Game(config);
      const controller = game['controller'];

      const players = [
        createPlayer(0, '玩家1', [], PlayerType.HUMAN),
        createPlayer(1, '玩家2', []),
        createPlayer(2, '玩家3', []),
        createPlayer(3, '玩家4', [])
      ];
      const hands = dealCards(4);
      players.forEach((p, i) => {
        p.hand = hands[i];
      });

      game.initialize(players, hands);
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
      const players = [
        createPlayer(0, '玩家1', []),
        createPlayer(1, '玩家2', []),
        createPlayer(2, '玩家3', []),
        createPlayer(3, '玩家4', [])
      ];

      const dunCards = createSameRankCards(Rank.THREE, 7);
      const play = canPlayCards(dunCards);
      expect(play).not.toBeNull();
      expect(play?.type).toBe(CardType.DUN);

      const result = handleDunScoring(players, 0, dunCards, 4, play!, undefined);
      
      // 1墩，4人游戏：出墩玩家获得90分，其他玩家各扣30分
      // 注意：handleDunScoring只处理其他玩家的扣分，出墩玩家的加分在updatePlayerAfterPlay中处理
      expect(result.updatedPlayers[1].score).toBe(-130); // -100 - 30
      expect(result.updatedPlayers[2].score).toBe(-130);
      expect(result.updatedPlayers[3].score).toBe(-130);
      expect(result.dunScore).toBe(90); // 出墩玩家应该获得的分数
      
      // 测试updatePlayerAfterPlay来更新出墩玩家的分数
      const updatedPlayer0 = updatePlayerAfterPlay(result.updatedPlayers[0], dunCards, result.dunScore);
      expect(updatedPlayer0.score).toBe(-10); // -100 + 90
    });
  });

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
    });
  });
});

