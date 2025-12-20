/**
 * InferenceEngine - 游戏推理引擎
 * 
 * 职责：
 * 1. 记牌：记录已经打出的每张牌。
 * 2. 概率推演：基于已出牌和行为推断对手/队友的一手牌概率。
 * 3. 信号识别：识别队友的战术信号（如：打对A表示需要对子）。
 */

import { Card, Play } from '../../types/card';

export interface CardProbability {
    rank: number;
    prob: number; // 0-1
}

export interface PlayerInference {
    playerId: number;
    hasBomb: number;      // 有炸弹的概率
    hasJoker: number;     // 有王的概率
    weakSuits: string[];  // 缺门的概率（花色）- 虽不重要但可参考
    likelyRanks: number[]; // 可能持有的点数（比如总过K，说明手里没K或有K炸/K三张）
    remainingCount: number;
}

export class InferenceEngine {
    private playedCards: Map<number, number>; // rank -> count
    private playerInferences: Map<number, PlayerInference>;
    private playerCount: number;
    private deckCount: number;

    constructor(playerCount: number, deckCount: number = 2) { // 默认2副牌
        this.playerCount = playerCount;
        this.deckCount = deckCount;
        this.playedCards = new Map();
        this.playerInferences = new Map();
        this.reset();
    }

    reset() {
        this.playedCards.clear();
        for (let i = 0; i < this.playerCount; i++) {
            this.playerInferences.set(i, {
                playerId: i,
                hasBomb: 0.1, // 初始盲猜
                hasJoker: 0.2, // 初始盲猜
                weakSuits: [],
                likelyRanks: [],
                remainingCount: 27 // 初始值应根据发牌决定，这里仅为占位
            });
        }
    }

    /**
     * 记录出牌，更新推断
     * @param playerId 出牌者ID
     * @param cards 打出的牌
     */
    recordPlay(playerId: number, cards: Card[]) {
        // 1. 更新记牌器
        cards.forEach(c => {
            const count = this.playedCards.get(c.rank) || 0;
            this.playedCards.set(c.rank, count + 1);
        });

        // 2. 更新该玩家的剩余手牌数
        const inference = this.playerInferences.get(playerId);
        if (inference) {
            inference.remainingCount -= cards.length;
            if (inference.remainingCount < 0) inference.remainingCount = 0;
        }

        // 3. 简单的行为推断
        // 比如：如果只剩1张牌，肯定没有对子/三张/炸弹
        this.updateEndgameInference(playerId);
    }

    private updateEndgameInference(playerId: number) {
        const inference = this.playerInferences.get(playerId);
        if (inference && inference.remainingCount <= 1) {
            inference.hasBomb = 0;
            inference.hasJoker = 0; // 单张王其实算有的，这里简单化
        }
    }

    /**
     * 记录"过牌"行为（Critical Log）
     * @param playerId 过牌者ID
     * @param lastPlay 上家出的牌（他没管上的牌）
     */
    recordPass(playerId: number, lastPlay: Play) {
        // 这种推断是最有价值的！
        // 比如：上家打了单张8，他过了 -> 推断：他手里没有 >8 的单张，或者想保留大牌
        // 通常意味着：他手里的单张都很小，或者极少。

        // 简化实现：如果管不上单张，说明没大单张
        const playType = lastPlay.type as any;
        if (playType === 'single') {
            // 标记为弱单张玩家
            // TODO: 细化逻辑
        }
    }

    /**
     * 获取某张牌在某人手中的概率（朴素贝叶斯）
     */
    getProbability(playerId: number, rank: number): number {
        // 1. 先看外面还剩几张这张牌
        const playedCount = this.playedCards.get(rank) || 0;
        // 2副牌：普通牌8张，大小王各2张
        const totalCount = (rank === 16 || rank === 17) ? this.deckCount : (4 * this.deckCount);
        const remainingInDeck = totalCount - playedCount;

        if (remainingInDeck <= 0) return 0;

        // 2. 均摊到每个还没出完牌的人身上（简化版）
        // TODO: 结合 playerInferences 进行加权
        // 这里简单除以（玩家数 - 1），假设自己不算
        return remainingInDeck / Math.max(1, this.playerCount - 1);
    }
}
