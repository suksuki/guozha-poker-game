/**
 * Master AI Brain - 统一AI大脑
 * 管理所有AI玩家，统一调度决策、通信、学习
 * 完全独立，不依赖任何UI框架
 */

import { GameState, AIPlayerConfig, Decision, CommunicationMessage } from '../types';
import { AIPlayer } from '../players/AIPlayer';
import { AIOrchestrator } from '../orchestrator/AIOrchestrator';
import { SharedCognitiveLayer } from '../cognitive/SharedCognitiveLayer';
import { CommunicationScheduler } from '../orchestrator/CommunicationScheduler';
import { RoundController } from '../orchestrator/RoundController';
import { MasterDataCollector } from '../infrastructure/data-collection/MasterDataCollector';
import { PerformanceMonitor } from '../infrastructure/monitoring/PerformanceMonitor';
import { GameKnowledgeBase } from '../infrastructure/knowledge/GameKnowledgeBase';
import { UnifiedLLMService } from '../infrastructure/llm/UnifiedLLMService';
import { EventBus } from '../integration/EventBus';

/**
 * Master AI Brain配置
 */
export interface MasterBrainConfig {
  // AI玩家配置
  aiPlayers: AIPlayerConfig[];
  
  // LLM配置
  llm?: {
    enabled: boolean;
    endpoint: string;
    model: string;
  };
  
  // 数据收集
  dataCollection: {
    enabled: boolean;
    autoExport: boolean;
    exportInterval: number;
  };
  
  // 性能配置
  performance: {
    enableCache: boolean;
    timeout: number;
  };
}

/**
 * AI行为结果
 */
export interface AIBehavior {
  playerId: number;
  decision?: Decision;
  message?: CommunicationMessage;
  cognitive: any;
  timestamp: number;
}

/**
 * Master AI Brain 主类
 */
export class MasterAIBrain {
  // AI玩家池
  private aiPlayers: Map<number, AIPlayer> = new Map();
  
  // 调度器
  private orchestrator: AIOrchestrator;
  private commScheduler: CommunicationScheduler;
  private roundController: RoundController;
  
  // 共享资源
  private sharedCognitive: SharedCognitiveLayer;
  private knowledgeBase: GameKnowledgeBase;
  private llmService: UnifiedLLMService | null = null;
  
  // 基础设施
  private dataCollector: MasterDataCollector;
  private perfMonitor: PerformanceMonitor;
  private eventBus: EventBus;
  
  // 配置和状态
  private config: MasterBrainConfig;
  private initialized: boolean = false;
  private sessionId: string | null = null;
  
