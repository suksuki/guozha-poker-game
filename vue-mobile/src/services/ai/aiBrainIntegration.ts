/**
 * Vue移动端 AI Brain 集成服务
 * 将AI Brain系统集成到Vue移动端游戏
 * 
 * ⚠️ 注意：当前使用老APP的AI Brain系统
 * 未来计划：迁移到移动端独立的AI实现
 * 标记：TODO - 迁移到移动端独立AI系统
 */

// TODO: 迁移到移动端独立AI系统
import { GameBridge } from '../../../../src/ai-core/integration/GameBridge';
import { MasterBrainConfig } from '../../../../src/ai-core/master-brain/MasterAIBrain';
import { GameState as AIGameState } from '../../../../src/ai-core/types';
// TODO: 迁移到移动端独立Game类
import { Game } from '../../../../src/game-engine/Game';
import type { Card, Play } from '../../../../src/types/card';

/**
 * AI Brain集成服务
 */
export class AIBrainIntegration {
  private gameBridge: GameBridge | null = null;
  private isInitialized = false;
  private communicationListeners: Set<(message: any) => void> = new Set();

  /**
   * 初始化AI Brain
   */
  async initialize(config: {
    llmProvider?: 'ollama' | 'openai' | 'claude';
    llmEndpoint?: string;
    llmModel?: string;
    enableLLM?: boolean;
    timeout?: number; // LLM请求超时时间（毫秒），默认30秒
    temperature?: number; // 温度参数
    maxTokens?: number; // 最大token数
  }): Promise<void> {
    if (this.isInitialized) {
      console.warn('[AIBrainIntegration] 已经初始化，跳过');
      return;
    }

    const brainConfig: MasterBrainConfig = {
      aiPlayers: [
        { id: 1, personality: { preset: 'aggressive', chattiness: 0.6 }, decisionModules: ['mcts'], communicationEnabled: true },
        { id: 2, personality: { preset: 'balanced', chattiness: 0.5 }, decisionModules: ['mcts'], communicationEnabled: true },
        { id: 3, personality: { preset: 'conservative', chattiness: 0.4 }, decisionModules: ['mcts'], communicationEnabled: true }
      ],
      llm: {
        enabled: config.enableLLM !== false,
        endpoint: config.llmEndpoint || 'http://localhost:11434/api/chat',
        model: config.llmModel || 'qwen2.5:3b',
        temperature: config.temperature, // 从配置传递
        maxTokens: config.maxTokens // 从配置传递
      },
      dataCollection: {
        enabled: true,
        autoExport: false,
        exportInterval: 3600000
      },
      performance: {
        enableCache: true,
        timeout: config.timeout || 30000 // 使用配置的超时时间，默认30秒
      }
    };

    this.gameBridge = new GameBridge();
    const api = this.gameBridge.getAPI();
    
    // 先初始化AI Brain，这样GameBridge才能获取到EventBus
    await api.initialize(brainConfig);
    
    // 初始化完成后，再设置通信消息监听（此时EventBus已经可用）
    const unsubscribe = this.gameBridge.onCommunication((event) => {
      this.communicationListeners.forEach(listener => {
        try {
          listener(event);
        } catch (error) {
          console.error('[AIBrainIntegration] 通知监听器失败', error);
        }
      });
    });
    
    // 保存取消订阅函数（如果需要的话）
    (this as any)._unsubscribeCommunication = unsubscribe;

    this.isInitialized = true;
    console.log('[AIBrainIntegration] AI Brain初始化完成');
  }

  /**
   * 转换游戏状态为AI Brain的GameState
   */
  convertGameState(game: Game, playerId: number): AIGameState {
    const currentRound = game.currentRound;
    const player = game.players[playerId];
    const lastPlay = currentRound?.lastPlay || null;
    
    // 计算对手手牌数量
    const opponentHandSizes = game.players
      .filter((_, idx) => idx !== playerId)
      .map(p => p.hand.length);

    // 计算阶段
    const totalCards = game.players.reduce((sum, p) => sum + p.hand.length, 0);
    const remainingCards = player.hand.length;
    let phase: 'early' | 'middle' | 'late' | 'critical';
    if (remainingCards <= 3) {
      phase = 'critical';
    } else if (remainingCards <= 8) {
      phase = 'late';
    } else if (remainingCards <= 15) {
      phase = 'middle';
    } else {
      phase = 'early';
    }

    // 计算当前回合得分
    const currentRoundScore = currentRound?.score || 0;

    // 累计得分
    const cumulativeScores = new Map<number, number>();
    game.players.forEach((p, idx) => {
      cumulativeScores.set(idx, p.score);
    });

    return {
      myHand: player.hand,
      myPosition: playerId,
      playerCount: game.players.length,
      lastPlay: lastPlay as Play | null,
      lastPlayerId: currentRound?.lastPlayerIndex ?? null,
      currentPlayerId: game.currentPlayerIndex,
      playHistory: currentRound?.plays || [],
      roundNumber: game.rounds.length,
      opponentHandSizes,
      teamMode: game.state?.config?.teamMode || false,
      currentRoundScore,
      cumulativeScores,
      phase
    };
  }

  /**
   * 触发AI回合
   */
  async triggerAITurn(playerId: number, game: Game): Promise<void> {
    if (!this.gameBridge || !this.isInitialized) {
      console.warn('[AIBrainIntegration] AI Brain未初始化');
      return;
    }

    const gameState = this.convertGameState(game, playerId);
    const api = this.gameBridge.getAPI();
    api.triggerAITurn(playerId, gameState);
  }

  /**
   * 通知游戏状态变化（触发反应聊天）
   */
  async notifyStateChange(game: Game, playerId: number, changeType: 'play' | 'pass' | 'event' = 'play'): Promise<void> {
    if (!this.gameBridge || !this.isInitialized) {
      return;
    }

    const gameState = this.convertGameState(game, playerId);
    const api = this.gameBridge.getAPI();
    await api.notifyStateChange(gameState, changeType).catch(err => {
      console.error(`[AIBrainIntegration] 游戏状态更新失败:`, err);
    });
  }
  
  /**
   * 触发批量聊天（用于关键时刻）
   */
  async triggerBatchChat(
    game: Game,
    playerId: number,
    trigger: 'after_play' | 'after_pass' | 'game_event',
    eventType?: string
  ): Promise<Map<number, any>> {
    if (!this.gameBridge || !this.isInitialized) {
      return new Map();
    }

    const gameState = this.convertGameState(game, playerId);
    const api = this.gameBridge.getAPI();
    return await api.triggerBatchChat(gameState, trigger, eventType);
  }

  /**
   * 监听AI通信消息
   */
  onCommunicationMessage(callback: (message: {
    playerId: number;
    content: string;
    intent: string;
    emotion?: string;
    timestamp: number;
  }) => void): () => void {
    this.communicationListeners.add(callback);
    
    // 返回取消监听的函数
    return () => {
      this.communicationListeners.delete(callback);
    };
  }

  /**
   * 获取统计信息
   */
  getStatistics(): any {
    if (!this.gameBridge || !this.isInitialized) {
      return {};
    }
    return this.gameBridge.getAPI().getStatistics();
  }

  /**
   * 关闭
   */
  async shutdown(): Promise<void> {
    if (this.gameBridge && this.isInitialized) {
      await this.gameBridge.getAPI().shutdown();
      this.gameBridge = null;
      this.isInitialized = false;
      this.communicationListeners.clear();
      console.log('[AIBrainIntegration] AI Brain已关闭');
    }
  }
}

// 单例
export const aiBrainIntegration = new AIBrainIntegration();

