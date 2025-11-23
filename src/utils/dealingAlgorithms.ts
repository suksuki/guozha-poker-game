/**
 * 发牌算法模块
 * 支持多种发牌策略：随机、公平、偏袒等
 */

import { Card, Suit, Rank } from '../types/card';
import { createDeck, shuffleDeck, getCardScore, isScoreCard } from './cardUtils';

// 发牌算法类型
export type DealingAlgorithm = 
  | 'random'           // 完全随机
  | 'fair'             // 公平分配（尽量平均分配好牌）
  | 'favor-human'       // 偏袒人类玩家
  | 'favor-ai'          // 偏袒AI玩家
  | 'balanced-score'    // 平衡分牌分配
  | 'clustered'         // 聚类分配（好牌集中）

// 发牌配置
export interface DealingConfig {
  algorithm: DealingAlgorithm;
  playerCount: number;
  favorPlayerIndex?: number; // 偏袒模式时指定偏袒的玩家索引
  balanceScore?: boolean;    // 是否平衡分牌
}

// 发牌结果
export interface DealingResult {
  hands: Card[][];
  totalCards: number;
  cardsPerPlayer: number[];
}

/**
 * 获取更随机的随机数
 */
function getRandomValue(): number {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / (0xFFFFFFFF + 1);
  }
  return Math.random();
}

/**
 * 评估手牌质量（用于公平分配）
 */
function evaluateHandQuality(hand: Card[]): number {
  let quality = 0;
  
  // 炸弹牌（多张相同）
  const rankCounts: { [key: number]: number } = {};
  hand.forEach(card => {
    rankCounts[card.rank] = (rankCounts[card.rank] || 0) + 1;
  });
  
  Object.values(rankCounts).forEach(count => {
    if (count >= 4) quality += count * 20; // 炸弹
    else if (count === 3) quality += 10;    // 三张
    else if (count === 2) quality += 5;     // 对子
  });
  
  // 大小王
  const jokers = hand.filter(c => c.suit === Suit.JOKER);
  quality += jokers.length * 15;
  
  // 2和A
  const highCards = hand.filter(c => c.rank === Rank.TWO || c.rank === Rank.ACE);
  quality += highCards.length * 3;
  
  // 分牌（5、10、K）
  const scoreCards = hand.filter(c => isScoreCard(c));
  quality += scoreCards.length * 2;
  
  return quality;
}

/**
 * 随机发牌算法
 */
function randomDealing(playerCount: number): DealingResult {
  const allCards: Card[] = [];
  const timestamp = Date.now();
  
  // 创建所有牌（playerCount副牌）
  for (let deckIndex = 0; deckIndex < playerCount; deckIndex++) {
    const deck = createDeck();
    deck.forEach((card, cardIndex) => {
      const randomSeed = getRandomValue();
      if (card.suit === Suit.JOKER) {
        card.id = `joker-${card.rank === Rank.JOKER_SMALL ? 'small' : 'big'}-deck${deckIndex}-card${cardIndex}-${timestamp}-${randomSeed}`;
      } else {
        card.id = `${card.suit}-${card.rank}-deck${deckIndex}-card${cardIndex}-${timestamp}-${randomSeed}`;
      }
      allCards.push(card);
    });
  }
  
  // 洗牌
  const shuffled = shuffleDeck(allCards);
  
  // 分发给每个玩家
  const hands: Card[][] = [];
  const cardsPerPlayer = Math.floor(shuffled.length / playerCount);
  
  for (let i = 0; i < playerCount; i++) {
    const startIndex = i * cardsPerPlayer;
    const endIndex = (i === playerCount - 1) ? shuffled.length : (i + 1) * cardsPerPlayer;
    const playerHand = shuffled.slice(startIndex, endIndex);
    
    playerHand.forEach((card, cardIndexInHand) => {
      card.id = `${card.id}-player${i}-hand${cardIndexInHand}`;
    });
    
    hands.push(playerHand);
  }
  
  return {
    hands,
    totalCards: shuffled.length,
    cardsPerPlayer: hands.map(h => h.length)
  };
}

/**
 * 公平发牌算法（尽量平均分配好牌）
 */
