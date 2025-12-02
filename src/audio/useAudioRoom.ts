/**
 * React Hook：音频房间
 * 整合 AudioMixer 和 DialogueScheduler，提供便捷的 API
 */

import { useEffect, useRef, useCallback } from 'react';
import { AudioMixer, getAudioMixer } from './AudioMixer';
import { DialogueScheduler, Utter, DialogueSchedulerConfig } from './DialogueScheduler';

export interface UseAudioRoomConfig extends DialogueSchedulerConfig {
  autoInit?: boolean;  // 是否自动初始化，默认 true
  onError?: (error: Error) => void;
}

export interface UseAudioRoomReturn {
  // 提交话语
  submitUtter: (utter: Utter) => void;
  
  // 控制方法
  stopAll: () => void;
  stopRole: (roleId: string) => void;
  clearQueue: () => void;
  
  // 状态查询
  isRolePlaying: (roleId: string) => boolean;
  getPlayingRoles: () => string[];
  getQueueLength: () => number;
  hasAvailableSlot: () => boolean;
  
  // AudioMixer 方法
  setRoleVolume: (roleId: string, volume: number) => void;
  setRolePan: (roleId: string, pan: number) => void;
  duckOthers: (activeRoleId: string, otherLevel?: number) => void;
  restoreAllVolumes: () => void;
}

/**
 * 使用音频房间 Hook
 * @param config 配置选项
 * @returns 音频房间 API
 */
export function useAudioRoom(config: UseAudioRoomConfig = {}): UseAudioRoomReturn {
  const {
    autoInit = true,
    onError,
    ...schedulerConfig
  } = config;

  const mixerRef = useRef<AudioMixer | null>(null);
  const schedulerRef = useRef<DialogueScheduler | null>(null);
  const initializedRef = useRef(false);

  // 初始化
  useEffect(() => {
    if (!autoInit || initializedRef.current) {
      return;
    }

    const init = async () => {
      try {
        // 初始化 AudioMixer
        const mixer = getAudioMixer();
        await mixer.init();
        mixerRef.current = mixer;

        // 创建播放回调
        const playCallback = async (utter: Utter): Promise<void> => {
          if (!mixerRef.current || !utter.audioBuffer) {
            throw new Error('AudioMixer 未初始化或音频数据缺失');
          }

          if (utter.onStart) {
            utter.onStart();
          }

          // 如果启用 ducking，降低其他角色音量
          if (config.enableDucking && schedulerRef.current) {
            const playingRoles = schedulerRef.current.getPlayingRoles();
            if (playingRoles.length > 1) {
              mixerRef.current.duckOthers(utter.roleId, config.duckingLevel);
            }
          }

          // 播放音频
          await mixerRef.current.play(utter.roleId, utter.audioBuffer, {
            volume: utter.volume ?? 1.0,
            pan: utter.pan,
            onEnd: utter.onEnd,
            onError: utter.onError,
          });

          // 恢复所有音量
          if (config.enableDucking) {
            mixerRef.current.restoreAllVolumes();
          }
        };

        // 创建 DialogueScheduler
        const scheduler = new DialogueScheduler(playCallback, schedulerConfig);
        schedulerRef.current = scheduler;

        initializedRef.current = true;
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        if (onError) {
          onError(err);
        }
      }
    };

    init();

    // 清理函数
    return () => {
      if (schedulerRef.current) {
        schedulerRef.current.stopAll();
      }
      // 注意：不销毁 AudioMixer，因为可能是单例
    };
  }, [autoInit, onError, config.enableDucking, config.duckingLevel, schedulerConfig]);

  // 提交话语
  const submitUtter = useCallback((utter: Utter) => {
    if (!schedulerRef.current) {
      return;
    }
    schedulerRef.current.submit(utter);
  }, []);

  // 停止所有播放
  const stopAll = useCallback(() => {
    if (schedulerRef.current) {
      schedulerRef.current.stopAll();
    }
    if (mixerRef.current) {
      mixerRef.current.stopAll();
    }
  }, []);

  // 停止指定角色
  const stopRole = useCallback((roleId: string) => {
    if (schedulerRef.current) {
      schedulerRef.current.cancelRole(roleId);
    }
    if (mixerRef.current) {
      mixerRef.current.stopRole(roleId);
    }
  }, []);

  // 清空队列
  const clearQueue = useCallback(() => {
    if (schedulerRef.current) {
      schedulerRef.current.clearQueue();
    }
  }, []);

  // 检查角色是否正在播放
  const isRolePlaying = useCallback((roleId: string): boolean => {
    return schedulerRef.current?.isRolePlaying(roleId) ?? false;
  }, []);

  // 获取正在播放的角色列表
  const getPlayingRoles = useCallback((): string[] => {
    return schedulerRef.current?.getPlayingRoles() ?? [];
  }, []);

  // 获取队列长度
  const getQueueLength = useCallback((): number => {
    return schedulerRef.current?.getQueueLength() ?? 0;
  }, []);

  // 检查是否有空闲槽位
  const hasAvailableSlot = useCallback((): boolean => {
    return schedulerRef.current?.hasAvailableSlot() ?? false;
  }, []);

  // 设置角色音量
  const setRoleVolume = useCallback((roleId: string, volume: number) => {
    if (mixerRef.current) {
      mixerRef.current.setRoleVolume(roleId, volume);
    }
  }, []);

  // 设置角色声像位置
  const setRolePan = useCallback((roleId: string, pan: number) => {
    if (mixerRef.current) {
      mixerRef.current.setRolePan(roleId, pan);
    }
  }, []);

  // Ducking 效果
  const duckOthers = useCallback((activeRoleId: string, otherLevel?: number) => {
    if (mixerRef.current) {
      mixerRef.current.duckOthers(activeRoleId, otherLevel);
    }
  }, []);

  // 恢复所有音量
  const restoreAllVolumes = useCallback(() => {
    if (mixerRef.current) {
      mixerRef.current.restoreAllVolumes();
    }
  }, []);

  return {
    submitUtter,
    stopAll,
    stopRole,
    clearQueue,
    isRolePlaying,
    getPlayingRoles,
    getQueueLength,
    hasAvailableSlot,
    setRoleVolume,
    setRolePan,
    duckOthers,
    restoreAllVolumes,
  };
}

