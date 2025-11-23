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

// 轮次出牌记录
export interface RoundPlayRecord {
  playerId: number;
  playerName: string;
  cards: Card[];
  scoreCards: Card[]; // 这一手牌中的分牌
  score: number; // 这一手牌的分值
}

// 轮次记录（一轮的所有出牌）
export interface RoundRecord {
  roundNumber: number;
  plays: RoundPlayRecord[]; // 这一轮的所有出牌
  totalScore: number; // 这一轮的总分数
  winnerId: number; // 这一轮的赢家
  winnerName: string;
}

// 语音配置
export interface VoiceConfig {
  gender: 'male' | 'female'; // 性别
  dialect: 'mandarin' | 'cantonese' | 'shanghai' | 'sichuan' | 'dongbei' | 'taiwan' | 'nanchang'; // 方言
  rate?: number; // 语速 (0.1 - 10)
  pitch?: number; // 音调 (0 - 2)
  volume?: number; // 音量 (0 - 1)
  voiceIndex?: number; // 语音索引（用于区分不同玩家）
}

// 玩家信息
export interface Player {
  id: number;
  name: string;
  type: PlayerType;
  hand: Card[];
  score?: number; // 玩家得分（捡到的分）
  wonRounds?: RoundRecord[]; // 玩家赢得的轮次记录
  isHuman?: boolean; // 是否是人类玩家（可以手动操作）
  aiConfig?: { apiKey: string; strategy?: 'aggressive' | 'conservative' | 'balanced' };
  voiceConfig?: VoiceConfig; // 语音配置（用于语音提示和将来的聊天功能）
  finishedRank?: number | null; // 玩家出完牌后的名次（游戏结束时设置）
}

// 游戏状态
export enum GameStatus {
  WAITING = 'waiting',      // 等待开始
  PLAYING = 'playing',      // 游戏中
  FINISHED = 'finished'     // 游戏结束
}

