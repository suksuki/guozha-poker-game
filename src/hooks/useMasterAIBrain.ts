/**
 * Master AI Brain Hook
 * React Hook用于在游戏中使用统一AI大脑
 */

import { useEffect, useRef, useState } from 'react';
import { GameBridge, GameBridgeAPI, MasterBrainConfig } from '../ai-core';

export interface UseMasterAIBrainOptions {
  config: MasterBrainConfig;
  autoInit?: boolean;
}

export interface UseMasterAIBrainReturn {
  api: GameBridgeAPI | null;
  initialized: boolean;
  statistics: any;
  triggerAITurn: (playerId: number, gameState: any) => void;
  exportTrainingData: () => string;
  getStats: () => any;
}

/**
 * 使用Master AI Brain的Hook
 */
export function useMasterAIBrain(
  options: UseMasterAIBrainOptions
): UseMasterAIBrainReturn {
  const [initialized, setInitialized] = useState(false);
  const [statistics, setStatistics] = useState<any>(null);
  
  const bridgeRef = useRef<GameBridge | null>(null);
  const apiRef = useRef<GameBridgeAPI | null>(null);
  
  // 初始化
  useEffect(() => {
    if (!options.autoInit) return;
    
    const initBrain = async () => {
      try {
        console.log('[useMasterAIBrain] 初始化AI大脑...');
        
        // 创建桥接
        const bridge = new GameBridge();
        bridgeRef.current = bridge;
        
        // 获取API
        const api = bridge.getAPI();
        apiRef.current = api;
        
        // 初始化
        await api.initialize(options.config);
        
        setInitialized(true);
        console.log('[useMasterAIBrain] AI大脑初始化成功 ✓');
        
        // 监听AI事件
        bridge.eventBus.on('ai:turn-complete', (result: any) => {
          console.log('[useMasterAIBrain] AI回合完成:', result);
          // 这里可以触发游戏状态更新
        });
        
      } catch (error) {
        console.error('[useMasterAIBrain] 初始化失败:', error);
      }
    };
    
    initBrain();
    
    // 清理
    return () => {
      if (apiRef.current) {
        apiRef.current.shutdown().catch(console.error);
      }
    };
  }, [options.autoInit]);
  
  // 定期更新统计
  useEffect(() => {
    if (!initialized || !apiRef.current) return;
    
    const interval = setInterval(() => {
      const stats = apiRef.current?.getStatistics();
      setStatistics(stats);
    }, 5000); // 每5秒更新
    
    return () => clearInterval(interval);
  }, [initialized]);
  
  // 触发AI回合
  const triggerAITurn = (playerId: number, gameState: any) => {
    if (!apiRef.current) {
      console.warn('[useMasterAIBrain] API未初始化');
      return;
    }
    
    apiRef.current.triggerAITurn(playerId, gameState);
  };
  
  // 导出训练数据
  const exportTrainingData = (): string => {
    if (!apiRef.current) {
      console.warn('[useMasterAIBrain] API未初始化');
      return '';
    }
    
    return apiRef.current.exportTrainingData();
  };
  
  // 获取统计
  const getStats = (): any => {
    if (!apiRef.current) {
      return null;
    }
    
    return apiRef.current.getStatistics();
  };
  
  return {
    api: apiRef.current,
    initialized,
    statistics,
    triggerAITurn,
    exportTrainingData,
    getStats
  };
}

