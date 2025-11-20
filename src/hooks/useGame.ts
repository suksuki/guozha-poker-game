import { useState, useCallback, useEffect, useRef } from 'react';
import { Card, Play, GameStatus, PlayerType } from '../types/card';
import { createDeck, shuffleDeck, dealCards, canPlayCards, canBeat } from '../utils/cardUtils';
import { aiChoosePlay, AIConfig } from '../utils/aiPlayer';

export interface GameState {
  status: GameStatus;
  playerHand: Card[];
  aiHand: Card[];
  currentPlayer: PlayerType;
  lastPlay: Play | null;
  winner: PlayerType | null;
  aiConfig: AIConfig | null;
}

export function useGame() {
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.WAITING,
    playerHand: [],
    aiHand: [],
    currentPlayer: PlayerType.HUMAN,
    lastPlay: null,
    winner: null,
    aiConfig: null
  });

  // 使用ref来获取最新的gameState
  const gameStateRef = useRef(gameState);
  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  // 开始新游戏
  const startGame = useCallback((aiConfig: AIConfig) => {
    const deck = shuffleDeck(createDeck());
    const { playerCards, aiCards } = dealCards(deck);

    setGameState({
      status: GameStatus.PLAYING,
      playerHand: playerCards,
      aiHand: aiCards,
      currentPlayer: PlayerType.HUMAN, // 玩家先出
      lastPlay: null,
      winner: null,
      aiConfig
    });
  }, []);

  // 玩家出牌
  const playerPlay = useCallback((selectedCards: Card[]) => {
    setGameState(prev => {
      if (prev.status !== GameStatus.PLAYING) return prev;
      if (prev.currentPlayer !== PlayerType.HUMAN) return prev;

      const play = canPlayCards(selectedCards);
      if (!play) return prev;

      if (prev.lastPlay && !canBeat(play, prev.lastPlay)) {
        return prev; // 不能压过上家的牌
      }

      // 更新游戏状态
      const newPlayerHand = prev.playerHand.filter(
        card => !selectedCards.some(c => c.id === card.id)
      );

      // 检查是否获胜
      if (newPlayerHand.length === 0) {
        return {
          ...prev,
          status: GameStatus.FINISHED,
          winner: PlayerType.HUMAN,
          playerHand: newPlayerHand,
          lastPlay: play
        };
      }

      // 轮到AI
      const newState = {
        ...prev,
        playerHand: newPlayerHand,
        currentPlayer: PlayerType.AI,
        lastPlay: play
      };

      // AI自动出牌
      setTimeout(() => {
        aiPlay();
      }, 1000);

      return newState;
    });

    return true;
  }, [aiPlay]);

  // AI出牌
  const aiPlay = useCallback(async () => {
    const currentState = gameStateRef.current;
    if (currentState.status !== GameStatus.PLAYING) return;
    if (currentState.currentPlayer !== PlayerType.AI) return;
    if (!currentState.aiConfig) return;

    try {
      const aiCards = await aiChoosePlay(
        currentState.aiHand,
        currentState.lastPlay,
        currentState.aiConfig
      );

      if (!aiCards || aiCards.length === 0) {
        // AI要不起，轮到玩家
        setGameState(prev => ({
          ...prev,
          currentPlayer: PlayerType.HUMAN,
          lastPlay: null // 清空上家出牌，玩家可以出任意牌
        }));
        return;
      }

      const play = canPlayCards(aiCards);
      if (!play) return;

      setGameState(prev => {
        const newAiHand = prev.aiHand.filter(
          card => !aiCards.some(c => c.id === card.id)
        );

        // 检查AI是否获胜
        if (newAiHand.length === 0) {
          return {
            ...prev,
            status: GameStatus.FINISHED,
            winner: PlayerType.AI,
            aiHand: newAiHand,
            lastPlay: play
          };
        }

        // 轮到玩家
        return {
          ...prev,
          aiHand: newAiHand,
          currentPlayer: PlayerType.HUMAN,
          lastPlay: play
        };
      });
    } catch (error) {
      console.error('AI出牌失败:', error);
      // AI要不起
      setGameState(prev => ({
        ...prev,
        currentPlayer: PlayerType.HUMAN,
        lastPlay: null
      }));
    }
  }, []);

  // 玩家要不起
  const playerPass = useCallback(() => {
    setGameState(prev => {
      if (prev.status !== GameStatus.PLAYING) return prev;
      if (prev.currentPlayer !== PlayerType.HUMAN) return prev;

      // 轮到AI
      const newState = {
        ...prev,
        currentPlayer: PlayerType.AI,
        lastPlay: null
      };

      // AI自动出牌
      setTimeout(() => {
        aiPlay();
      }, 1000);

      return newState;
    });
  }, [aiPlay]);

  // 重置游戏
  const resetGame = useCallback(() => {
    setGameState({
      status: GameStatus.WAITING,
      playerHand: [],
      aiHand: [],
      currentPlayer: PlayerType.HUMAN,
      lastPlay: null,
      winner: null,
      aiConfig: null
    });
  }, []);

  return {
    gameState,
    startGame,
    playerPlay,
    playerPass,
    resetGame
  };
}

