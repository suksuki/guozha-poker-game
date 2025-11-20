import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Play, GameStatus, Player, PlayerType, Rank, RoundPlayRecord, RoundRecord } from '../types/card';
import { dealCards, canPlayCards, canBeat, hasPlayableCards, findPlayableCards, calculateCardsScore, isScoreCard } from '../utils/cardUtils';
import { aiChoosePlay, AIConfig } from '../utils/aiPlayer';

export interface MultiPlayerGameState {
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  lastPlay: Play | null;
  lastPlayPlayerIndex: number | null;
  winner: number | null;
  playerCount: number;
  totalScore: number; // 总分数（用于验证）
  roundScore: number; // 当前轮次累计的分数
  currentRoundPlays: RoundPlayRecord[]; // 当前轮次的所有出牌记录
  roundNumber: number; // 当前轮次编号
}

export interface GameConfig {
  playerCount: number; // 4-8人
  humanPlayerIndex: number; // 人类玩家在players数组中的索引
  aiConfigs: { apiKey: string; strategy?: 'aggressive' | 'conservative' | 'balanced' }[];
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
    roundNumber: 1
  });

  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // AI自动出牌（下一个回合）
  const playNextTurn = useCallback(async () => {
    const currentState = gameStateRef.current;
    if (currentState.status !== GameStatus.PLAYING) return;

    const currentPlayer = currentState.players[currentState.currentPlayerIndex];
    if (!currentPlayer || currentPlayer.type !== PlayerType.AI) return;
    if (!currentPlayer.aiConfig) return;

    try {
      const aiCards = await aiChoosePlay(
        currentPlayer.hand,
        currentState.lastPlay,
        currentPlayer.aiConfig
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

                const newHand = player.hand.filter(
                  card => !fallbackCards.some(c => c.id === card.id)
                );

                const newPlayers = [...prev.players];
                newPlayers[currentState.currentPlayerIndex] = { ...player, hand: newHand };

                if (newHand.length === 0) {
                  // 游戏结束，把轮次分数给获胜者
                  const finalScore = (player.score || 0) + prev.roundScore + fallbackScore;
                  newPlayers[currentState.currentPlayerIndex] = {
                    ...newPlayers[currentState.currentPlayerIndex],
                    score: finalScore
                  };
                  return {
                    ...prev,
                    status: GameStatus.FINISHED,
                    winner: currentState.currentPlayerIndex,
                    players: newPlayers,
                    lastPlay: fallbackPlay,
                    lastPlayPlayerIndex: currentState.currentPlayerIndex,
                    roundScore: 0,
                    currentRoundPlays: [],
                    roundNumber: prev.roundNumber + 1
                  };
                }

                const nextPlayerIndex = (currentState.currentPlayerIndex + 1) % prev.playerCount;
                const newState = {
                  ...prev,
                  players: newPlayers,
                  currentPlayerIndex: nextPlayerIndex,
                  lastPlay: fallbackPlay,
                  lastPlayPlayerIndex: currentState.currentPlayerIndex,
                  roundScore: prev.roundScore + fallbackScore // 累加轮次分数
                };

                if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
                  setTimeout(() => {
                    playNextTurn();
                  }, 1000);
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
            roundScore: newRoundScore,
            currentRoundPlays: nextPlayerIndex === prev.lastPlayPlayerIndex ? [] : prev.currentRoundPlays, // 重置或保持
            roundNumber: nextPlayerIndex === prev.lastPlayPlayerIndex ? prev.roundNumber + 1 : prev.roundNumber // 新轮次
          };

          if (prev.players[nextPlayerIndex].type === PlayerType.AI) {
            setTimeout(() => {
              playNextTurn();
            }, 1000);
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
              }
            }
            newLastPlay = null;
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

        // 记录这一手出牌
        const playRecord: RoundPlayRecord = {
          playerId: currentState.currentPlayerIndex,
          playerName: player.name,
          cards: aiCards,
          scoreCards: scoreCards,
          score: playScore
        };

        const newHand = player.hand.filter(
          card => !aiCards.some(c => c.id === card.id)
        );

        const newPlayers = [...prev.players];
        newPlayers[currentState.currentPlayerIndex] = { 
          ...player, 
          hand: newHand
        };

        if (newHand.length === 0) {
          // 游戏结束，把轮次分数给获胜者
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
          return {
            ...prev,
            status: GameStatus.FINISHED,
            winner: currentState.currentPlayerIndex,
            players: newPlayers,
            lastPlay: play,
            lastPlayPlayerIndex: currentState.currentPlayerIndex,
            roundScore: 0,
            currentRoundPlays: [],
            roundNumber: prev.roundNumber + 1
          };
        }

        const nextPlayerIndex = (currentState.currentPlayerIndex + 1) % prev.playerCount;
        const newState = {
          ...prev,
          players: newPlayers,
          currentPlayerIndex: nextPlayerIndex,
          lastPlay: play,
          lastPlayPlayerIndex: currentState.currentPlayerIndex,
          roundScore: prev.roundScore + playScore, // 累加轮次分数
          currentRoundPlays: [...prev.currentRoundPlays, playRecord] // 记录这一手出牌
        };

        if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
          setTimeout(() => {
            playNextTurn();
          }, 1000);
        }

        return newState;
      });
    } catch (error) {
      console.error('AI出牌失败:', error);
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
              newPlayers[prev.lastPlayPlayerIndex] = {
                ...lastPlayer,
                score: (lastPlayer.score || 0) + prev.roundScore
              };
            }
          }
          newLastPlay = null;
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
    const hands = dealCards(config.playerCount);

    const players: Player[] = hands.map((hand, index) => ({
      id: index,
      name: index === config.humanPlayerIndex ? '你' : `玩家${index + 1}`,
      type: index === config.humanPlayerIndex ? PlayerType.HUMAN : PlayerType.AI,
      hand: hand,
      score: 0, // 初始分数为0
      isHuman: index === config.humanPlayerIndex,
      aiConfig: index === config.humanPlayerIndex ? undefined : {
        apiKey: config.aiConfigs[index]?.apiKey || config.aiConfigs[0]?.apiKey || '',
        strategy: config.aiConfigs[index]?.strategy || 'balanced'
      }
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
      roundNumber: 1
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

      if (prev.lastPlay && !canBeat(play, prev.lastPlay)) {
        return prev; // 不能压过上家的牌
      }

      // 计算这手牌的分值（累加到轮次分数，不直接给玩家）
      const playScore = calculateCardsScore(selectedCards);
      const scoreCards = selectedCards.filter(card => isScoreCard(card));

      // 记录这一手出牌
      const playRecord: RoundPlayRecord = {
        playerId: playerIndex,
        playerName: player.name,
        cards: selectedCards,
        scoreCards: scoreCards,
        score: playScore
      };

      // 更新玩家手牌
      const newHand = player.hand.filter(
        card => !selectedCards.some(c => c.id === card.id)
      );

      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = { 
        ...player, 
        hand: newHand
      };

      // 检查是否获胜
      if (newHand.length === 0) {
        return {
          ...prev,
          status: GameStatus.FINISHED,
          winner: playerIndex,
          players: newPlayers,
          lastPlay: play,
          lastPlayPlayerIndex: playerIndex,
          roundScore: 0,
          currentRoundPlays: [],
          roundNumber: prev.roundNumber + 1
        };
      }

      // 计算下一个玩家
      const nextPlayerIndex = (playerIndex + 1) % prev.playerCount;

      const newState = {
        ...prev,
        players: newPlayers,
        currentPlayerIndex: nextPlayerIndex,
        lastPlay: play,
        lastPlayPlayerIndex: playerIndex
      };

      // 如果下一个玩家是AI，自动出牌
      if (newPlayers[nextPlayerIndex].type === PlayerType.AI) {
        setTimeout(() => {
          playNextTurn();
        }, 1000);
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

      // 强制出牌规则：如果有能打过的牌，不能要不起
      if (prev.lastPlay) {
        const hasPlayable = hasPlayableCards(player.hand, prev.lastPlay);
        if (hasPlayable) {
          // 有能打过的牌，不允许要不起
          return prev; // 不更新状态，保持当前状态
        }
      }

      // 计算下一个玩家
      const nextPlayerIndex = (playerIndex + 1) % prev.playerCount;

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

      // 如果下一个玩家是AI，自动出牌
      if (prev.players[nextPlayerIndex].type === PlayerType.AI) {
        setTimeout(() => {
          playNextTurn();
        }, 1000);
      }

      return newState;
    });
  }, [playNextTurn]);


  // 使用OpenAI辅助玩家出牌
  const suggestPlay = useCallback(async (
    playerIndex: number,
    aiConfig: AIConfig
  ): Promise<Card[] | null> => {
    const currentState = gameStateRef.current;
    const player = currentState.players[playerIndex];
    if (!player) return null;

    try {
      const suggestedCards = await aiChoosePlay(
        player.hand,
        currentState.lastPlay,
        aiConfig
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
      roundNumber: 1
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

