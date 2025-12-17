/**
 * Vue Mobile 测试工厂模块
 * 提供通用的测试数据创建函数
 */

import { Rank, Suit } from '../src/types/card';
import type { Card } from '../src/types/card';

// =====================================================
// 牌创建工厂
// =====================================================

/**
 * 创建单张牌
 */
export function createCard(suit: Suit, rank: Rank, id?: string): Card {
    return {
        suit,
        rank,
        id: id || `${suit}-${rank}-${Math.random().toString(36).substr(2, 9)}`,
    };
}

/**
 * 创建多张相同点数的牌
 */
export function createSameRankCards(rank: Rank, count: number): Card[] {
    const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
    const cards: Card[] = [];

    for (let i = 0; i < count; i++) {
        cards.push(createCard(suits[i % suits.length], rank));
    }

    return cards;
}

/**
 * 创建分牌组（5、10、K）
 */
export function createScoreCards(): Card[] {
    return [
        createCard(Suit.SPADES, Rank.FIVE),
        createCard(Suit.HEARTS, Rank.TEN),
        createCard(Suit.DIAMONDS, Rank.KING),
    ];
}

/**
 * 创建炸弹
 */
export function createBomb(rank: Rank, size: 4 | 5 | 6 = 4): Card[] {
    return createSameRankCards(rank, size);
}

/**
 * 创建墩（7张及以上）
 */
export function createDun(rank: Rank, size: number = 7): Card[] {
    if (size < 7) {
        throw new Error('墩至少需要7张牌');
    }
    return createSameRankCards(rank, size);
}

/**
 * 创建大小王
 */
export function createJokers(): Card[] {
    return [
        createCard(Suit.JOKER, Rank.JOKER_BIG),
        createCard(Suit.JOKER, Rank.JOKER_SMALL),
    ];
}

/**
 * 随机生成一张牌
 */
export function randomCard(): Card {
    const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
    const ranks = [
        Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN,
        Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN,
        Rank.KING, Rank.ACE, Rank.TWO,
    ];

    const suit = suits[Math.floor(Math.random() * suits.length)];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];

    return createCard(suit, rank);
}

/**
 * 随机生成多张牌
 */
export function randomCards(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
        cards.push(randomCard());
    }
    return cards;
}

// =====================================================
// 玩家创建工厂
// =====================================================

export interface MockPlayer {
    id: number;
    name: string;
    hand: Card[];
    score: number;
    dunCount: number;
    type: 'human' | 'ai';
    finishedRank: number | null;
}

/**
 * 创建测试玩家
 */
export function createPlayer(
    id: number,
    name: string,
    hand: Card[] = [],
    type: 'human' | 'ai' = 'ai'
): MockPlayer {
    return {
        id,
        name,
        hand,
        score: 0,
        dunCount: 0,
        type,
        finishedRank: null,
    };
}

/**
 * 创建人类玩家
 */
export function createHumanPlayer(id: number = 0, name: string = '玩家'): MockPlayer {
    return createPlayer(id, name, [], 'human');
}

/**
 * 创建AI玩家
 */
export function createAIPlayer(id: number, name?: string): MockPlayer {
    return createPlayer(id, name || `AI玩家${id}`, [], 'ai');
}

/**
 * 创建4人游戏玩家组
 */
export function createPlayers(withHands: boolean = false): MockPlayer[] {
    const players: MockPlayer[] = [
        createPlayer(0, '玩家', withHands ? randomCards(54) : [], 'human'),
        createPlayer(1, '东侧AI', withHands ? randomCards(54) : [], 'ai'),
        createPlayer(2, '北侧AI', withHands ? randomCards(54) : [], 'ai'),
        createPlayer(3, '西侧AI', withHands ? randomCards(54) : [], 'ai'),
    ];

    return players;
}

// =====================================================
// ChatMessage 工厂
// =====================================================

export interface MockChatMessage {
    id: string;
    playerId: number;
    playerName: string;
    content: string;
    intent: string;
    emotion?: string;
    timestamp: number;
}

/**
 * 创建模拟聊天消息
 */
export function createChatMessage(
    playerId: number,
    content: string,
    intent: string = 'social_chat'
): MockChatMessage {
    return {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        playerId,
        playerName: `玩家${playerId}`,
        content,
        intent,
        timestamp: Date.now(),
    };
}

// =====================================================
// 游戏状态工厂
// =====================================================

export interface MockGameState {
    status: 'waiting' | 'playing' | 'finished';
    players: MockPlayer[];
    currentPlayerIndex: number;
    currentRound: MockRound | null;
}

export interface MockRound {
    roundNumber: number;
    plays: any[];
    lastPlay: Card[] | null;
    totalScore: number;
}

/**
 * 创建模拟游戏状态
 */
export function createGameState(
    status: 'waiting' | 'playing' | 'finished' = 'waiting'
): MockGameState {
    return {
        status,
        players: createPlayers(),
        currentPlayerIndex: 0,
        currentRound: null,
    };
}

/**
 * 创建模拟轮次
 */
export function createRound(roundNumber: number = 1): MockRound {
    return {
        roundNumber,
        plays: [],
        lastPlay: null,
        totalScore: 0,
    };
}

// =====================================================
// 辅助工具
// =====================================================

/**
 * 等待指定时间
 */
export function wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 8): string {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
}

/**
 * 深度克隆对象
 */
export function deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
}
