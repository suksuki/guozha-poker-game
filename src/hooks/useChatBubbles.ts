/**
 * 聊天气泡 Hook
 * 管理聊天气泡的显示和位置
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as React from 'react';
import { GameStatus, Player } from '../types/card';
import { ChatMessage } from '../types/chat';
import { getChatMessages, triggerRandomChat, chatService } from '../services/chatService';
import { waitForVoices, listAvailableVoices, voiceService } from '../services/voiceService';
import { translateText } from '../services/translationService';
import i18n from '../i18n';

import { MultiPlayerGameState } from '../utils/gameStateUtils';

export function useChatBubbles(gameState: MultiPlayerGameState | { status: GameStatus; players: Player[]; currentPlayerIndex: number }) {
  const [activeChatBubbles, setActiveChatBubbles] = useState<Map<number, ChatMessage>>(new Map());
  const lastMessageIdRef = useRef<string | null>(null);

  // 初始化语音功能（某些浏览器需要等待voices加载）
  useEffect(() => {
    waitForVoices(() => {
      console.log('语音功能已就绪');
      // 列出所有可用语音（用于调试）
      listAvailableVoices();
    });
  }, []);

  // 监听聊天消息并显示气泡，同时播放语音
  useEffect(() => {
    const messages = getChatMessages();
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      
      // 避免重复处理同一条消息
      const messageId = `${latestMessage.playerId}-${latestMessage.timestamp}`;
      if (lastMessageIdRef.current === messageId) {
        return;
      }
      lastMessageIdRef.current = messageId;
      
      // 翻译消息内容（如果当前语言不是中文）
      const currentLang = i18n.language || 'zh-CN';
      const player = gameState.players.find(p => p.id === latestMessage.playerId);
      
      // 异步翻译并更新消息
      translateText(latestMessage.content, currentLang).then(translatedContent => {
        // 创建翻译后的消息
        const translatedMessage: ChatMessage = {
          ...latestMessage,
          content: translatedContent,
          originalContent: latestMessage.content // 保存原文
        };
        
        // 更新聊天气泡（显示翻译后的内容）
        setActiveChatBubbles(prev => {
          const newMap = new Map(prev);
          newMap.set(translatedMessage.playerId, translatedMessage);
          return newMap;
        });
        
        // 如果启用语音，播放聊天语音（使用翻译后的内容）
        if (player?.voiceConfig) {
          // 对骂消息使用更大的音量（1.5倍），但语速保持正常
          const voiceConfigForTaunt = translatedMessage.type === 'taunt' 
            ? { 
                ...player.voiceConfig, 
                volume: Math.min(1.0, (player.voiceConfig.volume || 1.0) * 1.5) // 提高音量1.5倍，但不超过1.0
              }
            : player.voiceConfig;
          console.log('[useChatBubbles] 播放聊天语音:', translatedContent, '玩家:', player.name, 'playerId:', translatedMessage.playerId, '类型:', translatedMessage.type, '音量:', voiceConfigForTaunt.volume);
          voiceService.speak(translatedContent, voiceConfigForTaunt, 0, translatedMessage.playerId).catch(err => {
            console.warn('[useChatBubbles] 播放聊天语音失败:', err);
          });
        } else {
          console.warn('[useChatBubbles] 无法播放语音: 玩家不存在或没有voiceConfig', {
            playerId: translatedMessage.playerId,
            player: player,
            players: gameState.players.map(p => ({ id: p.id, name: p.name, hasVoiceConfig: !!p.voiceConfig }))
          });
        }
      }).catch(err => {
        console.warn('[useChatBubbles] 翻译失败，使用原文:', err);
        // 翻译失败，使用原文
        setActiveChatBubbles(prev => {
          const newMap = new Map(prev);
          newMap.set(latestMessage.playerId, latestMessage);
          return newMap;
        });
        
        if (player?.voiceConfig) {
          // 对骂消息使用更大的音量（1.5倍），但语速保持正常
          const voiceConfigForTaunt = latestMessage.type === 'taunt' 
            ? { 
                ...player.voiceConfig, 
                volume: Math.min(1.0, (player.voiceConfig.volume || 1.0) * 1.5) // 提高音量1.5倍，但不超过1.0
              }
            : player.voiceConfig;
          voiceService.speak(latestMessage.content, voiceConfigForTaunt, 0, latestMessage.playerId).catch(err => {
            console.warn('[useChatBubbles] 播放聊天语音失败:', err);
          });
        }
      });
    }
  }, [gameState.players, gameState.currentPlayerIndex]);

  // 定期触发随机闲聊
  useEffect(() => {
    if (gameState.status !== GameStatus.PLAYING) return;

    const interval = setInterval(() => {
      // 随机选择一个玩家进行闲聊
      const activePlayers = gameState.players.filter(p => p.hand.length > 0);
      if (activePlayers.length > 0 && Math.random() < 0.3) {
        const randomPlayer = activePlayers[Math.floor(Math.random() * activePlayers.length)];
        // 传递完整的游戏状态给大模型
        const fullGameState = 'roundNumber' in gameState ? gameState as MultiPlayerGameState : undefined;
        triggerRandomChat(randomPlayer, 0.5, undefined, fullGameState).then(chatMessage => {
          if (chatMessage) {
            setActiveChatBubbles(prev => {
              const newMap = new Map(prev);
              newMap.set(chatMessage.playerId, chatMessage);
              return newMap;
            });
          }
        }).catch(err => {
          console.error('触发随机闲聊失败:', err);
        });
      }
    }, 8000); // 每8秒检查一次

    return () => clearInterval(interval);
  }, [gameState.status, gameState.players]);

  // 移除聊天气泡
  const removeChatBubble = useCallback((playerId: number) => {
    setActiveChatBubbles(prev => {
      const newMap = new Map(prev);
      newMap.delete(playerId);
      return newMap;
    });
  }, []);

  // 计算玩家聊天气泡位置
  const getPlayerBubblePosition = useMemo(() => {
    return (playerId: number): React.CSSProperties => {
      const humanPlayer = gameState.players.find(p => p.isHuman);
      const isHuman = humanPlayer?.id === playerId;
      
      if (isHuman) {
        // 人类玩家在底部
        return { bottom: '200px', left: '50%', transform: 'translateX(-50%)' };
      } else {
        // AI玩家在上方，根据玩家索引计算位置
        const aiPlayers = gameState.players.filter(p => !p.isHuman);
        const playerIndex = aiPlayers.findIndex(p => p.id === playerId);
        const totalAiPlayers = aiPlayers.length;
        const position = (playerIndex + 1) / (totalAiPlayers + 1) * 100;
        return { top: '80px', left: `${position}%`, transform: 'translateX(-50%)' };
      }
    };
  }, [gameState.players]);

  return {
    activeChatBubbles,
    removeChatBubble,
    getPlayerBubblePosition
  };
}

