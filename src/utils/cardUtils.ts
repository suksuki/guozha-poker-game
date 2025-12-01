import { Card, Suit, Rank, CardType, Play } from '../types/card';

// 分牌规则：5=5分，10=10分，K=10分
export function isScoreCard(card: Card): boolean {
  return card.rank === Rank.FIVE || card.rank === Rank.TEN || card.rank === Rank.KING;
}

// 获取单张牌的分值
export function getCardScore(card: Card): number {
  if (card.rank === Rank.FIVE) {
    return 5;
  } else if (card.rank === Rank.TEN || card.rank === Rank.KING) {
    return 10;
  }
  return 0;
}

// 计算一组牌的总分值
export function calculateCardsScore(cards: Card[]): number {
  return cards.reduce((total, card) => total + getCardScore(card), 0);
}

// 计算墩的数量
// 规则：7张=1墩，8张=2墩，9张=4墩，10张=8墩，11张=16墩...（翻倍）
export function calculateDunCount(cardCount: number): number {
  if (cardCount < 7) {
    return 0; // 少于7张不是墩
  }
  
  // 7张 = 1墩 (2^0)
  // 8张 = 2墩 (2^1)
  // 9张 = 4墩 (2^2)
  // 10张 = 8墩 (2^3)
  // 11张 = 16墩 (2^4)
  // ...
  const exponent = cardCount - 7;
  return Math.pow(2, exponent);
}

// 计算墩的分数
// 规则：每个墩从每个其他玩家扣除30分，出墩的玩家增加 (其他玩家数 × 30分 × 墩数)
export function calculateDunScore(dunCount: number, totalPlayers: number, dunPlayerIndex: number): {
  dunPlayerScore: number;  // 出墩玩家获得的分数
  otherPlayersScore: number; // 每个其他玩家扣除的分数
} {
  if (dunCount === 0) {
    return { dunPlayerScore: 0, otherPlayersScore: 0 };
  }
  
  const otherPlayersCount = totalPlayers - 1;
  const scorePerDun = 30;
  
  // 出墩玩家获得的分数 = 其他玩家数 × 30分 × 墩数
  const dunPlayerScore = otherPlayersCount * scorePerDun * dunCount;
  
  // 每个其他玩家扣除的分数 = 30分 × 墩数
  const otherPlayersScore = scorePerDun * dunCount;
  
  return { dunPlayerScore, otherPlayersScore };
}

// 创建一副完整的牌（包括大小王）- 使用随机顺序创建
export function createDeck(): Card[] {
  const deck: Card[] = [];
  const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
  const ranks = [
    Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN,
    Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN,
    Rank.KING, Rank.ACE, Rank.TWO
  ];

  // 先创建所有牌（包括大小王）
  suits.forEach(suit => {
    ranks.forEach(rank => {
      deck.push({
        suit,
        rank,
        id: `${suit}-${rank}`
      });
    });
  });

  // 大小王（ID会在dealCards中生成唯一值）
  deck.push({
    suit: Suit.JOKER,
    rank: Rank.JOKER_SMALL,
    id: 'joker-small-temp'
  });
  deck.push({
    suit: Suit.JOKER,
    rank: Rank.JOKER_BIG,
    id: 'joker-big-temp'
  });

  // 在创建时就打乱顺序，而不是按顺序创建
  // 使用 Fisher-Yates 算法立即洗牌
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

// 获取更随机的随机数（使用 crypto API 如果可用）
function getRandomValue(): number {
  // 如果浏览器支持 crypto API，使用它来获取更随机的值
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] / (0xFFFFFFFF + 1);
  }
  // 否则使用 Math.random()，但添加时间戳和计数器来增加随机性
  return Math.random();
}

