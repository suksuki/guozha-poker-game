/**
 * 聊天消息Store
 * 管理AI Brain生成的聊天消息
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { aiBrainIntegration } from '../services/ai/aiBrainIntegration';
import { useGameStore } from './gameStore';
import { useSettingsStore } from './settingsStore';
import { getMultiChannelAudioService } from '../services/audio/multiChannelAudioService';

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
  };

  /**
   * 初始化AI Brain通信监听
   */
  const initializeAIBrainListener = () => {
    const audioService = getMultiChannelAudioService();
    
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
      
      // 异步播放TTS语音（根据设置决定是否播放）
      const settingsStore = useSettingsStore();
      const voiceSettings = settingsStore.voicePlaybackSettings;
      
      // 检查是否应该播放（系统播报或玩家聊天）
      const isSystemMessage = event.intent === 'system' || event.intent === 'announcement';
      const shouldPlay = (isSystemMessage && voiceSettings.enableSystemAnnouncements) ||
                        (!isSystemMessage && voiceSettings.enablePlayerChat);
      
      if (event.content && event.content.trim() && voiceSettings.enabled && shouldPlay) {
        // 根据intent确定优先级：taunt=3, tactical_signal=2, social_chat=1, system=4
        const priorityMap: Record<string, number> = {
          'system': 4,
          'announcement': 4,
          'taunt': 3,
          'tactical_signal': 2,
          'social_chat': 1,
          'celebrate': 2
        };
        const priority = priorityMap[event.intent] || 1;
        
        // 使用TTS播报服务（等待音频返回后再显示文字）
        Promise.all([
          import('../types/channel'),
          import('../services/tts/ttsPlaybackService')
        ]).then(([{ ChannelType }, { getTTSPlaybackService }]) => {
          // 确定声道：所有聊天消息都使用玩家声道（PLAYER_0-PLAYER_7）
          // 报牌独占ANNOUNCEMENT声道，聊天不应该使用它
          const channel = (ChannelType.PLAYER_0 + (event.playerId % 8)) as ChannelType;
          const ttsService = getTTSPlaybackService();
          
          // 聊天TTS（在音频开始播放时显示气泡，不需要等待播放完成）
          let bubbleDisplayed = false;
          const displayBubble = () => {
            if (!bubbleDisplayed) {
              bubbleDisplayed = true;
              addMessage(newMessage);
              activeBubbles.value.set(event.playerId, newMessage);
              
              setTimeout(() => {
                activeBubbles.value.delete(event.playerId);
              }, 3000);
            }
          };
          
          // 设置超时，确保即使TTS失败也能显示气泡
          const timeoutId = setTimeout(() => {
            displayBubble();
          }, 5000);
          
          ttsService.speak(event.content, {
            timeout: 5000,
            fallbackTimeout: 5000,
            priority,
            channel,
            enableCache: true,
            onStart: () => {
              // 音频开始播放时，显示气泡
              clearTimeout(timeoutId);
              displayBubble();
            },
            onEnd: () => {
              // 音频播放完成
            },
            onError: (error) => {
              console.error(`[ChatStore] TTS播放失败 (玩家${event.playerId}):`, error);
              clearTimeout(timeoutId);
              displayBubble();
            }
          }).catch((error) => {
            console.error(`[ChatStore] TTS播放异常 (玩家${event.playerId}):`, error);
            clearTimeout(timeoutId);
            displayBubble();
          });
        }).catch((error) => {
          console.error(`[ChatStore] TTS服务初始化失败 (玩家${event.playerId}):`, error);
          // 如果TTS服务不可用，直接显示消息和气泡
          addMessage(newMessage);
          activeBubbles.value.set(event.playerId, newMessage);
          
          setTimeout(() => {
            activeBubbles.value.delete(event.playerId);
          }, 3000);
        });
      } else {
        // 不播放TTS，直接显示消息和气泡
        addMessage(newMessage);
        activeBubbles.value.set(event.playerId, newMessage);
        
        setTimeout(() => {
          activeBubbles.value.delete(event.playerId);
        }, 3000);
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

  return {
    messages,
    recentMessages,
    messagesByPlayer,
    activeBubbles,
    addMessage,
    initializeAIBrainListener,
    clearMessages,
    getLatestMessageByPlayer
  };
});

