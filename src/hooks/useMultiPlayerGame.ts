import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Play, GameStatus, Player, PlayerType, Rank, RoundPlayRecord, RoundRecord } from '../types/card';
import { dealCards, canPlayCards, canBeat, hasPlayableCards, findPlayableCards, calculateCardsScore, isScoreCard } from '../utils/cardUtils';
import { aiChoosePlay, AIConfig } from '../utils/aiPlayer';
import { voiceService } from '../services/voiceService';
import { announcePlay, announcePass } from '../services/systemAnnouncementService';
import { generateRandomVoiceConfig } from '../services/voiceConfigService';
import { triggerScoreStolenReaction, triggerScoreEatenCurseReaction, triggerFinishFirstReaction, triggerFinishMiddleReaction, triggerFinishLastReaction, clearChatMessages, triggerTaunt } from '../services/chatService';
import { findNextActivePlayer, checkGameFinished, MultiPlayerGameState, checkAllRemainingPlayersPassed } from '../utils/gameStateUtils';
import { applyFinalGameRules, calculateFinalRankings } from '../utils/gameRules';
import { handleDunScoring, createPlayRecord, updatePlayerAfterPlay, triggerGoodPlayReactions } from '../utils/playManager';
import { getGameConfig } from '../config/gameConfig';
import { calculatePlayAnimationPosition } from '../utils/animationUtils';

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
  dealingAlgorithm?: 'random' | 'fair' | 'favor-human' | 'favor-ai' | 'balanced-score' | 'clustered'; // 发牌算法
  skipDealingAnimation?: boolean; // 是否跳过发牌动画
  dealingSpeed?: number; // 发牌速度（毫秒/张）
  sortOrder?: 'asc' | 'desc' | 'grouped'; // 排序规则
}

