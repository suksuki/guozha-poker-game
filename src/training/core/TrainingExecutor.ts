/**
 * 训练执行器
 * 负责执行具体的训练任务
 */

import { TrainingConfig, TrainingRoundResult } from '../../types/training';
import { FastGameRunner } from '../utils/FastGameRunner';
import { DecisionDataCollector } from '../decision/DecisionDataCollector';
import { ChatDataCollector } from '../chat/ChatDataCollector';
import { MCTSTrainer } from '../decision/MCTSTrainer';
import { ChatTrainer } from '../chat/ChatTrainer';

export class TrainingExecutor {
  private config: TrainingConfig | null = null;
  private fastGameRunner: FastGameRunner | null = null;
  private decisionCollector: DecisionDataCollector | null = null;
  private chatCollector: ChatDataCollector | null = null;
  private mctsTrainer: MCTSTrainer | null = null;
  private chatTrainer: ChatTrainer | null = null;
  private stopRequested: boolean = false;
  
  /**
   * 初始化
   */
  async initialize(config: TrainingConfig): Promise<void> {
    this.config = config;
    this.stopRequested = false;
    
    // 初始化快速游戏运行器
    this.fastGameRunner = new FastGameRunner({
      speedMultiplier: config.fastMode?.speedMultiplier || 10,
      skipUI: config.fastMode?.skipUI !== false,
      skipTTS: config.fastMode?.skipTTS !== false
    });
    
    // 初始化数据收集器
    if (config.type === 'decision' || config.type === 'hybrid') {
      this.decisionCollector = new DecisionDataCollector();
      this.mctsTrainer = new MCTSTrainer();
    }
    
    if (config.type === 'chat' || config.type === 'hybrid') {
      this.chatCollector = new ChatDataCollector();
      this.chatTrainer = new ChatTrainer();
    }
  }
  
  /**
   * 执行一轮训练
   */
  async executeRound(): Promise<TrainingRoundResult> {
    if (!this.config) {
      throw new Error('训练执行器未初始化');
    }
    
    if (this.stopRequested) {
      throw new Error('训练已停止');
    }
    
    const roundStartTime = Date.now();
    let games = 0;
    let decisions = 0;
    let chats = 0;
    
    // 根据训练类型执行
    switch (this.config.type) {
      case 'decision':
        ({ games, decisions } = await this.executeDecisionTraining());
        break;
      case 'chat':
        ({ games, chats } = await this.executeChatTraining());
        break;
      case 'hybrid':
        ({ games, decisions, chats } = await this.executeHybridTraining());
        break;
    }
    
    const duration = Date.now() - roundStartTime;
    
    // 计算指标
    const metrics = await this.calculateMetrics();
    
    return {
      round: 0, // 由控制器设置
      games,
      decisions,
      chats,
      metrics,
      duration
    };
  }
  
  /**
   * 停止训练
   */
  stop(): void {
    this.stopRequested = true;
    this.fastGameRunner?.stop();
  }
  
  /**
   * 获取配置
   */
  getConfig(): TrainingConfig | null {
    return this.config;
  }
  
  /**
   * 执行决策训练
   */
  private async executeDecisionTraining(): Promise<{ games: number; decisions: number }> {
    if (!this.fastGameRunner || !this.mctsTrainer || !this.decisionCollector) {
      throw new Error('决策训练组件未初始化');
    }
    
    const batchSize = this.config!.batchSize || 10;
    let games = 0;
    let decisions = 0;
    
    // 批量运行游戏
    for (let i = 0; i < batchSize; i++) {
      if (this.stopRequested) break;
      
      // 运行快速游戏（异步，会定期让出控制权）
      const gameResult = await this.fastGameRunner.runGame({
        playerCount: 4,
        collectDecisions: true
      });
      
      games++;
      decisions += gameResult.decisions?.length || 0;
      
      // 收集决策数据
      if (gameResult.decisions && gameResult.decisions.length > 0) {
        for (const decision of gameResult.decisions) {
          await this.decisionCollector.collect(decision);
        }
      }
      
      // 每局游戏后让出控制权，让UI有机会更新
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // 训练MCTS（每批游戏后）
      if ((i + 1) % 5 === 0) {
        await this.mctsTrainer.train(this.decisionCollector.getSamples());
      }
    }
    
    return { games, decisions };
  }
  
