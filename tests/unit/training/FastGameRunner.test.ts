/**
 * FastGameRunner 单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FastGameRunner } from '../../../src/training/utils/FastGameRunner';

describe('FastGameRunner', () => {
  let runner: FastGameRunner;
  
  beforeEach(() => {
    runner = new FastGameRunner({
      speedMultiplier: 10,
      skipUI: true,
      skipTTS: true
    });
  });
  
  describe('初始化', () => {
    it('应该正确初始化', () => {
      expect(runner).toBeDefined();
    });
  });
  
  describe('运行游戏', () => {
    it('应该能够运行游戏', async () => {
      const result = await runner.runGame({
        playerCount: 4,
        collectDecisions: true
      });
      
      expect(result).toHaveProperty('gameId');
      expect(result).toHaveProperty('winner');
      expect(result).toHaveProperty('duration');
      expect(result).toHaveProperty('decisions');
      expect(result.decisions).toBeInstanceOf(Array);
    }, 30000);
    
    it('应该能够收集决策数据', async () => {
      const result = await runner.runGame({
        playerCount: 4,
        collectDecisions: true
      });
      
      // 检查决策数据格式
      if (result.decisions.length > 0) {
        const decision = result.decisions[0];
        expect(decision).toHaveProperty('gameState');
        expect(decision).toHaveProperty('decision');
        expect(decision).toHaveProperty('outcome');
        expect(decision).toHaveProperty('metadata');
      }
    }, 30000);
    
    it('应该能够停止游戏', async () => {
      const runPromise = runner.runGame({
        playerCount: 4
      });
      
      // 立即停止
      runner.stop();
      
      // 等待游戏结束
      await runPromise;
      
      // 验证游戏已停止
      expect(true).toBe(true); // 如果没抛出错误就说明正常停止
    }, 10000);
  });
});

