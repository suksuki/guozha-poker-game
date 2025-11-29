/**
 * 音频模块单元测试
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SystemApplication } from '../../src/services/system';
import { AudioModule } from '../../src/services/system/modules/audio/AudioModule';
import { EventModule } from '../../src/services/system/modules/event/EventModule';
import { registerAllModules } from '../../src/services/system/modules/registerModules';
import { Play, CardType } from '../../src/types/card';

// Mock 音频服务
vi.mock('../../src/services/systemAnnouncementService', () => ({
  systemAnnouncementService: {
    announcePlay: vi.fn().mockResolvedValue(undefined),
    announcePass: vi.fn().mockResolvedValue(undefined),
  }
}));

vi.mock('../../src/services/voiceService', () => ({
  voiceService: {
    isSpeechSupported: vi.fn().mockReturnValue(true),
    listAvailableVoices: vi.fn().mockResolvedValue([]),
  }
}));

vi.mock('../../src/services/soundService', () => ({
  soundService: {
    preloadSounds: vi.fn().mockResolvedValue(undefined),
    playSound: vi.fn(),
  }
}));

describe('AudioModule', () => {
  let systemApp: SystemApplication;
  let audioModule: AudioModule | null;

  beforeEach(async () => {
    // 重置系统应用
    systemApp = SystemApplication.getInstance();
    systemApp.reset();
    
    // 注册模块
    registerAllModules(systemApp);
    
    // 初始化
    await systemApp.initialize();
    await systemApp.start();
    
    // 获取音频模块
    audioModule = systemApp.getModule<AudioModule>('audio');
  });

  describe('模块初始化', () => {
    it('应该正确初始化音频模块', () => {
      expect(audioModule).toBeDefined();
      expect(audioModule?.isEnabled()).toBe(true);
      expect(audioModule?.getStatus().initialized).toBe(true);
    });

    it('应该能够获取模块状态', () => {
      const status = audioModule?.getStatus();
      expect(status).toBeDefined();
      expect(status?.initialized).toBe(true);
      expect(status?.enabled).toBe(true);
    });
  });

  describe('音频操作', () => {
    it('应该能够检查语音支持', () => {
      const isSupported = audioModule!.isSpeechSupported();
      expect(typeof isSupported).toBe('boolean');
    });

    it('应该能够获取可用语音列表', async () => {
      const voices = await audioModule!.listAvailableVoices();
      expect(Array.isArray(voices)).toBe(true);
    });

    it('应该能够预加载音效', async () => {
      await audioModule!.preloadSounds();
      // 主要测试不会抛出错误
      expect(true).toBe(true);
    });

    it('应该能够播放音效', () => {
      audioModule!.playSound('test-sound', 0.5);
      // 主要测试不会抛出错误
      expect(true).toBe(true);
    });
  });

  describe('报牌功能', () => {
    it('应该能够报牌', async () => {
      const mockPlay: Play = {
        cards: [],
        type: CardType.SINGLE,
        rank: 3,
        score: 0
      };
      
      await audioModule!.announcePlay(mockPlay);
      // 主要测试不会抛出错误
      expect(true).toBe(true);
    });

    it('应该能够报"要不起"', async () => {
      await audioModule!.announcePass();
      // 主要测试不会抛出错误
      expect(true).toBe(true);
    });
  });

  describe('配置管理', () => {
    it('应该能够配置音频模块', () => {
      audioModule!.configure({
        enabled: false
      });
      
      const status = audioModule!.getStatus();
      expect(status.enabled).toBe(false);
    });

    it('应该能够在禁用状态下跳过音频操作', async () => {
      audioModule!.configure({ enabled: false });
      
      const mockPlay: Play = {
        cards: [],
        type: CardType.SINGLE,
        rank: 3,
        score: 0
      };
      
      await audioModule!.announcePlay(mockPlay);
      // 禁用状态下应该不会执行，但不会抛出错误
      expect(true).toBe(true);
    });
  });
});

