/**
 * Store 工具模块
 * 提供 Store 相关的辅助函数
 */

import { computed, ComputedRef } from 'vue';

// =====================================================
// 游戏状态辅助
// =====================================================

/**
 * 创建玩家计算属性
 * @param getPlayers 获取玩家数组的函数
 * @param index 玩家索引
 */
export function createPlayerComputed<T>(
    getPlayers: () => T[],
    index: number
): ComputedRef<T | undefined> {
    return computed(() => getPlayers()[index]);
}

/**
 * 创建当前玩家检查器
 * @param getCurrentIndex 获取当前玩家索引
 */
export function createIsCurrentPlayerChecker(
    getCurrentIndex: () => number
): (playerId: number) => boolean {
    return (playerId: number) => getCurrentIndex() === playerId;
}

// =====================================================
// 持久化存储辅助
// =====================================================

const STORAGE_PREFIX = 'guozha_poker_';

/**
 * 从 localStorage 加载数据
 * @param key 键名
 * @param defaultValue 默认值
 */
export function loadFromStorage<T>(key: string, defaultValue: T): T {
    try {
        const stored = localStorage.getItem(STORAGE_PREFIX + key);
        if (stored) {
            return JSON.parse(stored) as T;
        }
    } catch (error) {
    }
    return defaultValue;
}

/**
 * 保存数据到 localStorage
 * @param key 键名
 * @param value 值
 */
export function saveToStorage<T>(key: string, value: T): boolean {
    try {
        localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 从 localStorage 删除数据
 * @param key 键名
 */
export function removeFromStorage(key: string): boolean {
    try {
        localStorage.removeItem(STORAGE_PREFIX + key);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * 清除所有游戏相关的存储
 */
export function clearAllStorage(): void {
    try {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(STORAGE_PREFIX)) {
                localStorage.removeItem(key);
            }
        });
    } catch (error) {
    }
}

// =====================================================
// 防抖和节流
// =====================================================

/**
 * 防抖函数
 * @param fn 要防抖的函数
 * @param delay 延迟时间（毫秒）
 */
export function debounce<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    return (...args: Parameters<T>) => {
        if (timeoutId) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            fn(...args);
            timeoutId = null;
        }, delay);
    };
}

/**
 * 节流函数
 * @param fn 要节流的函数
 * @param delay 最小间隔时间（毫秒）
 */
export function throttle<T extends (...args: any[]) => any>(
    fn: T,
    delay: number
): (...args: Parameters<T>) => void {
    let lastCall = 0;

    return (...args: Parameters<T>) => {
        const now = Date.now();
        if (now - lastCall >= delay) {
            lastCall = now;
            fn(...args);
        }
    };
}

// =====================================================
// 事件总线（简单版）
// =====================================================

type EventCallback = (...args: any[]) => void;

class EventBus {
    private events: Map<string, EventCallback[]> = new Map();

    /**
     * 订阅事件
     */
    on(event: string, callback: EventCallback): () => void {
        if (!this.events.has(event)) {
            this.events.set(event, []);
        }
        this.events.get(event)!.push(callback);

        // 返回取消订阅函数
        return () => this.off(event, callback);
    }

    /**
     * 取消订阅
     */
    off(event: string, callback: EventCallback): void {
        const callbacks = this.events.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 触发事件
     */
    emit(event: string, ...args: any[]): void {
        const callbacks = this.events.get(event);
        if (callbacks) {
            callbacks.forEach(callback => {
                try {
                    callback(...args);
                } catch (error) {
                }
            });
        }
    }

    /**
     * 订阅一次性事件
     */
    once(event: string, callback: EventCallback): () => void {
        const wrapper = (...args: any[]) => {
            this.off(event, wrapper);
            callback(...args);
        };
        return this.on(event, wrapper);
    }

    /**
     * 清除所有事件
     */
    clear(): void {
        this.events.clear();
    }
}

// 导出单例
export const eventBus = new EventBus();

// 游戏事件类型常量
export const GameEvents = {
    GAME_START: 'game:start',
    GAME_END: 'game:end',
    ROUND_START: 'round:start',
    ROUND_END: 'round:end',
    PLAYER_PLAY: 'player:play',
    PLAYER_PASS: 'player:pass',
    PLAYER_FINISH: 'player:finish',
    SCORE_UPDATE: 'score:update',
    SETTINGS_CHANGE: 'settings:change',
} as const;