export function useMultiPlayerGame() {
  // 获取游戏配置
  const gameConfig = getGameConfig();
  const announcementDelay = gameConfig.announcementDelay;

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

  // 用于防止重复触发AI出牌的标志
  const isAITurnProcessingRef = useRef(false);
  // 用于跟踪上一次处理的玩家索引，避免重复触发
  const lastProcessedPlayerIndexRef = useRef<number | null>(null);

  // 发牌状态
  const [isDealing, setIsDealing] = useState(false);
  const [pendingGameConfig, setPendingGameConfig] = useState<GameConfig | null>(null);

  // 辅助函数已移动到 gameStateUtils.ts

  // AI自动出牌（下一个回合）
  const playNextTurn = useCallback(async () => {
    const currentState = gameStateRef.current;
    if (currentState.status !== GameStatus.PLAYING) return;

    // 检查是否正在播放语音，如果是，等待完成
    // 确保AI等待上家报牌完成后再出牌（无论上家是AI还是真人）
    // 注意：由于报牌使用speakImmediate会立即播放并中断其他语音，
    // 所以如果isSpeaking为true，很可能就是正在报牌
    if (voiceService.isCurrentlySpeaking()) {
      // 记录初始状态，用于检查游戏是否已经更新
      const initialState = gameStateRef.current;
      const initialPlayerIndex = initialState.currentPlayerIndex;
      
      // 等待语音播放完成（最多等待1秒，避免卡住）
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          // 如果语音播放完成，或者游戏状态已经更新（说明上家已经出牌），就继续
          const currentState = gameStateRef.current;
          const stateChanged = currentState.currentPlayerIndex !== initialPlayerIndex;
          
          if (!voiceService.isCurrentlySpeaking() || stateChanged) {
            clearInterval(checkInterval);
            resolve();
          }
        }, 50); // 每50ms检查一次
        
        // 超时保护：1秒后强制继续（避免卡住游戏）
        setTimeout(() => {
          clearInterval(checkInterval);
          resolve();
        }, 1000);
      });
      
      // 再等待一小段时间，确保语音完全结束（但不超过200ms）
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const currentPlayer = currentState.players[currentState.currentPlayerIndex];
    if (!currentPlayer) return;
    
    // 检查是否只剩一个玩家还没出完，如果是，直接结束游戏
    const remainingPlayers = currentState.players.filter(p => p.hand.length > 0);
    if (remainingPlayers.length === 1) {
      const lastPlayerIndex = remainingPlayers[0].id;
      const lastPlayer = currentState.players[lastPlayerIndex];
      
      // 触发最后一名输了的聊天反应（传递完整游戏状态）
      triggerFinishLastReaction(lastPlayer, undefined, currentState).catch(console.error);
      
      // 计算最后一名手中的分牌分数
      const lastPlayerScoreCards = lastPlayer.hand.filter(card => isScoreCard(card));
      const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);
      
      setGameState(prev => {
        if (prev.status !== GameStatus.PLAYING) return prev;
        
        const newPlayers = [...prev.players];
        const newFinishOrder = [...(prev.finishOrder || [])];
        
        // 如果最后一名还没在finishOrder中，添加进去
        if (!newFinishOrder.includes(lastPlayerIndex)) {
          newFinishOrder.push(lastPlayerIndex);
        }
        
        // 最后一名减去未出分牌的分数
        newPlayers[lastPlayerIndex] = {
          ...lastPlayer,
          score: (lastPlayer.score || 0) - lastPlayerRemainingScore
        };
        
        // 找到第一名（finishOrder中的第一个，即索引0）
        if (newFinishOrder.length >= 1) {
          const firstPlayerIndex = newFinishOrder[0];
          const firstPlayer = newPlayers[firstPlayerIndex];
          if (firstPlayer) {
            // 第一名加上最后一名未出的分牌分数
            newPlayers[firstPlayerIndex] = {
              ...firstPlayer,
              score: (firstPlayer.score || 0) + lastPlayerRemainingScore
            };
          }
        }
        
        // 应用最终规则并结束游戏
        const finalPlayers = applyFinalGameRules(newPlayers, newFinishOrder);
        const finalRankings = calculateFinalRankings(finalPlayers, newFinishOrder);
        
        // 找到第一名（分数最高的）
        const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
        
        return {
          ...prev,
          status: GameStatus.FINISHED,
          players: finalPlayers,
          winner: winner.player.id,
          finishOrder: newFinishOrder,
          finalRankings
        };
      });
      return;
    }
    
    // 如果当前玩家已经出完牌了，跳过到下一个玩家
    if (currentPlayer.hand.length === 0) {
      setGameState(prev => {
        if (prev.status !== GameStatus.PLAYING) return prev;
        
        const nextPlayerIndex = findNextActivePlayer(prev.currentPlayerIndex, prev.players, prev.playerCount);
        
        // 如果所有玩家都出完了，结束游戏
        if (nextPlayerIndex === null) {
          const allFinished = prev.players.every(p => p.hand.length === 0);
          if (allFinished) {
            const finalPlayers = applyFinalGameRules(prev.players, prev.finishOrder || []);
            const finalRankings = calculateFinalRankings(finalPlayers, prev.finishOrder || []);
            const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
            
            return {
              ...prev,
              status: GameStatus.FINISHED,
              players: finalPlayers,
              winner: winner.player.id,
              finalRankings
            };
          }
          return prev; // 不应该发生，但作为保护
        }
        
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
        // 如果是接风（lastPlay为null），应该强制出牌；如果有lastPlay且有能打过的牌，也应该强制出牌
        if (hasPlayable) {
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
                
                // 计算动画位置
                const animationPosition = calculatePlayAnimationPosition(
                  currentState.currentPlayerIndex,
                  prev.players,
                  prev.players.findIndex(p => p.isHuman),
                  prev.playerCount
                );
                
                // 处理墩的计分
                const { updatedPlayers: playersAfterDun, dunScore } = handleDunScoring(
                  prev.players,
                  currentState.currentPlayerIndex,
                  fallbackCards,
                  prev.playerCount,
                  fallbackPlay,
                  animationPosition
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
          
          // 计算当前玩家的名次（根据出完牌的顺序，第一个出完的是第1名）
          const currentRank = newFinishOrder.length;
          
          // 把轮次分数给获胜者（包括当前这一手的分牌）
                  const finalScore = (player.score || 0) + prev.roundScore + fallbackScore;
                  newPlayers[currentState.currentPlayerIndex] = {
                    ...newPlayers[currentState.currentPlayerIndex],
                    score: finalScore,
                    finishedRank: currentRank // 设置名次（第一个出完的是第1名）
                  };
          
          // 检查是否只剩下一个玩家还没出完（即最后一个玩家）
          const remainingPlayers = newPlayers.filter(p => p.hand.length > 0);
          
          // 如果只剩下一个玩家还没出完，那就是最后一名，立即结束游戏
          if (remainingPlayers.length === 1) {
            const lastPlayerIndex = remainingPlayers[0].id;
            const lastPlayer = newPlayers[lastPlayerIndex];
            
            // 触发最后一名输了的聊天反应（传递完整游戏状态）
            const currentGameState: MultiPlayerGameState = {
              ...prev,
              players: newPlayers
            };
            triggerFinishLastReaction(lastPlayer, undefined, currentGameState).catch(console.error);
            
            // 计算最后一名手中的分牌分数
            const lastPlayerScoreCards = lastPlayer.hand.filter(card => isScoreCard(card));
            const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);
            
            // 最后一名减去未出分牌的分数
            newPlayers[lastPlayerIndex] = {
              ...lastPlayer,
              score: (lastPlayer.score || 0) - lastPlayerRemainingScore
            };
            
            // 找到第一名（finishOrder中的第一个，即索引0）
            if (newFinishOrder.length >= 1) {
              const firstPlayerIndex = newFinishOrder[0];
              const firstPlayer = newPlayers[firstPlayerIndex];
              if (firstPlayer) {
                // 第一名加上最后一名未出的分牌分数
                newPlayers[firstPlayerIndex] = {
                  ...firstPlayer,
                  score: (firstPlayer.score || 0) + lastPlayerRemainingScore
                };
              }
            }
            
            // 应用最终规则并结束游戏
            const finalPlayers = applyFinalGameRules(newPlayers, newFinishOrder);
            const finalRankings = calculateFinalRankings(finalPlayers, newFinishOrder);
            
            // 找到第一名（分数最高的）
            const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
            
            return {
              ...prev,
              status: GameStatus.FINISHED,
              players: finalPlayers,
              winner: winner.player.id,
              finishOrder: newFinishOrder,
              finalRankings
            };
          }
          
          // 检查是否所有玩家都出完了
          const gameFinished = checkGameFinished(prev, newPlayers, newFinishOrder);
          if (gameFinished) {
            return gameFinished;
          }
          
          // 还没全部出完，找到下一个还在游戏中的玩家（接风）
          const nextPlayerIndex = findNextActivePlayer(currentState.currentPlayerIndex, newPlayers, prev.playerCount);
          
          // 如果所有玩家都出完了，结束游戏
          if (nextPlayerIndex === null) {
            const allFinished = newPlayers.every(p => p.hand.length === 0);
            if (allFinished) {
              const finalPlayers = applyFinalGameRules(newPlayers, newFinishOrder);
              const finalRankings = calculateFinalRankings(finalPlayers, newFinishOrder);
              const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
              
              return {
                ...prev,
                status: GameStatus.FINISHED,
                players: finalPlayers,
                winner: winner.player.id,
                finishOrder: newFinishOrder,
                finalRankings
              };
            }
            return prev; // 不应该发生，但作为保护
          }
          
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
          
          // 报牌（系统信息）：立即报牌，不等待完成
          const currentPlayerVoice = newPlayers[currentState.currentPlayerIndex]?.voiceConfig;
          announcePlay(fallbackPlay, currentPlayerVoice).catch(console.error);
          
          // 播报后等待，如果下一个玩家是AI，自动继续
          if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
              setTimeout(() => {
                playNextTurn();
            }, announcementDelay);
          }
          
          return newState;
        }

                const nextPlayerIndex = findNextActivePlayer(currentState.currentPlayerIndex, newPlayers, prev.playerCount);
                
                // 如果所有玩家都出完了，结束游戏
                if (nextPlayerIndex === null) {
                  const allFinished = newPlayers.every(p => p.hand.length === 0);
                  if (allFinished) {
                    const finishOrder = prev.finishOrder || [];
                    const finalPlayers = applyFinalGameRules(newPlayers, finishOrder);
                    const finalRankings = calculateFinalRankings(finalPlayers, finishOrder);
                    const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
                    
                    return {
                      ...prev,
                      status: GameStatus.FINISHED,
                      players: finalPlayers,
                      winner: winner.player.id,
                      finishOrder: finishOrder,
                      finalRankings
                    };
                  }
                  return prev; // 不应该发生，但作为保护
                }
                
                const newState = {
                  ...prev,
                  players: newPlayers,
                  currentPlayerIndex: nextPlayerIndex,
                  lastPlay: fallbackPlay,
                  lastPlayPlayerIndex: currentState.currentPlayerIndex,
                  roundScore: prev.roundScore + fallbackScore // 累加轮次分数
                };

                // 报牌（系统信息）：立即报牌，不等待完成
                const currentPlayerVoice = newPlayers[currentState.currentPlayerIndex]?.voiceConfig;
                announcePlay(fallbackPlay, currentPlayerVoice).catch(console.error);
                
                // 1.5秒后，如果下一个玩家是AI，自动继续
                if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
                    setTimeout(() => {
                      playNextTurn();
                  }, 1500);
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

          const nextPlayerIndex = findNextActivePlayer(prev.currentPlayerIndex, prev.players, prev.playerCount);
          
          // 如果所有玩家都出完了，结束游戏
          if (nextPlayerIndex === null) {
            const allFinished = prev.players.every(p => p.hand.length === 0);
            if (allFinished) {
              const finalPlayers = applyFinalGameRules(prev.players, prev.finishOrder || []);
              const finalRankings = calculateFinalRankings(finalPlayers, prev.finishOrder || []);
              const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
              
              return {
                ...prev,
                status: GameStatus.FINISHED,
                players: finalPlayers,
                winner: winner.player.id,
                finalRankings
              };
            }
            return prev; // 不应该发生，但作为保护
          }
          
          const newPlayers = [...prev.players];
          
          // 只要有人"要不起"，且本轮有出牌记录（lastPlayPlayerIndex不为null），则强制结束本轮
          if (prev.lastPlayPlayerIndex !== null) {
            // 强制结束本轮，把分数给最后出牌的人
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
              
              // 如果有分数，给最后出牌的人
              if (prev.roundScore > 0) {
                newPlayers[prev.lastPlayPlayerIndex] = {
                  ...lastPlayer,
                  score: (lastPlayer.score || 0) + prev.roundScore,
                  wonRounds: [...(lastPlayer.wonRounds || []), roundRecord]
                };
              }
              
              // 保存轮次记录到allRounds
              const updatedAllRounds = [...(prev.allRounds || []), roundRecord];
              
              // 一轮结束，由赢家开始下一轮（如果赢家已出完，找下一个还在游戏中的玩家）
              const winnerIndex = prev.lastPlayPlayerIndex;
              let nextActivePlayerIndex: number | null;
              if (newPlayers[winnerIndex]?.hand.length > 0) {
                nextActivePlayerIndex = winnerIndex;
              } else {
                nextActivePlayerIndex = findNextActivePlayer(winnerIndex, newPlayers, prev.playerCount);
              }
              
              // 如果所有玩家都出完了，结束游戏
              if (nextActivePlayerIndex === null) {
                const allFinished = newPlayers.every(p => p.hand.length === 0);
                if (allFinished) {
                  const finalPlayers = applyFinalGameRules(newPlayers, prev.finishOrder || []);
                  const finalRankings = calculateFinalRankings(finalPlayers, prev.finishOrder || []);
                  const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
                  
                  return {
                    ...prev,
                    status: GameStatus.FINISHED,
                    players: finalPlayers,
                    winner: winner.player.id,
                    finalRankings
                  };
                }
                return prev; // 不应该发生，但作为保护
              }
              
              const newState = {
                ...prev,
                players: newPlayers,
                currentPlayerIndex: nextActivePlayerIndex, // 由赢家（或下一个还在游戏中的玩家）开始下一轮
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
              
              // 如果下一个玩家是AI，自动出牌开始下一轮
              // 报"要不起"（系统信息）：必须等待完成才能继续游戏流程
              const currentPlayerVoice = prev.players[prev.currentPlayerIndex]?.voiceConfig;
              // 报"要不起"（系统信息）：立即报牌，不等待完成
              announcePass(currentPlayerVoice).catch(console.error);
              
              // 1.5秒后，如果下一个玩家是AI，自动继续
              if (newPlayers[nextActivePlayerIndex].type === PlayerType.AI) {
                  setTimeout(() => {
                    playNextTurn();
                }, 1500);
              }
              
              return newState;
            }
          }
          
          // 如果没有lastPlayPlayerIndex（接风状态），检查是否所有剩余玩家都要不起
          if (prev.lastPlayPlayerIndex === null) {
            // 接风状态下，如果所有剩余玩家都要不起，强制开始新轮次
            const allPassed = checkAllRemainingPlayersPassed(
              prev.currentPlayerIndex,
              prev.players,
              prev.playerCount,
              prev.lastPlay
            );
            
            if (allPassed) {
              // 所有剩余玩家都要不起，强制开始新轮次，由当前玩家开始
              const newState = {
                ...prev,
                players: newPlayers,
                currentPlayerIndex: prev.currentPlayerIndex, // 由当前玩家开始新轮次
                lastPlay: null,
                lastPlayPlayerIndex: null,
                roundScore: 0,
                currentRoundPlays: [],
                roundNumber: prev.roundNumber + 1
              };
              
              // 报"要不起"（系统信息）：立即报牌，不等待完成
              const currentPlayerVoice = prev.players[prev.currentPlayerIndex]?.voiceConfig;
              announcePass(currentPlayerVoice).catch(console.error);
              
              // 1.5秒后，如果当前玩家是AI，自动继续
              if (prev.players[prev.currentPlayerIndex].type === PlayerType.AI) {
                  setTimeout(() => {
                    playNextTurn();
                }, 1500);
              }
              
              return newState;
            }
          }
          
          // 正常继续游戏
          // 检查 nextPlayerIndex 是否为 null（所有玩家都出完了）
          if (nextPlayerIndex === null) {
            // 所有玩家都出完了，结束游戏
            const allFinished = newPlayers.every(p => p.hand.length === 0);
            if (allFinished) {
              const finalPlayers = applyFinalGameRules(newPlayers, prev.finishOrder || []);
              const finalRankings = calculateFinalRankings(finalPlayers, prev.finishOrder || []);
              const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
              
              return {
                ...prev,
                status: GameStatus.FINISHED,
                players: finalPlayers,
                winner: winner.player.id,
                finalRankings
              };
            }
            return prev; // 不应该发生，但作为保护
          }
          
          let newLastPlay = prev.lastPlay;
          let newLastPlayPlayerIndex = prev.lastPlayPlayerIndex;
          let newRoundScore = prev.roundScore;

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

          // 报"要不起"（系统信息）：立即报牌，不等待完成
          const currentPlayerVoice = prev.players[prev.currentPlayerIndex]?.voiceConfig;
          announcePass(currentPlayerVoice).catch(console.error);
          
          // 1.5秒后，如果下一个玩家是AI，自动继续
          if (prev.players[nextPlayerIndex].type === PlayerType.AI) {
              setTimeout(() => {
                playNextTurn();
            }, 1500);
          }

          return newState;
        });
        return;
      }

      const play = canPlayCards(aiCards);
      if (!play) {
        setGameState(prev => {
          if (prev.status !== GameStatus.PLAYING) return prev;
          const nextPlayerIndex = findNextActivePlayer(prev.currentPlayerIndex, prev.players, prev.playerCount);
          
          // 如果所有玩家都出完了，结束游戏
          if (nextPlayerIndex === null) {
            const allFinished = prev.players.every(p => p.hand.length === 0);
            if (allFinished) {
              const finalPlayers = applyFinalGameRules(prev.players, prev.finishOrder || []);
              const finalRankings = calculateFinalRankings(finalPlayers, prev.finishOrder || []);
              const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
              
              return {
                ...prev,
                status: GameStatus.FINISHED,
                players: finalPlayers,
                winner: winner.player.id,
                finalRankings
              };
            }
            return prev; // 不应该发生，但作为保护
          }
          
          const newPlayers = [...prev.players];
          
          // 只要有人"要不起"，且本轮有出牌记录（lastPlayPlayerIndex不为null），则强制结束本轮
          if (prev.lastPlayPlayerIndex !== null) {
            // 强制结束本轮，把分数给最后出牌的人
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
              
              // 如果有分数，给最后出牌的人
              if (prev.roundScore > 0) {
                newPlayers[prev.lastPlayPlayerIndex] = {
                  ...lastPlayer,
                  score: (lastPlayer.score || 0) + prev.roundScore,
                  wonRounds: [...(lastPlayer.wonRounds || []), roundRecord]
                };
              }
              
              // 保存轮次记录到allRounds
              const updatedAllRounds = [...(prev.allRounds || []), roundRecord];
              
              // 一轮结束，由赢家开始下一轮（如果赢家已出完，找下一个还在游戏中的玩家）
              const winnerIndex = prev.lastPlayPlayerIndex;
              let nextActivePlayerIndex: number | null;
              if (newPlayers[winnerIndex]?.hand.length > 0) {
                nextActivePlayerIndex = winnerIndex;
              } else {
                nextActivePlayerIndex = findNextActivePlayer(winnerIndex, newPlayers, prev.playerCount);
              }
              
              // 如果所有玩家都出完了，结束游戏
              if (nextActivePlayerIndex === null) {
                const allFinished = newPlayers.every(p => p.hand.length === 0);
                if (allFinished) {
                  const finalPlayers = applyFinalGameRules(newPlayers, prev.finishOrder || []);
                  const finalRankings = calculateFinalRankings(finalPlayers, prev.finishOrder || []);
                  const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
                  
                  return {
                    ...prev,
                    status: GameStatus.FINISHED,
                    players: finalPlayers,
                    winner: winner.player.id,
                    finalRankings
                  };
                }
                return prev; // 不应该发生，但作为保护
              }
              
              const newState = {
                ...prev,
                players: newPlayers,
                currentPlayerIndex: nextActivePlayerIndex, // 由赢家（或下一个还在游戏中的玩家）开始下一轮
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
              
              // 如果下一个玩家是AI，自动出牌开始下一轮
              // 报"要不起"（系统信息）：必须等待完成才能继续游戏流程
              const currentPlayerVoice = prev.players[prev.currentPlayerIndex]?.voiceConfig;
              // 报"要不起"（系统信息）：立即报牌，不等待完成
              announcePass(currentPlayerVoice).catch(console.error);
              
              // 1.5秒后，如果下一个玩家是AI，自动继续
              if (newPlayers[nextActivePlayerIndex].type === PlayerType.AI) {
                  setTimeout(() => {
                    playNextTurn();
                }, 1500);
              }
              
              return newState;
            }
          }
          
          // 如果没有lastPlayPlayerIndex（接风状态），继续游戏
          return {
            ...prev,
            players: newPlayers,
            currentPlayerIndex: nextPlayerIndex,
            lastPlay: prev.lastPlay,
            lastPlayPlayerIndex: prev.lastPlayPlayerIndex,
            roundScore: prev.roundScore,
            currentRoundPlays: prev.currentRoundPlays,
            roundNumber: prev.roundNumber
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

        // 计算动画位置
        const animationPosition = calculatePlayAnimationPosition(
          currentState.currentPlayerIndex,
          prev.players,
          prev.players.findIndex(p => p.isHuman),
          prev.playerCount
        );

        // 处理墩的计分
        const { updatedPlayers: playersAfterDun, dunScore } = handleDunScoring(
          prev.players,
          currentState.currentPlayerIndex,
          aiCards,
          prev.playerCount,
          play,
          animationPosition
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
          
          // 计算当前玩家的名次（根据出完牌的顺序，第一个出完的是第1名）
          const currentRank = newFinishOrder.length;
          
          // 触发出完牌时的聊天反应（传递完整游戏状态）
          const finishPosition = newFinishOrder.length;
          const currentGameState: MultiPlayerGameState = {
            ...prev,
            players: newPlayers,
            finishOrder: newFinishOrder
          };
          if (finishPosition === 1) {
            // 头名出完，兴奋
            triggerFinishFirstReaction(updatedPlayer, undefined, currentGameState).catch(console.error);
          } else {
            // 中间名次出完，感慨
            triggerFinishMiddleReaction(updatedPlayer, undefined, currentGameState).catch(console.error);
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
            wonRounds: [...(player.wonRounds || []), finalRoundRecord],
            finishedRank: currentRank // 设置名次（第一个出完的是第1名）
          };
          
          // 检查是否只剩下一个玩家还没出完（即最后一个玩家）
          const remainingPlayers = newPlayers.filter(p => p.hand.length > 0);
          
          // 如果只剩下一个玩家还没出完，那就是最后一名，立即结束游戏
          if (remainingPlayers.length === 1) {
            const lastPlayerIndex = remainingPlayers[0].id;
            const lastPlayer = newPlayers[lastPlayerIndex];
            
            // 触发最后一名输了的聊天反应（传递完整游戏状态）
            const currentGameState: MultiPlayerGameState = {
              ...prev,
              players: newPlayers
            };
            triggerFinishLastReaction(lastPlayer, undefined, currentGameState).catch(console.error);
            
            // 计算最后一名手中的分牌分数
            const lastPlayerScoreCards = lastPlayer.hand.filter(card => isScoreCard(card));
            const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);
            
            // 最后一名减去未出分牌的分数
            newPlayers[lastPlayerIndex] = {
              ...lastPlayer,
              score: (lastPlayer.score || 0) - lastPlayerRemainingScore
            };
            
            // 找到第一名（finishOrder中的第一个，即索引0）
            if (newFinishOrder.length >= 1) {
              const firstPlayerIndex = newFinishOrder[0];
              const firstPlayer = newPlayers[firstPlayerIndex];
              if (firstPlayer) {
                // 第一名加上最后一名未出的分牌分数
                newPlayers[firstPlayerIndex] = {
                  ...firstPlayer,
                  score: (firstPlayer.score || 0) + lastPlayerRemainingScore
                };
              }
            }
            
            // 应用最终规则并结束游戏
            const finalPlayers = applyFinalGameRules(newPlayers, newFinishOrder);
            const finalRankings = calculateFinalRankings(finalPlayers, newFinishOrder);
            
            // 找到第一名（分数最高的）
            const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
            
            return {
              ...prev,
              status: GameStatus.FINISHED,
              players: finalPlayers,
              winner: winner.player.id,
              finishOrder: newFinishOrder,
              finalRankings
            };
          }
          
          // 检查是否所有玩家都出完了
          const gameFinished = checkGameFinished(prev, newPlayers, newFinishOrder);
          if (gameFinished) {
            return gameFinished;
          }
          
          // 还没全部出完，找到下一个还在游戏中的玩家
          // 重要：使用findNextActivePlayer确保跳过已出完牌的玩家
          const nextPlayerIndex = findNextActivePlayer(currentState.currentPlayerIndex, newPlayers, prev.playerCount);
          
          // 检查是否所有剩余玩家都要不起最后一手牌
          // 如果都要不起，则接风（清空lastPlay，让下家自由出牌）
          // 如果有人能打过，则不清空lastPlay，让能打过的玩家继续
          let shouldTakeover = true; // 默认接风
          for (let i = 0; i < newPlayers.length; i++) {
            if (i !== currentState.currentPlayerIndex && newPlayers[i].hand.length > 0) {
              // 检查这个玩家是否能打过最后一手牌
              if (hasPlayableCards(newPlayers[i].hand, play)) {
                shouldTakeover = false; // 有人能打过，不需要接风
                break;
              }
            }
          }
          
          // 根据是否接风决定游戏状态
          // 注意：分数已经在前面（593行）加给玩家了，所以这里roundScore应该重置为0
          // 检查 nextPlayerIndex 是否为 null
          if (nextPlayerIndex === null) {
            const allFinished = newPlayers.every(p => p.hand.length === 0);
            if (allFinished) {
              const finalPlayers = applyFinalGameRules(newPlayers, newFinishOrder);
              const finalRankings = calculateFinalRankings(finalPlayers, newFinishOrder);
              const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
              
              return {
                ...prev,
                status: GameStatus.FINISHED,
                players: finalPlayers,
                winner: winner.player.id,
                finishOrder: newFinishOrder,
                finalRankings
              };
            }
            return prev; // 不应该发生，但作为保护
          }
          
          // 报牌（系统信息）：立即报牌，不等待完成
          const currentPlayerVoice = newPlayers[currentState.currentPlayerIndex]?.voiceConfig;
          announcePlay(play, currentPlayerVoice).catch(console.error);
          
          const newState = {
            ...prev,
            players: newPlayers,
            currentPlayerIndex: nextPlayerIndex,
            lastPlay: shouldTakeover ? null : play, // 如果接风，清空lastPlay；否则保持lastPlay
            lastPlayPlayerIndex: shouldTakeover ? null : currentState.currentPlayerIndex, // 如果接风，清空lastPlayPlayerIndex；否则保持为当前玩家
            roundScore: 0, // 分数已经给玩家了，重置轮次分数
            currentRoundPlays: shouldTakeover ? [] : [...prev.currentRoundPlays, playRecord], // 如果接风，清空记录；否则添加记录
            finishOrder: newFinishOrder
          };
          
          // 播报后等待，如果下一个玩家是AI，自动继续
          if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
              setTimeout(() => {
                playNextTurn();
            }, announcementDelay);
          }
          
          return newState;
        }

        // 计算下一个玩家，跳过已出完的玩家
        const nextPlayerIndex = findNextActivePlayer(currentState.currentPlayerIndex, newPlayers, prev.playerCount);
        
        // 如果所有玩家都出完了，结束游戏
        if (nextPlayerIndex === null) {
          const allFinished = newPlayers.every(p => p.hand.length === 0);
          if (allFinished) {
            const finishOrder = prev.finishOrder || [];
            const finalPlayers = applyFinalGameRules(newPlayers, finishOrder);
            const finalRankings = calculateFinalRankings(finalPlayers, finishOrder);
            const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
            
            return {
              ...prev,
              status: GameStatus.FINISHED,
              players: finalPlayers,
              winner: winner.player.id,
              finishOrder: finishOrder,
              finalRankings
            };
          }
          return prev; // 不应该发生，但作为保护
        }
        
        const newState = {
          ...prev,
          players: newPlayers,
          currentPlayerIndex: nextPlayerIndex,
          lastPlay: play,
          lastPlayPlayerIndex: currentState.currentPlayerIndex,
          roundScore: prev.roundScore + playScore, // 累加轮次分数
          currentRoundPlays: [...prev.currentRoundPlays, playRecord] // 记录这一手出牌
        };

        // 报牌（系统信息）：立即报牌，不等待完成
        const currentPlayerVoice = newPlayers[currentState.currentPlayerIndex]?.voiceConfig;
        announcePlay(play, currentPlayerVoice).catch(console.error);
        
        // 1.5秒后，如果下一个玩家是AI，自动继续
        if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
            setTimeout(() => {
              playNextTurn();
          }, 1500);
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
        
        // 只要有人"要不起"，且本轮有出牌记录（lastPlayPlayerIndex不为null），则强制结束本轮
        if (prev.lastPlayPlayerIndex !== null) {
          // 强制结束本轮，把分数给最后出牌的人
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
            
            // 如果有分数，给最后出牌的人
            if (prev.roundScore > 0) {
              newPlayers[prev.lastPlayPlayerIndex] = {
                ...lastPlayer,
                score: (lastPlayer.score || 0) + prev.roundScore,
                wonRounds: [...(lastPlayer.wonRounds || []), roundRecord]
              };
            }
            
            // 保存轮次记录到allRounds
            const updatedAllRounds = [...(prev.allRounds || []), roundRecord];
            
            // 一轮结束，由赢家开始下一轮（如果赢家已出完，找下一个还在游戏中的玩家）
            const winnerIndex = prev.lastPlayPlayerIndex;
            let nextActivePlayerIndex: number | null;
            if (newPlayers[winnerIndex]?.hand.length > 0) {
              nextActivePlayerIndex = winnerIndex;
            } else {
              nextActivePlayerIndex = findNextActivePlayer(winnerIndex, newPlayers, prev.playerCount);
            }
            
            // 如果所有玩家都出完了，结束游戏
            if (nextActivePlayerIndex === null) {
              const allFinished = newPlayers.every(p => p.hand.length === 0);
              if (allFinished) {
                const finalPlayers = applyFinalGameRules(newPlayers, prev.finishOrder || []);
                const finalRankings = calculateFinalRankings(finalPlayers, prev.finishOrder || []);
                const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
                
                return {
                  ...prev,
                  status: GameStatus.FINISHED,
                  players: finalPlayers,
                  winner: winner.player.id,
                  finalRankings
                };
              }
              return prev; // 不应该发生，但作为保护
            }
            
            const newState = {
              ...prev,
              players: newPlayers,
              currentPlayerIndex: nextActivePlayerIndex, // 由赢家（或下一个还在游戏中的玩家）开始下一轮
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
            
            // 报牌（系统信息）：必须等待完成才能继续游戏流程
            const currentPlayerVoice = prev.players[prev.currentPlayerIndex]?.voiceConfig;
            // 报"要不起"（系统信息）：立即报牌，不等待完成
            announcePass(currentPlayerVoice).catch(console.error);
            
            // 1.5秒后，如果下一个玩家是AI，自动继续
            if (newPlayers[nextActivePlayerIndex].type === PlayerType.AI) {
                setTimeout(() => {
                  playNextTurn();
              }, 1500);
            }
            
            return newState;
          }
        }
        
        // 如果没有lastPlayPlayerIndex（接风状态），继续游戏
        newLastPlay = prev.lastPlay;
        newLastPlayPlayerIndex = prev.lastPlayPlayerIndex;
        newRoundScore = prev.roundScore;
        
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

  // 监听currentPlayerIndex变化，自动触发AI玩家出牌
  useEffect(() => {
    // 如果游戏不在进行中，或者正在处理AI回合，则跳过
    if (gameState.status !== GameStatus.PLAYING || isAITurnProcessingRef.current) {
      return;
    }

    // 如果这个玩家索引已经处理过，跳过（避免重复触发）
    if (lastProcessedPlayerIndexRef.current === gameState.currentPlayerIndex) {
      return;
    }

    // 确保players数组已经初始化
    if (!gameState.players || gameState.players.length === 0) {
      return;
    }

    const currentPlayer = gameState.players[gameState.currentPlayerIndex];
    if (!currentPlayer) return;

    // 如果当前玩家是AI，自动触发出牌
    if (currentPlayer.type === PlayerType.AI && currentPlayer.hand.length > 0) {
      // 标记这个玩家索引已经处理
      lastProcessedPlayerIndexRef.current = gameState.currentPlayerIndex;
      // 设置标志，防止重复触发
      isAITurnProcessingRef.current = true;
      
      // 延迟一小段时间，确保状态完全更新（包括gameStateRef）
      const timer = setTimeout(() => {
        // 再次检查，确保状态已经更新
        const latestState = gameStateRef.current;
        if (latestState.status === GameStatus.PLAYING && 
            latestState.currentPlayerIndex === gameState.currentPlayerIndex &&
            latestState.players[latestState.currentPlayerIndex]?.type === PlayerType.AI) {
          playNextTurn().finally(() => {
            // 出牌完成后，重置标志
            isAITurnProcessingRef.current = false;
          });
        } else {
          // 如果状态不匹配，重置标志
          isAITurnProcessingRef.current = false;
        }
      }, 150); // 稍微增加延迟，确保状态完全更新

      return () => {
        clearTimeout(timer);
        isAITurnProcessingRef.current = false;
      };
    } else {
      // 如果不是AI玩家，更新lastProcessedPlayerIndexRef，但重置标志
      lastProcessedPlayerIndexRef.current = gameState.currentPlayerIndex;
      isAITurnProcessingRef.current = false;
    }
  }, [gameState.currentPlayerIndex, gameState.status, playNextTurn]);

  // 开始新游戏（内部函数，处理发牌）
  const startGameInternal = useCallback((config: GameConfig, hands: Card[][]) => {
    // 清空聊天记录
    clearChatMessages();

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

  // 开始新游戏（公开接口，接收GameConfig）
  const startGame = useCallback((startConfig: GameConfig) => {
    // 转换为GameConfig
    const config: GameConfig = {
      playerCount: startConfig.playerCount,
      humanPlayerIndex: startConfig.humanPlayerIndex,
      aiConfigs: startConfig.aiConfigs,
      dealingAlgorithm: startConfig.dealingAlgorithm,
      skipDealingAnimation: startConfig.skipDealingAnimation
    };

    // 如果跳过发牌动画，直接使用旧逻辑
    if (config.skipDealingAnimation) {
      const hands = dealCards(config.playerCount);
      startGameInternal(config, hands);
      return;
    }

    // 否则，显示发牌动画
    setIsDealing(true);
    setPendingGameConfig(config);
  }, [startGameInternal]);

  // 发牌完成回调
  const handleDealingComplete = useCallback((hands: Card[][]) => {
    if (pendingGameConfig) {
      setIsDealing(false);
      startGameInternal(pendingGameConfig, hands);
      setPendingGameConfig(null);
    }
  }, [pendingGameConfig, startGameInternal]);

  // 取消发牌动画
  const handleDealingCancel = useCallback(() => {
    if (pendingGameConfig) {
      // 快速发牌（不使用动画）
      const hands = dealCards(pendingGameConfig.playerCount);
      setIsDealing(false);
      startGameInternal(pendingGameConfig, hands);
      setPendingGameConfig(null);
    }
  }, [pendingGameConfig, startGameInternal]);

  // 玩家出牌
  const playerPlay = useCallback((playerIndex: number, selectedCards: Card[]): boolean => {
    setGameState(prev => {
      if (prev.status !== GameStatus.PLAYING) return prev;
      if (prev.currentPlayerIndex !== playerIndex) return prev;

      const player = prev.players[playerIndex];
      if (!player) return prev;
      
      // 如果玩家已经出完牌了，不应该再出牌
      if (player.hand.length === 0) return prev;

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
        
        // 只要有人"要不起"，且本轮有出牌记录（lastPlayPlayerIndex不为null），则强制结束本轮
        if (prev.lastPlayPlayerIndex !== null) {
          // 强制结束本轮，把分数给最后出牌的人
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
            
            // 如果有分数，给最后出牌的人
            if (prev.roundScore > 0) {
              newPlayers[prev.lastPlayPlayerIndex] = {
                ...lastPlayer,
                score: (lastPlayer.score || 0) + prev.roundScore,
                wonRounds: [...(lastPlayer.wonRounds || []), roundRecord]
              };
            }
            
            // 保存轮次记录到allRounds
            const updatedAllRounds = [...(prev.allRounds || []), roundRecord];
            
            // 一轮结束，由赢家开始下一轮（如果赢家已出完，找下一个还在游戏中的玩家）
            const winnerIndex = prev.lastPlayPlayerIndex;
            let nextActivePlayerIndex: number | null;
            if (newPlayers[winnerIndex]?.hand.length > 0) {
              nextActivePlayerIndex = winnerIndex;
            } else {
              nextActivePlayerIndex = findNextActivePlayer(winnerIndex, newPlayers, prev.playerCount);
            }
            
            // 如果所有玩家都出完了，结束游戏
            if (nextActivePlayerIndex === null) {
              const allFinished = newPlayers.every(p => p.hand.length === 0);
              if (allFinished) {
                const finalPlayers = applyFinalGameRules(newPlayers, prev.finishOrder || []);
                const finalRankings = calculateFinalRankings(finalPlayers, prev.finishOrder || []);
                const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
                
                return {
                  ...prev,
                  status: GameStatus.FINISHED,
                  players: finalPlayers,
                  winner: winner.player.id,
                  finalRankings
                };
              }
              return prev; // 不应该发生，但作为保护
            }
            
            const newState = {
              ...prev,
              players: newPlayers,
              currentPlayerIndex: nextActivePlayerIndex, // 由赢家（或下一个还在游戏中的玩家）开始下一轮
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
            
            // 报牌（系统信息）：必须等待完成才能继续游戏流程
            const currentPlayerVoice = prev.players[playerIndex]?.voiceConfig;
            // 报"要不起"（系统信息）：立即报牌，不等待完成
            announcePass(currentPlayerVoice).catch(console.error);
            
            // 1.5秒后，如果下一个玩家是AI，自动继续
            if (newPlayers[nextActivePlayerIndex].type === PlayerType.AI) {
                setTimeout(() => {
                  playNextTurn();
              }, 1500);
            }
            
            return newState;
          }
        }
        
        // 如果没有lastPlayPlayerIndex（接风状态），继续游戏
        // 检查 nextPlayerIndex 是否为 null
        if (nextPlayerIndex === null) {
          const allFinished = newPlayers.every(p => p.hand.length === 0);
          if (allFinished) {
            const finalPlayers = applyFinalGameRules(newPlayers, prev.finishOrder || []);
            const finalRankings = calculateFinalRankings(finalPlayers, prev.finishOrder || []);
            const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
            
            return {
              ...prev,
              status: GameStatus.FINISHED,
              players: finalPlayers,
              winner: winner.player.id,
              finalRankings
            };
          }
          return prev; // 不应该发生，但作为保护
        }
        
        newLastPlay = prev.lastPlay;
        newLastPlayPlayerIndex = prev.lastPlayPlayerIndex;
        newRoundScore = prev.roundScore;

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
        // 报"要不起"（系统信息）：必须等待完成才能继续游戏流程
        const currentPlayerVoice = newPlayers[prev.currentPlayerIndex]?.voiceConfig;
        // 报"要不起"（系统信息）：立即报牌，不等待完成
        announcePass(currentPlayerVoice).catch(console.error);
        
        // 1.5秒后，如果下一个玩家是AI，自动继续
        if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
            setTimeout(() => {
              playNextTurn();
          }, 1500);
        }

        return newState;
      }

      // 计算这手牌的分值（累加到轮次分数，不直接给玩家）
      const playScore = calculateCardsScore(selectedCards);
      const scoreCards = selectedCards.filter(card => isScoreCard(card));

      // 计算动画位置
      const animationPosition = calculatePlayAnimationPosition(
        playerIndex,
        prev.players,
        prev.players.findIndex(p => p.isHuman),
        prev.playerCount
      );

      // 处理墩的计分
      const { updatedPlayers: playersAfterDun, dunScore } = handleDunScoring(
        prev.players,
        playerIndex,
        selectedCards,
        prev.playerCount,
        play,
        animationPosition
      );
      
      // 更新玩家手牌和分数
      const updatedPlayer = updatePlayerAfterPlay(player, selectedCards, dunScore);
      const newPlayers = [...playersAfterDun];
      newPlayers[playerIndex] = updatedPlayer;
      
      // 触发好牌反应（传递完整游戏状态）
      const currentGameState: MultiPlayerGameState = {
        ...prev,
        players: newPlayers
      };
      triggerGoodPlayReactions(player, play, scoreCards, currentGameState);
      
      // 如果出的是好牌（炸弹、墩、有分牌），其他玩家可能对骂
      // 测试模式：提高触发概率，确保能看到大量对骂
      if (play.type === 'bomb' || play.type === 'dun' || scoreCards.length > 0) {
        newPlayers.forEach((p, idx) => {
          if (idx !== playerIndex && p.hand.length > 0) {
            // 测试模式：100%概率对骂（确保能看到）
            // 炸弹：100%概率对骂
            // 墩：100%概率对骂（更激烈）
            // 有分牌：100%概率对骂
            const tauntProbability = 1.0; // 100%触发，用于测试
            if (Math.random() < tauntProbability) {
              triggerTaunt(p, player, currentGameState).catch(console.error);
            }
          }
        });
      }
      
      // 测试模式：每次出牌都有一定概率触发对骂（增加触发频率）
      // 即使不是好牌，也有30%概率触发对骂
      if (play.type !== 'bomb' && play.type !== 'dun' && scoreCards.length === 0) {
        newPlayers.forEach((p, idx) => {
          if (idx !== playerIndex && p.hand.length > 0) {
            if (Math.random() < 0.3) { // 30%概率
              triggerTaunt(p, player, currentGameState).catch(console.error);
            }
          }
        });
      }
      
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
                triggerScoreEatenCurseReaction(p, lostScore, currentGameState).catch(console.error);
              } else if (Math.random() < 0.3) {
                // 20%概率普通抱怨
                triggerScoreStolenReaction(p, lostScore, currentGameState).catch(console.error);
              }
            } else {
              // 小分被吃，也有一定概率触发脏话（30%），或者普通抱怨（40%）
              if (Math.random() < 0.3) {
                triggerScoreEatenCurseReaction(p, lostScore, currentGameState).catch(console.error);
              } else if (Math.random() < 0.4) {
                triggerScoreStolenReaction(p, lostScore, currentGameState).catch(console.error);
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
        
        // 计算当前玩家的名次（根据出完牌的顺序，第一个出完的是第1名）
        const currentRank = newFinishOrder.length;
        
        // 触发出完牌时的聊天反应（传递完整游戏状态）
        const finishPosition = newFinishOrder.length;
        const currentGameState: MultiPlayerGameState = {
          ...prev,
          players: newPlayers,
          finishOrder: newFinishOrder
        };
        if (finishPosition === 1) {
          // 头名出完，兴奋
          triggerFinishFirstReaction(updatedPlayer, undefined, currentGameState).catch(console.error);
        } else {
          // 中间名次出完，感慨
          triggerFinishMiddleReaction(updatedPlayer, undefined, currentGameState).catch(console.error);
        }
        
        // 先把轮次分数加上（包括当前这一手的分牌）
        newPlayers[playerIndex] = {
          ...newPlayers[playerIndex],
          score: (newPlayers[playerIndex].score || 0) + prev.roundScore + playScore,
          finishedRank: currentRank // 设置名次（第一个出完的是第1名）
        };
        
        // 检查是否所有玩家都出完了（包括当前玩家）
        const remainingPlayers = newPlayers.filter(p => p.hand.length > 0);
        
        // 如果只剩下一个玩家还没出完，那就是最后一名，立即结束游戏
        if (remainingPlayers.length === 1) {
          const lastPlayerIndex = remainingPlayers[0].id;
          const lastPlayer = newPlayers[lastPlayerIndex];
          
          // 触发最后一名输了的聊天反应
          triggerFinishLastReaction(lastPlayer).catch(console.error);
          
          // 计算最后一名手中的分牌分数
          const lastPlayerScoreCards = lastPlayer.hand.filter(card => isScoreCard(card));
          const lastPlayerRemainingScore = calculateCardsScore(lastPlayerScoreCards);
          
          // 最后一名减去未出分牌的分数
          newPlayers[lastPlayerIndex] = {
            ...lastPlayer,
            score: (lastPlayer.score || 0) - lastPlayerRemainingScore
          };
          
          // 找到第一名（finishOrder中的第一个，即索引0）
          if (newFinishOrder.length >= 1) {
            const firstPlayerIndex = newFinishOrder[0];
            const firstPlayer = newPlayers[firstPlayerIndex];
            if (firstPlayer) {
              // 第一名加上最后一名未出的分牌分数
              newPlayers[firstPlayerIndex] = {
                ...firstPlayer,
                score: (firstPlayer.score || 0) + lastPlayerRemainingScore
              };
            }
          }
          
          // 应用最终规则并结束游戏
          const finalPlayers = applyFinalGameRules(newPlayers, newFinishOrder);
          const finalRankings = calculateFinalRankings(finalPlayers, newFinishOrder);
          
          // 找到第一名（分数最高的）
          const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
          
          return {
            ...prev,
            status: GameStatus.FINISHED,
            players: finalPlayers,
            winner: winner.player.id,
            finishOrder: newFinishOrder,
            finalRankings
          };
        }
        
        // 检查是否所有玩家都出完了
        const gameFinished = checkGameFinished(prev, newPlayers, newFinishOrder);
        if (gameFinished) {
          return gameFinished;
        }
        
        // 还没全部出完，找到下一个还在游戏中的玩家
        // 重要：使用findNextActivePlayer确保跳过已出完牌的玩家
        const nextPlayerIndex = findNextActivePlayer(playerIndex, newPlayers, prev.playerCount);
        
        // 如果所有玩家都出完了，结束游戏
        if (nextPlayerIndex === null) {
          const allFinished = newPlayers.every(p => p.hand.length === 0);
          if (allFinished) {
            const finalPlayers = applyFinalGameRules(newPlayers, newFinishOrder);
            const finalRankings = calculateFinalRankings(finalPlayers, newFinishOrder);
            const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
            
            return {
              ...prev,
              status: GameStatus.FINISHED,
              players: finalPlayers,
              winner: winner.player.id,
              finishOrder: newFinishOrder,
              finalRankings
            };
          }
          return prev; // 不应该发生，但作为保护
        }
        
        // 检查是否所有剩余玩家都要不起最后一手牌
        // 如果都要不起，则接风（清空lastPlay，让下家自由出牌）
        // 如果有人能打过，则不清空lastPlay，让能打过的玩家继续
        let shouldTakeover = true; // 默认接风
        for (let i = 0; i < newPlayers.length; i++) {
          if (i !== playerIndex && newPlayers[i].hand.length > 0) {
            // 检查这个玩家是否能打过最后一手牌
            if (hasPlayableCards(newPlayers[i].hand, play)) {
              shouldTakeover = false; // 有人能打过，不需要接风
              break;
            }
          }
        }
        
        // 根据是否接风决定游戏状态
        // 注意：分数已经在前面（1039-1041行）加给玩家了，所以这里roundScore应该重置为0
        const newState = {
          ...prev,
          players: newPlayers,
          currentPlayerIndex: nextPlayerIndex,
          lastPlay: shouldTakeover ? null : play, // 如果接风，清空lastPlay；否则保持lastPlay
          lastPlayPlayerIndex: shouldTakeover ? null : playerIndex, // 如果接风，清空lastPlayPlayerIndex；否则保持为当前玩家
          roundScore: 0, // 分数已经给玩家了，重置轮次分数
          currentRoundPlays: shouldTakeover ? [] : [...prev.currentRoundPlays, playRecord], // 如果接风，清空记录；否则添加记录
          finishOrder: newFinishOrder
        };
        
        // 报牌（系统信息）：必须等待完成才能继续游戏流程
        const currentPlayerVoice = newPlayers[playerIndex]?.voiceConfig;
        // 报牌（系统信息）：立即报牌，不等待完成
        announcePlay(play, currentPlayerVoice).catch(console.error);
        
        // 1.5秒后，如果下一个玩家是AI，自动继续
          if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
            setTimeout(() => {
              playNextTurn();
          }, 1500);
        }
        
        return newState;
      }

      // 计算下一个玩家，跳过已出完的玩家
      const nextPlayerIndex = findNextActivePlayer(playerIndex, newPlayers, prev.playerCount);
      
      // 如果所有玩家都出完了，结束游戏
      if (nextPlayerIndex === null) {
        const allFinished = newPlayers.every(p => p.hand.length === 0);
        if (allFinished) {
          const finishOrder = prev.finishOrder || [];
          const finalPlayers = applyFinalGameRules(newPlayers, finishOrder);
          const finalRankings = calculateFinalRankings(finalPlayers, finishOrder);
          const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
          
          return {
            ...prev,
            status: GameStatus.FINISHED,
            players: finalPlayers,
            winner: winner.player.id,
            finishOrder: finishOrder,
            finalRankings
          };
        }
        return prev; // 不应该发生，但作为保护
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

      // 报牌（系统信息）：必须等待完成才能继续游戏流程
      const currentPlayerVoice = newPlayers[playerIndex]?.voiceConfig;
      // 报牌（系统信息）：立即报牌，不等待完成
      announcePlay(play, currentPlayerVoice).catch(console.error);
      
      // 1.5秒后，如果下一个玩家是AI，自动继续
      if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
          setTimeout(() => {
            playNextTurn();
        }, 1500);
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
        
        // 如果所有玩家都出完了，结束游戏
        if (nextPlayerIndex === null) {
          const allFinished = prev.players.every(p => p.hand.length === 0);
          if (allFinished) {
            const finalPlayers = applyFinalGameRules(prev.players, prev.finishOrder || []);
            const finalRankings = calculateFinalRankings(finalPlayers, prev.finishOrder || []);
            const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
            
            return {
              ...prev,
              status: GameStatus.FINISHED,
              players: finalPlayers,
              winner: winner.player.id,
              finalRankings
            };
          }
          return prev; // 不应该发生，但作为保护
        }
        
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
      // 立即播放"要不起"语音（在状态更新前，确保能播放）
      const currentPlayerVoice = prev.players[playerIndex]?.voiceConfig;
      if (currentPlayerVoice) {
        console.log('[useMultiPlayerGame] 玩家要不起，立即播放语音:', player.name, 'voiceConfig:', currentPlayerVoice);
        announcePass(currentPlayerVoice).catch(err => {
          console.error('[useMultiPlayerGame] 播放"要不起"语音失败:', err);
        });
      } else {
        console.warn('[useMultiPlayerGame] 玩家要不起，但没有voiceConfig:', player.name, playerIndex);
        // 即使没有voiceConfig，也尝试播放（使用默认语音）
        announcePass(undefined).catch(err => {
          console.error('[useMultiPlayerGame] 播放"要不起"语音失败（无voiceConfig）:', err);
        });
      }

      // 计算下一个玩家，跳过已出完的玩家
      const nextPlayerIndex = findNextActivePlayer(playerIndex, prev.players, prev.playerCount);
      
      // 如果所有玩家都出完了，结束游戏
      if (nextPlayerIndex === null) {
        const allFinished = prev.players.every(p => p.hand.length === 0);
        if (allFinished) {
          const finalPlayers = applyFinalGameRules(prev.players, prev.finishOrder || []);
          const finalRankings = calculateFinalRankings(finalPlayers, prev.finishOrder || []);
          const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
          
          return {
            ...prev,
            status: GameStatus.FINISHED,
            players: finalPlayers,
            winner: winner.player.id,
            finalRankings
          };
        }
        return prev; // 不应该发生，但作为保护
      }

      const newPlayers = [...prev.players];
      
      // 只要有人"要不起"，且本轮有出牌记录（lastPlayPlayerIndex不为null），则强制结束本轮
      if (prev.lastPlayPlayerIndex !== null) {
        // 强制结束本轮，把分数给最后出牌的人
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
          
          // 如果有分数，给最后出牌的人
          if (prev.roundScore > 0) {
            newPlayers[prev.lastPlayPlayerIndex] = {
              ...lastPlayer,
              score: (lastPlayer.score || 0) + prev.roundScore,
              wonRounds: [...(lastPlayer.wonRounds || []), roundRecord]
            };
          }
          
          // 保存轮次记录到allRounds
          const updatedAllRounds = [...(prev.allRounds || []), roundRecord];
          
          // 一轮结束，由赢家开始下一轮（如果赢家已出完，找下一个还在游戏中的玩家）
          const winnerIndex = prev.lastPlayPlayerIndex;
          let nextActivePlayerIndex: number | null;
          if (newPlayers[winnerIndex]?.hand.length > 0) {
            nextActivePlayerIndex = winnerIndex;
          } else {
            nextActivePlayerIndex = findNextActivePlayer(winnerIndex, newPlayers, prev.playerCount);
          }
          
          // 如果所有玩家都出完了，结束游戏
          if (nextActivePlayerIndex === null) {
            const allFinished = newPlayers.every(p => p.hand.length === 0);
            if (allFinished) {
              const finalPlayers = applyFinalGameRules(newPlayers, prev.finishOrder || []);
              const finalRankings = calculateFinalRankings(finalPlayers, prev.finishOrder || []);
              const winner = finalRankings.sort((a, b) => b.finalScore - a.finalScore)[0];
              
              return {
                ...prev,
                status: GameStatus.FINISHED,
                players: finalPlayers,
                winner: winner.player.id,
                finalRankings
              };
            }
            return prev; // 不应该发生，但作为保护
          }
          
          const newState = {
            ...prev,
            players: newPlayers,
            currentPlayerIndex: nextActivePlayerIndex, // 由赢家（或下一个还在游戏中的玩家）开始下一轮
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
          
          // 报牌（系统信息）：必须等待完成才能继续游戏流程
          // 使用之前已声明的 currentPlayerVoice
          announcePass(currentPlayerVoice).then(() => {
            // 报牌完成后，如果下一个玩家是AI，自动继续
          if (newPlayers[nextActivePlayerIndex].type === PlayerType.AI) {
              setTimeout(() => {
                playNextTurn();
              }, announcementDelay); // 报牌完成后等待配置的时间再继续
            }
            }).catch(() => {
            // 如果报牌失败，直接继续（避免卡住游戏）
            if (newPlayers[nextActivePlayerIndex].type === PlayerType.AI) {
              setTimeout(() => {
                playNextTurn();
              }, 1000);
          }
          });
          
          return newState;
        }
      }
      
      // 如果没有lastPlayPlayerIndex（接风状态），继续游戏
      let newLastPlay = prev.lastPlay;
      let newLastPlayPlayerIndex = prev.lastPlayPlayerIndex;
      let newRoundScore = prev.roundScore;

      const newState = {
        ...prev,
        players: newPlayers,
        currentPlayerIndex: nextPlayerIndex,
        lastPlay: newLastPlay,
        lastPlayPlayerIndex: newLastPlayPlayerIndex,
        roundScore: newRoundScore
      };

      // 如果下一个玩家是AI，等待"要不起"语音播放完成后再继续
      // 报"要不起"（系统信息）：立即报牌，不等待完成
      // 使用之前已声明的 currentPlayerVoice（已在状态更新前播放过，这里不再重复播放）
      
      // 1.5秒后，如果下一个玩家是AI，自动继续
      if (prev.players[nextPlayerIndex].type === PlayerType.AI) {
          setTimeout(() => {
            playNextTurn();
        }, 1500);
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
    resetGame,
    isDealing,
    pendingGameConfig,
    handleDealingComplete,
    handleDealingCancel
  };
}