  /**
   * 执行聊天训练
   */
  private async executeChatTraining(): Promise<{ games: number; chats: number }> {
    if (!this.fastGameRunner || !this.chatTrainer || !this.chatCollector) {
      throw new Error('聊天训练组件未初始化');
    }
    
    const batchSize = this.config!.batchSize || 10;
    let games = 0;
    let chats = 0;
    
    // 批量运行游戏
    for (let i = 0; i < batchSize; i++) {
      if (this.stopRequested) break;
      
      // 运行快速游戏（异步，会定期让出控制权）
      const gameResult = await this.fastGameRunner.runGame({
        playerCount: 4,
        collectChats: true
      });
      
      games++;
      chats += gameResult.chats?.length || 0;
      
      // 收集聊天数据
      if (gameResult.chats && gameResult.chats.length > 0) {
        for (const chat of gameResult.chats) {
          await this.chatCollector.collect(chat);
        }
      }
      
      // 每局游戏后让出控制权，让UI有机会更新
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // 训练聊天（每批游戏后）
      if ((i + 1) % 5 === 0) {
        await this.chatTrainer.train(this.chatCollector.getSamples());
      }
    }
    
    return { games, chats };
  }
  
  /**
   * 执行混合训练
   */
  private async executeHybridTraining(): Promise<{ games: number; decisions: number; chats: number }> {
    if (!this.fastGameRunner || !this.mctsTrainer || !this.chatTrainer || 
        !this.decisionCollector || !this.chatCollector) {
      throw new Error('混合训练组件未初始化');
    }
    
    const batchSize = this.config!.batchSize || 10;
    let games = 0;
    let decisions = 0;
    let chats = 0;
    
    // 批量运行游戏
    for (let i = 0; i < batchSize; i++) {
      if (this.stopRequested) break;
      
      // 运行快速游戏（异步，会定期让出控制权）
      const gameResult = await this.fastGameRunner.runGame({
        playerCount: 4,
        collectDecisions: true,
        collectChats: true
      });
      
      games++;
      decisions += gameResult.decisions?.length || 0;
      chats += gameResult.chats?.length || 0;
      
      // 收集数据
      if (gameResult.decisions && gameResult.decisions.length > 0) {
        for (const decision of gameResult.decisions) {
          await this.decisionCollector.collect(decision);
        }
      }
      if (gameResult.chats && gameResult.chats.length > 0) {
        for (const chat of gameResult.chats) {
          await this.chatCollector.collect(chat);
        }
      }
      
      // 每局游戏后让出控制权，让UI有机会更新
      await new Promise(resolve => setTimeout(resolve, 0));
      
      // 训练（每批游戏后）
      if ((i + 1) % 5 === 0) {
        await Promise.all([
          this.mctsTrainer.train(this.decisionCollector.getSamples()),
          this.chatTrainer.train(this.chatCollector.getSamples())
        ]);
      }
    }
    
    return { games, decisions, chats };
  }
  
  /**
   * 计算指标
   */
  private async calculateMetrics(): Promise<any> {
    const metrics: any = {
      performance: {
        avgGameTime: 0,
        avgDecisionTime: 0,
        avgChatTime: 0
      }
    };
    
    // 从收集器获取指标
    if (this.decisionCollector) {
      const decisionMetrics = this.decisionCollector.getMetrics();
      if (decisionMetrics) {
        metrics.decisionMetrics = decisionMetrics;
      }
    }
    
    if (this.chatCollector) {
      const chatMetrics = this.chatCollector.getMetrics();
      if (chatMetrics) {
        metrics.chatMetrics = chatMetrics;
      }
    }
    
    return metrics;
  }
}

