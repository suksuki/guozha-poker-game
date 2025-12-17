/**
 * PlayArea 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PlayArea from '../../src/components/game/PlayArea.vue';
import { createCard, createSameRankCards } from '../testFactories';
import { Rank, Suit } from '../../src/types/card';

// Mock i18n composable
vi.mock('../../src/i18n/composable', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'game.waitingFirstPlayer': '等待出牌',
                'game.playCards': '出牌',
                'game.round': '第',
                'game.playTypes.single': '单张',
                'game.playTypes.pair': '对子',
                'game.playTypes.triple': '三张',
                'game.playTypes.bomb': '炸弹',
                'game.playTypes.dun': '墩',
                'game.playTypes.combination': '组合',
            };
            return translations[key] || key;
        },
    }),
}));

// Mock CardView component
vi.mock('../../src/components/card/CardView.vue', () => ({
    default: {
        name: 'CardView',
        template: '<div class="mock-card-view" :data-rank="card.rank"></div>',
        props: ['card', 'size'],
    },
}));

describe('PlayArea 组件', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    const i18nPlugin = {
        install: (app: any) => {
            app.config.globalProperties.$t = (key: string) => {
                const translations: Record<string, string> = {
                    'game.waitingFirstPlayer': '等待出牌',
                    'game.playCards': '出牌',
                    'game.round': '第',
                    'game.playTypes.single': '单张',
                    'game.playTypes.pair': '对子',
                    'game.playTypes.triple': '三张',
                    'game.playTypes.bomb': '炸弹',
                    'game.playTypes.dun': '墩',
                    'game.playTypes.combination': '组合',
                };
                return translations[key] || key;
            };
        },
    };

    const createWrapper = (props: any) => {
        return mount(PlayArea, {
            props,
            global: {
                plugins: [i18nPlugin],
                stubs: {
                    'van-empty': {
                        template: '<div class="van-empty"><slot /></div>',
                        props: ['description', 'image', 'imageSize'],
                    },
                    'van-tag': {
                        template: '<span class="van-tag"><slot /></span>',
                        props: ['type', 'size'],
                    },
                },
            },
        });
    };

    describe('无出牌状态', () => {
        it('lastPlay为null时应该显示空状态', () => {
            const wrapper = createWrapper({
                lastPlay: null,
                lastPlayerName: '无',
                playCount: 0,
            });

            expect(wrapper.find('.empty-state').exists()).toBe(true);
        });

        it('lastPlay为空数组时应该显示空状态', () => {
            const wrapper = createWrapper({
                lastPlay: [],
                lastPlayerName: '无',
                playCount: 0,
            });

            expect(wrapper.find('.empty-state').exists()).toBe(true);
        });
    });

    describe('有出牌状态', () => {
        it('单张牌应该正确显示', () => {
            const card = createCard(Suit.SPADES, Rank.ACE);
            const wrapper = createWrapper({
                lastPlay: [card],
                lastPlayerName: '玩家1',
                playCount: 1,
            });

            expect(wrapper.find('.last-play-container').exists()).toBe(true);
            expect(wrapper.find('.mock-card-view').exists()).toBe(true);
        });

        it('对子应该显示两张牌', () => {
            const cards = createSameRankCards(Rank.FIVE, 2);
            const wrapper = createWrapper({
                lastPlay: cards,
                lastPlayerName: '玩家2',
                playCount: 2,
            });

            expect(wrapper.findAll('.mock-card-view').length).toBe(2);
        });

        it('炸弹应该显示四张牌', () => {
            const cards = createSameRankCards(Rank.THREE, 4);
            const wrapper = createWrapper({
                lastPlay: cards,
                lastPlayerName: '玩家3',
                playCount: 3,
            });

            expect(wrapper.findAll('.mock-card-view').length).toBe(4);
        });

        it('应该显示出牌玩家名称', () => {
            const cards = [createCard(Suit.HEARTS, Rank.KING)];
            const wrapper = createWrapper({
                lastPlay: cards,
                lastPlayerName: '测试玩家',
                playCount: 5,
            });

            expect(wrapper.text()).toContain('测试玩家');
        });

        it('应该显示轮次信息', () => {
            const cards = [createCard(Suit.DIAMONDS, Rank.TEN)];
            const wrapper = createWrapper({
                lastPlay: cards,
                lastPlayerName: '玩家',
                playCount: 10,
            });

            expect(wrapper.text()).toContain('10');
        });
    });

    describe('牌型识别', () => {
        it('单张应该显示正确的类型', () => {
            const wrapper = createWrapper({
                lastPlay: [createCard(Suit.SPADES, Rank.THREE)],
                lastPlayerName: '玩家',
                playCount: 1,
            });

            expect(wrapper.text()).toContain('单张');
        });

        it('对子应该显示正确的类型', () => {
            const wrapper = createWrapper({
                lastPlay: createSameRankCards(Rank.FOUR, 2),
                lastPlayerName: '玩家',
                playCount: 1,
            });

            expect(wrapper.text()).toContain('对子');
        });

        it('三张应该显示正确的类型', () => {
            const wrapper = createWrapper({
                lastPlay: createSameRankCards(Rank.FIVE, 3),
                lastPlayerName: '玩家',
                playCount: 1,
            });

            expect(wrapper.text()).toContain('三张');
        });

        it('炸弹应该显示正确的类型', () => {
            const wrapper = createWrapper({
                lastPlay: createSameRankCards(Rank.SIX, 4),
                lastPlayerName: '玩家',
                playCount: 1,
            });

            expect(wrapper.text()).toContain('炸弹');
        });
    });
});
