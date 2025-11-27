/**
 * React Hook：吵架王语音服务
 * 提供便捷的API来使用QuarrelVoiceService
 */

import { useEffect, useRef, useCallback } from 'react';
import { getQuarrelVoiceService, updateMainFightRoles, Utter, Priority, Language } from '../services/quarrelVoiceService';
import { Player } from '../types/card';

export interface UseQuarrelVoiceOptions {
  autoInit?: boolean;  // 是否自动初始化，默认 true
  maxConcurrent?: number;  // 最大并发数，默认 2
  enableDucking?: boolean;  // 是否启用ducking，默认 true
  duckingLevel?: number;  // ducking时其他角色的音量级别，默认 0.25
  onError?: (error: Error) => void;
}

export interface UseQuarrelVoiceReturn {
  // 提交话语
  submitUtter: (utter: Utter) => Promise<void>;
  
  // 便捷方法：提交主吵架
  submitMainFight: (
    roleId: string,
    text: string,
    options?: {
      civility?: number;
      lang?: Language;
      volume?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    }
  ) => Promise<void>;
  
  // 便捷方法：提交短插一句
  submitQuickJab: (
    roleId: string,
    text: string,
    options?: {
      civility?: number;
      lang?: Language;
      volume?: number;
    }
  ) => Promise<void>;
  
  // 便捷方法：提交普通聊天
  submitNormalChat: (
    roleId: string,
    text: string,
    options?: {
      civility?: number;
      lang?: Language;
      volume?: number;
    }
  ) => Promise<void>;
  
  // 设置主吵架角色
  setMainFightRoles: (roleIds: string[]) => void;
  
  // 控制方法
  stopAll: () => void;
  stopRole: (roleId: string) => void;
  clearQueue: () => void;
  
  // 状态查询
  isRolePlaying: (roleId: string) => boolean;
  getPlayingRoles: () => string[];
  getQueueLength: () => number;
  hasAvailableSlot: () => boolean;
  
  // 服务实例（高级用法）
  service: ReturnType<typeof getQuarrelVoiceService>;
}

/**
 * 使用吵架王语音服务 Hook
 */
export function useQuarrelVoice(options: UseQuarrelVoiceOptions = {}): UseQuarrelVoiceReturn {
  const {
    autoInit = true,
    onError,
  } = options;

  const serviceRef = useRef<ReturnType<typeof getQuarrelVoiceService> | null>(null);
  const initializedRef = useRef(false);

  // 初始化
  useEffect(() => {
    if (!autoInit || initializedRef.current) {
      return;
    }

    const init = async () => {
      try {
        const service = getQuarrelVoiceService();
        await service.init();
        serviceRef.current = service;
        initializedRef.current = true;
        console.log('[useQuarrelVoice] 初始化完成');
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        console.error('[useQuarrelVoice] 初始化失败:', err);
        if (onError) {
          onError(err);
        }
      }
    };

    init();

    // 清理函数
    return () => {
      if (serviceRef.current) {
        serviceRef.current.stopAll();
      }
    };
  }, [autoInit, onError]);

  // 提交话语
  const submitUtter = useCallback(async (utter: Utter) => {
    if (!serviceRef.current) {
      console.warn('[useQuarrelVoice] 服务未初始化');
      return;
    }
    await serviceRef.current.submitUtter(utter);
  }, []);

  // 提交主吵架
  const submitMainFight = useCallback(async (
    roleId: string,
    text: string,
    options: {
      civility?: number;
      lang?: Language;
      volume?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (error: Error) => void;
    } = {}
  ) => {
    await submitUtter({
      roleId,
      text,
      priority: 'MAIN_FIGHT',
      civility: options.civility ?? 2,
      lang: options.lang ?? 'zh',
      volume: options.volume ?? 1.0,
      onStart: options.onStart,
      onEnd: options.onEnd,
      onError: options.onError,
    });
  }, [submitUtter]);

  // 提交短插一句
  const submitQuickJab = useCallback(async (
    roleId: string,
    text: string,
    options: {
      civility?: number;
      lang?: Language;
      volume?: number;
    } = {}
  ) => {
    await submitUtter({
      roleId,
      text,
      priority: 'QUICK_JAB',
      civility: options.civility ?? 1,
      lang: options.lang ?? 'zh',
      volume: options.volume ?? 0.8,
    });
  }, [submitUtter]);

  // 提交普通聊天
  const submitNormalChat = useCallback(async (
    roleId: string,
    text: string,
    options: {
      civility?: number;
      lang?: Language;
      volume?: number;
    } = {}
  ) => {
    await submitUtter({
      roleId,
      text,
      priority: 'NORMAL_CHAT',
      civility: options.civility ?? 0,
      lang: options.lang ?? 'zh',
      volume: options.volume ?? 1.0,
    });
  }, [submitUtter]);

  // 设置主吵架角色
  const setMainFightRoles = useCallback((roleIds: string[]) => {
    updateMainFightRoles(roleIds);
  }, []);

  // 停止所有播放
  const stopAll = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.stopAll();
    }
  }, []);

  // 停止指定角色
  const stopRole = useCallback((roleId: string) => {
    if (serviceRef.current) {
      serviceRef.current.stopRole(roleId);
    }
  }, []);

  // 清空队列
  const clearQueue = useCallback(() => {
    if (serviceRef.current) {
      serviceRef.current.clearQueue();
    }
  }, []);

  // 检查角色是否正在播放
  const isRolePlaying = useCallback((roleId: string): boolean => {
    if (!serviceRef.current) {
      return false;
    }
    return serviceRef.current.getPlayingRoles().includes(roleId);
  }, []);

  // 获取正在播放的角色列表
  const getPlayingRoles = useCallback((): string[] => {
    if (!serviceRef.current) {
      return [];
    }
    return serviceRef.current.getPlayingRoles();
  }, []);

  // 获取队列长度
  const getQueueLength = useCallback((): number => {
    if (!serviceRef.current) {
      return 0;
    }
    return serviceRef.current.getQueueLength();
  }, []);

  // 检查是否有空闲槽位
  const hasAvailableSlot = useCallback((): boolean => {
    if (!serviceRef.current) {
      return false;
    }
    const playing = serviceRef.current.getPlayingRoles();
    return playing.length < 2;  // 最多2人同时说话
  }, []);

  return {
    submitUtter,
    submitMainFight,
    submitQuickJab,
    submitNormalChat,
    setMainFightRoles,
    stopAll,
    stopRole,
    clearQueue,
    isRolePlaying,
    getPlayingRoles,
    getQueueLength,
    hasAvailableSlot,
    service: serviceRef.current || getQuarrelVoiceService(),
  };
}

/**
 * 便捷函数：从Player对象创建roleId
 */
export function playerToRoleId(player: Player): string {
  return player.id.toString();
}

/**
 * 便捷函数：从多个Player创建roleId数组
 */
export function playersToRoleIds(players: Player[]): string[] {
  return players.map(p => p.id.toString());
}

