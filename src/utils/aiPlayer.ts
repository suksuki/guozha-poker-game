import OpenAI from 'openai';
import { Card, Play, PlayerType } from '../types/card';
import { canPlayCards, canBeat, findPlayableCards, sortCards } from './cardUtils';

// AI玩家配置
export interface AIConfig {
  apiKey: string;
  model?: string;
  strategy?: 'aggressive' | 'conservative' | 'balanced';
}

// 将手牌转换为描述性文本
function cardsToDescription(cards: Card[]): string {
  const sorted = sortCards(cards);
  const rankNames: { [key: number]: string } = {
    3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
    11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
    16: '小王', 17: '大王'
  };
  const suitNames: { [key: string]: string } = {
    'spades': '♠', 'hearts': '♥', 'diamonds': '♦', 'clubs': '♣',
    'joker': '🃏'
  };

  return sorted.map(card => {
    if (card.suit === 'joker') {
      return rankNames[card.rank] || '王';
    }
    return `${rankNames[card.rank]}${suitNames[card.suit]}`;
  }).join(' ');
}

// 将牌型转换为描述
function playToDescription(play: Play | null): string {
  if (!play) return '无';
  
  const typeNames: { [key: string]: string } = {
    'single': '单张',
    'pair': '对子',
    'triple': '三张',
    'bomb': '炸弹',
    'dun': '墩'
  };

  return `${typeNames[play.type]} (${cardsToDescription(play.cards)})`;
}

// 使用OpenAI选择出牌
export async function aiChoosePlay(
  hand: Card[],
  lastPlay: Play | null,
  config: AIConfig
): Promise<Card[] | null> {
  try {
    const openai = new OpenAI({
      apiKey: config.apiKey,
      dangerouslyAllowBrowser: true // 注意：在生产环境中应该使用后端代理
    });

    const handDesc = cardsToDescription(hand);
    const lastPlayDesc = playToDescription(lastPlay);
    const strategy = config.strategy || 'balanced';

    const strategyPrompt = {
      aggressive: '激进策略：尽量出大牌压制对手，快速出完手牌',
      conservative: '保守策略：尽量保留大牌，等待合适时机',
      balanced: '平衡策略：根据情况灵活出牌'
    }[strategy];

    // 找到所有可以出的牌
    const playableOptions = findPlayableCards(hand, lastPlay);
    
    if (playableOptions.length === 0) {
      return null; // 要不起
    }

    const optionsDesc = playableOptions.map((cards, index) => {
      const play = canPlayCards(cards);
      return `${index + 1}. ${playToDescription(play)}`;
    }).join('\n');

    const prompt = `你是一个过炸扑克游戏的AI玩家。游戏规则类似争上游，需要尽快出完手牌。

当前手牌：${handDesc}
上家出牌：${lastPlayDesc}
手牌数量：${hand.length}张

可选出牌方案：
${optionsDesc}

策略：${strategyPrompt}

请分析当前局势，选择一个最合适的出牌方案。只返回数字（1-${playableOptions.length}），或者返回"pass"表示要不起。`;

    const response = await openai.chat.completions.create({
      model: config.model || 'gpt-3.5-turbo',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的过炸扑克游戏AI，擅长分析牌局并做出最优决策。'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 50,
      temperature: 0.7
    });

    const choice = response.choices[0]?.message?.content?.trim().toLowerCase() || '';
    
    if (choice === 'pass' || choice.includes('要不起')) {
      return null;
    }

    const match = choice.match(/\d+/);
    if (match) {
      const index = parseInt(match[0]) - 1;
      if (index >= 0 && index < playableOptions.length) {
        return playableOptions[index];
      }
    }

    // 如果AI返回不明确，使用简单策略
    return simpleAIStrategy(hand, lastPlay, strategy);
  } catch (error) {
    console.error('AI选择出牌失败，使用简单策略:', error);
    return simpleAIStrategy(hand, lastPlay, config.strategy || 'balanced');
  }
}

// 简单AI策略（备用方案）
function simpleAIStrategy(
  hand: Card[],
  lastPlay: Play | null,
  strategy: string
): Card[] | null {
  const playableOptions = findPlayableCards(hand, lastPlay);
  
  if (playableOptions.length === 0) {
    return null;
  }

  // 简单策略：选择最小的可以压过的牌
  const validPlays = playableOptions
    .map(cards => canPlayCards(cards))
    .filter((play): play is Play => {
      if (!play) return false;
      if (!lastPlay) return true;
      return canBeat(play, lastPlay);
    });

  if (validPlays.length === 0) {
    return null;
  }

  // 根据策略选择
  if (strategy === 'aggressive') {
    // 激进：选择最大的牌
    validPlays.sort((a, b) => b.value - a.value);
  } else if (strategy === 'conservative') {
    // 保守：选择最小的牌
    validPlays.sort((a, b) => a.value - b.value);
  } else {
    // 平衡：选择中等大小的牌
    validPlays.sort((a, b) => a.value - b.value);
    const midIndex = Math.floor(validPlays.length / 2);
    return validPlays[midIndex].cards;
  }

  return validPlays[0].cards;
}

