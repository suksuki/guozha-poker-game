/**
 * 测试工厂模块
 * 提供通用的测试数据创建函数，减少测试代码重复
 */

import { Card, Suit, Rank, PlayerType, Player, GameStatus } from '../src/types/card';
import { Game, GameSetupConfig } from '../src/utils/Game';
import { Round } from '../src/utils/Round';
import { dealCards } from '../src/utils/cardUtils';

// =====================================================
// 牌创建工厂
// =====================================================

/**
 * 创建单张牌
 * @param suit 花色
 * @param rank 点数
 * @param id 可选的ID，默认自动生成
 */
export function createCard(suit: Suit, rank: Rank, id?: string): Card {
    return { suit, rank, id: id || `${suit}-${rank}-${Math.random().toString(36).substr(2, 9)}` };
}

/**
 * 创建多张相同点数的牌
 * @param rank 点数
 * @param count 数量
 */
export function createSameRankCards(rank: Rank, count: number): Card[] {
    const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
        cards.push(createCard(suits[i % 4], rank, `${rank}-${i}`));
    }
    return cards;
}

/**
 * 创建一组分牌（5、10、K）
 * @param includeAll 是否包含所有类型的分牌
 */
export function createScoreCards(includeAll: boolean = true): Card[] {
    const cards: Card[] = [];
    if (includeAll) {
        cards.push(createCard(Suit.SPADES, Rank.FIVE));
        cards.push(createCard(Suit.HEARTS, Rank.TEN));
        cards.push(createCard(Suit.DIAMONDS, Rank.KING));
    } else {
        cards.push(createCard(Suit.SPADES, Rank.FIVE));
    }
    return cards;
}

/**
 * 创建大小王
 */
export function createJokers(): Card[] {
    return [
        createCard(Suit.JOKER, Rank.JOKER_SMALL, 'joker-small'),
        createCard(Suit.JOKER, Rank.JOKER_BIG, 'joker-big'),
    ];
}

/**
 * 创建炸弹牌组
 * @param rank 点数
 * @param size 炸弹大小（4-6张）
 */
export function createBomb(rank: Rank, size: number = 4): Card[] {
    if (size < 4 || size > 6) {
        throw new Error('炸弹大小必须在4-6之间');
    }
    return createSameRankCards(rank, size);
}

/**
 * 创建墩牌组（7张或以上）
 * @param rank 点数
 * @param size 墩大小（默认7张）
 */
export function createDun(rank: Rank, size: number = 7): Card[] {
    if (size < 7) {
        throw new Error('墩至少需要7张牌');
    }
    return createSameRankCards(rank, size);
}

// =====================================================
// 玩家创建工厂
// =====================================================

/**
 * 创建测试玩家
 * @param id 玩家ID
 * @param name 玩家名称
 * @param hand 手牌
 * @param type 玩家类型（默认AI）
 */
export function createPlayer(
    id: number,
    name: string,
    hand: Card[] = [],
    type: PlayerType = PlayerType.AI
): Player {
    return {
        id,
        name,
        type,
        hand,
        score: 0,
        isHuman: type === PlayerType.HUMAN,
        dunCount: 0,
    };
}

/**
 * 创建人类玩家
 * @param id 玩家ID
 * @param name 玩家名称
 * @param hand 手牌
 */
export function createHumanPlayer(id: number, name: string, hand: Card[] = []): Player {
    return createPlayer(id, name, hand, PlayerType.HUMAN);
}

/**
 * 创建一组测试玩家（4人游戏）
 * @param withHands 是否自动分配手牌
 */
export function createPlayers(withHands: boolean = false): Player[] {
    const players = [
        createHumanPlayer(0, '玩家1'),
        createPlayer(1, '玩家2'),
        createPlayer(2, '玩家3'),
        createPlayer(3, '玩家4'),
    ];

    if (withHands) {
        const hands = dealCards(4);
        players.forEach((p, i) => {
            p.hand = hands[i];
        });
    }

    return players;
}

// =====================================================
// 游戏创建工厂
// =====================================================

/**
 * 默认游戏配置
 */
