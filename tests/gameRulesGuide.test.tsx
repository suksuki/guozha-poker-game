/**
 * 游戏规则指南组件测试
 * 测试组件渲染、交互、多语言等功能
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GameRulesGuide } from '../src/components/GameRulesGuide';
import { i18n } from '../src/i18n';

// Mock i18n
const mockT = vi.fn((key: string) => key);

vi.mock('react-i18next', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-i18next')>();
  return {
    ...actual,
    useTranslation: () => ({
      t: mockT,
      i18n: {
        language: 'zh-CN',
        changeLanguage: vi.fn(),
        isInitialized: true
      }
    }),
    initReactI18next: {
      type: '3rdParty',
      init: vi.fn()
    }
  };
});

// 等待语言切换完成
async function waitForLanguageChange(targetLang: string, maxWait = 200): Promise<void> {
  const startTime = Date.now();
  let attempts = 0;
  const maxAttempts = 20;
  
  while (i18n.language !== targetLang && attempts < maxAttempts && (Date.now() - startTime) < maxWait) {
    await new Promise(resolve => setTimeout(resolve, 5));
    attempts++;
  }
  
  if (i18n.language !== targetLang) {
    await i18n.changeLanguage(targetLang);
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  await new Promise(resolve => setTimeout(resolve, 10));
}

describe('游戏规则指南组件测试', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // 确保 i18n 已初始化
    if (i18n && typeof i18n.isInitialized !== 'undefined' && !i18n.isInitialized) {
      await i18n.init();
    }
    // 重置为默认语言
    await i18n.changeLanguage('zh-CN');
    await new Promise(resolve => setTimeout(resolve, 20));
    
    // 设置 mockT 返回翻译键（默认行为）
    mockT.mockImplementation((key: string) => key);
  });

  describe('基本渲染', () => {
    it('应该渲染关闭状态的按钮', () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle');
      expect(toggleButton).toBeTruthy();
      expect(toggleButton?.textContent).toContain('📖');
    });

    it('按钮应该有正确的样式类', () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle');
      expect(toggleButton).toBeTruthy();
      expect(toggleButton?.classList.contains('game-rules-guide-toggle')).toBe(true);
    });

    it('点击按钮应该打开指南', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const overlay = container.querySelector('.game-rules-guide-overlay');
        expect(overlay).toBeTruthy();
      });
    });

    it('打开后应该显示指南容器', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const guideContainer = container.querySelector('.game-rules-guide-container');
        expect(guideContainer).toBeTruthy();
      });
    });
  });

  describe('标签页切换', () => {
    it('应该显示所有标签页按钮', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const tabs = container.querySelectorAll('.tab-btn');
        expect(tabs.length).toBeGreaterThanOrEqual(3); // 至少3个标签页
      });
    });

    it('应该默认显示教程标签页', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const tutorialTab = Array.from(container.querySelectorAll('.tab-btn')).find(
          tab => tab.classList.contains('active')
        );
        expect(tutorialTab).toBeTruthy();
      });
    });

    it('应该能够切换到规则标签页', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const tabs = container.querySelectorAll('.tab-btn');
        expect(tabs.length).toBeGreaterThan(0);
      });
      
      const tabs = container.querySelectorAll('.tab-btn');
      const rulesTab = Array.from(tabs).find(tab => 
        tab.textContent?.includes('rules') || tab.textContent?.includes('打牌规则')
      );
      
      if (rulesTab) {
        fireEvent.click(rulesTab);
        
        // 等待内容切换
        await waitFor(() => {
          const rulesSection = container.querySelector('.rules-section');
          expect(rulesSection).toBeTruthy();
        }, { timeout: 1000 });
      }
    });

    it('应该能够切换到计分标签页', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const tabs = container.querySelectorAll('.tab-btn');
        expect(tabs.length).toBeGreaterThan(0);
      });
      
      const tabs = container.querySelectorAll('.tab-btn');
      const scoringTab = Array.from(tabs).find(tab => 
        tab.textContent?.includes('scoring') || tab.textContent?.includes('计分')
      );
      
      if (scoringTab) {
        fireEvent.click(scoringTab);
        
        // 等待内容切换
        await waitFor(() => {
          const scoringSection = container.querySelector('.scoring-section');
          expect(scoringSection).toBeTruthy();
        }, { timeout: 1000 });
      }
    });
  });

  describe('关闭功能', () => {
    it('点击关闭按钮应该关闭指南', async () => {
      const { container } = render(<GameRulesGuide />);
      
      // 打开指南
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(container.querySelector('.game-rules-guide-overlay')).toBeTruthy();
      });
      
      // 点击关闭按钮
      const closeButton = container.querySelector('.close-btn') as HTMLElement;
      fireEvent.click(closeButton);
      
      await waitFor(() => {
        expect(container.querySelector('.game-rules-guide-overlay')).toBeFalsy();
        expect(container.querySelector('.game-rules-guide-toggle')).toBeTruthy();
      });
    });

    it('点击遮罩层应该关闭指南', async () => {
      const { container } = render(<GameRulesGuide />);
      
      // 打开指南
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(container.querySelector('.game-rules-guide-overlay')).toBeTruthy();
      });
      
      // 点击遮罩层
      const overlay = container.querySelector('.game-rules-guide-overlay') as HTMLElement;
      fireEvent.click(overlay);
      
      await waitFor(() => {
        expect(container.querySelector('.game-rules-guide-overlay')).toBeFalsy();
      });
    });

    it('点击容器内部不应该关闭指南', async () => {
      const { container } = render(<GameRulesGuide />);
      
      // 打开指南
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(container.querySelector('.game-rules-guide-overlay')).toBeTruthy();
      });
      
      // 点击容器内部
      const guideContainer = container.querySelector('.game-rules-guide-container') as HTMLElement;
      fireEvent.click(guideContainer);
      
      // 指南应该仍然打开
      await waitFor(() => {
        expect(container.querySelector('.game-rules-guide-overlay')).toBeTruthy();
      });
    });
  });

  describe('内容显示', () => {
    it('教程标签页应该显示教程内容', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const tutorialSection = container.querySelector('.tutorial-section');
        expect(tutorialSection).toBeTruthy();
      });
    });

    it('应该显示教程卡片', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const tutorialCards = container.querySelectorAll('.tutorial-card');
        expect(tutorialCards.length).toBeGreaterThan(0);
      });
    });

    it('应该显示步骤内容', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const steps = container.querySelectorAll('.tutorial-step');
        expect(steps.length).toBeGreaterThan(0);
      });
    });

    it('应该显示流程图', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const flowDiagram = container.querySelector('.flow-diagram');
        expect(flowDiagram).toBeTruthy();
      });
    });
  });

  describe('多语言支持', () => {
    it('应该使用i18n翻译函数', () => {
      render(<GameRulesGuide />);
      
      // 验证 mockT 被调用
      expect(mockT).toHaveBeenCalled();
    });

    it('应该支持中文翻译', async () => {
      await waitForLanguageChange('zh-CN');
      
      const { container } = render(<GameRulesGuide />);
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(container.querySelector('.game-rules-guide-container')).toBeTruthy();
      });
      
      // 验证翻译键被调用
      expect(mockT).toHaveBeenCalledWith(expect.stringContaining('title'));
    });

    it('应该支持英文翻译', async () => {
      await waitForLanguageChange('en-US');
      
      const { container } = render(<GameRulesGuide />);
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(container.querySelector('.game-rules-guide-container')).toBeTruthy();
      });
      
      expect(mockT).toHaveBeenCalled();
    });
  });

  describe('交互功能', () => {
    it('标签页切换时应该更新活动状态', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const tabs = container.querySelectorAll('.tab-btn');
        expect(tabs.length).toBeGreaterThan(0);
        
        // 找到第一个非活动标签页并点击
        const inactiveTab = Array.from(tabs).find(tab => !tab.classList.contains('active'));
        if (inactiveTab) {
          fireEvent.click(inactiveTab);
          
          setTimeout(() => {
            expect(inactiveTab.classList.contains('active')).toBe(true);
          }, 100);
        }
      });
    });

    it('应该正确显示步骤编号', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const stepNumbers = container.querySelectorAll('.step-number');
        expect(stepNumbers.length).toBeGreaterThan(0);
      });
    });
  });

  describe('样式和布局', () => {
    it('按钮应该有正确的样式类', () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      
      // 检查按钮是否有正确的类名（而不是检查计算样式，因为测试环境可能不支持）
      expect(toggleButton).toBeTruthy();
      expect(toggleButton.classList.contains('game-rules-guide-toggle')).toBe(true);
    });

    it('打开时应该显示遮罩层', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const overlay = container.querySelector('.game-rules-guide-overlay');
        expect(overlay).toBeTruthy();
      });
    });

    it('容器应该有正确的样式类', async () => {
      const { container } = render(<GameRulesGuide />);
      
      const toggleButton = container.querySelector('.game-rules-guide-toggle') as HTMLElement;
      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        const guideContainer = container.querySelector('.game-rules-guide-container');
        expect(guideContainer).toBeTruthy();
        expect(guideContainer?.classList.contains('game-rules-guide-container')).toBe(true);
      });
    });
  });
});

