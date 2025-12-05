/**
 * 空闲聊天Hook
 * 检测长期不出牌的情况，评估语音队列状态，自动触发自发聊天
 */

import { useEffect, useRef } from 'react';
import { GameStatus, Player, PlayerType } from '../types/card';
import { triggerRandomChat } from '../services/chatService';
import { multiChannelVoiceService } from '../services/multiChannelVoiceService';
import { MultiPlayerGameState } from '../utils/gameStateUtils';

interface UseIdleChatOptions {
  gameState: MultiPlayerGameState;
  idleDelay?: number; // 空闲延迟时间（毫秒），默认10秒
  checkInterval?: number; // 检查间隔（毫秒），默认2秒
  minQueueLength?: number; // 触发聊天的最大队列长度阈值，默认2
}

/**
 * 空闲聊天Hook
 * 当玩家长期不出牌且语音队列空闲时，自动触发AI玩家的自发聊天
 */
export function useIdleChat({ 
  gameState, 
  idleDelay = 10000, // 默认10秒
  checkInterval = 2000, // 默认2秒检查一次
  minQueueLength = 2 // 队列长度≤2时认为空闲
}: UseIdleChatOptions): void {
  const lastActionTimeRef = useRef<number>(Date.now());
  const lastChatTimeRef = useRef<number>(0); // 上次触发聊天的时间
  const checkTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastPlayerIndexRef = useRef<number | null>(null);

  useEffect(() => {
    // 只在游戏进行中时启用
    if (gameState.status !== GameStatus.PLAYING) {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
        checkTimerRef.current = null;
      }
      return;
    }

    const currentIndex = gameState.currentPlayerIndex ?? 0;
    const currentPlayer = gameState.players?.[currentIndex];
    if (!currentPlayer) return;

    // 如果当前玩家切换了，重置计时器
    if (lastPlayerIndexRef.current !== currentIndex) {
      lastPlayerIndexRef.current = currentIndex;
      lastActionTimeRef.current = Date.now();
    }

    // 设置定期检查
    checkTimerRef.current = setInterval(() => {
      const now = Date.now();
      const idleTime = now - lastActionTimeRef.current;
      const timeSinceLastChat = now - lastChatTimeRef.current;

      // 检查是否满足触发条件：
      // 1. 空闲时间超过阈值
      // 2. 距离上次聊天至少5秒（避免频繁触发）
      // 3. 语音队列空闲或很少
      if (idleTime >= idleDelay && timeSinceLastChat >= 5000) {
        const queueStatus = multiChannelVoiceService.getChatQueueStatus();
        
        // 评估队列状态：空闲且队列长度小于阈值
        const isQueueIdle = !queueStatus.isPlaying && queueStatus.queueLength < minQueueLength;
        
        if (isQueueIdle) {
          // 随机选择一个AI玩家触发自发聊天
            const aiPlayers = (gameState.players || []).filter(
              (p, idx) => p.type === PlayerType.AI && idx !== currentIndex
            );

          if (aiPlayers.length > 0) {
            // 随机选择一个AI玩家
            const randomPlayer = aiPlayers[Math.floor(Math.random() * aiPlayers.length)];
            
            // 触发随机聊天（提高概率到0.7，因为这是主动触发的）
            triggerRandomChat(randomPlayer, 0.7, undefined, gameState)
              .then(chatMessage => {
                if (chatMessage) {
                  lastChatTimeRef.current = Date.now();
                  // 重置空闲计时器，避免连续触发
                  lastActionTimeRef.current = Date.now() + 5000; // 给5秒缓冲
                }
              })
              .catch(err => {
              });
          }
        } else {
          // 队列繁忙，记录日志但不触发（仅在调试时）
          if (queueStatus.queueLength >= minQueueLength) {
          }
        }
      }
    }, checkInterval);

    // 清理函数
    return () => {
      if (checkTimerRef.current) {
        clearInterval(checkTimerRef.current);
        checkTimerRef.current = null;
      }
    };
  }, [gameState.status, gameState.currentPlayerIndex, gameState.players, idleDelay, checkInterval, minQueueLength]);

  // 监听玩家出牌，重置计时器
  useEffect(() => {
    if (gameState.status === GameStatus.PLAYING && gameState.lastPlay) {
      // 检测到出牌，重置计时器
      lastActionTimeRef.current = Date.now();
      lastPlayerIndexRef.current = gameState.currentPlayerIndex ?? null;
    }
  }, [gameState.status, gameState.lastPlay, gameState.currentPlayerIndex]);
}
