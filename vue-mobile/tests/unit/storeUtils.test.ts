/**
 * Store 工具模块测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
    debounce,
    throttle,
    eventBus,
    GameEvents,
} from '../../src/stores/storeUtils';

// localStorage mock 在 jsdom 环境中可能行为不同，跳过这些测试
// 只测试纯函数部分

describe('Store 工具模块', () => {
    describe('防抖函数', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('应该延迟执行', () => {
            const fn = vi.fn();
            const debouncedFn = debounce(fn, 100);

            debouncedFn();
            expect(fn).not.toHaveBeenCalled();

            vi.advanceTimersByTime(100);
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('多次调用应该只执行最后一次', () => {
            const fn = vi.fn();
            const debouncedFn = debounce(fn, 100);

            debouncedFn('a');
            debouncedFn('b');
            debouncedFn('c');

            vi.advanceTimersByTime(100);
            expect(fn).toHaveBeenCalledTimes(1);
            expect(fn).toHaveBeenCalledWith('c');
        });

        it('在延迟期间重新调用应该重置计时器', () => {
            const fn = vi.fn();
            const debouncedFn = debounce(fn, 100);

            debouncedFn();
            vi.advanceTimersByTime(50);
            debouncedFn();
            vi.advanceTimersByTime(50);

            expect(fn).not.toHaveBeenCalled();

            vi.advanceTimersByTime(50);
            expect(fn).toHaveBeenCalledTimes(1);
        });
    });

    describe('节流函数', () => {
        beforeEach(() => {
            vi.useFakeTimers();
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('应该立即执行第一次调用', () => {
            const fn = vi.fn();
            const throttledFn = throttle(fn, 100);

            throttledFn();
            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('在间隔时间内多次调用应该被忽略', () => {
            const fn = vi.fn();
            const throttledFn = throttle(fn, 100);

            throttledFn();
            throttledFn();
            throttledFn();

            expect(fn).toHaveBeenCalledTimes(1);
        });

        it('超过间隔时间后应该可以再次执行', () => {
            const fn = vi.fn();
            const throttledFn = throttle(fn, 100);

            throttledFn();
            vi.advanceTimersByTime(100);
            throttledFn();

            expect(fn).toHaveBeenCalledTimes(2);
        });

        it('应该正确传递参数', () => {
            const fn = vi.fn();
            const throttledFn = throttle(fn, 100);

            throttledFn('arg1', 'arg2');
            expect(fn).toHaveBeenCalledWith('arg1', 'arg2');
        });
    });

    describe('事件总线', () => {
        beforeEach(() => {
            eventBus.clear();
        });

        it('on 应该订阅事件', () => {
            const callback = vi.fn();
            eventBus.on('test', callback);

            eventBus.emit('test', 'arg1', 'arg2');

            expect(callback).toHaveBeenCalledWith('arg1', 'arg2');
        });

        it('off 应该取消订阅', () => {
            const callback = vi.fn();
            eventBus.on('test', callback);
            eventBus.off('test', callback);

            eventBus.emit('test');

            expect(callback).not.toHaveBeenCalled();
        });

        it('on 返回的函数应该能取消订阅', () => {
            const callback = vi.fn();
            const unsubscribe = eventBus.on('test', callback);

            unsubscribe();
            eventBus.emit('test');

            expect(callback).not.toHaveBeenCalled();
        });

        it('once 应该只触发一次', () => {
            const callback = vi.fn();
            eventBus.once('test', callback);

            eventBus.emit('test');
            eventBus.emit('test');

            expect(callback).toHaveBeenCalledTimes(1);
        });

        it('多个订阅者应该都被调用', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            eventBus.on('test', callback1);
            eventBus.on('test', callback2);

            eventBus.emit('test');

            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).toHaveBeenCalledTimes(1);
        });

        it('clear 应该清除所有事件', () => {
            const callback = vi.fn();
            eventBus.on('test1', callback);
            eventBus.on('test2', callback);

            eventBus.clear();

            eventBus.emit('test1');
            eventBus.emit('test2');

            expect(callback).not.toHaveBeenCalled();
        });

        it('不同事件应该互不影响', () => {
            const callback1 = vi.fn();
            const callback2 = vi.fn();

            eventBus.on('event1', callback1);
            eventBus.on('event2', callback2);

            eventBus.emit('event1');

            expect(callback1).toHaveBeenCalledTimes(1);
            expect(callback2).not.toHaveBeenCalled();
        });

        it('订阅不存在的事件时不应该报错', () => {
            expect(() => {
                eventBus.emit('nonexistent');
            }).not.toThrow();
        });
    });

    describe('游戏事件常量', () => {
        it('应该定义所有游戏事件', () => {
            expect(GameEvents.GAME_START).toBe('game:start');
            expect(GameEvents.GAME_END).toBe('game:end');
            expect(GameEvents.ROUND_START).toBe('round:start');
            expect(GameEvents.ROUND_END).toBe('round:end');
            expect(GameEvents.PLAYER_PLAY).toBe('player:play');
            expect(GameEvents.PLAYER_PASS).toBe('player:pass');
            expect(GameEvents.PLAYER_FINISH).toBe('player:finish');
            expect(GameEvents.SCORE_UPDATE).toBe('score:update');
            expect(GameEvents.SETTINGS_CHANGE).toBe('settings:change');
        });

        it('事件常量应该是唯一的', () => {
            const values = Object.values(GameEvents);
            const uniqueValues = new Set(values);
            expect(values.length).toBe(uniqueValues.size);
        });
    });
});
