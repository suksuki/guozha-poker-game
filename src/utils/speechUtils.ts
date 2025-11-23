/**
 * 语音提示工具
 * 提供工具函数（如playToSpeechText）供其他模块使用
 */

import { Play, CardType, Rank } from '../types/card';

// 将牌型转换为中文语音文本
export function playToSpeechText(play: Play): string {
  const { type, cards } = play;
  const cardCount = cards.length;
  
  // 获取第一张牌的rank，用于显示点数
  const firstCard = cards[0];
  const rank = firstCard.rank;
  
  // 将rank转换为中文
  const rankText = rankToChinese(rank);
  
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
      return `${cardCount}张牌`;
  }
}

// 将rank转换为中文
function rankToChinese(rank: Rank): string {
  switch (rank) {
    case Rank.THREE: return '三';
    case Rank.FOUR: return '四';
    case Rank.FIVE: return '五';
    case Rank.SIX: return '六';
    case Rank.SEVEN: return '七';
    case Rank.EIGHT: return '八';
    case Rank.NINE: return '九';
    case Rank.TEN: return '十';
    case Rank.JACK: return '钩';
    case Rank.QUEEN: return '圈圈';
    case Rank.KING: return 'K';
    case Rank.ACE: return '桌桌';
    case Rank.TWO: return '喔喔';
    case Rank.JOKER_SMALL: return '小王';
    case Rank.JOKER_BIG: return '大王';
    default: return '未知';
  }
}
