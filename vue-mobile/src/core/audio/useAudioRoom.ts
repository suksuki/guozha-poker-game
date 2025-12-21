/**
 * Vue Composable：音频房间
 * 整合 AudioMixer 和 DialogueScheduler，提供便捷的 API
 */

import { onMounted, onUnmounted, ref } from 'vue';
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
 * 使用音频房间 Composable
 * @param config 配置选项
 * @returns 音频房间 API
 */
export function useAudioRoom(config: UseAudioRoomConfig = {}): UseAudioRoomReturn {
  const {
    autoInit = true,
    onError,
    ...schedulerConfig
  } = config;

  const mixerRef = ref<AudioMixer | null>(null);
  const schedulerRef = ref<DialogueScheduler | null>(null);
  const initializedRef = ref(false);

  const init = async () => {
    if (initializedRef.value) return;

    try {
      // 初始化 AudioMixer
      const mixer = getAudioMixer();
      await mixer.init();
      mixerRef.value = mixer;

      // 创建播放回调
      const playCallback = async (utter: Utter): Promise<void> => {
        if (!mixerRef.value || !utter.audioBuffer) {
          throw new Error('AudioMixer 未初始化或音频数据缺失');
        }

        if (utter.onStart) {
          utter.onStart();
        }

        // 如果启用 ducking，降低其他角色音量
        if (config.enableDucking && schedulerRef.value) {
          const playingRoles = schedulerRef.value.getPlayingRoles();
          if (playingRoles.length > 1) {
            mixerRef.value.duckOthers(utter.roleId, config.duckingLevel);
          }
        }

        // 播放音频
        await mixerRef.value.play(utter.roleId, utter.audioBuffer, {
          volume: utter.volume ?? 1.0,
          pan: utter.pan,
          onEnd: utter.onEnd,
          onError: utter.onError,
        });

        // 恢复所有音量
        if (config.enableDucking) {
          mixerRef.value.restoreAllVolumes();
        }
      };

      // 创建 DialogueScheduler
      const scheduler = new DialogueScheduler(playCallback, schedulerConfig);
      schedulerRef.value = scheduler;

      initializedRef.value = true;
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      if (onError) {
        onError(err);
      }
    }
  };

  onMounted(() => {
    if (autoInit) {
      init();
    }
  });

  onUnmounted(() => {
    if (schedulerRef.value) {
      schedulerRef.value.stopAll();
    }
    // 注意：不销毁 AudioMixer，因为可能是单例
  });

  // 提交话语
  const submitUtter = (utter: Utter) => {
    if (schedulerRef.value) {
      schedulerRef.value.submit(utter);
    }
  };

  // 停止所有播放
  const stopAll = () => {
    if (schedulerRef.value) {
      schedulerRef.value.stopAll();
    }
    if (mixerRef.value) {
      mixerRef.value.stopAll();
    }
  };

  // 停止指定角色
  const stopRole = (roleId: string) => {
    if (schedulerRef.value) {
      schedulerRef.value.cancelRole(roleId);
    }
    if (mixerRef.value) {
      mixerRef.value.stopRole(roleId);
    }
  };

  // 清空队列
  const clearQueue = () => {
    if (schedulerRef.value) {
      schedulerRef.value.clearQueue();
    }
  };

  // 检查角色是否正在播放
  const isRolePlaying = (roleId: string): boolean => {
    return schedulerRef.value?.isRolePlaying(roleId) ?? false;
  };

  // 获取正在播放的角色列表
  const getPlayingRoles = (): string[] => {
    return schedulerRef.value?.getPlayingRoles() ?? [];
  };

  // 获取队列长度
  const getQueueLength = (): number => {
    return schedulerRef.value?.getQueueLength() ?? 0;
  };

  // 检查是否有空闲槽位
  const hasAvailableSlot = (): boolean => {
    return schedulerRef.value?.hasAvailableSlot() ?? false;
  };

  // 设置角色音量
  const setRoleVolume = (roleId: string, volume: number) => {
    if (mixerRef.value) {
      mixerRef.value.setRoleVolume(roleId, volume);
    }
  };

  // 设置角色声像位置
  const setRolePan = (roleId: string, pan: number) => {
    if (mixerRef.value) {
      mixerRef.value.setRolePan(roleId, pan);
    }
  };

  // Ducking 效果
  const duckOthers = (activeRoleId: string, otherLevel?: number) => {
    if (mixerRef.value) {
      mixerRef.value.duckOthers(activeRoleId, otherLevel);
    }
  };

  // 恢复所有音量
  const restoreAllVolumes = () => {
    if (mixerRef.value) {
      mixerRef.value.restoreAllVolumes();
    }
  };

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
