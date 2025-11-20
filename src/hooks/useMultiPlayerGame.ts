import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Play, GameStatus, Player, PlayerType } from '../types/card';
import { dealCards, canPlayCards, canBeat } from '../utils/cardUtils';
import { aiChoosePlay, AIConfig } from '../utils/aiPlayer';

export interface MultiPlayerGameState {
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  lastPlay: Play | null;
  lastPlayPlayerIndex: number | null;
  winner: number | null;
  playerCount: number;
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
    playerCount: 0
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

      if (!aiCards || aiCards.length === 0) {
        // AI要不起
        setGameState(prev => {
          if (prev.status !== GameStatus.PLAYING) return prev;
          if (prev.currentPlayerIndex !== currentState.currentPlayerIndex) return prev;

          const nextPlayerIndex = (prev.currentPlayerIndex + 1) % prev.playerCount;
          let newLastPlay = prev.lastPlay;
          let newLastPlayPlayerIndex = prev.lastPlayPlayerIndex;
          if (nextPlayerIndex === prev.lastPlayPlayerIndex) {
            newLastPlay = null;
            newLastPlayPlayerIndex = null;
          }

          const newState = {
            ...prev,
            currentPlayerIndex: nextPlayerIndex,
            lastPlay: newLastPlay,
            lastPlayPlayerIndex: newLastPlayPlayerIndex
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
          if (nextPlayerIndex === prev.lastPlayPlayerIndex) {
            newLastPlay = null;
            newLastPlayPlayerIndex = null;
          }
          return {
            ...prev,
            currentPlayerIndex: nextPlayerIndex,
            lastPlay: newLastPlay,
            lastPlayPlayerIndex: newLastPlayPlayerIndex
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

        const newHand = player.hand.filter(
          card => !aiCards.some(c => c.id === card.id)
        );

        const newPlayers = [...prev.players];
        newPlayers[currentState.currentPlayerIndex] = { ...player, hand: newHand };

        if (newHand.length === 0) {
          return {
            ...prev,
            status: GameStatus.FINISHED,
            winner: currentState.currentPlayerIndex,
            players: newPlayers,
            lastPlay: play,
            lastPlayPlayerIndex: currentState.currentPlayerIndex
          };
        }

        const nextPlayerIndex = (currentState.currentPlayerIndex + 1) % prev.playerCount;
        const newState = {
          ...prev,
          players: newPlayers,
          currentPlayerIndex: nextPlayerIndex,
          lastPlay: play,
          lastPlayPlayerIndex: currentState.currentPlayerIndex
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
        if (nextPlayerIndex === prev.lastPlayPlayerIndex) {
          newLastPlay = null;
          newLastPlayPlayerIndex = null;
        }
        return {
          ...prev,
          currentPlayerIndex: nextPlayerIndex,
          lastPlay: newLastPlay,
          lastPlayPlayerIndex: newLastPlayPlayerIndex
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
      isHuman: index === config.humanPlayerIndex,
      aiConfig: index === config.humanPlayerIndex ? undefined : {
        apiKey: config.aiConfigs[index]?.apiKey || config.aiConfigs[0]?.apiKey || '',
        strategy: config.aiConfigs[index]?.strategy || 'balanced'
      }
    }));

    // 随机决定谁先出牌
    const firstPlayer = Math.floor(Math.random() * config.playerCount);

    setGameState({
      status: GameStatus.PLAYING,
      players,
      currentPlayerIndex: firstPlayer,
      lastPlay: null,
      lastPlayPlayerIndex: null,
      winner: null,
      playerCount: config.playerCount
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

      // 更新玩家手牌
      const newHand = player.hand.filter(
        card => !selectedCards.some(c => c.id === card.id)
      );

      const newPlayers = [...prev.players];
      newPlayers[playerIndex] = { ...player, hand: newHand };

      // 检查是否获胜
      if (newHand.length === 0) {
        return {
          ...prev,
          status: GameStatus.FINISHED,
          winner: playerIndex,
          players: newPlayers,
          lastPlay: play,
          lastPlayPlayerIndex: playerIndex
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

  // 玩家要不起
  const playerPass = useCallback((playerIndex: number) => {
    setGameState(prev => {
      if (prev.status !== GameStatus.PLAYING) return prev;
      if (prev.currentPlayerIndex !== playerIndex) return prev;

      // 计算下一个玩家
      const nextPlayerIndex = (playerIndex + 1) % prev.playerCount;

      // 如果下一个玩家是上家出牌的人，清空lastPlay
      let newLastPlay = prev.lastPlay;
      let newLastPlayPlayerIndex = prev.lastPlayPlayerIndex;
      if (nextPlayerIndex === prev.lastPlayPlayerIndex) {
        newLastPlay = null;
        newLastPlayPlayerIndex = null;
      }

      const newState = {
        ...prev,
        currentPlayerIndex: nextPlayerIndex,
        lastPlay: newLastPlay,
        lastPlayPlayerIndex: newLastPlayPlayerIndex
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
      playerCount: 0
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

