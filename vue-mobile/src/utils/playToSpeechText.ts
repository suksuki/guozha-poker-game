/**
 * 将出牌转换为语音文本
 * 简化版本，用于移动端
 */

import type { Play } from '../types/card';
import { CardType, Rank } from '../types/card';

// Rank到中文的映射
const rankToChinese: Record<Rank, string> = {
  [Rank.THREE]: '三',
  [Rank.FOUR]: '四',
  [Rank.FIVE]: '五',
  [Rank.SIX]: '六',
  [Rank.SEVEN]: '七',
  [Rank.EIGHT]: '八',
  [Rank.NINE]: '九',
  [Rank.TEN]: '十',
  [Rank.JACK]: 'J',
  [Rank.QUEEN]: 'Q',
  [Rank.KING]: 'K',
  [Rank.ACE]: 'A',
  [Rank.TWO]: '二',
  [Rank.JOKER_SMALL]: '小王',
  [Rank.JOKER_BIG]: '大王'
};

/**
 * 将出牌转换为语音文本
 */
export function playToSpeechText(play: Play): string {
  const { type, cards } = play;
  const cardCount = cards.length;
  
  // 获取第一张牌的rank
  const firstCard = cards[0];
  const rank = firstCard.rank;
  const rankText = rankToChinese[rank] || '未知';
  
  switch (type) {
    case CardType.SINGLE:
      return rankText;
    
    case CardType.PAIR:
      return `对${rankText}`;
    
    case CardType.TRIPLE:
      return `三个${rankText}`;
    
    case CardType.BOMB:
      return `${cardCount}个${rankText}`;
    
    case CardType.DUN:
      return `${cardCount}个${rankText}`;
    
    default:
      return `${cardCount}个${rankText}`;
  }
}

