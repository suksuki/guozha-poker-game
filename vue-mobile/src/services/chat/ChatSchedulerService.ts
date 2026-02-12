/**
 * 聊天调度服务
 * 独立的聊天调度器，监听游戏事件并触发AI聊天
 * 
 * 设计原则：
 * - 关注点分离：gameStore只管游戏逻辑，聊天调度独立处理
 * - 事件驱动：通过 window.dispatchEvent 接收游戏事件
 * - 概率控制：避免每次出牌都触发聊天
 * - 频率限制：防止消息轰炸
 */

import { aiBrainIntegration } from '../ai/aiBrainIntegration';
import type { Card } from '@/core/types/card';
import { Game } from '@/core/game-engine/Game';

// 游戏事件类型定义
export interface PlayerPlayedEventDetail {
    playerId: number;
    cards: Card[];
    playType?: string;
}

export interface PlayerPassedEventDetail {
    playerId: number;
}

// 声明自定义事件类型（用于 TypeScript 类型检查）
declare global {
    interface WindowEventMap {
        'guozha:player-played': CustomEvent<PlayerPlayedEventDetail>;
        'guozha:player-passed': CustomEvent<PlayerPassedEventDetail>;
    }
}

class ChatSchedulerService {
    // 配置参数
    private chatProbability = 0.35;       // 35% 概率触发聊天
    private minChatInterval = 5000;       // 最小5秒间隔（毫秒）
    private lastChatTime = 0;

    // 获取游戏实例的回调（由外部注入）
    private getGameInstance: (() => Game | null) | null = null;

    // 事件监听器引用（用于清理）
    private boundHandlePlayerPlayed: ((e: CustomEvent<PlayerPlayedEventDetail>) => void) | null = null;
    private boundHandlePlayerPassed: ((e: CustomEvent<PlayerPassedEventDetail>) => void) | null = null;

    private isInitialized = false;

    /**
     * 初始化聊天调度服务
     * @param getGameInstance 获取当前游戏实例的回调函数
     */
    initialize(getGameInstance: () => Game | null): void {
        if (this.isInitialized) {
            return;
        }

        this.getGameInstance = getGameInstance;

        // 绑定事件处理器
        this.boundHandlePlayerPlayed = (e) => this.handlePlayerPlayed(e.detail);
        this.boundHandlePlayerPassed = (e) => this.handlePlayerPassed(e.detail);

        // 注册事件监听
        window.addEventListener('guozha:player-played', this.boundHandlePlayerPlayed);
        window.addEventListener('guozha:player-passed', this.boundHandlePlayerPassed);

        this.isInitialized = true;
    }

    /**
     * 处理玩家出牌事件
     */
    private handlePlayerPlayed(detail: PlayerPlayedEventDetail): void {
        // 检查是否应该触发聊天
        if (!this.shouldTriggerChat(detail.playType)) {
            return;
        }

        // 触发聊天（异步，不阻塞游戏流程）
        this.triggerChat(detail.playerId, 'play');
    }

    /**
     * 处理玩家不要事件
     */
    private handlePlayerPassed(detail: PlayerPassedEventDetail): void {
        // 不要事件的聊天概率降低
        if (!this.shouldTriggerChat('pass')) {
            return;
        }

        // 触发聊天（异步，不阻塞游戏流程）
        this.triggerChat(detail.playerId, 'pass');
    }

    /**
     * 判断是否应该触发聊天
     * @param playType 出牌类型（可选）
     */
    private shouldTriggerChat(playType?: string): boolean {
        const now = Date.now();

        // 1. 检查最小间隔
        if (now - this.lastChatTime < this.minChatInterval) {
            return false;
        }

        // 2. 计算概率
        let probability = this.chatProbability;

        // 根据出牌类型调整概率
        if (playType === 'bomb' || playType === 'dun') {
            probability *= 2.5; // 炸弹或墩时大幅提高概率
        } else if (playType === 'pass') {
            probability *= 0.5; // 不要时降低概率
        }

        // 限制最大概率为 80%
        probability = Math.min(probability, 0.8);

        // 3. 随机判断
        const roll = Math.random();
        const triggered = roll < probability;


        return triggered;
    }

    /**
     * 触发聊天
     */
    private async triggerChat(playerId: number, actionType: 'play' | 'pass'): Promise<void> {
        const game = this.getGameInstance?.();

        if (!game) {
            return;
        }

        // 更新最后聊天时间
        this.lastChatTime = Date.now();


        // 使用 setTimeout 将其推入下一个事件循环，确保完全不阻塞主线程
        // 完全异步执行，不等待结果，避免阻塞游戏流程
        // 移除 await，让所有操作在后台异步执行
        setTimeout(() => {
            // 不等待，完全异步执行
            aiBrainIntegration.notifyStateChange(game as any, playerId, actionType).catch(error => {
            });
        }, 0);
    }

    /**
     * 更新配置
     */
    updateConfig(config: {
        chatProbability?: number;
        minChatInterval?: number;
    }): void {
        if (config.chatProbability !== undefined) {
            this.chatProbability = Math.max(0, Math.min(1, config.chatProbability));
        }
        if (config.minChatInterval !== undefined) {
            this.minChatInterval = Math.max(1000, config.minChatInterval);
        }
    }

    /**
     * 获取当前配置
     */
    getConfig(): { chatProbability: number; minChatInterval: number } {
        return {
            chatProbability: this.chatProbability,
            minChatInterval: this.minChatInterval
        };
    }

    /**
     * 清理资源
     */
    destroy(): void {
        if (this.boundHandlePlayerPlayed) {
            window.removeEventListener('guozha:player-played', this.boundHandlePlayerPlayed);
        }
        if (this.boundHandlePlayerPassed) {
            window.removeEventListener('guozha:player-passed', this.boundHandlePlayerPassed);
        }

        this.boundHandlePlayerPlayed = null;
        this.boundHandlePlayerPassed = null;
        this.getGameInstance = null;
        this.isInitialized = false;

    }
}

// 导出单例
export const chatSchedulerService = new ChatSchedulerService();
