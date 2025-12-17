/**
 * 游戏Store辅助模块
 * 抽取游戏逻辑相关的工具函数，减少gameStore的复杂度
 */

import type { Card, Play, Player } from '../types/card';
import { canPlayCards, canBeat, calculateCardsScore, isScoreCard } from './cardUtils';
import { ChannelType } from '../types/channel';

// =====================================================
// 出牌验证
// =====================================================

/**
 * 验证出牌是否合法
 * @param cards 要出的牌
 * @param lastPlay 上一手牌（可选）
 * @returns 验证结果
 */
export function validatePlay(
    cards: Card[],
    lastPlay: Play | null
): { valid: boolean; message: string; playInfo?: Play } {
    if (cards.length === 0) {
        return { valid: false, message: '请选择要出的牌' };
    }

    // 验证牌型
    const play = canPlayCards(cards);
    if (!play) {
        return { valid: false, message: '无效的牌型组合' };
    }

    // 如果有上一手牌，验证是否能压过
    if (lastPlay) {
        if (!canBeat(play, lastPlay)) {
            return { valid: false, message: '无法压过上家的牌' };
        }
    }

    return {
        valid: true,
        message: '出牌成功',
        playInfo: play,
    };
}

/**
 * 检查玩家是否可以过牌
 * @param lastPlay 上一手牌
 * @param isFirstPlayer 是否是第一个出牌的玩家
 */
export function canPass(lastPlay: Play | null, isFirstPlayer: boolean): boolean {
    // 第一个出牌的玩家不能过牌
    if (isFirstPlayer || lastPlay === null) {
        return false;
    }
    return true;
}

// =====================================================
// AI 推荐逻辑
// =====================================================

/**
 * 获取AI推荐的出牌（简单策略）
 * @param hand 玩家手牌
 * @param lastPlay 上一手牌
 * @returns 推荐的牌组或null（表示过牌）
 */
export function getAIRecommendation(
    hand: Card[],
    lastPlay: Play | null
): { cards: Card[]; play: Play } | null {
    // 如果没有上一手牌，出最小的单张
    if (!lastPlay) {
        if (hand.length > 0) {
            const sortedHand = [...hand].sort((a, b) => a.rank - b.rank);
            const smallestCard = sortedHand[0];
            const play = canPlayCards([smallestCard]);
            if (play) {
                return { cards: [smallestCard], play };
            }
        }
        return null;
    }

    // 尝试找能压的牌
    // 简单策略：找相同类型且更大的牌
    const lastType = lastPlay.type;
    const lastRank = lastPlay.rank;
    const lastLength = lastPlay.length;

    // 按点数分组
    const rankGroups = new Map<number, Card[]>();
    hand.forEach(card => {
        const existing = rankGroups.get(card.rank) || [];
        existing.push(card);
        rankGroups.set(card.rank, existing);
    });

    // 找能压的牌组
    for (const [rank, group] of Array.from(rankGroups.entries()).sort((a, b) => a[0] - b[0])) {
        if (rank > lastRank && group.length >= lastLength) {
            const cardsToPlay = group.slice(0, lastLength);
            const play = canPlayCards(cardsToPlay);
            if (play && canBeat(play, lastPlay)) {
                return { cards: cardsToPlay, play };
            }
        }
    }

    return null; // 建议过牌
}

// =====================================================
// 分数计算
// =====================================================

/**
 * 计算出牌的分数
 * @param cards 出的牌
 */
export function calculatePlayScore(cards: Card[]): number {
    return calculateCardsScore(cards);
}

/**
 * 获取牌组中的分牌
 * @param cards 牌组
 */
export function getScoreCards(cards: Card[]): Card[] {
    return cards.filter(card => isScoreCard(card));
}

// =====================================================
// 报牌文字生成
// =====================================================

/**
 * 生成报牌语音文字
 * @param cards 出的牌
 * @param play 牌型信息
 */
export function generatePlayAnnouncement(
    cards: Card[],
    play: Play
): string {
    const typeNames: Record<number, string> = {
        0: '单张',
        1: '对子',
        2: '三张',
        3: '炸弹',
        4: '墩',
    };

    const typeName = typeNames[play.type] || '组合';
    const cardCount = cards.length;

    // 简单的报牌文字
    if (play.type === 3) { // BOMB
        return `${cardCount}张炸弹！`;
    }
    if (play.type === 4) { // DUN
        return `${cardCount}张墩！太厉害了！`;
    }

    return `${typeName}`;
}

// =====================================================
// 声道分配
// =====================================================

/**
 * 根据玩家ID获取对应的声道
 * @param playerId 玩家ID
 */
export function getPlayerChannel(playerId: number): ChannelType {
    // 玩家声道：PLAYER_1 到 PLAYER_7
    const channelOffset = playerId % 7;
    return (ChannelType.PLAYER_1 + channelOffset) as ChannelType;
}

/**
 * 获取系统公告声道
 */
export function getAnnouncementChannel(): ChannelType {
    return ChannelType.ANNOUNCEMENT;
}

// =====================================================
// 游戏状态判断
// =====================================================

/**
 * 检查游戏是否结束
 * @param players 所有玩家
 */
export function isGameOver(players: Player[]): boolean {
    // 只剩一个玩家有牌时游戏结束
    const playersWithCards = players.filter(p => p.hand.length > 0);
    return playersWithCards.length <= 1;
}

/**
 * 获取获胜者
 * @param players 所有玩家
 */
export function getWinner(players: Player[]): Player | null {
    // 第一个出完牌的玩家获胜
    const finished = players.filter(p => p.finishedRank !== null && p.finishedRank !== undefined);
    if (finished.length === 0) return null;

    return finished.sort((a, b) => (a.finishedRank || 0) - (b.finishedRank || 0))[0];
}

/**
 * 获取下一个玩家索引
 * @param currentIndex 当前玩家索引
 * @param playerCount 玩家总数
 * @param finishedPlayers 已完成的玩家索引列表
 */
export function getNextPlayerIndex(
    currentIndex: number,
    playerCount: number,
    finishedPlayers: number[] = []
): number {
    let nextIndex = (currentIndex + 1) % playerCount;

    // 跳过已完成的玩家
    while (finishedPlayers.includes(nextIndex)) {
        nextIndex = (nextIndex + 1) % playerCount;
        // 防止无限循环
        if (nextIndex === currentIndex) break;
    }

    return nextIndex;
}
