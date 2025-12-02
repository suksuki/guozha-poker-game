/**
 * 验证服务
 * 统一管理所有牌型验证逻辑
 */

import { Card, Play, CardType, Rank } from '../../types/card';
import { getCardType } from '../../utils/cardUtils';
import { ValidationResult, ValidationOptions } from './types';

/**
 * 验证服务类
 * 提供统一的验证接口
 */
export class ValidationService {
  /**
   * 验证牌型是否合法
   * @param cards 要验证的牌
   * @returns 如果合法返回 Play 对象，否则返回 null
   */
  validateCardType(cards: Card[]): Play | null {
    if (!cards || cards.length === 0) {
      return null;
    }

    const result = getCardType(cards);
    if (!result) {
      return null;
    }

    return {
      cards,
      type: result.type,
      value: result.value
    };
  }

  /**
   * 验证出牌规则
   * 检查选中的牌是否可以出，以及是否能压过上家
   * @param cards 要出的牌
   * @param lastPlay 上家出的牌（可选）
   * @param playerHand 玩家手牌（可选，用于验证牌是否在手牌中）
   * @param options 验证选项
   * @returns 验证结果
   */
  validatePlayRules(
    cards: Card[],
    lastPlay: Play | null,
    playerHand?: Card[],
    options: ValidationOptions = {}
  ): ValidationResult {
    // 检查空牌
    if (!cards || cards.length === 0) {
      if (options.allowEmpty) {
        return { valid: true };
      }
      return {
        valid: false,
        error: '请选择要出的牌'
      };
    }

    // 检查牌是否在手牌中
    if (options.checkInHand && playerHand) {
      const cardIds = new Set(cards.map(c => c.id));
      const handIds = new Set(playerHand.map(c => c.id));
      
      for (const cardId of cardIds) {
        if (!handIds.has(cardId)) {
          return {
            valid: false,
            error: '选择的牌不在手牌中'
          };
        }
      }
    }

    // 验证牌型
    const play = this.validateCardType(cards);
    if (!play) {
      return {
        valid: false,
        error: '不是合法的牌型'
      };
    }

    // 如果没有上家出牌，直接通过
    if (!lastPlay) {
      return {
        valid: true,
        play
      };
    }

    // 检查是否能压过上家
    if (!this.canBeat(play, lastPlay)) {
      return {
        valid: false,
        error: '无法压过上家的牌',
        play
      };
    }

    return {
      valid: true,
      play
    };
  }

  /**
   * 判断是否可以压过上家的牌
   * @param play 当前要出的牌
   * @param lastPlay 上家出的牌
   * @returns 是否可以压过
   */
  canBeat(play: Play, lastPlay: Play | null): boolean {
    if (!lastPlay) {
      return true; // 没有上家出牌，可以出任何牌
    }

    // 墩可以压任何非墩牌型
    if (play.type === CardType.DUN && lastPlay.type !== CardType.DUN) {
      return true;
    }

    // 炸弹可以压任何非炸弹、非墩牌型
    if (play.type === CardType.BOMB && lastPlay.type !== CardType.BOMB && lastPlay.type !== CardType.DUN) {
      return true;
    }

    // 同类型牌型比较
    if (play.type === lastPlay.type) {
      // 墩比较
      if (play.type === CardType.DUN) {
        // 墩比较：数量多的赢，数量相同则比较值
        if (play.cards.length > lastPlay.cards.length) {
          return true;
        }
        if (play.cards.length === lastPlay.cards.length) {
          return play.value > lastPlay.value;
        }
        return false;
      }
      // 炸弹比较
      if (play.type === CardType.BOMB) {
        // 炸弹比较：数量多的赢，数量相同则比较值
        if (play.cards.length > lastPlay.cards.length) {
          return true;
        }
        if (play.cards.length === lastPlay.cards.length) {
          return play.value > lastPlay.value;
        }
        return false;
      }
      // 其他牌型需要数量相同
      if (play.cards.length === lastPlay.cards.length) {
        return play.value > lastPlay.value;
      }
    }

    return false;
  }

