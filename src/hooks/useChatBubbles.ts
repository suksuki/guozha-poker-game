/**
 * 聊天气泡 Hook
 * 管理聊天气泡的显示和位置
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import React from 'react';
import { GameStatus, Player } from '../types/card';
import { ChatMessage } from '../types/chat';
import { getChatMessages, triggerRandomChat } from '../services/chatService';
import { waitForVoices, listAvailableVoices } from '../services/voiceService';

export function useChatBubbles(gameState: { status: GameStatus; players: Player[]; currentPlayerIndex: number }) {
  const [activeChatBubbles, setActiveChatBubbles] = useState<Map<number, ChatMessage>>(new Map());

  // 初始化语音功能（某些浏览器需要等待voices加载）
  useEffect(() => {
    waitForVoices(() => {
      console.log('语音功能已就绪');
      // 列出所有可用语音（用于调试）
      listAvailableVoices();
    });
  }, []);

  // 监听聊天消息并显示气泡
  useEffect(() => {
    const messages = getChatMessages();
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      // 添加新的聊天气泡
      setActiveChatBubbles(prev => {
        const newMap = new Map(prev);
        newMap.set(latestMessage.playerId, latestMessage);
        return newMap;
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
        const chatMessage = triggerRandomChat(randomPlayer, 0.5);
        if (chatMessage) {
          setActiveChatBubbles(prev => {
            const newMap = new Map(prev);
            newMap.set(chatMessage.playerId, chatMessage);
            return newMap;
          });
        }
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

