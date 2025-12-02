/**
 * 聊天回复Hook
 * 处理玩家接收消息后的回复逻辑（AI自动回复 + 真实玩家回复UI）
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { GameStatus, Player, PlayerType } from '../types/card';
import { ChatMessage } from '../types/chat';
import { subscribeToMessages, triggerReply } from '../services/chatService';
import { multiChannelVoiceService } from '../services/multiChannelVoiceService';
import { MultiPlayerGameState } from '../utils/gameStateUtils';

interface UseChatReplyOptions {
  gameState: MultiPlayerGameState;
  humanPlayer: Player | null;
  aiReplyProbability?: number; // AI回复概率，默认0.4
  minReplyDelay?: number; // 最小回复延迟（毫秒），默认2秒
  maxReplyDelay?: number; // 最大回复延迟（毫秒），默认5秒
}

/**
 * 聊天回复Hook
 * 1. AI玩家收到消息后自动回复（根据概率和延迟）
 * 2. 真实玩家可以选择回复或忽略（通过UI）
 */
export function useChatReply({
  gameState,
  humanPlayer,
  aiReplyProbability = 0.4, // 默认40%概率回复
  minReplyDelay = 2000, // 默认2秒
  maxReplyDelay = 5000 // 默认5秒
}: UseChatReplyOptions) {
  const [pendingReply, setPendingReply] = useState<ChatMessage | null>(null); // 待回复的消息
  const processedMessagesRef = useRef<Set<string>>(new Set()); // 已处理的消息ID

  // 处理AI自动回复
  const handleAIAutoReply = useCallback(async (message: ChatMessage) => {
    // 只在游戏进行中时处理
    if (gameState.status !== GameStatus.PLAYING) {
      return;
    }

    // 避免重复处理同一条消息
    const messageId = `${message.playerId}-${message.timestamp}`;
    if (processedMessagesRef.current.has(messageId)) {
      return;
    }
    processedMessagesRef.current.add(messageId);

    // 如果消息是自己发的，不回复
    if (humanPlayer && message.playerId === humanPlayer.id) {
      return;
    }

    // 如果消息已经有回复标记，不重复回复
    if (message.replyTo) {
      return;
    }

    // 找到所有AI玩家（排除发消息的玩家）
    const aiPlayers = gameState.players.filter(
      p => p.type === PlayerType.AI && p.id !== message.playerId
    );

    if (aiPlayers.length === 0) {
      return;
    }

    // 检查语音队列状态，如果队列繁忙，降低回复概率
    const queueStatus = multiChannelVoiceService.getChatQueueStatus();
    let adjustedProbability = aiReplyProbability;
    
    if (queueStatus.isPlaying || queueStatus.queueLength >= 3) {
      // 队列繁忙，降低回复概率
      adjustedProbability = aiReplyProbability * 0.5;
    }

    // 随机选择一些AI玩家回复（避免所有人同时回复）
    for (const aiPlayer of aiPlayers) {
      if (Math.random() < adjustedProbability / aiPlayers.length) {
        // 随机延迟回复（模拟思考时间）
        const delay = minReplyDelay + Math.random() * (maxReplyDelay - minReplyDelay);
        
        setTimeout(async () => {
          // 再次检查游戏状态和队列状态
          if (gameState.status === GameStatus.PLAYING) {
            const currentQueueStatus = multiChannelVoiceService.getChatQueueStatus();
            // 如果队列仍然繁忙，可能跳过回复
            if (currentQueueStatus.queueLength < 5) {
              await triggerReply(aiPlayer, message, adjustedProbability, gameState)
                .then(replyMessage => {
                  if (replyMessage) {
                  }
                })
                .catch(err => {
                });
            }
          }
        }, delay);
        
        // 只让一个AI玩家回复，避免多人同时回复
        break;
      }
    }
  }, [gameState, humanPlayer, aiReplyProbability, minReplyDelay, maxReplyDelay]);

  // 订阅消息通知
  useEffect(() => {
    const unsubscribe = subscribeToMessages((message: ChatMessage) => {
      // 处理AI自动回复
      handleAIAutoReply(message);
      
      // 如果是发给真实玩家的消息，显示回复选项
      if (humanPlayer && message.playerId !== humanPlayer.id) {
        // 延迟显示回复选项（给玩家一些时间看到消息）
        setTimeout(() => {
          setPendingReply(message);
          // 5秒后自动隐藏回复选项（如果玩家没有回复）
          setTimeout(() => {
            setPendingReply(prev => prev?.timestamp === message.timestamp ? null : prev);
          }, 5000);
        }, 1000);
      }
    });

    return unsubscribe;
  }, [handleAIAutoReply, humanPlayer]);

  // 真实玩家手动回复
  const handleHumanReply = useCallback(async () => {
    if (!pendingReply || !humanPlayer) {
      return;
    }

    const message = pendingReply;
    setPendingReply(null);

    // 触发回复
    await triggerReply(humanPlayer, message, 1.0, gameState)
      .then(replyMessage => {
        if (replyMessage) {
        }
      })
      .catch(err => {
      });
  }, [pendingReply, humanPlayer, gameState]);

  // 忽略消息
  const handleIgnore = useCallback(() => {
    setPendingReply(null);
  }, []);

  return {
    pendingReply, // 待回复的消息
    handleHumanReply, // 真实玩家回复函数
    handleIgnore // 忽略消息函数
  };
}

