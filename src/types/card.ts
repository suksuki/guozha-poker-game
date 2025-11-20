// 扑克牌花色
export enum Suit {
  SPADES = 'spades',    // 黑桃
  HEARTS = 'hearts',    // 红桃
  DIAMONDS = 'diamonds', // 方块
  CLUBS = 'clubs',      // 梅花
  JOKER = 'joker'       // 大小王（特殊花色）
}

// 扑克牌点数
export enum Rank {
  THREE = 3,
  FOUR = 4,
  FIVE = 5,
  SIX = 6,
  SEVEN = 7,
  EIGHT = 8,
  NINE = 9,
  TEN = 10,
  JACK = 11,
  QUEEN = 12,
  KING = 13,
  ACE = 14,
  TWO = 15,  // 2是最大的单牌
  JOKER_SMALL = 16, // 小王
  JOKER_BIG = 17    // 大王
}

// 单张牌
export interface Card {
  suit: Suit;
  rank: Rank;
  id: string; // 唯一标识
}

// 牌型类型
export enum CardType {
  SINGLE = 'single',           // 单张
  PAIR = 'pair',               // 对子
  TRIPLE = 'triple',           // 三张
  BOMB = 'bomb',               // 炸弹（四张及以上相同）
  DUN = 'dun'                  // 墩（七张及以上相同）
}

// 出牌组合
export interface Play {
  cards: Card[];
  type: CardType;
  value: number; // 用于比较大小
}

// 玩家类型
export enum PlayerType {
  HUMAN = 'human',
  AI = 'ai'
}

// 玩家信息
export interface Player {
  id: number;
  name: string;
  type: PlayerType;
  hand: Card[];
  isHuman?: boolean; // 是否是人类玩家（可以手动操作）
  aiConfig?: { apiKey: string; strategy?: 'aggressive' | 'conservative' | 'balanced' };
}

// 游戏状态
export enum GameStatus {
  WAITING = 'waiting',      // 等待开始
  PLAYING = 'playing',      // 游戏中
  FINISHED = 'finished'     // 游戏结束
}