  /**
   * 从手牌中查找可以出的牌
   * @param hand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @returns 所有可以出的牌组合
   */
  findPlayableCards(hand: Card[], lastPlay: Play | null): Card[][] {
    const playable: Card[][] = [];
    
    if (!lastPlay) {
      // 没有上家出牌，可以出任何合法牌型
      const rankGroups = new Map<Rank, Card[]>();
      hand.forEach(card => {
        if (!rankGroups.has(card.rank)) {
          rankGroups.set(card.rank, []);
        }
        rankGroups.get(card.rank)!.push(card);
      });

      // 单张
      hand.forEach(card => {
        playable.push([card]);
      });

      // 对子
      rankGroups.forEach(cards => {
        if (cards.length >= 2) {
          playable.push(cards.slice(0, 2));
        }
      });

      // 三张
      rankGroups.forEach(cards => {
        if (cards.length >= 3) {
          playable.push(cards.slice(0, 3));
        }
      });

      // 炸弹（4-6张相同）
      rankGroups.forEach(cards => {
        if (cards.length >= 4 && cards.length < 7) {
          playable.push(cards.slice(0, cards.length));
        }
      });

      // 墩（7张及以上相同）
      rankGroups.forEach(cards => {
        if (cards.length >= 7) {
          playable.push(cards.slice(0, cards.length));
        }
      });

      // 大小王特殊处理：4张以下分别出，4张及以上可以一起出
      const jokerSmall = hand.filter(c => c.rank === Rank.JOKER_SMALL);
      const jokerBig = hand.filter(c => c.rank === Rank.JOKER_BIG);
      const totalJokers = jokerSmall.length + jokerBig.length;

      // 4张以下的大小王，分别出
      if (totalJokers < 4) {
        jokerSmall.forEach(card => playable.push([card]));
        jokerBig.forEach(card => playable.push([card]));
        if (jokerSmall.length >= 2) playable.push(jokerSmall.slice(0, 2));
        if (jokerBig.length >= 2) playable.push(jokerBig.slice(0, 2));
        if (jokerSmall.length >= 3) playable.push(jokerSmall.slice(0, 3));
        if (jokerBig.length >= 3) playable.push(jokerBig.slice(0, 3));
      } else {
        // 4张及以上，可以一起出（炸弹或墩）
        const allJokers = [...jokerSmall, ...jokerBig];
        playable.push(allJokers);
      }
    } else {
      // 需要压过上家的牌
      const rankGroups = new Map<Rank, Card[]>();
      hand.forEach(card => {
        if (!rankGroups.has(card.rank)) {
          rankGroups.set(card.rank, []);
        }
        rankGroups.get(card.rank)!.push(card);
      });

      // 尝试找到可以压过的牌
      rankGroups.forEach(cards => {
        // 先检查同类型的牌
        if (lastPlay.type === CardType.SINGLE && cards.length >= 1) {
          const testPlay = this.validateCardType([cards[0]]);
          if (testPlay && this.canBeat(testPlay, lastPlay)) {
            // 单张能压过，高亮该点数的所有牌（因为任意一张都能压过）
            playable.push(cards);
          }
        } else if (lastPlay.type === CardType.PAIR && cards.length >= 2) {
          const testPlay = this.validateCardType(cards.slice(0, 2));
          if (testPlay && this.canBeat(testPlay, lastPlay)) {
            // 对子能压过，高亮该点数的所有牌（因为可以任意选择2张组成对子）
            playable.push(cards);
          }
        } else if (lastPlay.type === CardType.TRIPLE && cards.length >= 3) {
          const testPlay = this.validateCardType(cards.slice(0, 3));
          if (testPlay && this.canBeat(testPlay, lastPlay)) {
            // 三张能压过，高亮该点数的所有牌（因为可以任意选择3张组成三张）
            playable.push(cards);
          }
        } else if (lastPlay.type === CardType.BOMB) {
          // 炸弹可以用更大的炸弹或墩来压
          if (cards.length >= 4 && cards.length <= 6) {
            // 对于4-6张相同点数，直接检查全部是否能压过
            const testPlay = this.validateCardType(cards);
            if (testPlay && testPlay.type === CardType.BOMB && this.canBeat(testPlay, lastPlay)) {
              playable.push(cards);
            }
          }
          // 墩可以压炸弹
          if (cards.length >= 7) {
            const testPlay = this.validateCardType(cards);
            if (testPlay && this.canBeat(testPlay, lastPlay)) {
              playable.push(cards);
            }
          }
        } else if (lastPlay.type === CardType.DUN) {
          // 墩只能用更大的墩来压
          if (cards.length >= 7 && cards.length > lastPlay.cards.length) {
            const testPlay = this.validateCardType(cards);
            if (testPlay && this.canBeat(testPlay, lastPlay)) {
              playable.push(cards);
            }
          }
        }
        
        // 重要：检查炸弹/墩是否可以压过单张、对子、三张
        // 炸弹可以压任何非炸弹、非墩的牌型（单张、对子、三张）
        if (lastPlay.type !== CardType.BOMB && lastPlay.type !== CardType.DUN) {
          // 检查炸弹（4-6张）
          if (cards.length >= 4 && cards.length < 7) {
            const bombPlay = this.validateCardType(cards);
            if (bombPlay && this.canBeat(bombPlay, lastPlay)) {
              playable.push(cards);
            }
          }
          // 检查墩（7张及以上）
          if (cards.length >= 7) {
            const dunPlay = this.validateCardType(cards);
            if (dunPlay && this.canBeat(dunPlay, lastPlay)) {
              playable.push(cards);
            }
          }
        }
      });

      // 大小王特殊处理
      const jokerSmall = hand.filter(c => c.rank === Rank.JOKER_SMALL);
      const jokerBig = hand.filter(c => c.rank === Rank.JOKER_BIG);
      const totalJokers = jokerSmall.length + jokerBig.length;

      if (totalJokers >= 4) {
        // 4张及以上可以一起出作为炸弹或墩
        const allJokers = [...jokerSmall, ...jokerBig];
        const testPlay = this.validateCardType(allJokers);
        if (testPlay && this.canBeat(testPlay, lastPlay)) {
          playable.push(allJokers);
        }
      } else {
        // 4张以下分别出
        if (lastPlay.type === CardType.SINGLE) {
          jokerSmall.forEach(card => {
            const testPlay = this.validateCardType([card]);
            if (testPlay && this.canBeat(testPlay, lastPlay)) {
              playable.push([card]);
            }
          });
          jokerBig.forEach(card => {
            const testPlay = this.validateCardType([card]);
            if (testPlay && this.canBeat(testPlay, lastPlay)) {
              playable.push([card]);
            }
          });
        } else if (lastPlay.type === CardType.PAIR) {
          if (jokerSmall.length >= 2) {
            const testPlay = this.validateCardType(jokerSmall.slice(0, 2));
            if (testPlay && this.canBeat(testPlay, lastPlay)) {
              playable.push(jokerSmall.slice(0, 2));
            }
          }
          if (jokerBig.length >= 2) {
            const testPlay = this.validateCardType(jokerBig.slice(0, 2));
            if (testPlay && this.canBeat(testPlay, lastPlay)) {
              playable.push(jokerBig.slice(0, 2));
            }
          }
        } else if (lastPlay.type === CardType.TRIPLE) {
          if (jokerSmall.length >= 3) {
            const testPlay = this.validateCardType(jokerSmall.slice(0, 3));
            if (testPlay && this.canBeat(testPlay, lastPlay)) {
              playable.push(jokerSmall.slice(0, 3));
            }
          }
          if (jokerBig.length >= 3) {
            const testPlay = this.validateCardType(jokerBig.slice(0, 3));
            if (testPlay && this.canBeat(testPlay, lastPlay)) {
              playable.push(jokerBig.slice(0, 3));
            }
          }
        }
      }
      
      // 重要：大小王炸弹/墩也可以压过单张、对子、三张
      if (totalJokers >= 4) {
        if (lastPlay.type !== CardType.BOMB && lastPlay.type !== CardType.DUN) {
          const allJokers = [...jokerSmall, ...jokerBig];
          const jokerPlay = this.validateCardType(allJokers);
          if (jokerPlay && this.canBeat(jokerPlay, lastPlay)) {
            // 避免重复添加
            const alreadyAdded = playable.some(play => 
              play.length === allJokers.length && 
              play.every(card => allJokers.some(j => j.id === card.id))
            );
            if (!alreadyAdded) {
              playable.push(allJokers);
            }
          }
        }
      }
    }

    return playable;
  }

  /**
   * 检查玩家是否有能打过的牌（用于强制出牌规则）
   * @param hand 玩家手牌
   * @param lastPlay 上家出的牌（可选）
   * @returns 是否有能打过的牌
   */
  hasPlayableCards(hand: Card[], lastPlay: Play | null): boolean {
    if (!lastPlay) {
      // 没有上家出牌，可以出任何牌，所以总是有能出的牌
      return hand.length > 0;
    }
    
    // 查找所有可以出的牌
    const playableCards = this.findPlayableCards(hand, lastPlay);
    
    // 如果有任何可以打过的牌，返回 true
    return playableCards.length > 0;
  }
}

// 导出单例实例
export const validationService = new ValidationService();

