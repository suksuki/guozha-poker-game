/**
 * 数据收集层
 * 统一管理所有数据收集器
 */

import { PlayerActionTracker } from './PlayerActionTracker';
import { AIDecisionTracker } from './AIDecisionTracker';
import { TrainingDataGenerator } from './TrainingDataGenerator';
import { AIControlCenter } from '../AIControlCenter';

export class DataCollectionLayer {
  private playerActionTracker: PlayerActionTracker;
  private aiDecisionTracker: AIDecisionTracker;
  private trainingDataGenerator: TrainingDataGenerator;
  
  constructor() {
    this.playerActionTracker = new PlayerActionTracker();
    this.aiDecisionTracker = new AIDecisionTracker();
    this.trainingDataGenerator = new TrainingDataGenerator();
  }
  
  /**
   * 获取玩家操作追踪器
   */
  getPlayerActionTracker(): PlayerActionTracker {
    return this.playerActionTracker;
  }
  
  /**
   * 获取AI决策追踪器
   */
  getAIDecisionTracker(): AIDecisionTracker {
    return this.aiDecisionTracker;
  }
  
  /**
   * 获取训练数据生成器
   */
  getTrainingDataGenerator(): TrainingDataGenerator {
    return this.trainingDataGenerator;
  }
  
  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    // 可以在这里做一些初始化工作
    console.log('[DataCollectionLayer] 初始化完成');
  }
}

