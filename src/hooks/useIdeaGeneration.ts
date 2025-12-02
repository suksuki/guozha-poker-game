/**
 * 想法生成 Hook
 * 监听游戏事件，自动生成优化建议
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { getIdeaGenerationService, GameIdea } from '../services/ideaGenerationService';

interface UseIdeaGenerationOptions {
  enabled?: boolean;
  checkInterval?: number;  // 检查间隔（毫秒）
  triggers?: string[];  // 触发条件
}

export function useIdeaGeneration(options: UseIdeaGenerationOptions = {}) {
  const {
    enabled = true,
    checkInterval = 30000,  // 默认30秒检查一次
    triggers = ['performance', 'ux', 'feature'],
  } = options;

  const [currentIdea, setCurrentIdea] = useState<GameIdea | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const service = getIdeaGenerationService();
  
  // 使用 ref 来跟踪 enabled 状态，确保在异步操作中能获取最新值
  const enabledRef = useRef(enabled);
  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  /**
   * 生成想法
   */
  const generateIdea = useCallback(async (gameState: any, trigger: string) => {
    // 使用 ref 检查，确保获取最新的 enabled 状态
    if (!enabledRef.current || isGenerating) return null;

    setIsGenerating(true);
    try {
      const idea = await service.generateIdeaFromGameState(gameState, trigger);
      // 再次检查 enabled 状态，如果已经关闭则不设置 currentIdea
      if (idea && enabledRef.current) {
        setCurrentIdea(idea);
        return idea;
      }
    } catch (error) {
    } finally {
      setIsGenerating(false);
    }
    return null;
  }, [isGenerating, service]);

  /**
   * 监听游戏性能
   */
  useEffect(() => {
    if (!enabled) return;

    let lastCheckTime = Date.now();
    let frameCount = 0;
    let lastFpsCheck = Date.now();
    let rafId: number | null = null;

    const checkPerformance = () => {
      // 检查 enabled 状态，如果已关闭则停止循环
      if (!enabledRef.current) {
        if (rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
        }
        return;
      }
      
      const now = Date.now();
      frameCount++;

      // 每5秒检查一次FPS
      if (now - lastFpsCheck > 5000) {
        const fps = (frameCount / ((now - lastFpsCheck) / 1000));
        frameCount = 0;
        lastFpsCheck = now;

        // 如果FPS低于30，触发性能优化建议
        if (fps < 30 && enabledRef.current) {
          generateIdea(
            { fps, timestamp: now },
            'performance: low_fps'
          );
        }
      }

      // 检查内存使用（如果可用）
      if ((performance as any).memory) {
        const memory = (performance as any).memory;
        const memoryMB = memory.usedJSHeapSize / 1024 / 1024;
        
        // 如果内存使用超过100MB，触发优化建议
        if (memoryMB > 100 && now - lastCheckTime > checkInterval && enabledRef.current) {
          generateIdea(
            { memoryUsage: memoryMB, timestamp: now },
            'performance: high_memory'
          );
          lastCheckTime = now;
        }
      }
      
      // 继续循环
      if (enabledRef.current) {
        rafId = requestAnimationFrame(checkPerformance);
      }
    };

    rafId = requestAnimationFrame(checkPerformance);

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
      }
    };
  }, [enabled, checkInterval, generateIdea]);

  /**
   * 监听用户操作模式
   */
  useEffect(() => {
    if (!enabled) return;

    const userActions: any[] = [];
    const maxActions = 20;

    const handleUserAction = (event: Event) => {
      // 如果已关闭，不处理用户操作
      if (!enabledRef.current) return;
      
      // 记录用户操作
      userActions.push({
        type: event.type,
        timestamp: Date.now(),
      });

      // 只保留最近的操作
      if (userActions.length > maxActions) {
        userActions.shift();
      }

      // 如果用户频繁重复某个操作，触发UX建议
      if (userActions.length > 10 && enabledRef.current) {
        const lastAction = userActions[userActions.length - 1];
        const repeatCount = userActions.filter(
          a => a.type === lastAction.type
        ).length;

        if (repeatCount > 5) {
          generateIdea(
            { userActions, timestamp: Date.now() },
            'ux: repetitive_action'
          );
        }
      }
    };

    // 监听常见的用户操作
    const events = ['click', 'keydown', 'touchstart'];
    events.forEach(eventType => {
      window.addEventListener(eventType, handleUserAction, { passive: true });
    });

    return () => {
      events.forEach(eventType => {
        window.removeEventListener(eventType, handleUserAction);
      });
    };
  }, [enabled, generateIdea]);

  /**
   * 当 enabled 变为 false 时，清除当前想法
   */
  useEffect(() => {
    if (!enabled) {
      setCurrentIdea(null);
    }
  }, [enabled]);

  /**
   * 清除当前想法
   */
  const clearCurrentIdea = useCallback(() => {
    setCurrentIdea(null);
  }, []);

  return {
    currentIdea,
    isGenerating,
    generateIdea,
    clearCurrentIdea,
  };
}

