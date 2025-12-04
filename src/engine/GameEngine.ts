/**
 * 游戏引擎 - 核心类
 * 
 * 职责：
 * 1. 初始化游戏
 * 2. 运行游戏主循环
 * 3. 调度各个组件（AI、状态、规则、渲染）
 * 4. 发送事件通知
 * 
 * 设计理念：
 * - 逻辑清晰：每个步骤都有明确注释
 * - 职责单一：只负责调度，不负责具体实现
 * - 易于调试：每个操作都有日志
 * - 完全独立：不依赖任何UI框架
 */

import { GameState } from './GameState';
import { Player } from './Player';
import { RuleEngine } from './RuleEngine';
import { TurnManager } from './TurnManager';
import { GameBridge } from '../ai-core/integration/GameBridge';
import { Card } from '../types/card';
import { GameEngineConfig, IRenderer, GameEvent, IGameState } from './types';
import { dealCards } from '../utils/cardDealing';

/**
 * 游戏引擎主类
 */
export class GameEngine {
  // ==================== 核心组件 ====================
  
  /** 游戏状态 */
  private gameState: GameState;
  
  /** 规则引擎 */
  private ruleEngine: RuleEngine;
  
  /** 回合管理器 */
  private turnManager: TurnManager;
  
  /** AI大脑桥接 */
  private aiBridge: GameBridge;
  private aiAPI: any;
  
  /** 渲染器 */
  private renderer: IRenderer;
  
  // ==================== 运行状态 ====================
  
  /** 是否正在运行 */
  private running: boolean = false;
  
  /** 是否已初始化 */
  private initialized: boolean = false;
  
  /** 事件监听器 */
  private eventListeners: Map<string, Set<Function>> = new Map();
  
  // ==================== 构造函数 ====================
  
  /**
   * 创建游戏引擎
   * @param config 引擎配置
   */
  constructor(private config: GameEngineConfig) {
    console.log('\n┌─────────────────────────────────┐');
    console.log('│   游戏引擎初始化中...           │');
    console.log('└─────────────────────────────────┘\n');
    
    // 创建渲染器
    this.renderer = config.renderer;
    console.log('✓ 渲染器已创建');
    
    // 创建规则引擎
    this.ruleEngine = new RuleEngine();
    console.log('✓ 规则引擎已创建');
    
    // 创建回合管理器
    this.turnManager = new TurnManager();
    console.log('✓ 回合管理器已创建');
    
    // 创建游戏状态
    const playerNames = config.playerNames || ['玩家0', '玩家1', '玩家2', '玩家3'];
    const personalities = config.aiConfig?.personalities || ['aggressive', 'conservative', 'balanced'];
    
    this.gameState = new GameState(
      config.playerCount,
      playerNames,
      config.aiPlayerIds,
      personalities
    );
    console.log('✓ 游戏状态已创建');
    
    // 创建AI大脑桥接
    this.aiBridge = new GameBridge();
    console.log('✓ AI大脑桥接已创建');
  }
  
  // ==================== 初始化 ====================
  
  /**
   * 初始化游戏引擎
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[GameEngine] 已经初始化过了');
      return;
    }
    
    console.log('\n[GameEngine] 开始初始化...');
    
    // 1. 初始化AI大脑
    console.log('\n步骤1: 初始化AI大脑...');
    this.aiAPI = this.aiBridge.getAPI();
    
    await this.aiAPI.initialize({
      aiPlayers: this.config.aiPlayerIds.map((id, idx) => ({
        id,
        personality: { 
          preset: this.config.aiConfig?.personalities?.[idx] || 'balanced' 
        },
        decisionModules: ['mcts'],
        communicationEnabled: true
      })),
      llm: {
        enabled: this.config.aiConfig?.enableLLM || false,
        endpoint: this.config.aiConfig?.llmEndpoint || 'http://localhost:11434/api/chat',
        model: this.config.aiConfig?.llmModel || 'qwen2.5:3b'
      },
      dataCollection: {
        enabled: this.config.aiConfig?.enableDataCollection !== false,
        autoExport: false,
        exportInterval: 60000
      },
      performance: {
        enableCache: true,
        timeout: 5000
      }
    });
    console.log('  ✓ AI大脑初始化完成');
    
    // 2. 设置AI事件监听
    console.log('\n步骤2: 设置AI事件监听...');
    this.setupAIEventListeners();
    console.log('  ✓ 事件监听设置完成');
    
    // 3. 发牌
    console.log('\n步骤3: 发牌...');
    this.dealInitialCards();
    console.log('  ✓ 发牌完成');
    
    this.initialized = true;
    
    console.log('\n┌─────────────────────────────────┐');
    console.log('│   游戏引擎初始化完成 ✓          │');
    console.log('└─────────────────────────────────┘\n');
  }
  
  /**
   * 设置AI事件监听
   */
  private setupAIEventListeners(): void {
    // 监听AI回合完成
    this.aiBridge.eventBus.on('ai:turn-complete', (result: any) => {
      this.handleAITurnComplete(result);
    });
    
    // 监听AI错误
    this.aiBridge.eventBus.on('ai:turn-error', (error: any) => {
      console.error('[GameEngine] AI错误:', error);
    });
  }
  
