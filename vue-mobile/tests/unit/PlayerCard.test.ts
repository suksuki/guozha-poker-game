/**
 * PlayerCard 组件测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PlayerCard from '../../src/components/game/PlayerCard.vue';
import { createPlayer, createChatMessage } from '../testFactories';

// Mock i18n
vi.mock('../../src/i18n/composable', () => ({
    useI18n: () => ({
        t: (key: string) => {
            const translations: Record<string, string> = {
                'game.directions.west': '西',
                'game.directions.east': '东',
                'game.directions.north': '北',
                'game.directions.south': '南',
            };
            return translations[key] || key;
        },
    }),
}));

// Mock ChatBubble component
vi.mock('../../src/components/chat/ChatBubble.vue', () => ({
    default: {
        name: 'ChatBubble',
        template: '<div class="mock-chat-bubble"></div>',
        props: ['content', 'playerId', 'isHuman', 'position', 'offsetX', 'offsetY'],
    },
}));

describe('PlayerCard 组件', () => {
    beforeEach(() => {
        setActivePinia(createPinia());
    });

    const createWrapper = (props: any) => {
        return mount(PlayerCard, {
            props,
            global: {
                stubs: {
                    'van-tag': {
                        template: '<span class="van-tag"><slot /></span>',
                        props: ['size', 'type'],
                    },
                },
            },
        });
    };

    describe('基本渲染', () => {
        it('应该渲染玩家卡片', () => {
            const player = createPlayer(1, '测试玩家');
            const wrapper = createWrapper({
                player,
                position: 'left',
                isCurrent: false,
            });

            expect(wrapper.find('.player-card').exists()).toBe(true);
        });

        it('应该显示玩家头像', () => {
            const player = createPlayer(1, '测试玩家');
            const wrapper = createWrapper({
                player,
                position: 'left',
                isCurrent: false,
                isHuman: false,
            });

            expect(wrapper.find('.avatar').exists()).toBe(true);
            expect(wrapper.find('.avatar').text()).toBe('🤖');
        });

        it('人类玩家应该显示不同的头像', () => {
            const player = createPlayer(0, '玩家');
            const wrapper = createWrapper({
                player,
                position: 'bottom',
                isCurrent: false,
                isHuman: true,
            });

            expect(wrapper.find('.avatar').text()).toBe('🧑');
        });
    });

    describe('位置样式', () => {
        it('左侧位置应该使用垂直布局', () => {
            const player = createPlayer(1, '测试');
            const wrapper = createWrapper({
                player,
                position: 'left',
                isCurrent: false,
            });

            expect(wrapper.find('.position-left').exists()).toBe(true);
        });

        it('顶部位置应该使用水平布局', () => {
            const player = createPlayer(2, '测试');
            const wrapper = createWrapper({
                player,
                position: 'top',
                isCurrent: false,
            });

            expect(wrapper.find('.position-top').exists()).toBe(true);
        });
    });

    describe('当前玩家高亮', () => {
        it('当前玩家应该有高亮样式', () => {
            const player = createPlayer(1, '测试');
            const wrapper = createWrapper({
                player,
                position: 'left',
                isCurrent: true,
            });

            expect(wrapper.find('.is-current').exists()).toBe(true);
        });

        it('非当前玩家不应该有高亮样式', () => {
            const player = createPlayer(1, '测试');
            const wrapper = createWrapper({
                player,
                position: 'left',
                isCurrent: false,
            });

            expect(wrapper.find('.is-current').exists()).toBe(false);
        });
    });

    describe('玩家统计信息', () => {
        it('应该显示手牌数量', () => {
            const player = createPlayer(1, '测试');
            player.hand = [{ id: '1', suit: Suit.SPADES, rank: 3 }] as any;

            const wrapper = createWrapper({
                player,
                position: 'left',
                isCurrent: false,
            });

            expect(wrapper.text()).toContain('🎴');
            expect(wrapper.text()).toContain('1');
        });

        it('有分数时应该显示分数', () => {
            const player = createPlayer(1, '测试');
            player.score = 50;

            const wrapper = createWrapper({
                player,
                position: 'left',
                isCurrent: false,
            });

            expect(wrapper.text()).toContain('💰');
            expect(wrapper.text()).toContain('+50');
        });

        it('有墩数时应该显示墩数', () => {
            const player = createPlayer(1, '测试');
            player.dunCount = 2;

            const wrapper = createWrapper({
                player,
                position: 'left',
                isCurrent: false,
            });

            expect(wrapper.text()).toContain('🏆');
            expect(wrapper.text()).toContain('2');
        });
    });

    describe('完成排名', () => {
        it('有排名时应该显示排名标签', () => {
            const player = createPlayer(1, '测试');
            player.finishedRank = 1;

            const wrapper = createWrapper({
                player,
                position: 'left',
                isCurrent: false,
            });

            // 新UI使用 emoji 徽章代替 #1
            expect(wrapper.text()).toContain('🥇');
        });

        it('无排名时不显示排名标签', () => {
            const player = createPlayer(1, '测试');
            player.finishedRank = null;

            const wrapper = createWrapper({
                player,
                position: 'left',
                isCurrent: false,
            });

            // 无排名时不显示任何排名徽章
            expect(wrapper.find('.rank-badge').exists()).toBe(false);
        });
    });

    describe('聊天气泡', () => {
        it('有活跃气泡时应该显示', () => {
            const player = createPlayer(1, '测试');
            const bubble = createChatMessage(1, '你好');

            const wrapper = createWrapper({
                player,
                position: 'left',
                isCurrent: false,
                activeBubble: bubble,
            });

            // 由于使用了mock，检查mock组件是否存在
            expect(wrapper.find('.mock-chat-bubble').exists()).toBe(true);
        });
    });
});
