import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Play, GameStatus, Player, PlayerType, Rank, RoundPlayRecord, RoundRecord } from '../types/card';
import { dealCards, canPlayCards, canBeat, hasPlayableCards, findPlayableCards, calculateCardsScore, isScoreCard, calculateDunCount, calculateDunScore } from '../utils/cardUtils';
import { aiChoosePlay, AIConfig } from '../utils/aiPlayer';
import { speakPlay, speakPass } from '../utils/speechUtils';
import { generateRandomVoiceConfig } from '../services/voiceConfigService';
import { triggerScoreStolenReaction, triggerScoreEatenCurseReaction, triggerFinishFirstReaction, triggerFinishMiddleReaction, clearChatMessages } from '../services/chatService';
import { findNextActivePlayer, checkGameFinished, MultiPlayerGameState } from '../utils/gameStateUtils';
import { handleDunScoring, createPlayRecord, updatePlayerAfterPlay, triggerGoodPlayReactions } from '../utils/playManager';

// 游戏完整记录（用于保存）
export interface GameRecord {
  gameId: string; // 游戏唯一ID
  startTime: number; // 游戏开始时间
  endTime?: number; // 游戏结束时间
  playerCount: number; // 玩家数量
  initialHands: Card[][]; // 初始手牌（按玩家顺序）
  allRounds: RoundRecord[]; // 所有轮次的记录
  finishOrder: number[]; // 玩家出完牌的顺序
  finalRankings: any[]; // 最终排名
  winner: number; // 获胜者ID
}

// MultiPlayerGameState 已移动到 gameStateUtils.ts

export interface GameConfig {
  playerCount: number; // 4-8人
  humanPlayerIndex: number; // 人类玩家在players数组中的索引
  aiConfigs: { 
    apiKey?: string; // 不需要API Key（OpenAI已禁用）
    strategy?: 'aggressive' | 'conservative' | 'balanced';
    algorithm?: 'simple' | 'mcts';
    mctsIterations?: number;
  }[];
}

