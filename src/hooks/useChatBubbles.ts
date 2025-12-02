/**
 * 聊天气泡 Hook
 * 管理聊天气泡的显示和位置
 */

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import * as React from 'react';
import { GameStatus } from '../types/card';
import { ChatMessage } from '../types/chat';
import { getChatMessages, triggerRandomChat } from '../services/chatService';
import { waitForVoices, listAvailableVoices, voiceService } from '../services/voiceService';
import { translateText } from '../services/translationService';
import { i18n } from '../i18n';

import { Game } from '../utils/Game';
import { useGameAudio } from './useGameAudio';

export function useChatBubbles(
  game: Game,
  gameAudio?: ReturnType<typeof useGameAudio>  // 可选的游戏音频系统
) {
  const [activeChatBubbles, setActiveChatBubbles] = useState<Map<number, ChatMessage>>(new Map());
  const [speakingStates, setSpeakingStates] = useState<Map<number, boolean>>(new Map());
  const lastMessageIdRef = useRef<string | null>(null);

  // 初始化语音功能（某些浏览器需要等待voices加载）
  useEffect(() => {
    waitForVoices(() => {
      // 列出所有可用语音（用于调试）
      listAvailableVoices();
    });
  }, []);

  // 监听聊天消息并显示气泡，同时播放语音
  useEffect(() => {
    // 检查新消息的函数
    const checkNewMessages = () => {
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
        const currentLang = i18n?.language || 'zh-CN';
        const player = game?.players?.find(p => p.id === latestMessage.playerId);
        
        // 异步翻译并更新消息
        translateText(latestMessage.content, currentLang).then(translatedContent => {
          // 创建翻译后的消息
          const translatedMessage: ChatMessage = {
            ...latestMessage,
            content: translatedContent,
            originalContent: latestMessage.content // 保存原文
          };
          
          // 如果启用语音，播放聊天语音（使用翻译后的内容）
          if (player?.voiceConfig) {
            // 对骂消息使用更大的音量（1.5倍），但语速保持正常
            const voiceConfigForTaunt = translatedMessage.type === 'taunt' 
              ? { 
                  ...player.voiceConfig, 
                  volume: Math.min(1.0, (player.voiceConfig.volume || 1.0) * 1.5) // 提高音量1.5倍，但不超过1.0
                }
              : player.voiceConfig;
            
            
            // 使用 voiceService 播放语音（它内部使用 ttsAudioService，支持多声道）
            // 注意：不再同时调用 gameAudio.handleChatMessage，避免重复播放
            // 根据消息类型确定优先级：3=对骂，2=事件，1=随机
            const priority = translatedMessage.type === 'taunt' ? 3 : 
                           translatedMessage.type === 'event' ? 2 : 1;
            voiceService.speak(
              translatedContent,
              voiceConfigForTaunt,
              priority,
              translatedMessage.playerId,
              {
                onStart: () => {
                  // 语音开始，同时显示气泡和设置播放状态（确保同步）
                  setActiveChatBubbles(prev => {
                    const newMap = new Map(prev);
                    newMap.set(translatedMessage.playerId, translatedMessage);
                    return newMap;
                  });
                  setSpeakingStates(prev => {
                    const newMap = new Map(prev);
                    newMap.set(translatedMessage.playerId, true);
                    return newMap;
                  });
                },
                onEnd: () => {
                  // 语音结束，标记为不播放状态（触发淡出）
                  setSpeakingStates(prev => {
                    const newMap = new Map(prev);
                    newMap.set(translatedMessage.playerId, false);
                    return newMap;
                  });
                },
                onError: (error) => {
                  // 播放失败，立即隐藏（不等待）
                  setSpeakingStates(prev => {
                    const newMap = new Map(prev);
                    newMap.set(translatedMessage.playerId, false);
                    return newMap;
                  });
                }
              }
            ).catch(err => {
              // 失败后立即隐藏（不等待）
              setSpeakingStates(prev => {
                const newMap = new Map(prev);
                newMap.set(translatedMessage.playerId, false);
                return newMap;
              });
            });
          } else {
            // 没有语音配置，直接显示气泡，2秒后自动隐藏
            setActiveChatBubbles(prev => {
              const newMap = new Map(prev);
              newMap.set(translatedMessage.playerId, translatedMessage);
              return newMap;
            });
            setTimeout(() => {
              setSpeakingStates(prev => {
                const newMap = new Map(prev);
                newMap.set(translatedMessage.playerId, false);
                return newMap;
              });
            }, 2000);
          }
        }).catch(err => {
          // 翻译失败，使用原文
          
          if (player?.voiceConfig) {
            // 对骂消息使用更大的音量（1.5倍），但语速保持正常
            const voiceConfigForTaunt = latestMessage.type === 'taunt' 
              ? { 
                  ...player.voiceConfig, 
                  volume: Math.min(1.0, (player.voiceConfig.volume || 1.0) * 1.5) // 提高音量1.5倍，但不超过1.0
                }
              : player.voiceConfig;
            
          // 播放语音，传入事件回调
          // 根据消息类型确定优先级：3=对骂，2=事件，1=随机
          const priority = latestMessage.type === 'taunt' ? 3 : 
                         latestMessage.type === 'event' ? 2 : 1;
          voiceService.speak(
            latestMessage.content,
            voiceConfigForTaunt,
            priority,
            latestMessage.playerId,
            {
                onStart: () => {
                  // 语音开始，同时显示气泡和设置播放状态（确保同步）
                  setActiveChatBubbles(prev => {
                    const newMap = new Map(prev);
                    newMap.set(latestMessage.playerId, latestMessage);
                    return newMap;
                  });
                  setSpeakingStates(prev => {
                    const newMap = new Map(prev);
                    newMap.set(latestMessage.playerId, true);
                    return newMap;
                  });
                },
                onEnd: () => {
                  // 语音结束，标记为不播放状态（触发淡出）
                  setSpeakingStates(prev => {
                    const newMap = new Map(prev);
                    newMap.set(latestMessage.playerId, false);
                    return newMap;
                  });
                },
                onError: (error) => {
                  // 播放失败，立即隐藏（不等待）
                  setSpeakingStates(prev => {
                    const newMap = new Map(prev);
                    newMap.set(latestMessage.playerId, false);
                    return newMap;
                  });
                }
              }
            ).catch(err => {
              // 失败后立即隐藏（不等待）
              setSpeakingStates(prev => {
                const newMap = new Map(prev);
                newMap.set(latestMessage.playerId, false);
                return newMap;
              });
            });
          } else {
            // 没有语音配置，直接显示气泡，2秒后自动隐藏
            setActiveChatBubbles(prev => {
              const newMap = new Map(prev);
              newMap.set(latestMessage.playerId, latestMessage);
              return newMap;
            });
            setTimeout(() => {
              setSpeakingStates(prev => {
                const newMap = new Map(prev);
                newMap.set(latestMessage.playerId, false);
                return newMap;
              });
            }, 2000);
          }
        });
      }
    };

    // 立即检查一次
    checkNewMessages();

    // 设置轮询，每500ms检查一次新消息（确保不会错过消息）
    const interval = setInterval(checkNewMessages, 500);

    return () => {
      clearInterval(interval);
    };
  }, [game.players, game.currentPlayerIndex]);

  // 定期触发随机闲聊
  useEffect(() => {
    if (game.status !== GameStatus.PLAYING) return;

    const interval = setInterval(() => {
      // 随机选择一个玩家进行闲聊
      const activePlayers = game.players.filter(p => p.hand.length > 0);
      if (activePlayers.length > 0 && Math.random() < 0.3) {
        const randomPlayer = activePlayers[Math.floor(Math.random() * activePlayers.length)];
        // 传递完整的游戏状态给大模型（转换为兼容格式）
        const fullGameState = {
          status: game.status,
          players: game.players,
          currentPlayerIndex: game.currentPlayerIndex,
          winner: game.winner,
          playerCount: game.playerCount,
          finishOrder: game.finishOrder,
          finalRankings: game.finalRankings,
          rounds: game.rounds,
          currentRoundIndex: game.currentRoundIndex,
          gameRecord: game.gameRecord,
          initialHands: game.initialHands
        };
        triggerRandomChat(randomPlayer, 0.5, undefined, fullGameState).then(chatMessage => {
          if (chatMessage) {
            setActiveChatBubbles(prev => {
              const newMap = new Map(prev);
              newMap.set(chatMessage.playerId, chatMessage);
              return newMap;
            });
          }
        }).catch(err => {
        });
      }
    }, 8000); // 每8秒检查一次

    return () => clearInterval(interval);
  }, [game.status, game.players]);

  // 移除聊天气泡
  const removeChatBubble = useCallback((playerId: number) => {
    setActiveChatBubbles(prev => {
      const newMap = new Map(prev);
      newMap.delete(playerId);
      return newMap;
    });
    setSpeakingStates(prev => {
      const newMap = new Map(prev);
      newMap.delete(playerId);
      return newMap;
    });
  }, []);

  // 计算玩家聊天气泡位置
  const getPlayerBubblePosition = useMemo(() => {
    return (playerId: number): React.CSSProperties => {
      const humanPlayer = game.players.find(p => p.isHuman);
      const isHuman = humanPlayer?.id === playerId;
      
      if (isHuman) {
        // 人类玩家在底部左侧，避免挡住手牌和出牌按钮
        return { bottom: '450px', left: '10%', transform: 'translateX(0)' };
      } else {
        // AI玩家在上方，根据玩家索引计算位置
        const aiPlayers = game.players.filter(p => !p.isHuman);
        const playerIndex = aiPlayers.findIndex(p => p.id === playerId);
        const totalAiPlayers = aiPlayers.length;
        const position = (playerIndex + 1) / (totalAiPlayers + 1) * 100;
        return { top: '80px', left: `${position}%`, transform: 'translateX(-50%)' };
      }
    };
  }, [game.players]);

  return {
    activeChatBubbles,
    speakingStates,  // 新增：播放状态
    removeChatBubble,
    getPlayerBubblePosition
  };
}

