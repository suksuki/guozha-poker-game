/**
 * 将出牌转换为语音文本（支持多语言）
 */

import type { Play } from '@/core/types/card';
import { CardType, Rank } from '@/core/types/card';
import type { SupportedLocale } from '@/i18n';

type TTSLang = 'zh' | 'ja' | 'ko' | 'en';

const rankByLocale: Record<TTSLang, Partial<Record<Rank, string>>> = {
  zh: {
    [Rank.THREE]: '三', [Rank.FOUR]: '四', [Rank.FIVE]: '五', [Rank.SIX]: '六',
    [Rank.SEVEN]: '七', [Rank.EIGHT]: '八', [Rank.NINE]: '九', [Rank.TEN]: '十',
    [Rank.JACK]: 'J', [Rank.QUEEN]: 'Q', [Rank.KING]: 'K', [Rank.ACE]: 'A',
    [Rank.TWO]: '二', [Rank.JOKER_SMALL]: '小王', [Rank.JOKER_BIG]: '大王'
  },
  ko: {
    [Rank.THREE]: '쓰리', [Rank.FOUR]: '포', [Rank.FIVE]: '파이브', [Rank.SIX]: '식스',
    [Rank.SEVEN]: '세븐', [Rank.EIGHT]: '에이트', [Rank.NINE]: '나인', [Rank.TEN]: '텐',
    [Rank.JACK]: 'J', [Rank.QUEEN]: 'Q', [Rank.KING]: 'K', [Rank.ACE]: 'A',
    [Rank.TWO]: '투', [Rank.JOKER_SMALL]: '작은 조커', [Rank.JOKER_BIG]: '큰 조커'
  },
  ja: {
    [Rank.THREE]: 'スリー', [Rank.FOUR]: 'フォー', [Rank.FIVE]: 'ファイブ', [Rank.SIX]: 'シックス',
    [Rank.SEVEN]: 'セブン', [Rank.EIGHT]: 'エイト', [Rank.NINE]: 'ナイン', [Rank.TEN]: 'テン',
    [Rank.JACK]: 'J', [Rank.QUEEN]: 'Q', [Rank.KING]: 'K', [Rank.ACE]: 'A',
    [Rank.TWO]: 'ツー', [Rank.JOKER_SMALL]: 'ジョーカー小', [Rank.JOKER_BIG]: 'ジョーカー大'
  },
  en: {
    [Rank.THREE]: 'three', [Rank.FOUR]: 'four', [Rank.FIVE]: 'five', [Rank.SIX]: 'six',
    [Rank.SEVEN]: 'seven', [Rank.EIGHT]: 'eight', [Rank.NINE]: 'nine', [Rank.TEN]: 'ten',
    [Rank.JACK]: 'J', [Rank.QUEEN]: 'Q', [Rank.KING]: 'K', [Rank.ACE]: 'A',
    [Rank.TWO]: 'two', [Rank.JOKER_SMALL]: 'small joker', [Rank.JOKER_BIG]: 'big joker'
  }
};

/** 根据 locale 得到 TTS 用语言码 */
function localeToTTSLang(locale: SupportedLocale): TTSLang {
  if (locale.startsWith('ko')) return 'ko';
  if (locale.startsWith('ja')) return 'ja';
  if (locale.startsWith('en')) return 'en';
  return 'zh';
}

/**
 * 将出牌转换为语音文本
 * @param play 出牌
 * @param locale 当前界面语言，不传则用默认（中文）
 */
export function playToSpeechText(play: Play, locale?: SupportedLocale): string {
  const lang: TTSLang = locale ? localeToTTSLang(locale) : 'zh';
  const rankMap = rankByLocale[lang];
  const { type, cards } = play;
  const cardCount = cards.length;
  const firstCard = cards[0];
  const rank = firstCard.rank;
  const rankText = rankMap[rank] ?? String(rank);

  switch (type) {
    case CardType.SINGLE:
      return rankText;
    case CardType.PAIR:
      return lang === 'zh' ? `对${rankText}` : lang === 'ko' ? `${rankText} 페어` : lang === 'ja' ? `${rankText}ペア` : `${rankText} pair`;
    case CardType.TRIPLE:
      return lang === 'zh' ? `三个${rankText}` : lang === 'ko' ? `${rankText} 트리플` : lang === 'ja' ? `${rankText}スリー` : `${rankText} triple`;
    case CardType.BOMB:
      return lang === 'zh' ? `${cardCount}个${rankText}` : lang === 'ko' ? `${rankText} ${cardCount}장` : lang === 'ja' ? `${rankText}${cardCount}枚` : `${cardCount} ${rankText}s`;
    case CardType.DUN:
      return lang === 'zh' ? `${cardCount}个${rankText}` : lang === 'ko' ? `${rankText} ${cardCount}장` : lang === 'ja' ? `${rankText}${cardCount}枚` : `${cardCount} ${rankText}s`;
    default:
      return lang === 'zh' ? `${cardCount}个${rankText}` : `${rankText} ${cardCount}`;
  }
}
