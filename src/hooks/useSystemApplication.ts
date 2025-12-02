/**
 * 系统应用模块 React Hook
 * 提供在 React 组件中访问系统应用模块的便捷方式
 */

import { useEffect, useState, useRef } from 'react';
import { SystemApplication } from '../services/system';
import type { SystemConfig } from '../services/system/types/SystemConfig';
import type { SystemStatus } from '../services/system/SystemApplication';

export interface UseSystemApplicationReturn {
  systemApp: SystemApplication | null;
  isInitialized: boolean;
  started: boolean;
  error: Error | null;
  status: SystemStatus | null;
  getModule: <T>(name: string) => T | null;
}

/**
 * 使用系统应用模块
 * @param config 可选的配置覆盖
 */
export function useSystemApplication(config?: Partial<SystemConfig>): UseSystemApplicationReturn {
  const [isInitialized, setIsInitialized] = useState(false);
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const systemAppRef = useRef<SystemApplication | null>(null);
  const configRef = useRef(config);
  
  // 更新配置引用
  if (config !== configRef.current) {
    configRef.current = config;
  }
  
  useEffect(() => {
    let mounted = true;
    
    async function init() {
      try {
        const systemApp = SystemApplication.getInstance();
        systemAppRef.current = systemApp;
        
        // 初始化（如果还未初始化）
        if (!systemApp.getStatus().initialized) {
          await systemApp.initialize(configRef.current);
        } else if (configRef.current) {
          // 如果已经初始化，更新配置
          systemApp.configure(configRef.current);
        }
        
        // 启动（如果还未启动）
        if (!systemApp.getStatus().started) {
          await systemApp.start();
        }
        
        if (mounted) {
          const currentStatus = systemApp.getStatus();
          setIsInitialized(currentStatus.initialized);
          setStarted(currentStatus.started);
          setStatus(currentStatus);
        }
      } catch (err) {
        if (mounted) {
          const error = err instanceof Error ? err : new Error(String(err));
          setError(error);
        }
      }
    }
    
    init();
    
    // 清理函数
    return () => {
      mounted = false;
      // 注意：不在这里 shutdown，因为系统应用是单例，可能在多个组件中使用
      // 如果需要清理，应该在应用级别（App.tsx）进行
    };
  }, []); // 只在组件挂载时初始化一次
  
  // 配置变化时更新
  useEffect(() => {
    if (systemAppRef.current && configRef.current && isInitialized) {
      systemAppRef.current.configure(configRef.current);
      setStatus(systemAppRef.current.getStatus());
    }
  }, [config, isInitialized]);
  
  const getModule = <T,>(name: string): T | null => {
    if (!systemAppRef.current) {
      return null;
    }
    return systemAppRef.current.getModule<T>(name);
  };
  
  return {
    systemApp: systemAppRef.current,
    isInitialized,
    started,
    error,
    status,
    getModule,
  };
}

