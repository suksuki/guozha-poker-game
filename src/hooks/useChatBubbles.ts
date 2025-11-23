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

export function useChatBubbles(gameState: { status: GameStatus; players: Player[]; currentPlayerIndex: number }) {
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
      
      // 添加新的聊天气泡
      setActiveChatBubbles(prev => {
        const newMap = new Map(prev);
        newMap.set(latestMessage.playerId, latestMessage);
        return newMap;
      });
      
      // 如果启用语音，播放聊天语音（组件直接调用voiceService）
      const player = gameState.players.find(p => p.id === latestMessage.playerId);
      if (player?.voiceConfig) {
        // 传递 playerId 以支持多声道模式
        console.log('[useChatBubbles] 播放聊天语音:', latestMessage.content, '玩家:', player.name, 'playerId:', latestMessage.playerId);
        voiceService.speak(latestMessage.content, player.voiceConfig, 0, latestMessage.playerId).catch(err => {
          console.warn('[useChatBubbles] 播放聊天语音失败:', err);
        });
      } else {
        console.warn('[useChatBubbles] 无法播放语音: 玩家不存在或没有voiceConfig', {
          playerId: latestMessage.playerId,
          player: player,
          players: gameState.players.map(p => ({ id: p.id, name: p.name, hasVoiceConfig: !!p.voiceConfig }))
        });
      }
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
        triggerRandomChat(randomPlayer, 0.5).then(chatMessage => {
          if (chatMessage) {
            setActiveChatBubbles(prev => {
              const newMap = new Map(prev);
              newMap.set(chatMessage.playerId, chatMessage);
              return newMap;
            });
          }
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

