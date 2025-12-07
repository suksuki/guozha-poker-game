/**
 * 训练数据管理器
 * 负责训练数据的存储、加载和导出
 */

import { TrainingConfig, DecisionTrainingSample, ChatTrainingSample, TrainingRoundResult } from '../../types/training';
import { DecisionDataCollector } from '../decision/DecisionDataCollector';
import { ChatDataCollector } from '../chat/ChatDataCollector';

export class TrainingDataManager {
  private decisionCollector: DecisionDataCollector | null = null;
  private chatCollector: ChatDataCollector | null = null;
  private config: TrainingConfig | null = null;
  private saveTimer?: NodeJS.Timeout;
  
  /**
   * 初始化
   */
  async initialize(config: TrainingConfig): Promise<void> {
    this.config = config;
    
    if (config.type === 'decision' || config.type === 'hybrid') {
      this.decisionCollector = new DecisionDataCollector();
    }
    
    if (config.type === 'chat' || config.type === 'hybrid') {
      this.chatCollector = new ChatDataCollector();
    }
    
    // 设置自动保存定时器
    if (config.dataCollection?.autoSave && config.dataCollection?.saveInterval) {
      this.saveTimer = setInterval(() => {
        this.autoSave();
      }, config.dataCollection.saveInterval);
    }
  }
  
  /**
   * 保存轮次数据
   */
  async saveRoundData(roundResult: TrainingRoundResult): Promise<void> {
    // 数据已由收集器收集，这里只需要记录元数据
    console.log(`[TrainingDataManager] 保存第${roundResult.round}轮数据`);
  }
  
  /**
   * 自动保存
   */
  async autoSave(): Promise<void> {
    try {
      // 保存到本地存储
      if (typeof window !== 'undefined' && window.localStorage) {
        const data = this.exportSamples();
        const json = JSON.stringify(data);
        window.localStorage.setItem('training_data', json);
        console.log('[TrainingDataManager] 自动保存完成');
      }
    } catch (error) {
      console.error('[TrainingDataManager] 自动保存失败:', error);
    }
  }
  
  /**
   * 导出样本
   */
  exportSamples(): {
    decisions?: DecisionTrainingSample[];
    chats?: ChatTrainingSample[];
  } {
    const result: any = {};
    
    if (this.decisionCollector) {
      result.decisions = this.decisionCollector.getSamples();
    }
    
    if (this.chatCollector) {
      result.chats = this.chatCollector.getSamples();
    }
    
    return result;
  }
  
  /**
   * 导入样本
   */
  async importSamples(data: {
    decisions?: DecisionTrainingSample[];
    chats?: ChatTrainingSample[];
  }): Promise<void> {
    if (data.decisions && this.decisionCollector) {
      for (const sample of data.decisions) {
        this.decisionCollector.collect(sample);
      }
    }
    
    if (data.chats && this.chatCollector) {
      for (const sample of data.chats) {
        this.chatCollector.collect(sample);
      }
    }
  }
  
  /**
   * 获取最佳参数
   */
  async getBestParams(): Promise<{
    mcts?: any;
    prompt?: string;
  }> {
    const params: any = {};
    
    if (this.decisionCollector) {
      // 从决策收集器获取最佳参数
      params.mcts = this.decisionCollector.getBestParams();
    }
    
    if (this.chatCollector) {
      params.prompt = this.chatCollector.getBestPrompt();
    }
    
    return params;
  }
  
  /**
   * 获取训练器实例（用于获取优化后的参数）
   */
  getDecisionCollector(): DecisionDataCollector | null {
    return this.decisionCollector;
  }
  
  /**
   * 获取聊天收集器实例
   */
  getChatCollector(): ChatDataCollector | null {
    return this.chatCollector;
  }
  
  /**
   * 清理
   */
  cleanup(): void {
    if (this.saveTimer) {
      clearInterval(this.saveTimer);
      this.saveTimer = undefined;
    }
  }
}

