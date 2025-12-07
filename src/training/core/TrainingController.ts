/**
 * 训练控制器
 * 统一管理训练任务的调度、进度和结果
 */

import { TrainingConfig, TrainingProgress, TrainingMetrics, TrainingResult } from '../../types/training';
import { TrainingExecutor } from './TrainingExecutor';
import { TrainingDataManager } from './TrainingDataManager';
import { ParameterApplier } from './ParameterApplier';

export class TrainingController {
  private executor: TrainingExecutor;
  private dataManager: TrainingDataManager;
  private progress: TrainingProgress;
  private metrics: TrainingMetrics;
  private startTime: number = 0;
  private isRunning: boolean = false;
  private pauseRequested: boolean = false;
  
  constructor() {
    this.executor = new TrainingExecutor();
    this.dataManager = new TrainingDataManager();
    this.progress = this.createInitialProgress();
    this.metrics = this.createInitialMetrics();
  }
  
  /**
   * 开始训练
   */
  async startTraining(config: TrainingConfig): Promise<void> {
    if (this.isRunning) {
      throw new Error('训练已在运行中');
    }
    
    this.isRunning = true;
    this.pauseRequested = false;
    this.startTime = Date.now();
    this.progress = {
      currentRound: 0,
      totalRounds: config.rounds,
      percentage: 0,
      elapsedTime: 0,
      status: 'running'
    };
    this.metrics = this.createInitialMetrics();
    
    try {
      // 初始化数据管理器
      await this.dataManager.initialize(config);
      
      // 初始化执行器
      await this.executor.initialize(config);
      
      // 开始训练循环
      await this.runTrainingLoop(config);
      
      this.progress.status = 'completed';
    } catch (error) {
      this.progress.status = 'error';
      this.progress.error = error instanceof Error ? error.message : String(error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
  
  /**
   * 停止训练
   */
  stopTraining(): void {
    if (!this.isRunning) {
      return;
    }
    
    this.pauseRequested = true;
    this.executor.stop();
    this.isRunning = false;
    this.progress.status = 'idle';
  }
  
  /**
   * 暂停训练
   */
  pauseTraining(): void {
    if (!this.isRunning) {
      return;
    }
    
    this.pauseRequested = true;
    this.progress.status = 'paused';
  }
  
  /**
   * 继续训练
   */
  async resumeTraining(): Promise<void> {
    if (this.progress.status !== 'paused') {
      return;
    }
    
    this.pauseRequested = false;
    this.progress.status = 'running';
    
    // 继续训练循环
    const config = this.executor.getConfig();
    if (config) {
      await this.runTrainingLoop(config);
    }
  }
  
  /**
   * 获取训练进度
   */
  getProgress(): TrainingProgress {
    if (this.isRunning) {
      this.progress.elapsedTime = Date.now() - this.startTime;
      
      // 计算预计剩余时间
      if (this.progress.currentRound > 0) {
        const avgTimePerRound = this.progress.elapsedTime / this.progress.currentRound;
        const remainingRounds = this.progress.totalRounds - this.progress.currentRound;
        this.progress.estimatedTimeRemaining = avgTimePerRound * remainingRounds;
      }
      
      this.progress.percentage = (this.progress.currentRound / this.progress.totalRounds) * 100;
    }
    
    return { ...this.progress };
  }
  
  /**
   * 获取训练指标
   */
  getMetrics(): TrainingMetrics {
    return { ...this.metrics };
  }
  
  /**
   * 获取训练结果
   */
  async getResult(): Promise<TrainingResult> {
    const samples = await this.dataManager.exportSamples();
    const bestParams = await this.dataManager.getBestParams();
    
    return {
      config: this.executor.getConfig()!,
      progress: this.getProgress(),
      metrics: this.getMetrics(),
      samples,
      bestParams,
      duration: Date.now() - this.startTime
    };
  }
  
  /**
   * 运行训练循环
   */
  private async runTrainingLoop(config: TrainingConfig): Promise<void> {
    for (let round = 0; round < config.rounds; round++) {
      // 检查暂停请求
      if (this.pauseRequested) {
        this.progress.status = 'paused';
        return;
      }
      
      // 更新进度
      this.progress.currentRound = round + 1;
      
      try {
        // 执行一轮训练
        const roundResult = await this.executor.executeRound();
        
        // 更新指标
        this.updateMetrics(roundResult);
        
        // 保存数据
        await this.dataManager.saveRoundData(roundResult);
        
        // 自动保存（如果启用）
        if (config.dataCollection?.autoSave) {
          await this.dataManager.autoSave();
        }
      } catch (error) {
        console.error(`[TrainingController] 第${round + 1}轮训练失败:`, error);
        // 继续下一轮，不中断训练
      }
    }
  }
  
  /**
   * 更新指标
   */
  private updateMetrics(roundResult: any): void {
    this.metrics.totalRounds++;
    this.metrics.totalGames += roundResult.games || 0;
    this.metrics.totalDecisions += roundResult.decisions || 0;
    this.metrics.totalChats += roundResult.chats || 0;
    
    // 更新决策指标
    if (roundResult.metrics?.decisionMetrics) {
      const dm = roundResult.metrics.decisionMetrics;
      if (!this.metrics.decisionMetrics) {
        this.metrics.decisionMetrics = {
          avgQuality: 0,
          avgConfidence: 0,
          winRate: 0,
          avgScore: 0
        };
      }
      
      // 加权平均更新
      const weight = 1 / this.metrics.totalRounds;
      this.metrics.decisionMetrics.avgQuality = 
        this.metrics.decisionMetrics.avgQuality * (1 - weight) + dm.avgQuality * weight;
      this.metrics.decisionMetrics.avgConfidence = 
        this.metrics.decisionMetrics.avgConfidence * (1 - weight) + dm.avgConfidence * weight;
      this.metrics.decisionMetrics.winRate = 
        this.metrics.decisionMetrics.winRate * (1 - weight) + dm.winRate * weight;
      this.metrics.decisionMetrics.avgScore = 
        this.metrics.decisionMetrics.avgScore * (1 - weight) + dm.avgScore * weight;
    }
    
    // 更新聊天指标
    if (roundResult.metrics?.chatMetrics) {
      const cm = roundResult.metrics.chatMetrics;
      if (!this.metrics.chatMetrics) {
        this.metrics.chatMetrics = {
          avgQuality: 0,
          avgRelevance: 0,
          avgDiversity: 0,
          avgEngagement: 0
        };
      }
      
      const weight = 1 / this.metrics.totalRounds;
      this.metrics.chatMetrics.avgQuality = 
        this.metrics.chatMetrics.avgQuality * (1 - weight) + cm.avgQuality * weight;
      this.metrics.chatMetrics.avgRelevance = 
        this.metrics.chatMetrics.avgRelevance * (1 - weight) + cm.avgRelevance * weight;
      this.metrics.chatMetrics.avgDiversity = 
        this.metrics.chatMetrics.avgDiversity * (1 - weight) + cm.avgDiversity * weight;
      this.metrics.chatMetrics.avgEngagement = 
        this.metrics.chatMetrics.avgEngagement * (1 - weight) + cm.avgEngagement * weight;
    }
    
    // 更新性能指标
    if (roundResult.metrics?.performance) {
      const perf = roundResult.metrics.performance;
      const weight = 1 / this.metrics.totalRounds;
      this.metrics.performance.avgGameTime = 
        this.metrics.performance.avgGameTime * (1 - weight) + perf.avgGameTime * weight;
      this.metrics.performance.avgDecisionTime = 
        this.metrics.performance.avgDecisionTime * (1 - weight) + perf.avgDecisionTime * weight;
      this.metrics.performance.avgChatTime = 
        this.metrics.performance.avgChatTime * (1 - weight) + perf.avgChatTime * weight;
    }
  }
  
  /**
   * 创建初始进度
   */
  private createInitialProgress(): TrainingProgress {
    return {
      currentRound: 0,
      totalRounds: 0,
      percentage: 0,
      elapsedTime: 0,
      status: 'idle'
    };
  }
  
  /**
   * 创建初始指标
   */
  private createInitialMetrics(): TrainingMetrics {
    return {
      totalRounds: 0,
      totalGames: 0,
      totalDecisions: 0,
      totalChats: 0,
      performance: {
        avgGameTime: 0,
        avgDecisionTime: 0,
        avgChatTime: 0
      }
    };
  }
  
  /**
   * 应用最佳参数
   */
  private async applyBestParams(): Promise<void> {
    try {
      // 从训练执行器获取MCTS训练器（它保存了优化后的参数）
      const executor = this.executor as any;
      const mctsTrainer = executor.mctsTrainer;
      
      if (mctsTrainer && typeof mctsTrainer.getOptimizedParams === 'function') {
        const optimizedParams = mctsTrainer.getOptimizedParams();
        if (optimizedParams) {
          // 应用MCTS参数
          ParameterApplier.applyMCTSParams(optimizedParams);
          console.log('[TrainingController] 已应用训练后的MCTS参数:', optimizedParams);
        }
      }
      
      // 从数据管理器获取最佳参数（备用方案）
      const bestParams = await this.dataManager.getBestParams();
      if (bestParams.mcts && !mctsTrainer) {
        ParameterApplier.applyMCTSParams(bestParams.mcts);
        console.log('[TrainingController] 已应用训练后的MCTS参数（从数据管理器）:', bestParams.mcts);
      }
      
      // 注意：聊天Prompt参数需要单独处理（如果有）
      if (bestParams.prompt) {
        console.log('[TrainingController] 最佳Prompt已保存:', bestParams.prompt);
        // TODO: 保存到聊天系统配置中
      }
    } catch (error) {
      console.error('[TrainingController] 应用最佳参数失败:', error);
    }
  }
  
  /**
   * 手动应用参数（供UI调用）
   */
  async applyParams(): Promise<void> {
    await this.applyBestParams();
  }
  
  /**
   * 获取当前应用的参数
   */
  getAppliedParams(): { mcts?: any } {
    const mctsParams = ParameterApplier.getAppliedMCTSParams();
    return { mcts: mctsParams };
  }
  
  /**
   * 清除应用的参数（恢复默认）
   */
  clearAppliedParams(): void {
    ParameterApplier.clearAppliedParams();
  }
}

