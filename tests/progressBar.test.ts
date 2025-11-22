/**
 * 进度条工具单元测试
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { createProgressBar, updateProgressBar, clearLine } from '../src/utils/progressBar';

describe('进度条工具', () => {
  let originalStdout: any;
  let mockWrite: any;

  beforeEach(() => {
    // 保存原始的process.stdout
    if (typeof process !== 'undefined' && process.stdout) {
      originalStdout = process.stdout.write;
      mockWrite = vi.fn();
      process.stdout.write = mockWrite;
    }
  });

  afterEach(() => {
    // 恢复原始的process.stdout
    if (typeof process !== 'undefined' && process.stdout && originalStdout) {
      process.stdout.write = originalStdout;
    }
    vi.clearAllMocks();
  });

  describe('createProgressBar', () => {
    it('应该创建基本的进度条', () => {
      const progress = createProgressBar({
        total: 100,
        current: 50
      });
      
      expect(progress).toContain('█');
      expect(progress).toContain('░');
      expect(progress).toContain('50.0%');
    });

    it('应该显示正确的百分比', () => {
      const progress = createProgressBar({
        total: 100,
        current: 25
      });
      
      expect(progress).toContain('25.0%');
    });

    it('应该处理完成状态', () => {
      const progress = createProgressBar({
        total: 100,
        current: 100
      });
      
      expect(progress).toContain('100.0%');
    });

    it('应该显示标签', () => {
      const progress = createProgressBar({
        total: 100,
        current: 50,
        label: '训练进度'
      });
      
      expect(progress).toContain('训练进度');
    });

    it('应该显示时间信息', () => {
      const startTime = Date.now() - 5000; // 5秒前
      const progress = createProgressBar({
        total: 100,
        current: 50,
        showTime: true,
        startTime
      });
      
      expect(progress).toContain('已用');
    });

    it('应该计算剩余时间', () => {
      const startTime = Date.now() - 5000; // 5秒前
      const progress = createProgressBar({
        total: 100,
        current: 50,
        showTime: true,
        startTime
      });
      
      expect(progress).toContain('剩余');
    });

    it('应该处理0进度', () => {
      const progress = createProgressBar({
        total: 100,
        current: 0
      });
      
      expect(progress).toContain('0.0%');
    });

    it('应该处理自定义宽度', () => {
      const progress = createProgressBar({
        total: 100,
        current: 50,
        width: 20
      });
      
      // 进度条应该包含20个字符（填充+空白）
      const barMatch = progress.match(/\[([█░]+)\]/);
      if (barMatch) {
        expect(barMatch[1].length).toBe(20);
      }
    });

    it('应该在不显示百分比时隐藏百分比', () => {
      const progress = createProgressBar({
        total: 100,
        current: 50,
        showPercentage: false
      });
      
      expect(progress).not.toContain('%');
    });

    it('应该处理total为0的情况', () => {
      const progress = createProgressBar({
        total: 0,
        current: 0
      });
      
      expect(progress).toContain('0.0%');
    });
  });

  describe('updateProgressBar', () => {
    it('应该在Node.js环境中更新进度条', () => {
      if (typeof process !== 'undefined' && process.stdout) {
        updateProgressBar({
          total: 100,
          current: 50
        });
        
        expect(mockWrite).toHaveBeenCalled();
        const call = mockWrite.mock.calls[0][0];
        expect(call).toContain('\r');
        expect(call).toContain('█');
      }
    });

    it('应该在完成时换行', () => {
      if (typeof process !== 'undefined' && process.stdout) {
        updateProgressBar({
          total: 100,
          current: 100
        });
        
        expect(mockWrite).toHaveBeenCalled();
        const calls = mockWrite.mock.calls;
        const lastCall = calls[calls.length - 1][0];
        expect(lastCall).toContain('\n');
      }
    });
  });

  describe('clearLine', () => {
    it('应该在Node.js环境中清除行', () => {
      if (typeof process !== 'undefined' && process.stdout) {
        clearLine();
        
        expect(mockWrite).toHaveBeenCalled();
        const call = mockWrite.mock.calls[0][0];
        expect(call).toContain('\r');
      }
    });
  });
});

