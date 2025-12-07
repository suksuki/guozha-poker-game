/**
 * TrainingController 单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TrainingController } from '../../../src/training/core/TrainingController';
import { TrainingConfig } from '../../../src/types/training';

describe('TrainingController', () => {
  let controller: TrainingController;
  
  beforeEach(() => {
    controller = new TrainingController();
  });
  
  describe('初始化', () => {
    it('应该正确初始化', () => {
      const progress = controller.getProgress();
      expect(progress.status).toBe('idle');
      expect(progress.currentRound).toBe(0);
    });
  });
  
  describe('开始训练', () => {
    it('应该能够开始决策训练', async () => {
      const config: TrainingConfig = {
        type: 'decision',
        rounds: 5,
        batchSize: 2,
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
      
      // 注意：实际测试需要mock FastGameRunner等依赖
      // 这里只是测试接口
      expect(() => controller.startTraining(config)).not.toThrow();
    }, 10000);
    
    it('应该能够开始聊天训练', async () => {
      const config: TrainingConfig = {
        type: 'chat',
        rounds: 5,
        batchSize: 2
      };
      
      expect(() => controller.startTraining(config)).not.toThrow();
    }, 10000);
    
    it('应该能够开始混合训练', async () => {
      const config: TrainingConfig = {
        type: 'hybrid',
        rounds: 5,
        batchSize: 2
      };
      
      expect(() => controller.startTraining(config)).not.toThrow();
    }, 10000);
  });
  
  describe('训练控制', () => {
    it('应该能够停止训练', () => {
      controller.stopTraining();
      const progress = controller.getProgress();
      expect(progress.status).toBe('idle');
    });
    
    it('应该能够暂停和继续训练', async () => {
      const config: TrainingConfig = {
        type: 'decision',
        rounds: 10,
        batchSize: 1
      };
      
      // 开始训练（异步）
      const startPromise = controller.startTraining(config);
      
      // 等待一小段时间后暂停
      setTimeout(() => {
        controller.pauseTraining();
      }, 100);
      
      // 继续训练
      setTimeout(() => {
        controller.resumeTraining();
      }, 200);
      
      // 等待训练完成或超时
      await Promise.race([
        startPromise,
        new Promise(resolve => setTimeout(resolve, 5000))
      ]);
    }, 10000);
  });
  
  describe('进度和指标', () => {
    it('应该能够获取训练进度', () => {
      const progress = controller.getProgress();
      expect(progress).toHaveProperty('currentRound');
      expect(progress).toHaveProperty('totalRounds');
      expect(progress).toHaveProperty('percentage');
      expect(progress).toHaveProperty('status');
    });
    
    it('应该能够获取训练指标', () => {
      const metrics = controller.getMetrics();
      expect(metrics).toHaveProperty('totalRounds');
      expect(metrics).toHaveProperty('totalGames');
      expect(metrics).toHaveProperty('totalDecisions');
      expect(metrics).toHaveProperty('totalChats');
      expect(metrics).toHaveProperty('performance');
    });
  });
});