function fairDealing(playerCount: number): DealingResult {
  const allCards: Card[] = [];
  const timestamp = Date.now();
  
  // 创建所有牌
  for (let deckIndex = 0; deckIndex < playerCount; deckIndex++) {
    const deck = createDeck();
    deck.forEach((card, cardIndex) => {
      const randomSeed = getRandomValue();
      if (card.suit === Suit.JOKER) {
        card.id = `joker-${card.rank === Rank.JOKER_SMALL ? 'small' : 'big'}-deck${deckIndex}-card${cardIndex}-${timestamp}-${randomSeed}`;
      } else {
        card.id = `${card.suit}-${card.rank}-deck${deckIndex}-card${cardIndex}-${timestamp}-${randomSeed}`;
      }
      allCards.push(card);
    });
  }
  
  // 洗牌
  const shuffled = shuffleDeck(allCards);
  
  // 按质量排序（好牌在前）
  const sortedCards = [...shuffled].sort((a, b) => {
    const scoreA = getCardScore(a) + (a.rank === Rank.TWO ? 5 : 0) + (a.rank === Rank.ACE ? 3 : 0) + (a.suit === Suit.JOKER ? 10 : 0);
    const scoreB = getCardScore(b) + (b.rank === Rank.TWO ? 5 : 0) + (b.rank === Rank.ACE ? 3 : 0) + (b.suit === Suit.JOKER ? 10 : 0);
    return scoreB - scoreA;
  });
  
  // 轮询分配好牌
  const hands: Card[][] = Array(playerCount).fill(null).map(() => []);
  const cardsPerPlayer = Math.floor(sortedCards.length / playerCount);
  
  // 先分配好牌（轮询）
  for (let i = 0; i < cardsPerPlayer * playerCount; i++) {
    const playerIndex = i % playerCount;
    hands[playerIndex].push(sortedCards[i]);
  }
  
  // 剩余牌随机分配
  const remainingCards = sortedCards.slice(cardsPerPlayer * playerCount);
  remainingCards.forEach((card, index) => {
    const playerIndex = index % playerCount;
    hands[playerIndex].push(card);
  });
  
  // 为每张牌添加ID
  hands.forEach((hand, playerIndex) => {
    hand.forEach((card, cardIndex) => {
      card.id = `${card.id || `${card.suit}-${card.rank}`}-player${playerIndex}-hand${cardIndex}`;
    });
  });
  
  // 每个手牌内部洗牌（保持公平但增加随机性）
  hands.forEach(hand => {
    for (let i = hand.length - 1; i > 0; i--) {
      const j = Math.floor(getRandomValue() * (i + 1));
      [hand[i], hand[j]] = [hand[j], hand[i]];
    }
  });
  
  return {
    hands,
    totalCards: sortedCards.length,
    cardsPerPlayer: hands.map(h => h.length)
  };
}

/**
 * 偏袒发牌算法（给指定玩家更好的牌）
 */
function favorDealing(playerCount: number, favorPlayerIndex: number): DealingResult {
  const allCards: Card[] = [];
  const timestamp = Date.now();
  
  // 创建所有牌
  for (let deckIndex = 0; deckIndex < playerCount; deckIndex++) {
    const deck = createDeck();
    deck.forEach((card, cardIndex) => {
      const randomSeed = getRandomValue();
      if (card.suit === Suit.JOKER) {
        card.id = `joker-${card.rank === Rank.JOKER_SMALL ? 'small' : 'big'}-deck${deckIndex}-card${cardIndex}-${timestamp}-${randomSeed}`;
      } else {
        card.id = `${card.suit}-${card.rank}-deck${deckIndex}-card${cardIndex}-${timestamp}-${randomSeed}`;
      }
      allCards.push(card);
    });
  }
  
  // 洗牌
  const shuffled = shuffleDeck(allCards);
  
  // 按质量排序
  const sortedCards = [...shuffled].sort((a, b) => {
    const scoreA = getCardScore(a) + (a.rank === Rank.TWO ? 5 : 0) + (a.rank === Rank.ACE ? 3 : 0) + (a.suit === Suit.JOKER ? 10 : 0);
    const scoreB = getCardScore(b) + (b.rank === Rank.TWO ? 5 : 0) + (b.rank === Rank.ACE ? 3 : 0) + (b.suit === Suit.JOKER ? 10 : 0);
    return scoreB - scoreA;
  });
  
  const hands: Card[][] = Array(playerCount).fill(null).map(() => []);
  const cardsPerPlayer = Math.floor(sortedCards.length / playerCount);
  
  // 给偏袒玩家分配更多好牌
  let cardIndex = 0;
  for (let round = 0; round < cardsPerPlayer; round++) {
    for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
      if (cardIndex >= sortedCards.length) break;
      
      // 偏袒玩家优先拿好牌
      if (playerIndex === favorPlayerIndex && round < cardsPerPlayer * 0.6) {
        // 前60%的轮次，偏袒玩家优先
        hands[playerIndex].push(sortedCards[cardIndex]);
      } else {
        // 其他玩家随机分配
        const randomIndex = Math.floor(getRandomValue() * Math.min(10, sortedCards.length - cardIndex)) + cardIndex;
        hands[playerIndex].push(sortedCards[randomIndex]);
        sortedCards.splice(randomIndex, 1);
        cardIndex--;
      }
      cardIndex++;
    }
  }
  
  // 剩余牌随机分配
  const remainingCards = sortedCards.slice(cardIndex);
  remainingCards.forEach((card, index) => {
    const playerIndex = (favorPlayerIndex + index + 1) % playerCount;
    hands[playerIndex].push(card);
  });
  
  // 为每张牌添加ID
  hands.forEach((hand, playerIndex) => {
    hand.forEach((card, cardIndex) => {
      card.id = `${card.id || `${card.suit}-${card.rank}`}-player${playerIndex}-hand${cardIndex}`;
    });
  });
  
  // 每个手牌内部洗牌
  hands.forEach(hand => {
    for (let i = hand.length - 1; i > 0; i--) {
      const j = Math.floor(getRandomValue() * (i + 1));
      [hand[i], hand[j]] = [hand[j], hand[i]];
    }
  });
  
  return {
    hands,
    totalCards: shuffled.length,
    cardsPerPlayer: hands.map(h => h.length)
  };
}

