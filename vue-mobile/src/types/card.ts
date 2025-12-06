/**
 * 移动端独立的卡牌类型定义
 * 完全独立于老APP，不依赖任何老APP的代码
 */

export enum Suit {
  SPADES = 'spades',    // 黑桃
  HEARTS = 'hearts',    // 红桃
  DIAMONDS = 'diamonds', // 方块
  CLUBS = 'clubs',      // 梅花
  JOKER = 'joker'       // 大小王（特殊花色）
}

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
  TWO = 15
}

export enum CardType {
  SINGLE = 'single',      // 单张
  PAIR = 'pair',          // 对子
  TRIPLE = 'triple',      // 三张
  STRAIGHT = 'straight',  // 顺子
  PAIR_STRAIGHT = 'pair_straight', // 连对
  TRIPLE_STRAIGHT = 'triple_straight', // 飞机
  BOMB = 'bomb',          // 炸弹
  DUN = 'dun'             // 墩（7张及以上）
}

export interface Card {
  id: string;
  suit: Suit;
  rank: Rank;
}

export interface Play {
  type: CardType;
  cards: Card[];
  rank: Rank;  // 主要牌的点数
  length: number;  // 牌的数量
}

export interface Player {
  id: number;
  name: string;
  hand: Card[];
  score: number;
  dunCount?: number;
  finishedRank?: number;
  scoreRank?: number;
  type?: 'human' | 'ai';
  voiceConfig?: any;
}

export interface RoundPlayRecord {
  playerId: number;
  playerName: string;
  cards: Card[];
  scoreCards: Card[];
  score: number;
}

export interface Round {
  roundNumber: number;
  plays: RoundPlayRecord[];
  lastPlay: Card[] | null;
  lastPlayerIndex: number | null;
  score: number;
  isFinished: boolean;
  isTakeoverRound?: boolean;
  takeoverStartPlayerIndex?: number | null;
  takeoverEndPlayerIndex?: number | null;
}

export enum GameStatus {
  WAITING = 'waiting',
  PLAYING = 'playing',
  FINISHED = 'finished'
}