export function useMultiPlayerGame() {
  const [gameState, setGameState] = useState<MultiPlayerGameState>({
    status: GameStatus.WAITING,
    players: [],
    currentPlayerIndex: 0,
    lastPlay: null,
    lastPlayPlayerIndex: null,
    winner: null,
    playerCount: 0,
    totalScore: 0,
    roundScore: 0,
    currentRoundPlays: [],
      roundNumber: 1,
      finishOrder: []
  });

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // 辅助函数已移动到 gameStateUtils.ts

  // AI自动出牌（下一个回合）
  const playNextTurn = useCallback(async () => {
    const currentState = gameStateRef.current;
    if (currentState.status !== GameStatus.PLAYING) return;

    const currentPlayer = currentState.players[currentState.currentPlayerIndex];
    if (!currentPlayer) return;
    
    // 如果当前玩家已经出完牌了，跳过到下一个玩家
    if (currentPlayer.hand.length === 0) {
      setGameState(prev => {
        if (prev.status !== GameStatus.PLAYING) return prev;
        
        const nextPlayerIndex = findNextActivePlayer(prev.currentPlayerIndex, prev.players, prev.playerCount);
        
        return {
          ...prev,
          currentPlayerIndex: nextPlayerIndex
        };
      });
      
      // 递归调用，处理下一个玩家
      setTimeout(() => {
        playNextTurn();
      }, 100);
      return;
    }
    
    if (currentPlayer.type !== PlayerType.AI) return;
    if (!currentPlayer.aiConfig) return;

    try {
      // 准备完全信息模式的配置
      const aiConfigWithContext = {
        ...currentPlayer.aiConfig,
        perfectInformation: true, // 启用完全信息模式（"作弊"模式）
        allPlayerHands: currentState.players.map(p => [...p.hand]), // 所有玩家的手牌
        currentRoundScore: currentState.roundScore || 0, // 当前轮次累计分数
        playerCount: currentState.playerCount // 玩家总数
      };
      
      const aiCards = await aiChoosePlay(
        currentPlayer.hand,
        currentState.lastPlay,
        aiConfigWithContext
      );

      // 检查 AI 是否有能打过的牌（强制出牌规则）
      const hasPlayable = hasPlayableCards(currentPlayer.hand, currentState.lastPlay);
      
      if (!aiCards || aiCards.length === 0) {
        // AI要不起 - 但需要验证是否真的没有能打过的牌
        if (hasPlayable && currentState.lastPlay) {
          // 如果有能打过的牌但没有选择，强制选择最小的能打过的牌
          const allPlayable = findPlayableCards(currentPlayer.hand, currentState.lastPlay);
          if (allPlayable.length > 0) {
            // 选择第一个能打过的牌（AI应该选择，这里作为fallback）
            const fallbackCards = allPlayable[0];
            const fallbackPlay = canPlayCards(fallbackCards);
            if (fallbackPlay) {
              // 使用fallback出牌
              setGameState(prev => {
                if (prev.status !== GameStatus.PLAYING) return prev;
                if (prev.currentPlayerIndex !== currentState.currentPlayerIndex) return prev;

                const player = prev.players[currentState.currentPlayerIndex];
                if (!player) return prev;

                // 计算这手牌的分值
                const fallbackScore = calculateCardsScore(fallbackCards);
                
                // 处理墩的计分
                const { updatedPlayers: playersAfterDun, dunScore } = handleDunScoring(
                  prev.players,
                  currentState.currentPlayerIndex,
                  fallbackCards,
                  prev.playerCount,
                  fallbackPlay
                );
                
                // 更新玩家手牌和分数
                const updatedPlayer = updatePlayerAfterPlay(player, fallbackCards, dunScore);
                const newPlayers = [...playersAfterDun];
                newPlayers[currentState.currentPlayerIndex] = updatedPlayer;

        // 播放出牌语音提示（异步，不阻塞状态更新）
        // 注意：这里不等待，因为会在状态更新后统一处理

                if (updatedPlayer.hand.length === 0) {
          // 玩家出完牌，记录到完成顺序
          const newFinishOrder = [...(prev.finishOrder || []), currentState.currentPlayerIndex];
          
          // 把轮次分数给获胜者（包括当前这一手的分牌）
                  const finalScore = (player.score || 0) + prev.roundScore + fallbackScore;
                  newPlayers[currentState.currentPlayerIndex] = {
                    ...newPlayers[currentState.currentPlayerIndex],
                    score: finalScore
                  };
          
          // 检查是否只剩下一个玩家还没出完（即最后一个玩家）
          const remainingPlayers = newPlayers.filter(p => p.hand.length > 0);
          
          // 如果只剩下一个玩家还没出完，那就是最后一名，立即结束游戏
          if (remainingPlayers.length === 1) {
            const lastPlayerIndex = remainingPlayers[0].id;
            const lastPlayer = newPlayers[lastPlayerIndex];
            
            // 计算最后一名手中的分牌分数
            const lastPlayerScoreCards = lastPlayer.hand.filter(card => isScoreCard(card));
            const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);
            
            // 最后一名减去未出分牌的分数
            newPlayers[lastPlayerIndex] = {
              ...lastPlayer,
              score: (lastPlayer.score || 0) - lastPlayerRemainingScore
            };
            
            // 找到第二名（finishOrder中的第二个，即索引1）
            if (newFinishOrder.length >= 2) {
              const secondPlayerIndex = newFinishOrder[1];
              const secondPlayer = newPlayers[secondPlayerIndex];
              if (secondPlayer) {
                // 第二名加上最后一名未出的分牌分数
                newPlayers[secondPlayerIndex] = {
                  ...secondPlayer,
                  score: (secondPlayer.score || 0) + lastPlayerRemainingScore
                };
              }
            }
            
            // 最后一个玩家也出完了，游戏结束
            const gameFinished = checkGameFinished(prev, newPlayers, newFinishOrder);
            if (gameFinished) {
              return gameFinished;
            }
          }
          
          // 检查是否所有玩家都出完了
          const gameFinished = checkGameFinished(prev, newPlayers, newFinishOrder);
          if (gameFinished) {
            return gameFinished;
          }
          
          // 还没全部出完，找到下一个还在游戏中的玩家（接风）
          const nextPlayerIndex = findNextActivePlayer(currentState.currentPlayerIndex, newPlayers, prev.playerCount);
          
          // AI出完牌后，如果最后一手牌没人能打过，应该由下家接风出牌（清空lastPlay）
          // 检查是否所有剩余玩家都要不起这一手牌
          let allCannotBeat = true;
          for (let i = 0; i < newPlayers.length; i++) {
            if (newPlayers[i].hand.length > 0 && i !== currentState.currentPlayerIndex) {
              // 检查这个玩家是否有能打过当前牌的牌
              const hasPlayable = hasPlayableCards(newPlayers[i].hand, fallbackPlay);
              if (hasPlayable) {
                allCannotBeat = false;
                break;
              }
            }
          }
          
          const playRecord: RoundPlayRecord = {
              playerId: currentState.currentPlayerIndex,
              playerName: player.name,
              cards: fallbackCards,
              scoreCards: fallbackCards.filter(card => isScoreCard(card)),
              score: fallbackScore
          };
          
          // 如果所有人都要不起，或者当前玩家已经出完牌，由下家接风出牌
          // 接风：清空lastPlay，让下家自由出牌
          const newState = {
                    ...prev,
                    players: newPlayers,
                    currentPlayerIndex: nextPlayerIndex,
                    lastPlay: allCannotBeat ? null : fallbackPlay, // 如果所有人都要不起，清空lastPlay（接风）
                    lastPlayPlayerIndex: allCannotBeat ? null : currentState.currentPlayerIndex, // 接风时清空lastPlayPlayerIndex
            roundScore: allCannotBeat ? 0 : (prev.roundScore + fallbackScore), // 如果接风，分数已经给玩家了，重置轮次分数
            currentRoundPlays: allCannotBeat ? [] : [...(prev.currentRoundPlays || []), playRecord], // 如果接风，清空当前轮次记录
            finishOrder: newFinishOrder
                  };
          
          // 如果下一个玩家是AI，等待语音播放完成后再继续
          const currentPlayerVoice = newPlayers[currentState.currentPlayerIndex]?.voiceConfig;
          if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
            speakPlay(fallbackPlay, currentPlayerVoice).then(() => {
              setTimeout(() => {
                playNextTurn();
              }, 300);
            }).catch(() => {
              setTimeout(() => {
                playNextTurn();
              }, 1000);
            });
          } else {
            speakPlay(fallbackPlay, currentPlayerVoice).catch(console.error);
          }
          
          return newState;
        }

                const nextPlayerIndex = findNextActivePlayer(currentState.currentPlayerIndex, newPlayers, prev.playerCount);
                const newState = {
                  ...prev,
                  players: newPlayers,
                  currentPlayerIndex: nextPlayerIndex,
                  lastPlay: fallbackPlay,
                  lastPlayPlayerIndex: currentState.currentPlayerIndex,
                  roundScore: prev.roundScore + fallbackScore // 累加轮次分数
                };

                // 如果下一个玩家是AI，等待语音播放完成后再继续
                const currentPlayerVoice = newPlayers[currentState.currentPlayerIndex]?.voiceConfig;
                if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
                  speakPlay(fallbackPlay, currentPlayerVoice).then(() => {
                    setTimeout(() => {
                      playNextTurn();
                    }, 300);
                  }).catch(() => {
                    setTimeout(() => {
                      playNextTurn();
                    }, 1000);
                  });
                } else {
                  speakPlay(fallbackPlay, currentPlayerVoice).catch(console.error);
                }

                return newState;
              });
              return;
            }
          }
        }
        
        // AI真的没有能打过的牌，要不起
        setGameState(prev => {
          if (prev.status !== GameStatus.PLAYING) return prev;
          if (prev.currentPlayerIndex !== currentState.currentPlayerIndex) return prev;

          const nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.playerCount;
          let newLastPlay = prev.lastPlay;
          let newLastPlayPlayerIndex = prev.lastPlayPlayerIndex;
          let newRoundScore = prev.roundScore;
          const newPlayers = [...prev.players];
          
          // 如果一轮结束（回到最后出牌的人），把分数给最后出牌的人
          if (nextPlayerIndex === prev.lastPlayPlayerIndex) {
            if (prev.lastPlayPlayerIndex !== null && prev.roundScore > 0) {
              const lastPlayer = newPlayers[prev.lastPlayPlayerIndex];
              if (lastPlayer) {
                // 创建轮次记录
                const roundRecord: RoundRecord = {
                  roundNumber: prev.roundNumber,
                  plays: [...prev.currentRoundPlays],
                  totalScore: prev.roundScore,
                  winnerId: prev.lastPlayPlayerIndex,
                  winnerName: lastPlayer.name
                };
                
                newPlayers[prev.lastPlayPlayerIndex] = {
                  ...lastPlayer,
                  score: (lastPlayer.score || 0) + prev.roundScore,
                  wonRounds: [...(lastPlayer.wonRounds || []), roundRecord]
                };
                
                // 保存轮次记录到allRounds
                const updatedAllRounds = [...(prev.allRounds || []), roundRecord];
                
                // 一轮结束，由赢家开始下一轮
                const winnerIndex = prev.lastPlayPlayerIndex; // 赢家索引
                // 确保赢家还没有出完牌，如果出完了，找下一个还在游戏中的玩家
                const nextPlayerIndex = newPlayers[winnerIndex]?.hand.length > 0 
                  ? winnerIndex 
                  : findNextActivePlayer(winnerIndex, newPlayers, prev.playerCount);
                const newState = {
                  ...prev,
                  players: newPlayers,
                  currentPlayerIndex: nextPlayerIndex, // 由赢家（或下一个还在游戏中的玩家）开始下一轮
                  lastPlay: null, // 新轮次，清空lastPlay
                  lastPlayPlayerIndex: null, // 新轮次，清空lastPlayPlayerIndex
                  roundScore: 0, // 新轮次，重置分数
                  currentRoundPlays: [], // 新轮次，清空当前轮次出牌记录
                  roundNumber: prev.roundNumber + 1, // 新轮次
                  allRounds: updatedAllRounds,
                  gameRecord: prev.gameRecord ? {
                    ...prev.gameRecord,
                    allRounds: updatedAllRounds
                  } : prev.gameRecord
                };
                
                // 如果赢家是AI，自动出牌开始下一轮
                const winnerVoice = newPlayers[winnerIndex]?.voiceConfig;
                if (newPlayers[winnerIndex].type === PlayerType.AI) {
                  speakPass(winnerVoice).then(() => {
                    setTimeout(() => {
                      playNextTurn();
                    }, 500); // 给一点时间让用户看到轮次切换
                  }).catch(() => {
                    setTimeout(() => {
                      playNextTurn();
                    }, 1000);
                  });
                } else {
                  speakPass(winnerVoice).catch(console.error);
                }
                
                return newState;
              }
            }
            newLastPlay = null as Play | null;
            newLastPlayPlayerIndex = null;
            newRoundScore = 0; // 重置轮次分数
          }

          const newState = {
            ...prev,
            players: newPlayers,
            currentPlayerIndex: nextPlayerIndex,
            lastPlay: newLastPlay,
            lastPlayPlayerIndex: newLastPlayPlayerIndex,
            roundScore: newRoundScore,
            currentRoundPlays: nextPlayerIndex === prev.lastPlayPlayerIndex ? [] : prev.currentRoundPlays, // 重置或保持
            roundNumber: nextPlayerIndex === prev.lastPlayPlayerIndex ? prev.roundNumber + 1 : prev.roundNumber // 新轮次
          };

          // 如果下一个玩家是AI，等待"要不起"语音播放完成后再继续
          const currentPlayerVoice = prev.players[prev.currentPlayerIndex]?.voiceConfig;
          if (prev.players[nextPlayerIndex].type === PlayerType.AI) {
            speakPass(currentPlayerVoice).then(() => {
              setTimeout(() => {
                playNextTurn();
              }, 300);
            }).catch(() => {
            setTimeout(() => {
              playNextTurn();
            }, 1000);
            });
          } else {
            speakPass(currentPlayerVoice).catch(console.error);
          }

          return newState;
        });
        return;
      }

      const play = canPlayCards(aiCards);
      if (!play) {
        setGameState(prev => {
          if (prev.status !== GameStatus.PLAYING) return prev;
          const nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.playerCount;
          let newLastPlay = prev.lastPlay;
          let newLastPlayPlayerIndex = prev.lastPlayPlayerIndex;
          let newRoundScore = prev.roundScore;
          const newPlayers = [...prev.players];
          
          // 如果一轮结束（回到最后出牌的人），把分数给最后出牌的人
          if (nextPlayerIndex === prev.lastPlayPlayerIndex) {
            if (prev.lastPlayPlayerIndex !== null && prev.roundScore > 0) {
              const lastPlayer = newPlayers[prev.lastPlayPlayerIndex];
              if (lastPlayer) {
                // 创建轮次记录
                const roundRecord: RoundRecord = {
                  roundNumber: prev.roundNumber,
                  plays: [...prev.currentRoundPlays],
                  totalScore: prev.roundScore,
                  winnerId: prev.lastPlayPlayerIndex,
                  winnerName: lastPlayer.name
                };
                
                newPlayers[prev.lastPlayPlayerIndex] = {
                  ...lastPlayer,
                  score: (lastPlayer.score || 0) + prev.roundScore,
                  wonRounds: [...(lastPlayer.wonRounds || []), roundRecord]
                };
                
                // 保存轮次记录到allRounds
                const updatedAllRounds = [...(prev.allRounds || []), roundRecord];
                
                // 一轮结束，由赢家开始下一轮
                const winnerIndex = prev.lastPlayPlayerIndex;
                // 确保赢家还没有出完牌，如果出完了，找下一个还在游戏中的玩家
                const nextPlayerIndex = newPlayers[winnerIndex]?.hand.length > 0 
                  ? winnerIndex 
                  : findNextActivePlayer(winnerIndex, newPlayers, prev.playerCount);
                const newState = {
                  ...prev,
                  players: newPlayers,
                  currentPlayerIndex: nextPlayerIndex, // 由赢家（或下一个还在游戏中的玩家）开始下一轮
                  lastPlay: null, // 新轮次，清空lastPlay
                  lastPlayPlayerIndex: null, // 新轮次，清空lastPlayPlayerIndex
                  roundScore: 0, // 新轮次，重置分数
                  currentRoundPlays: [], // 新轮次，清空当前轮次出牌记录
                  roundNumber: prev.roundNumber + 1, // 新轮次
                  allRounds: updatedAllRounds,
                  gameRecord: prev.gameRecord ? {
                    ...prev.gameRecord,
                    allRounds: updatedAllRounds
                  } : prev.gameRecord
                };
                
                // 如果赢家是AI，自动出牌开始下一轮
                const winnerVoice = newPlayers[winnerIndex]?.voiceConfig;
                if (newPlayers[winnerIndex].type === PlayerType.AI) {
                  speakPass(winnerVoice).then(() => {
                    setTimeout(() => {
                      playNextTurn();
                    }, 500); // 给一点时间让用户看到轮次切换
                  }).catch(() => {
                    setTimeout(() => {
                      playNextTurn();
                    }, 1000);
                  });
                } else {
                  speakPass(winnerVoice).catch(console.error);
                }
                
                return newState;
              }
            }
            newLastPlay = null as Play | null;
            newLastPlayPlayerIndex = null;
            newRoundScore = 0; // 重置轮次分数
          }
          
          return {
            ...prev,
            players: newPlayers,
            currentPlayerIndex: nextPlayerIndex,
            lastPlay: newLastPlay,
            lastPlayPlayerIndex: newLastPlayPlayerIndex,
            roundScore: newRoundScore,
            currentRoundPlays: nextPlayerIndex === prev.lastPlayPlayerIndex ? [] : prev.currentRoundPlays, // 重置或保持
            roundNumber: nextPlayerIndex === prev.lastPlayPlayerIndex ? prev.roundNumber + 1 : prev.roundNumber // 新轮次
          };
        });
        return;
      }

      // 直接更新状态出牌
      setGameState(prev => {
        if (prev.status !== GameStatus.PLAYING) return prev;
        if (prev.currentPlayerIndex !== currentState.currentPlayerIndex) return prev;

        const player = prev.players[currentState.currentPlayerIndex];
        if (!player) return prev;

        // 计算这手牌的分值（累加到轮次分数，不直接给玩家）
        const playScore = calculateCardsScore(aiCards);
        const scoreCards = aiCards.filter(card => isScoreCard(card));

        // 检查是否是墩，如果是，应用墩的计分规则
        const play = canPlayCards(aiCards);
        if (!play) {
          // 如果无法识别牌型，跳过
          return prev;
        }

        // 处理墩的计分
        const { updatedPlayers: playersAfterDun, dunScore } = handleDunScoring(
          prev.players,
          currentState.currentPlayerIndex,
          aiCards,
          prev.playerCount,
          play
        );
        
        // 更新玩家手牌和分数
        const updatedPlayer = updatePlayerAfterPlay(player, aiCards, dunScore);
        const newPlayers = [...playersAfterDun];
        newPlayers[currentState.currentPlayerIndex] = updatedPlayer;
        
        // 触发好牌反应
        triggerGoodPlayReactions(player, play, scoreCards);

        // 如果捡到了分，可能触发其他玩家的反应
        if (playScore > 0) {
          // 检查是否有其他玩家失去了分
          const lostScore = playScore;
          // 计算总轮次分数（包括当前这一手）
          const totalRoundScore = prev.roundScore + playScore;
          
          newPlayers.forEach((p, idx) => {
            if (idx !== currentState.currentPlayerIndex && p.hand.length > 0) {
              // 根据分数大小决定反应强度
              // 如果分数较大（>=5分）或总轮次分数较大（>=10分），优先触发脏话反应
              const shouldCurse = lostScore >= 5 || totalRoundScore >= 10;
              
              if (shouldCurse) {
                // 大分被吃，触发脏话（更激烈）- 80%概率
                if (Math.random() < 0.8) {
                  triggerScoreEatenCurseReaction(p, lostScore).catch(console.error);
                } else if (Math.random() < 0.3) {
                  // 20%概率普通抱怨
                  triggerScoreStolenReaction(p, lostScore).catch(console.error);
                }
              } else {
                // 小分被吃，也有一定概率触发脏话（30%），或者普通抱怨（40%）
                if (Math.random() < 0.3) {
                  triggerScoreEatenCurseReaction(p, lostScore).catch(console.error);
                } else if (Math.random() < 0.4) {
                  triggerScoreStolenReaction(p, lostScore).catch(console.error);
                }
              }
            }
          });
        }

        // 记录这一手出牌
        const playRecord: RoundPlayRecord = createPlayRecord(
          currentState.currentPlayerIndex,
          player.name,
          aiCards,
          playScore
        );

        // 播放出牌语音提示（异步，不阻塞状态更新）
        // 注意：这里不等待，因为会在状态更新后统一处理

        if (updatedPlayer.hand.length === 0) {
          // 玩家出完牌，记录到完成顺序
          const newFinishOrder = [...(prev.finishOrder || []), currentState.currentPlayerIndex];
          
          // 触发出完牌时的聊天反应
          const finishPosition = newFinishOrder.length;
          if (finishPosition === 1) {
            // 头名出完，兴奋
            triggerFinishFirstReaction(updatedPlayer).catch(console.error);
          } else {
            // 中间名次出完，感慨
            triggerFinishMiddleReaction(updatedPlayer).catch(console.error);
          }
          
          // 把轮次分数给获胜者
          const finalScore = (player.score || 0) + prev.roundScore + playScore;
          // 创建最后一轮的记录
          const finalRoundRecord: RoundRecord = {
            roundNumber: prev.roundNumber,
            plays: [...prev.currentRoundPlays, playRecord],
            totalScore: prev.roundScore + playScore,
            winnerId: currentState.currentPlayerIndex,
            winnerName: player.name
          };
          newPlayers[currentState.currentPlayerIndex] = {
            ...newPlayers[currentState.currentPlayerIndex],
            score: finalScore,
            wonRounds: [...(player.wonRounds || []), finalRoundRecord]
          };
          
          // 检查是否只剩下一个玩家还没出完（即最后一个玩家）
          const remainingPlayers = newPlayers.filter(p => p.hand.length > 0);
          
          // 如果只剩下一个玩家还没出完，那就是最后一名，立即结束游戏
          if (remainingPlayers.length === 1) {
            const lastPlayerIndex = remainingPlayers[0].id;
            const lastPlayer = newPlayers[lastPlayerIndex];
            
            // 计算最后一名手中的分牌分数
            const lastPlayerScoreCards = lastPlayer.hand.filter(card => isScoreCard(card));
            const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);
            
            // 最后一名减去未出分牌的分数
            newPlayers[lastPlayerIndex] = {
              ...lastPlayer,
              score: (lastPlayer.score || 0) - lastPlayerRemainingScore
            };
            
            // 找到第二名（finishOrder中的第二个，即索引1）
            if (newFinishOrder.length >= 2) {
              const secondPlayerIndex = newFinishOrder[1];
              const secondPlayer = newPlayers[secondPlayerIndex];
              if (secondPlayer) {
                // 第二名加上最后一名未出的分牌分数
                newPlayers[secondPlayerIndex] = {
                  ...secondPlayer,
                  score: (secondPlayer.score || 0) + lastPlayerRemainingScore
                };
              }
            }
            
            // 最后一个玩家也出完了，游戏结束
            const gameFinished = checkGameFinished(prev, newPlayers, newFinishOrder);
            if (gameFinished) {
              return gameFinished;
            }
          }
          
          // 检查是否所有玩家都出完了
          const gameFinished = checkGameFinished(prev, newPlayers, newFinishOrder);
          if (gameFinished) {
            return gameFinished;
          }
          
          // 还没全部出完，找到下一个还在游戏中的玩家（接风）
          // 重要：使用findNextActivePlayer确保跳过已出完牌的玩家
          const nextPlayerIndex = findNextActivePlayer(currentState.currentPlayerIndex, newPlayers, prev.playerCount);
          
          // AI出完牌后，应该由下家接风出牌（清空lastPlay，让下家自由出牌）
          // 因为当前玩家已经出完牌，所以应该清空lastPlay，让下一个玩家自由出牌
          const newState = {
            ...prev,
            players: newPlayers,
            currentPlayerIndex: nextPlayerIndex,
            lastPlay: null, // AI出完牌后，清空lastPlay，让下家接风出牌
            lastPlayPlayerIndex: null, // 清空lastPlayPlayerIndex
            roundScore: 0, // 分数已经给玩家了，重置轮次分数
            currentRoundPlays: [], // 清空当前轮次记录
            finishOrder: newFinishOrder
          };
          
          // 如果下一个玩家是AI，等待语音播放完成后再继续
          const currentPlayerVoice = newPlayers[currentState.currentPlayerIndex]?.voiceConfig;
          if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
            // 等待语音播放完成后再继续
            speakPlay(play, currentPlayerVoice).then(() => {
              setTimeout(() => {
                playNextTurn();
              }, 300); // 语音播放完成后再等300ms
            }).catch(() => {
              // 如果语音播放失败，直接继续
              setTimeout(() => {
                playNextTurn();
              }, 1000);
            });
          } else {
            // 人类玩家，也播放语音但不等待
            speakPlay(play, currentPlayerVoice).catch(console.error);
          }
          
          return newState;
        }

        // 计算下一个玩家，跳过已出完的玩家
        const nextPlayerIndex = findNextActivePlayer(currentState.currentPlayerIndex, newPlayers, prev.playerCount);
        
        const newState = {
          ...prev,
          players: newPlayers,
          currentPlayerIndex: nextPlayerIndex,
          lastPlay: play,
          lastPlayPlayerIndex: currentState.currentPlayerIndex,
          roundScore: prev.roundScore + playScore, // 累加轮次分数
          currentRoundPlays: [...prev.currentRoundPlays, playRecord] // 记录这一手出牌
        };

        // 如果下一个玩家是AI，等待语音播放完成后再继续
        const currentPlayerVoice = newPlayers[currentState.currentPlayerIndex]?.voiceConfig;
        if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
          // 等待语音播放完成后再继续
          speakPlay(play, currentPlayerVoice).then(() => {
            setTimeout(() => {
              playNextTurn();
            }, 300); // 语音播放完成后再等300ms
          }).catch(() => {
            // 如果语音播放失败，直接继续
            setTimeout(() => {
              playNextTurn();
            }, 1000);
          });
        } else {
          // 人类玩家，也播放语音但不等待
          speakPlay(play, currentPlayerVoice).catch(console.error);
        }

        return newState;
      });
    } catch (error) {
      console.error('AI出牌失败:', error);
      setGameState(prev => {
        if (prev.status !== GameStatus.PLAYING) return prev;
        const nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.playerCount;
        let newLastPlay: Play | null = prev.lastPlay;
        let newLastPlayPlayerIndex: number | null = prev.lastPlayPlayerIndex;
        let newRoundScore = prev.roundScore;
        const newPlayers = [...prev.players];
        
        // 如果一轮结束（回到最后出牌的人），把分数给最后出牌的人
        if (nextPlayerIndex === prev.lastPlayPlayerIndex) {
          if (prev.lastPlayPlayerIndex !== null && prev.roundScore > 0) {
            const lastPlayer = newPlayers[prev.lastPlayPlayerIndex];
            if (lastPlayer) {
              newPlayers[prev.lastPlayPlayerIndex] = {
                ...lastPlayer,
                score: (lastPlayer.score || 0) + prev.roundScore
              };
            }
          }
          newLastPlay = null as Play | null;
          newLastPlayPlayerIndex = null;
          newRoundScore = 0; // 重置轮次分数
        }
        
        return {
          ...prev,
          players: newPlayers,
          currentPlayerIndex: nextPlayerIndex,
          lastPlay: newLastPlay,
          lastPlayPlayerIndex: newLastPlayPlayerIndex,
          roundScore: newRoundScore
        };
      });
    }
  }, []);

  // 开始新游戏
  const startGame = useCallback((config: GameConfig) => {
    // 清空聊天记录
    clearChatMessages();
    
    const hands = dealCards(config.playerCount);

    const players: Player[] = hands.map((hand, index) => ({
      id: index,
      name: index === config.humanPlayerIndex ? '你' : `玩家${index + 1}`,
      type: index === config.humanPlayerIndex ? PlayerType.HUMAN : PlayerType.AI,
      hand: hand,
      score: 0, // 初始分数为0
      isHuman: index === config.humanPlayerIndex,
      aiConfig: index === config.humanPlayerIndex ? undefined : {
        apiKey: '', // 不需要API Key（OpenAI已禁用）
        strategy: config.aiConfigs[index]?.strategy || 'balanced',
        algorithm: config.aiConfigs[index]?.algorithm || 'mcts', // 默认使用MCTS
        mctsIterations: config.aiConfigs[index]?.mctsIterations || 100 // 大幅降低默认值以提高速度（快速模式）
      },
      voiceConfig: generateRandomVoiceConfig(index) // 为每个玩家分配独特的语音配置（使用index确保每个玩家不同）
    }));

    // 计算总分数（所有牌中的分牌总和，用于验证）
    const totalScore = hands.reduce((sum, hand) => {
      return sum + hand.reduce((handSum, card) => {
        const cardScore = card.rank === Rank.FIVE ? 5 : (card.rank === Rank.TEN || card.rank === Rank.KING ? 10 : 0);
        return handSum + cardScore;
      }, 0);
    }, 0);

    // 随机决定谁先出牌
    const firstPlayer = Math.floor(Math.random() * config.playerCount);

    setGameState({
      status: GameStatus.PLAYING,
      players,
      currentPlayerIndex: firstPlayer,
      lastPlay: null,
      lastPlayPlayerIndex: null,
      winner: null,
      playerCount: config.playerCount,
      totalScore,
      roundScore: 0,
      currentRoundPlays: [],
      roundNumber: 1,
      finishOrder: [],
      initialHands: hands.map(hand => [...hand]), // 保存初始手牌
      allRounds: [], // 初始化所有轮次记录
      gameRecord: {
        gameId: `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        startTime: Date.now(),
        playerCount: config.playerCount,
        initialHands: hands.map(hand => [...hand]),
        allRounds: [],
        finishOrder: [],
        finalRankings: [],
        winner: -1
      }
    });

    // 如果第一个玩家是AI，自动出牌
    if (firstPlayer !== config.humanPlayerIndex) {
      setTimeout(() => {
        playNextTurn();
      }, 1000);
    }
  }, [playNextTurn]);

  // 玩家出牌
  const playerPlay = useCallback((playerIndex: number, selectedCards: Card[]): boolean => {
    setGameState(prev => {
      if (prev.status !== GameStatus.PLAYING) return prev;
      if (prev.currentPlayerIndex !== playerIndex) return prev;

      const player = prev.players[playerIndex];
      if (!player) return prev;

      const play = canPlayCards(selectedCards);
      if (!play) return prev;

      // 如果当前玩家是最后出牌的人（接风），可以自由出牌，不需要检查canBeat
      const isTakingOver = prev.currentPlayerIndex === prev.lastPlayPlayerIndex;
      
      // 如果不能压过上家的牌，立即要不起（不管手中有没有其他能打过的牌）
      // 但是，如果是接风（当前玩家是最后出牌的人），可以自由出牌
      if (!isTakingOver && prev.lastPlay && !canBeat(play, prev.lastPlay)) {
        // 执行要不起逻辑
        const nextPlayerIndex = findNextActivePlayer(playerIndex, prev.players, prev.playerCount);

        let newLastPlay: Play | null = prev.lastPlay;
        let newLastPlayPlayerIndex: number | null = prev.lastPlayPlayerIndex;
        let newRoundScore = prev.roundScore;
        const newPlayers = [...prev.players];
        
        if (nextPlayerIndex === prev.lastPlayPlayerIndex) {
          if (prev.lastPlayPlayerIndex !== null && prev.roundScore > 0) {
            const lastPlayer = newPlayers[prev.lastPlayPlayerIndex];
            if (lastPlayer) {
              const roundRecord: RoundRecord = {
                roundNumber: prev.roundNumber,
                plays: [...prev.currentRoundPlays],
                totalScore: prev.roundScore,
                winnerId: prev.lastPlayPlayerIndex,
                winnerName: lastPlayer.name
              };
              
              newPlayers[prev.lastPlayPlayerIndex] = {
                ...lastPlayer,
                score: (lastPlayer.score || 0) + prev.roundScore,
                wonRounds: [...(lastPlayer.wonRounds || []), roundRecord]
              };
              
              // 保存轮次记录到allRounds
              const updatedAllRounds = [...(prev.allRounds || []), roundRecord];
              
              // 一轮结束，由赢家开始下一轮
              const winnerIndex = prev.lastPlayPlayerIndex;
              // 确保赢家还没有出完牌，如果出完了，找下一个还在游戏中的玩家
              const nextPlayerIndex = newPlayers[winnerIndex]?.hand.length > 0 
                ? winnerIndex 
                : findNextActivePlayer(winnerIndex, newPlayers, prev.playerCount);
              const newState = {
                ...prev,
                players: newPlayers,
                currentPlayerIndex: nextPlayerIndex, // 由赢家（或下一个还在游戏中的玩家）开始下一轮
                lastPlay: null, // 新轮次，清空lastPlay
                lastPlayPlayerIndex: null, // 新轮次，清空lastPlayPlayerIndex
                roundScore: 0, // 新轮次，重置分数
                currentRoundPlays: [], // 新轮次，清空当前轮次出牌记录
                roundNumber: prev.roundNumber + 1, // 新轮次
                allRounds: updatedAllRounds,
                gameRecord: prev.gameRecord ? {
                  ...prev.gameRecord,
                  allRounds: updatedAllRounds
                } : prev.gameRecord
              };
              
              // 如果赢家是AI，自动出牌开始下一轮
              const winnerVoice = newPlayers[winnerIndex]?.voiceConfig;
              if (newPlayers[winnerIndex].type === PlayerType.AI) {
                speakPass(winnerVoice).then(() => {
                  setTimeout(() => {
                    playNextTurn();
                  }, 500); // 给一点时间让用户看到轮次切换
                }).catch(() => {
                  setTimeout(() => {
                    playNextTurn();
                  }, 1000);
                });
              } else {
                speakPass(winnerVoice).catch(console.error);
              }
              
              return newState;
            }
          }
          
          newLastPlay = null as Play | null;
          newLastPlayPlayerIndex = null;
          newRoundScore = 0;
        }

        const newState = {
          ...prev,
          players: newPlayers,
          currentPlayerIndex: nextPlayerIndex,
          lastPlay: newLastPlay,
          lastPlayPlayerIndex: newLastPlayPlayerIndex,
          roundScore: newRoundScore,
          currentRoundPlays: newLastPlay === null ? [] : prev.currentRoundPlays
        };

        // 等待"要不起"语音播放完成后再继续
        const currentPlayerVoice = newPlayers[prev.currentPlayerIndex]?.voiceConfig;
        if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
          speakPass(currentPlayerVoice).then(() => {
            setTimeout(() => {
              playNextTurn();
            }, 300);
          }).catch(() => {
            setTimeout(() => {
              playNextTurn();
            }, 1000);
          });
        } else {
          speakPass(currentPlayerVoice).catch(console.error);
        }

        return newState;
      }

      // 计算这手牌的分值（累加到轮次分数，不直接给玩家）
      const playScore = calculateCardsScore(selectedCards);
      const scoreCards = selectedCards.filter(card => isScoreCard(card));

      // 处理墩的计分
      const { updatedPlayers: playersAfterDun, dunScore } = handleDunScoring(
        prev.players,
        playerIndex,
        selectedCards,
        prev.playerCount,
        play
      );
      
      // 更新玩家手牌和分数
      const updatedPlayer = updatePlayerAfterPlay(player, selectedCards, dunScore);
      const newPlayers = [...playersAfterDun];
      newPlayers[playerIndex] = updatedPlayer;
      
      // 触发好牌反应
      triggerGoodPlayReactions(player, play, scoreCards);
      
      // 如果捡到了分，可能触发其他玩家的反应
      if (playScore > 0) {
        // 检查是否有其他玩家失去了分
        const lostScore = playScore;
        // 计算总轮次分数（包括当前这一手）
        const totalRoundScore = prev.roundScore + playScore;
        
        newPlayers.forEach((p, idx) => {
          if (idx !== playerIndex && p.hand.length > 0) {
            // 根据分数大小决定反应强度
            // 如果分数较大（>=5分）或总轮次分数较大（>=10分），优先触发脏话反应
            const shouldCurse = lostScore >= 5 || totalRoundScore >= 10;
            
            if (shouldCurse) {
              // 大分被吃，触发脏话（更激烈）- 80%概率
              if (Math.random() < 0.8) {
                triggerScoreEatenCurseReaction(p, lostScore).catch(console.error);
              } else if (Math.random() < 0.3) {
                // 20%概率普通抱怨
                triggerScoreStolenReaction(p, lostScore).catch(console.error);
              }
            } else {
              // 小分被吃，也有一定概率触发脏话（30%），或者普通抱怨（40%）
              if (Math.random() < 0.3) {
                triggerScoreEatenCurseReaction(p, lostScore).catch(console.error);
              } else if (Math.random() < 0.4) {
                triggerScoreStolenReaction(p, lostScore).catch(console.error);
              }
            }
          }
        });
      }

      // 记录这一手出牌
      const playRecord: RoundPlayRecord = {
        playerId: playerIndex,
        playerName: player.name,
        cards: selectedCards,
        scoreCards: scoreCards,
        score: playScore
      };

      // updatedPlayer已经在第937行设置到newPlayers[playerIndex]了
      // 这里不需要重复设置

      // 语音会在状态更新后统一处理

      // 检查是否获胜
      if (updatedPlayer.hand.length === 0) {
        // 玩家出完牌，记录到完成顺序
        const newFinishOrder = [...(prev.finishOrder || []), playerIndex];
        
        // 触发出完牌时的聊天反应
        const finishPosition = newFinishOrder.length;
        if (finishPosition === 1) {
          // 头名出完，兴奋
          triggerFinishFirstReaction(updatedPlayer).catch(console.error);
        } else {
          // 中间名次出完，感慨
          triggerFinishMiddleReaction(updatedPlayer).catch(console.error);
        }
        
        // 先把轮次分数加上（包括当前这一手的分牌）
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          score: (newPlayers[playerIndex].score || 0) + prev.roundScore + playScore
        };
        
        // 检查是否所有玩家都出完了（包括当前玩家）
        const remainingPlayers = newPlayers.filter(p => p.hand.length > 0);
        
        // 如果只剩下一个玩家还没出完，那就是最后一名
        if (remainingPlayers.length === 1) {
          // 最后一个玩家，立即结束游戏
          // 最后一个玩家的手牌中的分牌要给第二名
          const lastPlayerIndex = remainingPlayers[0].id;
          const lastPlayer = newPlayers[lastPlayerIndex];
          
          // 计算最后一名手中的分牌分数
          const lastPlayerScoreCards = lastPlayer.hand.filter(card => isScoreCard(card));
          const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);
          
          // 最后一名减去未出分牌的分数
          newPlayers[lastPlayerIndex] = {
            ...lastPlayer,
            score: (lastPlayer.score || 0) - lastPlayerRemainingScore
          };
          
          // 找到第二名（finishOrder中的第二个，即索引1）
          if (newFinishOrder.length >= 2) {
            const secondPlayerIndex = newFinishOrder[1];
            const secondPlayer = newPlayers[secondPlayerIndex];
            if (secondPlayer) {
              // 第二名加上最后一名未出的分牌分数
              newPlayers[secondPlayerIndex] = {
                ...secondPlayer,
                score: (secondPlayer.score || 0) + lastPlayerRemainingScore
              };
            }
          }
          
          // 最后一个玩家也出完了，游戏结束
          const gameFinished = checkGameFinished(prev, newPlayers, newFinishOrder);
          if (gameFinished) {
            return gameFinished;
          }
        }
        
        // 检查是否所有玩家都出完了
        const gameFinished = checkGameFinished(prev, newPlayers, newFinishOrder);
        if (gameFinished) {
          return gameFinished;
        }
        
        // 还没全部出完，找到下一个还在游戏中的玩家（接风）
        // 重要：使用findNextActivePlayer确保跳过已出完牌的玩家
        const nextPlayerIndex = findNextActivePlayer(playerIndex, newPlayers, prev.playerCount);
        
        // 玩家出完牌后，应该由下家接风出牌（清空lastPlay，让下家自由出牌）
        // 因为当前玩家已经出完牌，所以应该清空lastPlay，让下一个玩家自由出牌
        const newState = {
          ...prev,
          players: newPlayers,
          currentPlayerIndex: nextPlayerIndex,
          lastPlay: null, // 玩家出完牌后，清空lastPlay，让下家接风出牌
          lastPlayPlayerIndex: null, // 清空lastPlayPlayerIndex
          roundScore: 0, // 分数已经给玩家了，重置轮次分数
          currentRoundPlays: [], // 清空当前轮次记录
          finishOrder: newFinishOrder
        };
        
        // 播放语音，然后自动继续（无论下一个是AI还是人类，都自动继续）
        const currentPlayerVoice = newPlayers[playerIndex]?.voiceConfig;
        speakPlay(play, currentPlayerVoice).then(() => {
          // 如果下一个玩家是AI，自动出牌
          if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
            setTimeout(() => {
              playNextTurn();
            }, 300);
          }
          // 如果下一个是人类玩家，也自动继续（因为人类已经出完牌了，应该让AI继续）
          // 实际上，如果人类出完牌，下一个应该是AI，所以这里应该不会执行
        }).catch(() => {
          // 如果语音播放失败，直接继续
          if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
            setTimeout(() => {
              playNextTurn();
            }, 1000);
          }
        });
        
        return newState;
      }

      // 计算下一个玩家，跳过已出完的玩家
      const nextPlayerIndex = findNextActivePlayer(playerIndex, newPlayers, prev.playerCount);

      // 检查是否一轮结束（回到最后出牌的人）
      if (nextPlayerIndex === prev.lastPlayPlayerIndex) {
        // 一轮结束，把分数给最后出牌的人
        if (prev.lastPlayPlayerIndex !== null && prev.roundScore + playScore > 0) {
          const lastPlayer = newPlayers[prev.lastPlayPlayerIndex];
          if (lastPlayer) {
            // 创建轮次记录（包含当前这一手出牌）
            const roundRecord: RoundRecord = {
              roundNumber: prev.roundNumber,
              plays: [...(prev.currentRoundPlays || []), playRecord],
              totalScore: prev.roundScore + playScore,
              winnerId: prev.lastPlayPlayerIndex,
              winnerName: lastPlayer.name
            };
            
            newPlayers[prev.lastPlayPlayerIndex] = {
              ...lastPlayer,
              score: (lastPlayer.score || 0) + prev.roundScore + playScore,
              wonRounds: [...(lastPlayer.wonRounds || []), roundRecord]
            };
            
            // 保存轮次记录到allRounds
            const updatedAllRounds = [...(prev.allRounds || []), roundRecord];
            
            // 一轮结束，由赢家开始下一轮
            const winnerIndex = prev.lastPlayPlayerIndex;
            const newState = {
              ...prev,
              players: newPlayers,
              currentPlayerIndex: winnerIndex, // 由赢家开始下一轮
              lastPlay: null, // 新轮次，清空lastPlay
              lastPlayPlayerIndex: null, // 新轮次，清空lastPlayPlayerIndex
              roundScore: 0, // 新轮次，重置分数
              currentRoundPlays: [], // 新轮次，清空当前轮次出牌记录
              roundNumber: prev.roundNumber + 1, // 新轮次
              allRounds: updatedAllRounds,
              gameRecord: prev.gameRecord ? {
                ...prev.gameRecord,
                allRounds: updatedAllRounds
              } : prev.gameRecord
            };
            
            // 如果赢家是AI，自动出牌开始下一轮
            const winnerVoice = newPlayers[winnerIndex]?.voiceConfig;
            if (newPlayers[winnerIndex].type === PlayerType.AI) {
              speakPlay(play, winnerVoice).then(() => {
                setTimeout(() => {
                  playNextTurn();
                }, 500); // 给一点时间让用户看到轮次切换
              }).catch(() => {
                setTimeout(() => {
                  playNextTurn();
                }, 1000);
              });
            } else {
              speakPlay(play, winnerVoice).catch(console.error);
            }
            
            return newState;
          }
        }
        
        // 即使没有分数，也要开始下一轮
        const winnerIndex = prev.lastPlayPlayerIndex;
        // 确保赢家还没有出完牌，如果出完了，找下一个还在游戏中的玩家
        const nextPlayerIndex = newPlayers[winnerIndex]?.hand.length > 0 
          ? winnerIndex 
          : findNextActivePlayer(winnerIndex, newPlayers, prev.playerCount);
        const newState = {
          ...prev,
          players: newPlayers,
          currentPlayerIndex: nextPlayerIndex, // 由赢家（或下一个还在游戏中的玩家）开始下一轮
          lastPlay: null, // 新轮次，清空lastPlay
          lastPlayPlayerIndex: null, // 新轮次，清空lastPlayPlayerIndex
          roundScore: 0, // 新轮次，重置分数
          currentRoundPlays: [], // 新轮次，清空当前轮次出牌记录
          roundNumber: prev.roundNumber + 1, // 新轮次
        };
        
        // 如果赢家是AI，自动出牌开始下一轮
        const winnerVoice = newPlayers[winnerIndex]?.voiceConfig;
        if (newPlayers[winnerIndex].type === PlayerType.AI) {
          speakPlay(play, winnerVoice).then(() => {
            setTimeout(() => {
              playNextTurn();
            }, 500);
          }).catch(() => {
            setTimeout(() => {
              playNextTurn();
            }, 1000);
          });
        } else {
          speakPlay(play, winnerVoice).catch(console.error);
        }
        
        return newState;
      }

      const newState = {
        ...prev,
        players: newPlayers,
        currentPlayerIndex: nextPlayerIndex,
        lastPlay: play,
        lastPlayPlayerIndex: playerIndex,
        roundScore: prev.roundScore + playScore, // 累加轮次分数
        currentRoundPlays: [...(prev.currentRoundPlays || []), playRecord] // 记录这一手出牌
      };

      // 如果下一个玩家是AI，等待语音播放完成后再继续
      const currentPlayerVoice = newPlayers[playerIndex]?.voiceConfig;
      if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
        speakPlay(play, currentPlayerVoice).then(() => {
          setTimeout(() => {
            playNextTurn();
          }, 300);
        }).catch(() => {
          setTimeout(() => {
            playNextTurn();
          }, 1000);
        });
      } else {
        speakPlay(play, currentPlayerVoice).catch(console.error);
      }

      return newState;
    });

    return true;
  }, [playNextTurn]);

  // 玩家要不起（强制出牌规则：如果有能打过的牌，不能要不起）
  const playerPass = useCallback((playerIndex: number) => {
    setGameState(prev => {
      if (prev.status !== GameStatus.PLAYING) return prev;
      if (prev.currentPlayerIndex !== playerIndex) return prev;

      const player = prev.players[playerIndex];
      if (!player) return prev;
      
      // 如果玩家已经出完牌了，自动跳过到下一个玩家
      if (player.hand.length === 0) {
        // 找到下一个还在游戏中的玩家
        const nextPlayerIndex = findNextActivePlayer(playerIndex, prev.players, prev.playerCount);
        
        const newState = {
          ...prev,
          currentPlayerIndex: nextPlayerIndex
        };
        
        // 如果下一个玩家是AI，自动出牌
        if (prev.players[nextPlayerIndex].type === PlayerType.AI) {
          setTimeout(() => {
            playNextTurn();
          }, 100);
        }
        
        return newState;
      }

      // 强制出牌规则：如果有能打过的牌，不能要不起
      if (prev.lastPlay) {
        const hasPlayable = hasPlayableCards(player.hand, prev.lastPlay);
        if (hasPlayable) {
          // 有能打过的牌，不允许要不起
          return prev; // 不更新状态，保持当前状态
        }
      }

      // 播放"要不起"语音提示（异步，不阻塞状态更新）
      // 注意：会在状态更新后统一处理

      // 计算下一个玩家，跳过已出完的玩家
      const nextPlayerIndex = findNextActivePlayer(playerIndex, prev.players, prev.playerCount);

      // 如果下一个玩家是上家出牌的人，清空lastPlay，并把轮次分数给最后出牌的人
      let newLastPlay = prev.lastPlay;
      let newLastPlayPlayerIndex = prev.lastPlayPlayerIndex;
      let newRoundScore = prev.roundScore;
      const newPlayers = [...prev.players];
      
      if (nextPlayerIndex === prev.lastPlayPlayerIndex) {
        // 一轮结束，把分数给最后出牌的人
        if (prev.lastPlayPlayerIndex !== null && prev.roundScore > 0) {
          const lastPlayer = newPlayers[prev.lastPlayPlayerIndex];
          if (lastPlayer) {
            // 创建轮次记录
            const roundRecord: RoundRecord = {
              roundNumber: prev.roundNumber,
              plays: [...prev.currentRoundPlays],
              totalScore: prev.roundScore,
              winnerId: prev.lastPlayPlayerIndex,
              winnerName: lastPlayer.name
            };
            
            newPlayers[prev.lastPlayPlayerIndex] = {
              ...lastPlayer,
              score: (lastPlayer.score || 0) + prev.roundScore,
              wonRounds: [...(lastPlayer.wonRounds || []), roundRecord]
            };
            
            // 保存轮次记录到allRounds
            const updatedAllRounds = [...(prev.allRounds || []), roundRecord];
            
            // 一轮结束，由赢家开始下一轮
            const winnerIndex = prev.lastPlayPlayerIndex;
            const newState = {
              ...prev,
              players: newPlayers,
              currentPlayerIndex: winnerIndex, // 由赢家开始下一轮
              lastPlay: null, // 新轮次，清空lastPlay
              lastPlayPlayerIndex: null, // 新轮次，清空lastPlayPlayerIndex
              roundScore: 0, // 新轮次，重置分数
              currentRoundPlays: [], // 新轮次，清空当前轮次出牌记录
              roundNumber: prev.roundNumber + 1, // 新轮次
              allRounds: updatedAllRounds,
              gameRecord: prev.gameRecord ? {
                ...prev.gameRecord,
                allRounds: updatedAllRounds
              } : prev.gameRecord
            };
            
            // 如果赢家是AI，自动出牌开始下一轮
            const winnerVoice = newPlayers[winnerIndex]?.voiceConfig;
            if (newPlayers[winnerIndex].type === PlayerType.AI) {
              speakPass(winnerVoice).then(() => {
                setTimeout(() => {
                  playNextTurn();
                }, 500); // 给一点时间让用户看到轮次切换
              }).catch(() => {
                setTimeout(() => {
                  playNextTurn();
                }, 1000);
              });
            } else {
              speakPass(winnerVoice).catch(console.error);
            }
            
            return newState;
          }
        }
        newLastPlay = null;
        newLastPlayPlayerIndex = null;
        newRoundScore = 0; // 重置轮次分数
      }

      const newState = {
        ...prev,
        players: newPlayers,
        currentPlayerIndex: nextPlayerIndex,
        lastPlay: newLastPlay,
        lastPlayPlayerIndex: newLastPlayPlayerIndex,
        roundScore: newRoundScore
      };

      // 如果下一个玩家是AI，等待"要不起"语音播放完成后再继续
      const currentPlayerVoice = prev.players[playerIndex]?.voiceConfig;
      if (prev.players[nextPlayerIndex].type === PlayerType.AI) {
        speakPass(currentPlayerVoice).then(() => {
          setTimeout(() => {
            playNextTurn();
          }, 300);
        }).catch(() => {
        setTimeout(() => {
          playNextTurn();
        }, 1000);
        });
      } else {
        speakPass(currentPlayerVoice).catch(console.error);
      }

      return newState;
    });
  }, [playNextTurn]);


  // 使用OpenAI辅助玩家出牌
  // 建议出牌（使用完全信息模式）
  const suggestPlay = useCallback(async (
    playerIndex: number,
    aiConfig: AIConfig
  ): Promise<Card[] | null> => {
    const currentState = gameStateRef.current;
    const player = currentState.players[playerIndex];
    if (!player) return null;

    try {
      // 准备完全信息模式的配置
      const aiConfigWithContext = {
        ...aiConfig,
        perfectInformation: true, // 启用完全信息模式（"作弊"模式）
        allPlayerHands: currentState.players.map(p => [...p.hand]), // 所有玩家的手牌
        currentRoundScore: currentState.roundScore || 0, // 当前轮次累计分数
        playerCount: currentState.playerCount // 玩家总数
      };
      
      const suggestedCards = await aiChoosePlay(
        player.hand,
        currentState.lastPlay,
        aiConfigWithContext
      );
      return suggestedCards;
    } catch (error) {
      console.error('AI建议失败:', error);
      return null;
    }
  }, []);

  // 重置游戏
  const resetGame = useCallback(() => {
    setGameState({
      status: GameStatus.WAITING,
      players: [],
      currentPlayerIndex: 0,
      lastPlay: null,
      lastPlayPlayerIndex: null,
      winner: null,
      playerCount: 0,
      totalScore: 0,
      roundScore: 0,
      currentRoundPlays: [],
      roundNumber: 1,
      finishOrder: []
    });
  }, []);

  return {
    gameState,
    startGame,
    playerPlay,
    playerPass,
    suggestPlay,
    resetGame
  };
}

