/**
 * 系统默认配置
 */

import { SystemConfig } from '../types/SystemConfig';

export const DefaultSystemConfig: SystemConfig = {
  validation: {
    enabled: true,
    validateOnRoundEnd: true,
    validateOnGameEnd: true,
    validateAfterPlay: false, // 开发时可选开启
    cardIntegrity: {
      enabled: true,
      detectDuplicates: true,
      strictMode: true,
      tolerance: 0,
    },
    scoreIntegrity: {
      enabled: true,
      strictMode: true,
      tolerance: 0.01, // 允许小的浮点数误差
    },
    output: {
      console: {
        enabled: true,
        level: 'warn',
        detailed: false,
      },
      events: {
        enabled: true,
        dispatchCustomEvents: true,
      },
      errorHandling: {
        enabled: true,
        throwOnError: false, // 默认不抛出异常，只记录
        recoveryStrategy: 'warn',
      },
    },
  },
  event: {
    enabled: true,
    maxQueueSize: 50,
    processImmediately: true,
  },
  tracking: {
    enabled: true,
    cardTracker: {
      enabled: true,
      recordSnapshots: true,
    },
  },
  audio: {
    enabled: true,
    announcement: {
      enabled: true,
      deduplicationWindow: 500,
    },
    voice: {},
    sound: {},
  },
};