  /**
   * 处理AI回合完成
   */
  private handleAITurnComplete(result: any): void {
    const { playerId, decision, message } = result;
    
    console.log(`[GameEngine] AI${playerId}决策完成:`, {
      action: decision.action.type,
      confidence: decision.confidence?.toFixed(2)
    });
    
    // 应用AI决策
    if (decision.action.type === 'play') {
      const play = this.ruleEngine.cardsToPlay(decision.action.cards);
      if (play) {
        this.gameState.playCards(playerId, decision.action.cards, play);
        this.turnManager.resetPassCount();
      }
    } else {
      this.gameState.pass(playerId);
      this.turnManager.recordPass();
    }
    
    // 显示AI消息
    if (message) {
      this.renderer.showMessage(playerId, message.content);
    }
    
    // 触发事件
    this.emit('turn:end', { playerId, decision, message });
  }
  
  /**
   * 发牌
   */
  private dealInitialCards(): void {
    // 使用现有的发牌算法
    const playerHands = dealCards(this.config.playerCount);
    this.gameState.dealCards(playerHands);
  }
  
  // ==================== 游戏控制 ====================
  
  /**
   * 开始游戏
   */
  start(): void {
    if (!this.initialized) {
      throw new Error('游戏引擎未初始化，请先调用initialize()');
    }
    
    console.log('\n┌─────────────────────────────────┐');
    console.log('│        游戏开始！               │');
    console.log('└─────────────────────────────────┘\n');
    
    // 开始游戏
    this.gameState.startGame();
    this.turnManager.startRound(0);
    this.running = true;
    
    // 触发游戏开始事件
    this.emit('game:start', {});
    
    // 开始游戏循环
    this.gameLoop();
  }
  
  /**
   * 游戏主循环
   * 
   * 流程：
   * 1. 检查游戏是否结束
   * 2. 处理当前玩家回合
   * 3. 渲染
   * 4. 切换到下一个玩家
   * 5. 重复
   */
  private async gameLoop(): Promise<void> {
    while (this.running) {
      // 步骤1: 检查游戏是否结束
      if (this.gameState.isGameOver()) {
        this.onGameEnd();
        break;
      }
      
      // 步骤2: 处理当前玩家回合
      await this.processTurn();
      
      // 步骤3: 渲染当前状态
      this.renderer.render(this.gameState.export());
      
      // 步骤4: 检查回合是否结束
      if (this.turnManager.isRoundOver(this.config.playerCount)) {
        this.onRoundEnd();
      }
      
      // 步骤5: 切换到下一个玩家
      this.gameState.nextPlayer();
      
      // 等待一小段时间（让动画完成）
      await this.wait(500);
    }
  }
  
  /**
   * 处理一个玩家回合
   */
  private async processTurn(): Promise<void> {
    const currentPlayer = this.gameState.getCurrentPlayer();
    
    // 触发回合开始事件
    this.emit('turn:start', { playerId: currentPlayer.id });
    
    console.log(`\n--- 玩家${currentPlayer.id}的回合 ---`);
    
    if (currentPlayer.type === 'ai') {
      // AI玩家回合
      await this.handleAITurn(currentPlayer);
    } else {
      // 人类玩家回合
      await this.handleHumanTurn(currentPlayer);
    }
  }
  
  /**
   * 处理AI玩家回合
   */
  private async handleAITurn(player: IPlayer): Promise<void> {
    console.log(`[GameEngine] AI${player.id}思考中...`);
    
    // 显示思考状态
    this.renderer.showAIThinking(player.id);
    
    // 构建游戏状态（传给AI）
    const gameStateForAI = this.buildGameStateForAI(player.id);
    
    // 触发AI决策（异步，通过事件返回）
    this.aiAPI.triggerAITurn(player.id, gameStateForAI);
    
    // 等待AI响应（通过事件handleAITurnComplete处理）
    await this.waitForAIResponse();
  }
  
  /**
   * 处理人类玩家回合
   */
  private async handleHumanTurn(player: IPlayer): Promise<void> {
    console.log(`[GameEngine] 等待玩家${player.id}输入...`);
    
    // 等待人类输入
    const selectedCards = await this.renderer.waitForHumanInput();
    
    if (selectedCards && selectedCards.length > 0) {
      // 出牌
      const play = this.ruleEngine.cardsToPlay(selectedCards);
      if (play && this.ruleEngine.canPlay(selectedCards, this.gameState.lastPlay)) {
        this.gameState.playCards(player.id, selectedCards, play);
        this.turnManager.resetPassCount();
        console.log(`[GameEngine] 玩家${player.id}出牌成功`);
      } else {
        console.log(`[GameEngine] 不合法的出牌`);
      }
    } else {
      // Pass
      this.gameState.pass(player.id);
      this.turnManager.recordPass();
      console.log(`[GameEngine] 玩家${player.id} Pass`);
    }
  }
  
