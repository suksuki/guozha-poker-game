/**
 * 训练流程集成测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { TrainingController } from '../../../src/training/core/TrainingController';
import { TrainingConfig } from '../../../src/types/training';

describe('训练流程集成测试', () => {
  let controller: TrainingController;
  
  beforeEach(() => {
    controller = new TrainingController();
  });
  
  describe('完整训练流程', () => {
    it('应该能够完成一轮决策训练', async () => {
      const config: TrainingConfig = {
        type: 'decision',
        rounds: 1,
        batchSize: 1,
        fastMode: {
          enabled: true,
          speedMultiplier: 10,
          skipUI: true,
          skipTTS: true
        },
        dataCollection: {
          enabled: true,
          autoSave: false
        }
      };
      
      // 开始训练
      const trainingPromise = controller.startTraining(config);
      
      // 等待训练完成
      await trainingPromise;
      
      // 检查结果
      const progress = controller.getProgress();
      expect(progress.status).toBe('completed');
      expect(progress.currentRound).toBe(config.rounds);
      
      const metrics = controller.getMetrics();
      expect(metrics.totalRounds).toBeGreaterThan(0);
    }, 60000);
    
    it('应该能够完成一轮聊天训练', async () => {
      const config: TrainingConfig = {
        type: 'chat',
        rounds: 1,
        batchSize: 1,
        fastMode: {
          enabled: true,
          speedMultiplier: 10,
          skipUI: true,
          skipTTS: true
        },
        dataCollection: {
          enabled: true,
          autoSave: false
        }
      };
      
      const trainingPromise = controller.startTraining(config);
      await trainingPromise;
      
      const progress = controller.getProgress();
      expect(progress.status).toBe('completed');
    }, 60000);
    
    it('应该能够导出训练数据', async () => {
      const config: TrainingConfig = {
        type: 'decision',
        rounds: 1,
        batchSize: 1,
        dataCollection: {
          enabled: true,
          autoSave: false
        }
      };
      
      await controller.startTraining(config);
      
      const result = await controller.getResult();
      expect(result).toHaveProperty('config');
      expect(result).toHaveProperty('progress');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('samples');
      expect(result).toHaveProperty('duration');
    }, 60000);
  });
});

