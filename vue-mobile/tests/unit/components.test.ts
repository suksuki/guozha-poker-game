/**
 * 组件单元测试
 * 测试新创建的可复用组件和游戏逻辑模块
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { Rank, Suit } from '../../src/types/card';
import {
    createCard,
    createSameRankCards,
    createBomb,
    createDun,
    createPlayer,
    createPlayers,
    createChatMessage,
    createGameState,
    createRound,
} from '../testFactories';

// Mock i18n
vi.mock('../../src/i18n/composable', () => ({
    useI18n: () => ({
        t: (key: string) => key,
    }),
}));

// Mock Vant components
vi.mock('vant', () => ({
    showToast: vi.fn(),
}));

describe('测试工厂模块', () => {
    describe('牌创建工厂', () => {
        it('应该创建单张牌', () => {
            const card = createCard(Suit.SPADES, Rank.ACE);
            expect(card.suit).toBe(Suit.SPADES);
            expect(card.rank).toBe(Rank.ACE);
            expect(card.id).toBeDefined();
        });

        it('应该创建多张相同点数的牌', () => {
            const cards = createSameRankCards(Rank.THREE, 4);
            expect(cards.length).toBe(4);
            cards.forEach(card => {
                expect(card.rank).toBe(Rank.THREE);
            });
        });

        it('应该创建炸弹', () => {
            const bomb = createBomb(Rank.FIVE, 4);
            expect(bomb.length).toBe(4);
            bomb.forEach(card => {
                expect(card.rank).toBe(Rank.FIVE);
            });
        });

        it('应该创建墩', () => {
            const dun = createDun(Rank.SEVEN, 7);
            expect(dun.length).toBe(7);
            dun.forEach(card => {
                expect(card.rank).toBe(Rank.SEVEN);
            });
        });

        it('创建墩时应该验证最小张数', () => {
            expect(() => createDun(Rank.SEVEN, 6)).toThrow('墩至少需要7张牌');
        });
    });

    describe('玩家创建工厂', () => {
        it('应该创建测试玩家', () => {
            const player = createPlayer(0, '测试玩家');
            expect(player.id).toBe(0);
            expect(player.name).toBe('测试玩家');
            expect(player.hand).toEqual([]);
            expect(player.score).toBe(0);
            expect(player.dunCount).toBe(0);
            expect(player.type).toBe('ai');
        });

        it('应该创建4人游戏玩家组', () => {
            const players = createPlayers();
            expect(players.length).toBe(4);
            expect(players[0].type).toBe('human');
            expect(players[1].type).toBe('ai');
        });

        it('应该为玩家生成手牌', () => {
            const players = createPlayers(true);
            players.forEach(player => {
                expect(player.hand.length).toBe(54);
            });
        });
    });

    describe('聊天消息工厂', () => {
        it('应该创建聊天消息', () => {
            const message = createChatMessage(1, '你好', 'social_chat');
            expect(message.playerId).toBe(1);
            expect(message.content).toBe('你好');
            expect(message.intent).toBe('social_chat');
            expect(message.id).toContain('msg-');
        });
    });

    describe('游戏状态工厂', () => {
        it('应该创建游戏状态', () => {
            const state = createGameState('playing');
            expect(state.status).toBe('playing');
            expect(state.players.length).toBe(4);
            expect(state.currentPlayerIndex).toBe(0);
        });

        it('应该创建轮次', () => {
            const round = createRound(5);
            expect(round.roundNumber).toBe(5);
            expect(round.plays).toEqual([]);
            expect(round.lastPlay).toBeNull();
        });
    });
});

describe('游戏逻辑模块', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    describe('出牌验证', () => {
        it('空牌应该验证失败', async () => {
            const { validatePlay } = await import('../../src/utils/gameLogic');
            const result = validatePlay([], null);
            expect(result.valid).toBe(false);
            expect(result.message).toBe('请选择要出的牌');
        });

        it('单张牌应该验证成功', async () => {
            const { validatePlay } = await import('../../src/utils/gameLogic');
            const cards = [createCard(Suit.SPADES, Rank.THREE)];
            const result = validatePlay(cards, null);
            expect(result.valid).toBe(true);
        });

        it('对子应该验证成功', async () => {
            const { validatePlay } = await import('../../src/utils/gameLogic');
            const cards = createSameRankCards(Rank.FIVE, 2);
            const result = validatePlay(cards, null);
            expect(result.valid).toBe(true);
        });
    });

    describe('过牌判断', () => {
        it('第一个出牌者不能过牌', async () => {
            const { canPass } = await import('../../src/utils/gameLogic');
            expect(canPass(null, true)).toBe(false);
        });

        it('有上一手牌时可以过牌', async () => {
            const { canPass } = await import('../../src/utils/gameLogic');
            const { CardType } = await import('../../src/types/card');
            const lastPlay = {
                type: CardType.SINGLE,
                cards: [createCard(Suit.SPADES, Rank.THREE)],
                rank: Rank.THREE,
                length: 1,
            };
            expect(canPass(lastPlay, false)).toBe(true);
        });
    });

    describe('分数计算', () => {
        it('应该正确计算分牌分数', async () => {
            const { calculatePlayScore } = await import('../../src/utils/gameLogic');
            const cards = [
                createCard(Suit.SPADES, Rank.FIVE),
                createCard(Suit.HEARTS, Rank.TEN),
                createCard(Suit.DIAMONDS, Rank.KING),
            ];
            expect(calculatePlayScore(cards)).toBe(25);
        });

        it('非分牌应该返回0', async () => {
            const { calculatePlayScore } = await import('../../src/utils/gameLogic');
            const cards = [createCard(Suit.SPADES, Rank.THREE)];
            expect(calculatePlayScore(cards)).toBe(0);
        });
    });

    describe('下一个玩家计算', () => {
        it('应该正确计算下一个玩家', async () => {
            const { getNextPlayerIndex } = await import('../../src/utils/gameLogic');
            expect(getNextPlayerIndex(0, 4)).toBe(1);
            expect(getNextPlayerIndex(3, 4)).toBe(0);
        });

        it('应该跳过已完成的玩家', async () => {
            const { getNextPlayerIndex } = await import('../../src/utils/gameLogic');
            expect(getNextPlayerIndex(0, 4, [1])).toBe(2);
            expect(getNextPlayerIndex(0, 4, [1, 2])).toBe(3);
        });
    });
});
