/**
 * 游戏Store辅助模块
 * 抽取游戏逻辑相关的工具函数，减少gameStore的复杂度
 */

import type { Card, Play, Player } from '@/core/types/card';
import { CardType } from '@/core/types/card';
import { canPlayCards, canBeat, findPlayableCards } from '@/core/utils/cardUtils';
import { isScoreCard, calculateCardsScore } from '@/core/services/scoringService';
import { ChannelType, ANNOUNCEMENT } from '../types/channel';

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
 * 获取AI推荐的出牌（使用findPlayableCards来支持拆牌）
 * @param hand 玩家手牌
 * @param lastPlay 上一手牌
 * @returns 推荐的牌组或null（表示过牌）
 */
export function getAIRecommendation(
    hand: Card[],
    lastPlay: Play | null
): { cards: Card[]; play: Play } | null {
    // 使用 findPlayableCards 来查找所有可出的牌（支持拆牌）
    const playableCards = findPlayableCards(hand, lastPlay);

    if (playableCards.length === 0) {
        return null; // 没有可出的牌，建议过牌
    }

    // 策略：选择最小的可出牌（按value排序，相同value选择张数少的）
    const plays = playableCards
        .map(cards => {
            const play = canPlayCards(cards);
            return play ? { cards, play } : null;
        })
        .filter((p): p is { cards: Card[]; play: Play } => p !== null)
        .sort((a, b) => {
            // 优先按value排序（值小的优先）
            if (a.play.value !== b.play.value) {
                return a.play.value - b.play.value;
            }
            // value相同，选择张数少的（更省牌）
            return a.cards.length - b.cards.length;
        });

    if (plays.length > 0) {
        return plays[0]; // 返回最小的可出牌
    }

    return null;
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
    const typeNames: Record<CardType, string> = {
        [CardType.SINGLE]: '单张',
        [CardType.PAIR]: '对子',
        [CardType.TRIPLE]: '三张',
        [CardType.BOMB]: '炸弹',
        [CardType.DUN]: '墩',
    };

    const typeName = typeNames[play.type] || '组合';
    const cardCount = cards.length;

    // 简单的报牌文字
    if (play.type === CardType.BOMB) {
        return `${cardCount}张炸弹！`;
    }
    if (play.type === CardType.DUN) {
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
    return ANNOUNCEMENT as ChannelType;
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
