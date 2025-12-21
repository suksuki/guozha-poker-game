/**
 * Vue移动端 AI Brain 集成服务
 * 将AI Brain系统集成到Vue移动端游戏
 * 
 * ⚠️ 注意：当前使用老APP的AI Brain系统
 * 未来计划：迁移到移动端独立的AI实现
 * 标记：TODO - 迁移到移动端独立AI系统
 */

// TODO: 迁移到移动端独立AI系统
import { GameBridge } from '@/core/ai-core/integration/GameBridge';
import { MasterBrainConfig } from '@/core/ai-core/master-brain/MasterAIBrain';
import { GameState as AIGameState } from '@/core/ai-core/types';
// TODO: 迁移到移动端独立Game类
import { Game } from '@/core/game-engine/Game';
import type { Card, Play } from '@/core/types/card';
import { canPlayCards } from '@/core/utils/cardUtils';

/**
 * AI Brain集成服务
 */
export class AIBrainIntegration {
  private gameBridge: GameBridge | null = null;
  private isInitialized = false;
  private communicationListeners: Set<(message: any) => void> = new Set();
  private decisionListeners: Set<(event: any) => void> = new Set();

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
        }
      });
    });

    // 保存取消订阅函数（如果需要的话）
    (this as any)._unsubscribeCommunication = unsubscribe;

    // 监听AI决策完成事件
    const unsubscribeTurn = api.onTurnComplete((event) => {
      this.decisionListeners.forEach((listener) => {
        try {
          listener(event);
        } catch (error) {
        }
      });
    });
    (this as any)._unsubscribeTurn = unsubscribeTurn;

    this.isInitialized = true;
  }

  /**
   * 转换游戏状态为AI Brain的GameState
   */
  convertGameState(game: Game, playerId: number): AIGameState {
    const currentRound = game.currentRound;
    const player = game.players[playerId];
    
    if (!player) {
      console.error(`[TEAM_DEBUG] convertGameState: 玩家不存在, playerId=${playerId}, players.length=${game.players.length}`);
      throw new Error(`Player ${playerId} not found`);
    }
    
    if (!player.hand || !Array.isArray(player.hand)) {
      console.error(`[TEAM_DEBUG] convertGameState: 玩家手牌无效, playerId=${playerId}, hand=${player.hand}`);
      throw new Error(`Player ${playerId} hand is invalid`);
    }
    
    const lastPlay = currentRound?.lastPlay || null;

    // 计算对手手牌数量
    const opponentHandSizes = game.players
      .filter((_, idx) => idx !== playerId)
      .map(p => p.hand?.length || 0);

    // 计算阶段
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
    const currentRoundScore = currentRound?.roundScore || 0;

    // 累计得分
    const cumulativeScores = new Map<number, number>();
    game.players.forEach((p, idx) => {
      cumulativeScores.set(idx, p.score ?? 0);
    });

    // 正确重建 Play 对象，否则 AI (MCTS) 拿不到 type/value 会导致非法出牌建议
    let lastPlayObj: Play | null = null;
    if (lastPlay && lastPlay.length > 0) {
      lastPlayObj = canPlayCards(lastPlay);
    }

    return {
      myHand: player.hand,
      myPosition: playerId,
      playerCount: game.players.length,
      lastPlay: lastPlayObj,
      lastPlayerId: currentRound?.lastPlayPlayerIndex ?? null,
      currentPlayerId: game.currentPlayerIndex,
      playHistory: (currentRound?.plays as any) || [],
      roundNumber: game.rounds.length,
      opponentHandSizes,
      teamMode: game.state?.config?.teamMode || false,
      currentRoundScore,
      cumulativeScores,
      phase
    };
  }

  async triggerAITurn(playerId: number, game: Game): Promise<void> {
    console.log(`[TEAM_DEBUG] aiBrainIntegration.triggerAITurn: 开始, Player=${playerId}, TeamMode=${game.state.config.teamMode}`);
    if (!this.gameBridge || !this.isInitialized) {
      console.log(`[TEAM_DEBUG] aiBrainIntegration.triggerAITurn: GameBridge或AI未初始化`);
      return;
    }

    // 转换状态并触发
    const gameState = this.convertGameState(game, playerId);
    console.log(`[TEAM_DEBUG] aiBrainIntegration.triggerAITurn: 状态转换完成, handSize=${gameState.myHand?.length || 0}, lastPlay=${gameState.lastPlay ? 'exists' : 'null'}`);
    const api = this.gameBridge.getAPI();
    console.log(`[TEAM_DEBUG] aiBrainIntegration.triggerAITurn: 调用api.triggerAITurn`);
    api.triggerAITurn(playerId, gameState);
  }

  /**
   * 发送用户消息（带游戏上下文）
   */
  async sendUserMessage(playerId: number, content: string, game: Game): Promise<void> {
    if (!this.gameBridge || !this.isInitialized) return;

    const gameState = this.convertGameState(game, playerId);
    const api = this.gameBridge.getAPI();
    await api.sendUserMessage(playerId, content, gameState);
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
   * 生成消息建议
   */
  async generateMessageSuggestion(playerId: number, game: Game): Promise<string | null> {
    if (!this.gameBridge || !this.isInitialized) {
      return null;
    }

    const gameState = this.convertGameState(game, playerId);
    const api = this.gameBridge.getAPI();
    return await api.generateMessageSuggestion(playerId, gameState);
  }

  /**
   * 生成游戏提示
   */
  async generateHint(game: Game, playerId: number): Promise<any> {
    if (!this.gameBridge || !this.isInitialized) {
      return null;
    }

    const gameState = this.convertGameState(game, playerId);
    const api = this.gameBridge.getAPI();
    return await api.generateHint(gameState);
  }

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
   * 监听AI决策结果
   */
  onAIDecision(callback: (event: {
    playerId: number;
    decision: any;
    message?: any;
  }) => void): () => void {
    this.decisionListeners.add(callback);
    return () => {
      this.decisionListeners.delete(callback);
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
   * 动态更新LLM配置（无需重启AI Brain）
   * @param updates 要更新的配置项
   */
  updateLLMConfig(updates: {
    endpoint?: string;
    model?: string;
    temperature?: number;
    maxTokens?: number;
    timeout?: number;
  }): void {
    if (!this.gameBridge || !this.isInitialized) {
      return;
    }

    this.gameBridge.getAPI().updateLLMConfig(updates);
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
    }
  }
}

// 单例
export const aiBrainIntegration = new AIBrainIntegration();

