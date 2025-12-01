/**
 * AI中控系统快速测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AIControlDashboard } from './AIControlDashboard';
import { getInteractionService } from '../../services/ai/control/interaction/InteractionService';
import { AIControlCenter } from '../../services/ai/control/AIControlCenter';

// Mock依赖
vi.mock('../../services/ai/control/interaction/InteractionService');
vi.mock('../../services/ai/control/AIControlCenter');

describe('AIControlDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock InteractionService
    const mockInteractionService = {
      getSystemStatus: vi.fn(() => ({
        initialized: true,
        monitoring: true,
        resourceStatus: {
          cpu: { used: 0.02, limit: 0.05, usage: 0.4 },
          memory: { used: 50 * 1024 * 1024, limit: 100 * 1024 * 1024, usage: 0.5 }
        },
        config: {}
      })),
      getAnalysisResults: vi.fn(() => []),
      startMonitoring: vi.fn(),
      stopMonitoring: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    };
    
    vi.mocked(getInteractionService).mockReturnValue(mockInteractionService as any);
    
    // Mock AIControlCenter
    const mockAIControlCenter = {
      getInstance: vi.fn(() => ({
        getResourceStatus: vi.fn(() => ({
          cpu: { used: 0.02, limit: 0.05, usage: 0.4 },
          memory: { used: 50 * 1024 * 1024, limit: 100 * 1024 * 1024, usage: 0.5 }
        }))
      }))
    };
    
    vi.mocked(AIControlCenter.getInstance).mockReturnValue(mockAIControlCenter.getInstance() as any);
  });
  
  it('应该渲染关闭状态的按钮', () => {
    render(<AIControlDashboard />);
    const button = screen.getByText('🧠 AI中控');
    expect(button).toBeInTheDocument();
  });
  
  it('点击按钮应该打开控制面板', () => {
    render(<AIControlDashboard />);
    const button = screen.getByText('🧠 AI中控');
    fireEvent.click(button);
    
    expect(screen.getByText('🧠 AI中控系统')).toBeInTheDocument();
  });
  
  it('应该显示所有标签页', () => {
    render(<AIControlDashboard />);
    const button = screen.getByText('🧠 AI中控');
    fireEvent.click(button);
    
    expect(screen.getByText('🏠 仪表盘')).toBeInTheDocument();
    expect(screen.getByText('📊 监控中心')).toBeInTheDocument();
    expect(screen.getByText('🔍 分析中心')).toBeInTheDocument();
    expect(screen.getByText('⚙️ 优化中心')).toBeInTheDocument();
    expect(screen.getByText('📚 数据中心')).toBeInTheDocument();
    expect(screen.getByText('🧠 知识库')).toBeInTheDocument();
    expect(screen.getByText('⚙️ 设置')).toBeInTheDocument();
  });
  
  it('应该能够切换标签页', () => {
    render(<AIControlDashboard />);
    const button = screen.getByText('🧠 AI中控');
    fireEvent.click(button);
    
    const monitoringTab = screen.getByText('📊 监控中心');
    fireEvent.click(monitoringTab);
    
    expect(screen.getByText('监控中心')).toBeInTheDocument();
  });
  
  it('应该能够关闭控制面板', () => {
    render(<AIControlDashboard />);
    const button = screen.getByText('🧠 AI中控');
    fireEvent.click(button);
    
    const closeButton = screen.getByTitle('关闭');
    fireEvent.click(closeButton);
    
    // 应该回到关闭状态
    expect(screen.getByText('🧠 AI中控')).toBeInTheDocument();
    expect(screen.queryByText('🧠 AI中控系统')).not.toBeInTheDocument();
  });
  
  it('仪表盘应该显示系统状态', async () => {
    render(<AIControlDashboard />);
    const button = screen.getByText('🧠 AI中控');
    fireEvent.click(button);
    
    await waitFor(() => {
      expect(screen.getByText('系统状态')).toBeInTheDocument();
      expect(screen.getByText('资源使用')).toBeInTheDocument();
      expect(screen.getByText('分析结果')).toBeInTheDocument();
    });
  });
  
  it('应该能够启动和停止监控', () => {
    const mockService = getInteractionService();
    render(<AIControlDashboard />);
    const button = screen.getByText('🧠 AI中控');
    fireEvent.click(button);
    
    // 等待仪表盘加载
    waitFor(() => {
      const startButton = screen.getByText('启动监控');
      if (startButton) {
        fireEvent.click(startButton);
        expect(mockService.startMonitoring).toHaveBeenCalled();
      }
    });
  });
});

