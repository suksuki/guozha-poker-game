/**
 * 语音提示工具
 * 提供工具函数（如playToSpeechText）供其他模块使用
 */

import { Play, CardType, Rank } from '../types/card';
import i18n from '../i18n';

// 将牌型转换为语音文本（支持多语言）
export function playToSpeechText(play: Play): string {
  const { type, cards } = play;
  const cardCount = cards.length;
  
  // 获取第一张牌的rank，用于显示点数
  const firstCard = cards[0];
  const rank = firstCard.rank;
  
  // 将rank转换为当前语言的文本
  const rankText = rankToLocalized(rank);
  
  switch (type) {
    case CardType.SINGLE:
      return rankText;
    
    case CardType.PAIR:
      return i18n.t('cards:speech.pair', { rank: rankText });
    
    case CardType.TRIPLE:
      return i18n.t('cards:speech.triple', { rank: rankText });
    
    case CardType.BOMB:
      return i18n.t('cards:speech.bomb', { count: cardCount, rank: rankText });
    
    case CardType.DUN:
      return i18n.t('cards:speech.dun', { count: cardCount, rank: rankText });
    
    default:
      return i18n.t('cards:speech.default', { count: cardCount });
  }
}

// 将rank转换为当前语言的文本
function rankToLocalized(rank: Rank): string {
  const rankKey = rankToKey(rank);
  return i18n.t(`cards:ranks.${rankKey}`);
}

// 将rank转换为翻译键
function rankToKey(rank: Rank): string {
  switch (rank) {
    case Rank.THREE: return 'three';
    case Rank.FOUR: return 'four';
    case Rank.FIVE: return 'five';
    case Rank.SIX: return 'six';
    case Rank.SEVEN: return 'seven';
    case Rank.EIGHT: return 'eight';
    case Rank.NINE: return 'nine';
    case Rank.TEN: return 'ten';
    case Rank.JACK: return 'jack';
    case Rank.QUEEN: return 'queen';
    case Rank.KING: return 'king';
    case Rank.ACE: return 'ace';
    case Rank.TWO: return 'two';
    case Rank.JOKER_SMALL: return 'jokerSmall';
    case Rank.JOKER_BIG: return 'jokerBig';
    default: return 'unknown';
  }
}