export const DEFAULT_GAME_CONFIG: GameSetupConfig = {
    playerCount: 4,
    humanPlayerIndex: 0,
    aiConfigs: [
        { strategy: 'balanced' },
        { strategy: 'balanced' },
        { strategy: 'balanced' },
    ],
};

/**
 * 创建已配置的游戏实例
 * @param config 游戏配置（可选）
 */
export function createGame(config?: Partial<GameSetupConfig>): Game {
    return new Game({ ...DEFAULT_GAME_CONFIG, ...config });
}

/**
 * 创建并初始化游戏
 * @param config 游戏配置（可选）
 */
export function createInitializedGame(config?: Partial<GameSetupConfig>): {
    game: Game;
    players: Player[];
    hands: Card[][];
} {
    const game = createGame(config);
    const players = createPlayers(true);
    const hands = players.map(p => p.hand);

    game.initialize(players, hands);
    game.updateStatus(GameStatus.PLAYING);
    const firstRound = Round.createNew(1);
    game.addRound(firstRound);

    return { game, players, hands };
}

// =====================================================
// 轮次创建工厂
// =====================================================

/**
 * 轮次配置选项
 */
export interface RoundOptions {
    roundNumber?: number;
    minIntervalBetweenPlays?: number;
    playTimeout?: number;
    enabled?: boolean;
}

/**
 * 创建新轮次
 * @param options 轮次配置选项
 */
export function createRound(options: RoundOptions = {}): Round {
    const {
        roundNumber = 1,
        minIntervalBetweenPlays = 100,
        playTimeout = 5000,
        enabled = true,
    } = options;

    return Round.createNew(roundNumber, Date.now(), {
        minIntervalBetweenPlays,
        playTimeout,
        enabled,
    });
}

// =====================================================
// 测试断言辅助函数
// =====================================================

/**
 * 验证牌组长度
 * @param cards 牌组
 * @param expectedLength 期望长度
 */
export function assertCardsLength(cards: Card[], expectedLength: number): void {
    if (cards.length !== expectedLength) {
        throw new Error(`期望 ${expectedLength} 张牌，但得到 ${cards.length} 张`);
    }
}

/**
 * 验证玩家分数
 * @param player 玩家
 * @param expectedScore 期望分数
 */
export function assertPlayerScore(player: Player, expectedScore: number): void {
    if (player.score !== expectedScore) {
        throw new Error(`玩家 ${player.name} 的分数应该是 ${expectedScore}，但得到 ${player.score}`);
    }
}

/**
 * 验证游戏状态
 * @param game 游戏实例
 * @param expectedStatus 期望状态
 */
export function assertGameStatus(game: Game, expectedStatus: GameStatus): void {
    if (game.status !== expectedStatus) {
        throw new Error(`游戏状态应该是 ${expectedStatus}，但得到 ${game.status}`);
    }
}

// =====================================================
// 随机测试数据生成器
// =====================================================

/**
 * 生成随机点数
 */
export function randomRank(): Rank {
    const ranks = [
        Rank.THREE, Rank.FOUR, Rank.FIVE, Rank.SIX, Rank.SEVEN,
        Rank.EIGHT, Rank.NINE, Rank.TEN, Rank.JACK, Rank.QUEEN,
        Rank.KING, Rank.ACE, Rank.TWO,
    ];
    return ranks[Math.floor(Math.random() * ranks.length)];
}

/**
 * 生成随机花色（不包括Joker）
 */
export function randomSuit(): Suit {
    const suits = [Suit.SPADES, Suit.HEARTS, Suit.DIAMONDS, Suit.CLUBS];
    return suits[Math.floor(Math.random() * suits.length)];
}

/**
 * 生成随机牌
 */
export function randomCard(): Card {
    return createCard(randomSuit(), randomRank());
}

/**
 * 生成指定数量的随机牌
 * @param count 数量
 */
export function randomCards(count: number): Card[] {
    const cards: Card[] = [];
    for (let i = 0; i < count; i++) {
        cards.push(randomCard());
    }
    return cards;
}