  /**
   * 构建给AI的游戏状态
   */
  private buildGameStateForAI(playerId: number): any {
    const player = this.gameState.getPlayer(playerId);
    const allPlayers = this.gameState.players;
    
    return {
      myHand: player.hand,
      myPosition: playerId,
      playerCount: this.config.playerCount,
      lastPlay: this.gameState.lastPlay,
      lastPlayerId: this.gameState.lastPlayerId,
      currentPlayerId: playerId,
      playHistory: [],  // TODO: 添加历史记录
      roundNumber: this.gameState.roundNumber,
      opponentHandSizes: allPlayers
        .filter(p => p.id !== playerId)
        .map(p => p.hand.length),
      teamMode: false,
      currentRoundScore: this.gameState.currentRoundScore,
      cumulativeScores: new Map(allPlayers.map(p => [p.id, p.score])),
      phase: this.determinePhase()
    };
  }
  
  /**
   * 确定游戏阶段
   */
  private determinePhase(): 'early' | 'middle' | 'late' | 'critical' {
    if (this.gameState.roundNumber <= 3) {
      return 'early';
    }
    
    const minCards = Math.min(...this.gameState.players.map(p => p.hand.length));
    if (minCards < 3) return 'critical';
    if (minCards < 5) return 'late';
    
    return 'middle';
  }
  
  /**
   * 等待AI响应
   */
  private async waitForAIResponse(): Promise<void> {
    // 简单等待（AI响应通过事件异步返回）
    await this.wait(100);
  }
  
  /**
   * 等待指定时间
   */
  private wait(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // ==================== 事件处理 ====================
  
  /**
   * 回合结束处理
   */
  private onRoundEnd(): void {
    console.log(`[GameEngine] 回合${this.gameState.roundNumber}结束`);
    
    // 触发回合结束事件
    this.emit('round:end', { roundNumber: this.gameState.roundNumber });
    
    // 开始新回合
    this.gameState.startNewRound();
    this.turnManager.startRound(this.gameState.currentPlayerId);
  }
  
  /**
   * 游戏结束处理
   */
  private onGameEnd(): void {
    console.log('\n┌─────────────────────────────────┐');
    console.log('│        游戏结束！               │');
    console.log('└─────────────────────────────────┘\n');
    
    this.running = false;
    
    // 显示结果
    this.renderer.showGameEnd(this.gameState.winnerId!);
    
    // 导出训练数据
    const trainingData = this.exportTrainingData();
    console.log(`\n收集了 ${trainingData.split('\n').length} 个训练样本`);
    
    // 触发游戏结束事件
    this.emit('game:end', { 
      winnerId: this.gameState.winnerId,
      trainingData 
    });
  }
  
  // ==================== 公共接口 ====================
  
  /**
   * 获取当前游戏状态
   */
  getState(): IGameState {
    return this.gameState.export();
  }
  
  /**
   * 导出训练数据
   */
  exportTrainingData(): string {
    return this.aiAPI.exportTrainingData();
  }
  
  /**
   * 获取统计信息
   */
  getStatistics(): any {
    return this.aiAPI.getStatistics();
  }
  
  /**
   * 停止游戏
   */
  stop(): void {
    this.running = false;
    console.log('[GameEngine] 游戏已停止');
  }
  
  /**
   * 重置游戏
   */
  async reset(): Promise<void> {
    console.log('[GameEngine] 重置游戏...');
    
    this.stop();
    this.gameState.reset();
    this.turnManager.reset();
    
    // 重新发牌
    this.dealInitialCards();
    
    console.log('[GameEngine] 游戏已重置');
  }
  
  // ==================== 事件系统 ====================
  
  /**
   * 注册事件监听
   * @param event 事件名称
   * @param handler 处理函数
   */
  on(event: string, handler: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    this.eventListeners.get(event)!.add(handler);
  }
  
  /**
   * 注销事件监听
   * @param event 事件名称
   * @param handler 处理函数
   */
  off(event: string, handler: Function): void {
    this.eventListeners.get(event)?.delete(handler);
  }
  
  /**
   * 触发事件
   * @param event 事件名称
   * @param data 事件数据
   */
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`[GameEngine] 事件处理错误 ${event}:`, error);
        }
      });
    }
  }
  
  // ==================== 调试和工具 ====================
  
  /**
   * 打印当前状态（调试用）
   */
  printState(): void {
    console.log('\n=== 当前游戏状态 ===');
    console.log(`回合: ${this.gameState.roundNumber}`);
    console.log(`当前玩家: ${this.gameState.currentPlayerId}`);
    console.log('玩家手牌:');
    this.gameState.players.forEach(p => {
      console.log(`  玩家${p.id}: ${p.hand.length}张 (${p.type}${p.personality ? '-' + p.personality : ''})`);
    });
    console.log('==================\n');
  }
}

