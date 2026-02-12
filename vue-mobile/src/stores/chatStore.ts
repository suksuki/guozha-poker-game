/**
 * 聊天消息Store
 * 管理AI Brain生成的聊天消息
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { aiBrainIntegration } from '../services/ai/aiBrainIntegration';
import { useGameStore } from './gameStore';
import { useSettingsStore } from './settingsStore';
import { getCurrentLanguage } from '@/i18n';
import type { TTSLanguage } from '../services/tts/types';

function localeToTTSLang(locale: string): TTSLanguage {
  if (locale.startsWith('ko')) return 'ko';
  if (locale.startsWith('ja')) return 'ja';
  if (locale.startsWith('en')) return 'en';
  return 'zh';
}

export interface ChatMessage {
  id: string;
  playerId: number;
  playerName: string;
  content: string;
  intent: string;
  emotion?: string;
  timestamp: number;
}

export const useChatStore = defineStore('chat', () => {
  // ========== 状态 ==========
  const messages = ref<ChatMessage[]>([]);
  const maxMessages = 50; // 最多保存50条消息
  const activeBubbles = ref<Map<number, ChatMessage>>(new Map()); // 当前显示的聊天气泡

  // ========== 计算属性 ==========
  const recentMessages = computed(() => {
    return messages.value.slice(-10); // 最近10条消息
  });

  const messagesByPlayer = computed(() => {
    const map = new Map<number, ChatMessage[]>();
    messages.value.forEach(msg => {
      if (!map.has(msg.playerId)) {
        map.set(msg.playerId, []);
      }
      map.get(msg.playerId)!.push(msg);
    });
    return map;
  });

  // ========== 方法 ==========

  /**
   * 添加消息
   */
  const addMessage = (message: Omit<ChatMessage, 'id'>) => {
    const newMessage: ChatMessage = {
      ...message,
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    };

    messages.value.push(newMessage);

    // 限制消息数量
    if (messages.value.length > maxMessages) {
      messages.value.shift();
    }

    // [新增] 如果是人类玩家的消息，转发给 AI Brain（带上游戏状态上下文）
    const gameStore = useGameStore();
    const humanPlayer = gameStore.humanPlayer;
    if (humanPlayer && message.playerId === humanPlayer.id && !message.intent?.includes('system')) {
      if (gameStore.game) {
        // 使用 (gameStore.game as any) 规避 Pinia 响应式包装导致的类型不匹配
        aiBrainIntegration.sendUserMessage(message.playerId, message.content, gameStore.game as any).catch(err => {
        });
      }
    }
  };

  /**
   * 初始化AI Brain通信监听
   */
  const initializeAIBrainListener = () => {
    aiBrainIntegration.onCommunicationMessage((event) => {
      // 获取玩家名称（从gameStore获取）
      const gameStore = useGameStore();
      const player = gameStore.players.find(p => p.id === event.playerId);
      const playerName = player ? player.name : `AI玩家${event.playerId}`;

      const newMessage: ChatMessage = {
        id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        playerId: event.playerId,
        playerName,
        content: event.content,
        intent: event.intent,
        emotion: event.emotion,
        timestamp: event.timestamp
      };

      // 先立即显示气泡和消息（不依赖 TTS），确保未配置 TTS 时也能看到文字
      if (event.content && event.content.trim()) {
        addMessage(newMessage);
        activeBubbles.value.set(event.playerId, newMessage);
        setTimeout(() => {
          activeBubbles.value.delete(event.playerId);
        }, 3000);
      }

      // 再根据设置尝试播放 TTS（有则播，没有也不影响气泡）
      const settingsStore = useSettingsStore();
      const voiceSettings = settingsStore.voicePlaybackSettings;
      const isSystemMessage = event.intent === 'system' || event.intent === 'announcement';
      const shouldPlay = (isSystemMessage && voiceSettings.enableSystemAnnouncements) ||
        (!isSystemMessage && voiceSettings.enablePlayerChat);

      if (event.content && event.content.trim() && voiceSettings.enabled && shouldPlay) {
        const priorityMap: Record<string, number> = {
          'system': 4,
          'announcement': 4,
          'taunt': 3,
          'tactical_signal': 2,
          'social_chat': 1,
          'celebrate': 2
        };
        const priority = priorityMap[event.intent] || 1;

        Promise.all([
          import('../types/channel'),
          import('../services/tts/ttsPlaybackService')
        ]).then(([{ ChannelType }, { getTTSPlaybackService }]) => {
          const channel = (ChannelType.PLAYER_1 + (event.playerId % 7)) as typeof ChannelType[keyof typeof ChannelType];
          const ttsLang = localeToTTSLang(getCurrentLanguage());
          const ttsService = getTTSPlaybackService();
          ttsService.speak(event.content, {
            timeout: 5000,
            fallbackTimeout: 5000,
            priority,
            channel,
            lang: ttsLang,
            enableCache: true,
            onStart: () => {},
            onEnd: () => {},
            onError: () => {}
          }).catch(() => {});
        }).catch(() => {});
      }
    });
  };

  /**
   * 清空消息
   */
  const clearMessages = () => {
    messages.value = [];
  };

  /**
   * 获取玩家的最新消息
   */
  const getLatestMessageByPlayer = (playerId: number): ChatMessage | null => {
    const playerMessages = messages.value.filter(msg => msg.playerId === playerId);
    return playerMessages.length > 0
      ? playerMessages[playerMessages.length - 1]
      : null;
  };

  /**
   * 获取AI建议
   */
  const getAISuggestion = async (): Promise<string | null> => {
    const gameStore = useGameStore();
    const humanPlayer = gameStore.humanPlayer;
    if (!humanPlayer || !gameStore.game) return null;

    try {
      // 使用 (gameStore.game as any) 规避 Pinia 响应式包装导致的类型不匹配
      return await aiBrainIntegration.generateMessageSuggestion(humanPlayer.id, gameStore.game as any);
    } catch (error) {
      return null;
    }
  };

  return {
    messages,
    recentMessages,
    messagesByPlayer,
    activeBubbles,
    addMessage,
    initializeAIBrainListener,
    clearMessages,
    getLatestMessageByPlayer,
    getAISuggestion
  };
});