// 洗牌（使用改进的 Fisher-Yates 算法，多次洗牌确保随机性）
export function shuffleDeck(deck: Card[]): Card[] {
  let shuffled = [...deck];
  
  // 多次洗牌以增加随机性（蒙特卡洛方法：多次随机操作）
  const shuffleRounds = 5; // 洗5次，确保完全随机
  
  for (let round = 0; round < shuffleRounds; round++) {
    // Fisher-Yates 洗牌算法（从后往前）
    for (let i = shuffled.length - 1; i > 0; i--) {
      // 使用改进的随机数生成器
      const j = Math.floor(getRandomValue() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // 额外的随机操作：随机交换一些牌（增加随机性）
    const swapCount = Math.floor(shuffled.length * 0.5); // 随机交换50%的牌
    for (let k = 0; k < swapCount; k++) {
      const i = Math.floor(getRandomValue() * shuffled.length);
      const j = Math.floor(getRandomValue() * shuffled.length);
      if (i !== j) {
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    }
    
    // 随机切牌（Riffle Shuffle 模拟）
    const cutPoint = Math.floor(getRandomValue() * shuffled.length);
    shuffled = [...shuffled.slice(cutPoint), ...shuffled.slice(0, cutPoint)];
  }
  
  return shuffled;
}

// 比较两张牌的大小（用于排序）
export function compareCards(a: Card, b: Card): number {
  if (a.rank !== b.rank) {
    return a.rank - b.rank;
  }
  return a.suit.localeCompare(b.suit);
}

// 排序手牌
export function sortCards(cards: Card[]): Card[] {
  return [...cards].sort(compareCards);
}

// 发牌（蒙特卡洛模拟：将所有牌混在一起洗牌，然后分发给玩家）
export function dealCards(playerCount: number): Card[][] {
  // 第一步：创建所有牌（playerCount副牌）
  const allCards: Card[] = [];
  const timestamp = Date.now();
  
  for (let deckIndex = 0; deckIndex < playerCount; deckIndex++) {
    const deck = createDeck();
    // 为每张牌生成唯一ID
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
  
  // 第二步：蒙特卡洛模拟洗牌 - 将所有牌彻底混在一起
  let shuffled = shuffleDeck(allCards);
  
  // 第三步：多次洗牌确保随机性（蒙特卡洛方法）
  const monteCarloRounds = 7; // 洗7次，确保完全随机
  for (let round = 0; round < monteCarloRounds; round++) {
    // Fisher-Yates 洗牌
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(getRandomValue() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    
    // 随机切牌（模拟真实洗牌）
    const cutPoint = Math.floor(getRandomValue() * shuffled.length);
    shuffled = [...shuffled.slice(cutPoint), ...shuffled.slice(0, cutPoint)];
    
    // 随机交换（增加随机性）
    const swapCount = Math.floor(shuffled.length * 0.3);
    for (let k = 0; k < swapCount; k++) {
      const i = Math.floor(getRandomValue() * shuffled.length);
      const j = Math.floor(getRandomValue() * shuffled.length);
      if (i !== j) {
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
    }
  }
  
  // 第四步：分发给每个玩家（按顺序发牌）
  const hands: Card[][] = [];
  const cardsPerPlayer = Math.floor(shuffled.length / playerCount);
  
  for (let i = 0; i < playerCount; i++) {
    const startIndex = i * cardsPerPlayer;
    const endIndex = (i === playerCount - 1) ? shuffled.length : (i + 1) * cardsPerPlayer;
    const playerHand = shuffled.slice(startIndex, endIndex);
    
    // 为每张牌添加玩家信息到ID（确保唯一性和可追溯性）
    playerHand.forEach((card, cardIndexInHand) => {
      // 在现有ID基础上添加玩家信息
      card.id = `${card.id}-player${i}-hand${cardIndexInHand}`;
    });
    
    hands.push(playerHand);
  }
  
  return hands;
}

// 判断牌型
export function getCardType(cards: Card[]): { type: CardType; value: number } | null {
  if (cards.length === 0) return null;

  const sorted = sortCards(cards);
  const rankCounts = new Map<Rank, number>();
  
  sorted.forEach(card => {
    rankCounts.set(card.rank, (rankCounts.get(card.rank) || 0) + 1);
  });

  const counts = Array.from(rankCounts.values()).sort((a, b) => b - a);
  const uniqueRanks = Array.from(rankCounts.keys()).sort((a, b) => a - b);

  // 统计大小王数量
  const jokerSmallCount = rankCounts.get(Rank.JOKER_SMALL) || 0;
  const jokerBigCount = rankCounts.get(Rank.JOKER_BIG) || 0;
  const totalJokers = jokerSmallCount + jokerBigCount;

  // 检查是否有大小王混合（4张以下的大小王必须分别出）
  const hasJokers = totalJokers > 0;
  const hasNormalCards = uniqueRanks.some(r => r !== Rank.JOKER_SMALL && r !== Rank.JOKER_BIG);
  
  // 如果大小王总数 < 4，且混合了普通牌，不允许
  if (hasJokers && totalJokers < 4 && hasNormalCards) {
    return null;
  }

  // 如果大小王总数 < 4，且大小王混合，不允许
  if (totalJokers > 0 && totalJokers < 4 && jokerSmallCount > 0 && jokerBigCount > 0) {
    return null;
  }

  // 单张
  if (cards.length === 1) {
    return { type: CardType.SINGLE, value: sorted[0].rank };
  }

  // 对子
  if (cards.length === 2 && counts[0] === 2) {
    // 检查是否是大小王混合（不允许）
    if (jokerSmallCount === 1 && jokerBigCount === 1) {
      return null;
    }
    return { type: CardType.PAIR, value: uniqueRanks[0] };
  }

  // 三张
  if (cards.length === 3 && counts[0] === 3) {
    // 检查是否是大小王混合（不允许）
    if ((jokerSmallCount > 0 && jokerSmallCount < 4) && (jokerBigCount > 0 && jokerBigCount < 4)) {
      return null;
    }
    return { type: CardType.TRIPLE, value: uniqueRanks[0] };
  }

  // 大小王炸弹/墩（需要先判断，因为混合时 counts[0] 不等于 cards.length）
  if (totalJokers >= 4 && totalJokers === cards.length && !hasNormalCards) {
    // 大小王炸弹/墩的值：大王 > 小王
    const jokerValue = jokerBigCount >= jokerSmallCount ? Rank.JOKER_BIG : Rank.JOKER_SMALL;
    if (cards.length >= 7) {
      return { type: CardType.DUN, value: jokerValue };
    } else {
      return { type: CardType.BOMB, value: jokerValue };
    }
  }

  // 炸弹（四张及以上相同，但小于7张）
  if (cards.length >= 4 && cards.length < 7 && counts[0] === cards.length) {
    // 普通炸弹（没有大小王）
    if (totalJokers === 0) {
      return { type: CardType.BOMB, value: uniqueRanks[0] };
    }
  }

  // 墩（七张及以上相同）
  if (cards.length >= 7 && counts[0] === cards.length) {
    // 普通墩（没有大小王）
    if (totalJokers === 0) {
      return { type: CardType.DUN, value: uniqueRanks[0] };
    }
  }

  return null;
}

// 判断是否可以出牌
export function canPlayCards(cards: Card[]): Play | null {
  const result = getCardType(cards);
  if (!result) return null;

  return {
    cards,
    type: result.type,
    value: result.value
  };
}

// 判断是否可以压过上家的牌
export function canBeat(play: Play, lastPlay: Play | null): boolean {
  if (!lastPlay) return true; // 没有上家出牌，可以出任何牌

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

// 从手牌中查找可以出的牌
export function findPlayableCards(hand: Card[], lastPlay: Play | null): Card[][] {
  const playable: Card[][] = [];
  
  if (!lastPlay) {
    // 没有上家出牌，可以出任何合法牌型
    // 这里简化处理，返回所有单张、对子、三张等
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
    const sameType = hand.filter(card => {
      // 简化：尝试找到相同类型的牌
      return true;
    });

    // 这里需要更复杂的逻辑来找到可以压过的牌
    // 简化处理：返回所有可能的组合
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
        const testPlay = canPlayCards([cards[0]]);
        if (testPlay && canBeat(testPlay, lastPlay)) {
          playable.push([cards[0]]);
        }
      } else if (lastPlay.type === CardType.PAIR && cards.length >= 2) {
        const testPlay = canPlayCards(cards.slice(0, 2));
        if (testPlay && canBeat(testPlay, lastPlay)) {
          playable.push(cards.slice(0, 2));
        }
      } else if (lastPlay.type === CardType.TRIPLE && cards.length >= 3) {
        const testPlay = canPlayCards(cards.slice(0, 3));
        if (testPlay && canBeat(testPlay, lastPlay)) {
          playable.push(cards.slice(0, 3));
        }
      } else if (lastPlay.type === CardType.BOMB) {
        // 炸弹可以用更大的炸弹或墩来压
        if (cards.length >= 4 && cards.length <= 6) {
          // 对于4-6张相同点数，直接检查全部是否能压过
          const testPlay = canPlayCards(cards);
          if (testPlay && testPlay.type === CardType.BOMB && canBeat(testPlay, lastPlay)) {
            playable.push(cards);
          }
        }
        // 墩可以压炸弹
        if (cards.length >= 7) {
          const testPlay = canPlayCards(cards);
          if (testPlay && canBeat(testPlay, lastPlay)) {
            playable.push(cards);
          }
        }
      } else if (lastPlay.type === CardType.DUN) {
        // 墩只能用更大的墩来压
        if (cards.length >= 7 && cards.length > lastPlay.cards.length) {
          const testPlay = canPlayCards(cards);
          if (testPlay && canBeat(testPlay, lastPlay)) {
            playable.push(cards);
          }
        }
      }
      
      // 重要：检查炸弹/墩是否可以压过单张、对子、三张
      // 炸弹可以压任何非炸弹、非墩的牌型（单张、对子、三张）
      if (lastPlay.type !== CardType.BOMB && lastPlay.type !== CardType.DUN) {
        // 检查炸弹（4-6张）
        if (cards.length >= 4 && cards.length < 7) {
          const bombPlay = canPlayCards(cards);
          if (bombPlay && canBeat(bombPlay, lastPlay)) {
            playable.push(cards);
          }
        }
        // 检查墩（7张及以上）
        if (cards.length >= 7) {
          const dunPlay = canPlayCards(cards);
          if (dunPlay && canBeat(dunPlay, lastPlay)) {
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
      const testPlay = canPlayCards(allJokers);
      if (testPlay && canBeat(testPlay, lastPlay)) {
        playable.push(allJokers);
      }
    } else {
      // 4张以下分别出
      if (lastPlay.type === CardType.SINGLE) {
        jokerSmall.forEach(card => {
          const testPlay = canPlayCards([card]);
          if (testPlay && canBeat(testPlay, lastPlay)) {
            playable.push([card]);
          }
        });
        jokerBig.forEach(card => {
          const testPlay = canPlayCards([card]);
          if (testPlay && canBeat(testPlay, lastPlay)) {
            playable.push([card]);
          }
        });
      } else if (lastPlay.type === CardType.PAIR) {
        if (jokerSmall.length >= 2) {
          const testPlay = canPlayCards(jokerSmall.slice(0, 2));
          if (testPlay && canBeat(testPlay, lastPlay)) {
            playable.push(jokerSmall.slice(0, 2));
          }
        }
        if (jokerBig.length >= 2) {
          const testPlay = canPlayCards(jokerBig.slice(0, 2));
          if (testPlay && canBeat(testPlay, lastPlay)) {
            playable.push(jokerBig.slice(0, 2));
          }
        }
      } else if (lastPlay.type === CardType.TRIPLE) {
        if (jokerSmall.length >= 3) {
          const testPlay = canPlayCards(jokerSmall.slice(0, 3));
          if (testPlay && canBeat(testPlay, lastPlay)) {
            playable.push(jokerSmall.slice(0, 3));
          }
        }
        if (jokerBig.length >= 3) {
          const testPlay = canPlayCards(jokerBig.slice(0, 3));
          if (testPlay && canBeat(testPlay, lastPlay)) {
            playable.push(jokerBig.slice(0, 3));
          }
        }
      }
    }
    
    // 重要：大小王炸弹/墩也可以压过单张、对子、三张
    if (totalJokers >= 4) {
      if (lastPlay.type !== CardType.BOMB && lastPlay.type !== CardType.DUN) {
        const allJokers = [...jokerSmall, ...jokerBig];
        const jokerPlay = canPlayCards(allJokers);
        if (jokerPlay && canBeat(jokerPlay, lastPlay)) {
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

// 检查玩家是否有能打过的牌（用于强制出牌规则）
export function hasPlayableCards(hand: Card[], lastPlay: Play | null): boolean {
  if (!lastPlay) {
    // 没有上家出牌，可以出任何牌，所以总是有能出的牌
    return hand.length > 0;
  }
  
  // 查找所有可以出的牌
  const playableCards = findPlayableCards(hand, lastPlay);
  
  // 如果有任何可以打过的牌，返回 true
  return playableCards.length > 0;
}