/**
 * 平衡分牌发牌算法（尽量平均分配分牌）
 */
function balancedScoreDealing(playerCount: number): DealingResult {
  const allCards: Card[] = [];
  const timestamp = Date.now();
  
  // 创建所有牌
  for (let deckIndex = 0; deckIndex < playerCount; deckIndex++) {
    const deck = createDeck();
    deck.forEach((card, cardIndex) => {
      const randomSeed = getRandomValue();
      if (card.suit === Suit.JOKER) {
        card.id = `joker-${card.rank === Rank.JOKER_SMALL ? 'small' : 'big'}-deck${deckIndex}-card${cardIndex}-${timestamp}-${randomSeed}`;
      } else {
        card.id = `${card.suit}-${card.rank}-deck${deckIndex}-card${cardIndex}-${timestamp}-${randomSeed}`;
      }
      allCards.push(card);
    });
  }
  
  // 分离分牌和非分牌
  const scoreCards: Card[] = [];
  const nonScoreCards: Card[] = [];
  
  allCards.forEach(card => {
    if (isScoreCard(card)) {
      scoreCards.push(card);
    } else {
      nonScoreCards.push(card);
    }
  });
  
  // 洗牌
  const shuffledScoreCards = shuffleDeck(scoreCards);
  const shuffledNonScoreCards = shuffleDeck(nonScoreCards);
  
  const hands: Card[][] = Array(playerCount).fill(null).map(() => []);
  
  // 轮询分配分牌
  shuffledScoreCards.forEach((card, index) => {
    const playerIndex = index % playerCount;
    hands[playerIndex].push(card);
  });
  
  // 轮询分配非分牌
  shuffledNonScoreCards.forEach((card, index) => {
    const playerIndex = index % playerCount;
    hands[playerIndex].push(card);
  });
  
  // 为每张牌添加ID
  hands.forEach((hand, playerIndex) => {
    hand.forEach((card, cardIndex) => {
      card.id = `${card.id || `${card.suit}-${card.rank}`}-player${playerIndex}-hand${cardIndex}`;
    });
  });
  
  // 每个手牌内部洗牌
  hands.forEach(hand => {
    for (let i = hand.length - 1; i > 0; i--) {
      const j = Math.floor(getRandomValue() * (i + 1));
      [hand[i], hand[j]] = [hand[j], hand[i]];
    }
  });
  
  return {
    hands,
    totalCards: allCards.length,
    cardsPerPlayer: hands.map(h => h.length)
  };
}

/**
 * 主发牌函数
 */
export function dealCardsWithAlgorithm(config: DealingConfig): DealingResult {
  switch (config.algorithm) {
    case 'random':
      return randomDealing(config.playerCount);
    
    case 'fair':
      return fairDealing(config.playerCount);
    
    case 'favor-human':
      return favorDealing(config.playerCount, config.favorPlayerIndex || 0);
    
    case 'favor-ai':
      // 随机选择一个AI玩家偏袒
      const aiPlayerIndex = config.favorPlayerIndex || Math.floor(getRandomValue() * (config.playerCount - 1)) + 1;
      return favorDealing(config.playerCount, aiPlayerIndex);
    
    case 'balanced-score':
      return balancedScoreDealing(config.playerCount);
    
    case 'clustered':
      // 聚类分配：使用公平算法但增加好牌集中度
      return fairDealing(config.playerCount);
    
    default:
      return randomDealing(config.playerCount);
  }
}

/**
 * 获取发牌算法的描述
 */
export function getDealingAlgorithmDescription(algorithm: DealingAlgorithm): string {
  const descriptions: { [key in DealingAlgorithm]: string } = {
    'random': '完全随机发牌',
    'fair': '公平分配（尽量平均分配好牌）',
    'favor-human': '偏袒人类玩家',
    'favor-ai': '偏袒AI玩家',
    'balanced-score': '平衡分牌分配',
    'clustered': '聚类分配（好牌集中）'
  };
  return descriptions[algorithm] || '未知算法';
}

