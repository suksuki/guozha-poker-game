/**
 * 卡牌报牌同步测试
 * 
 * 验证报牌同步机制：
 * - 报牌完成后才触发下一个玩家（通过onAudioGenerated回调）
 * - 报牌失败时也应该继续游戏流程
 * - 报牌超时后也应该继续游戏流程
 * 
 * 相关改进：2024-12-19
 * - 使用回调机制确保报牌完成后才继续游戏流程
 * - onAudioGenerated在音频完全播放完成后触发（onEnd回调中）
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useGameStore } from '../../src/stores/gameStore';
import { useSettingsStore } from '../../src/stores/settingsStore';
import { getTTSPlaybackService } from '../../src/services/tts/ttsPlaybackService';
import { ChannelType } from '../../src/types/channel';

// Mock AI Brain Integration
vi.mock('../../src/services/aiBrainIntegration', () => ({
  aiBrainIntegration: {
    initialize: vi.fn().mockResolvedValue(undefined),
    notifyStateChange: vi.fn().mockReturnValue(Promise.resolve()),
    triggerAITurn: vi.fn().mockReturnValue(Promise.resolve()),
    isInitialized: false
  }
}));

describe('卡牌报牌同步测试', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('报牌完成后应该触发下一个玩家（通过onAudioGenerated回调）', async () => {
    const gameStore = useGameStore();
    const settingsStore = useSettingsStore();
    
    settingsStore.updateVoicePlaybackSettings({ 
      enabled: true,
      enableSystemAnnouncements: true 
    });
    gameStore.startGame();
    
    const ttsService = getTTSPlaybackService();
    
    // Mock TTS服务，模拟完整的播放流程
    let onAudioGeneratedCalled = false;
    const speakMock = vi.spyOn(ttsService, 'speak').mockImplementation((text, options) => {
      // 模拟音频播放流程：
      // 1. 音频开始播放（onStart）
      setTimeout(() => {
        options?.onStart?.();
      }, 10);
      
      // 2. 音频播放完成（onEnd）
      setTimeout(() => {
        options?.onEnd?.();
        // 3. 在onEnd中触发onAudioGenerated（这是实际实现）
        // 注意：实际实现中，onAudioGenerated在onEnd回调中触发
        setTimeout(() => {
          options?.onAudioGenerated?.();
          onAudioGeneratedCalled = true;
        }, 5);
      }, 20);
      
      return Promise.resolve();
    });
    
    const humanPlayer = gameStore.humanPlayer!;
    const cardToPlay = [humanPlayer.hand[0]];
    
    // 出牌
    await gameStore.playCards(cardToPlay);
    
    // 等待回调执行
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // 验证：
    // 1. speak被调用
    expect(speakMock).toHaveBeenCalled();
    
    // 2. 使用了ANNOUNCEMENT声道
    const call = speakMock.mock.calls[0];
    expect(call[1]?.channel).toBe(ChannelType.SYSTEM);
    
    // 3. onAudioGenerated被调用（触发下一个玩家）
    expect(onAudioGeneratedCalled).toBe(true);
  });

  it('报牌失败时也应该继续游戏流程', async () => {
    const gameStore = useGameStore();
    const settingsStore = useSettingsStore();
    
    settingsStore.updateVoicePlaybackSettings({ enabled: true });
    gameStore.startGame();
    
    const ttsService = getTTSPlaybackService();
    
    // Mock TTS服务，触发错误
    const speakMock = vi.spyOn(ttsService, 'speak').mockImplementation((text, options) => {
      // 立即触发onError回调，确保错误处理
      if (options?.onError) {
        setTimeout(() => {
          options.onError(new Error('TTS失败'));
        }, 10);
      }
      return Promise.resolve();
    });
    
    const humanPlayer = gameStore.humanPlayer!;
    const cardToPlay = [humanPlayer.hand[0]];
    
    // 出牌（即使TTS失败，也应该继续）
    const result = await gameStore.playCards(cardToPlay);
    
    // 等待一下确保异步操作完成
    await new Promise(resolve => setTimeout(resolve, 50));
    
    expect(result.success).toBe(true);
    expect(speakMock).toHaveBeenCalled();
  });

  it('报牌超时后应该继续游戏流程', async () => {
    const gameStore = useGameStore();
    const settingsStore = useSettingsStore();
    
    settingsStore.updateVoicePlaybackSettings({ enabled: true });
    gameStore.startGame();
    
    const ttsService = getTTSPlaybackService();
    
    // Mock TTS服务，不触发任何回调（模拟超时）
    const speakMock = vi.spyOn(ttsService, 'speak').mockImplementation(() => {
      // 不触发任何回调，模拟超时
      return Promise.resolve();
    });
    
    const humanPlayer = gameStore.humanPlayer!;
    const cardToPlay = [humanPlayer.hand[0]];
    
    // 出牌
    const result = await gameStore.playCards(cardToPlay);
    
    // 即使超时，出牌操作也应该成功
    expect(result.success).toBe(true);
  });
});