  constructor(config: MasterBrainConfig) {
    this.config = config;
    
    // 创建事件总线
    this.eventBus = new EventBus();
    
    // 创建基础设施
    this.dataCollector = new MasterDataCollector();
    this.perfMonitor = new PerformanceMonitor();
    this.knowledgeBase = new GameKnowledgeBase();
    
    // 创建共享层
    this.sharedCognitive = new SharedCognitiveLayer(this.knowledgeBase);
    
    // 创建调度器
    this.orchestrator = new AIOrchestrator(this.eventBus);
    this.commScheduler = new CommunicationScheduler(this.eventBus);
    this.roundController = new RoundController(this.eventBus);
    
    console.log('[MasterAIBrain] 创建成功');
  }
  
  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('[MasterAIBrain] 已经初始化');
      return;
    }
    
    console.log('[MasterAIBrain] 开始初始化...');
    
    const timer = this.perfMonitor.startTimer('analysis', 'initialization');
    
    try {
      // 1. 初始化知识库
      await this.knowledgeBase.initialize();
      
      // 2. 初始化LLM服务（如果启用）
      if (this.config.llm?.enabled) {
        this.llmService = new UnifiedLLMService({
          provider: 'ollama',
          endpoint: this.config.llm.endpoint,
          model: this.config.llm.model,
          defaultTemperature: 0.7,
          defaultMaxTokens: 500,
          timeout: 5000,
          retryCount: 2
        });
        console.log('[MasterAIBrain] LLM服务已启用');
      }
      
      // 3. 创建AI玩家
      for (const playerConfig of this.config.aiPlayers) {
        const player = new AIPlayer(playerConfig, {
          sharedCognitive: this.sharedCognitive,
          knowledgeBase: this.knowledgeBase,
          llmService: this.llmService
        });
        
        await player.initialize();
        this.aiPlayers.set(playerConfig.id, player);
        
        console.log(`[MasterAIBrain] AI玩家${playerConfig.id}已创建 (${playerConfig.personality.preset})`);
      }
      
      // 4. 初始化调度器
      await this.orchestrator.initialize(this.aiPlayers);
      await this.commScheduler.initialize();
      
      // 5. 开始数据收集会话
      if (this.config.dataCollection.enabled) {
        this.sessionId = this.dataCollector.startSession({
          gameMode: 'normal',
          playerCount: this.config.aiPlayers.length,
          aiCount: this.config.aiPlayers.length
        });
      }
      
      this.initialized = true;
      timer(true);
      
      console.log('[MasterAIBrain] 初始化完成 ✓');
    } catch (error) {
      timer(false);
      console.error('[MasterAIBrain] 初始化失败:', error);
      throw error;
    }
  }
  
  /**
   * 处理AI回合
   */
  async handleTurn(playerId: number, gameState: GameState): Promise<AIBehavior> {
    const timer = this.perfMonitor.startTimer('decision', `player_${playerId}`);
    
    try {
      const player = this.aiPlayers.get(playerId);
      if (!player) {
        throw new Error(`AI玩家${playerId}不存在`);
      }
      
      // 1. 共享认知层分析（所有AI共享）
      const cognitive = await this.sharedCognitive.analyze(gameState);
      
      // 2. 该AI做决策
      const decision = await player.makeDecision(gameState, cognitive);
      
      // 3. 通信调度器决定是否说话
      const message = await this.commScheduler.maybeGenerateMessage(
        playerId,
        {
          trigger: 'after_decision',
          gameState,
          decision,
          cognitive
        }
      );
      
      // 4. 收集训练数据
      if (this.config.dataCollection.enabled) {
        this.dataCollector.recordDecision({
          playerId,
          personality: player.getPersonality().preset || 'unknown',
          gameState,
          cognitive,
          decision
        });
        
        if (message) {
          this.dataCollector.recordCommunication({
            playerId,
            personality: player.getPersonality().preset || 'unknown',
            gameState,
            cognitive,
            message
          });
        }
      }
      
      timer(true);
      
      return {
        playerId,
        decision,
        message: message || undefined,
        cognitive,
        timestamp: Date.now()
      };
      
    } catch (error) {
      timer(false);
      console.error('[MasterAIBrain] 处理回合失败:', error);
      throw error;
    }
  }
  
  /**
   * 处理完整Round（可选，由大脑完全控制）
   */
  async processRound(gameState: GameState): Promise<any> {
    return await this.roundController.controlRound(
      gameState,
      this.aiPlayers,
      this.sharedCognitive,
      this.commScheduler
    );
  }
  
  /**
   * 导出训练数据
   */
  exportTrainingData(): string {
    return this.dataCollector.exportForLLMTraining();
  }
  
  /**
   * 获取统计信息
   */
  getStatistics(): any {
    return {
      performance: this.perfMonitor.getStats(),
      dataCollection: this.dataCollector.getStatistics(),
      llm: this.llmService?.getStatistics(),
      aiPlayers: Array.from(this.aiPlayers.values()).map(p => p.getStatistics())
    };
  }
  
  /**
   * 获取AI玩家
   */
  getPlayer(playerId: number): AIPlayer | undefined {
    return this.aiPlayers.get(playerId);
  }
  
  /**
   * 关闭
   */
  async shutdown(): Promise<void> {
    if (!this.initialized) return;
    
    console.log('[MasterAIBrain] 开始关闭...');
    
    // 结束数据收集会话
    if (this.sessionId) {
      this.dataCollector.endSession();
    }
    
    // 关闭所有AI玩家
    for (const player of this.aiPlayers.values()) {
      await player.shutdown();
    }
    
    this.initialized = false;
    console.log('[MasterAIBrain] 已关闭');
  }
}

