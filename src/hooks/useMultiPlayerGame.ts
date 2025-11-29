/**
 * 多人游戏主 Hook（使用 Game 类重构版）
 * 使用 Game 类统一管理所有游戏数据和状态
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, GameStatus } from '../types/card';
import { dealCards } from '../utils/cardUtils';
import { voiceService } from '../services/voiceService';
import { clearChatMessages } from '../services/chatService';
import { Game } from '../utils/Game';
import { useTrackingModule } from './useTrackingModule';
import { useAudioModule } from './useAudioModule';

export function useMultiPlayerGame() {
  // 使用系统应用模块
  const { initializeTracker, startRound: startTrackingRound, recordPlay: recordTrackingPlay } = useTrackingModule();
  const { announcePlay: announcePlayAudio } = useAudioModule();
  
  // 从 localStorage 读取计分器开关配置（默认关闭）
  const cardTrackerEnabled = (() => {
    const saved = localStorage.getItem('cardTrackerEnabled');
    return saved !== null ? saved === 'true' : false;
  })();

  // 使用 Game 类管理所有游戏数据
  const [game, setGame] = useState<Game>(() => new Game());
  const [, forceUpdate] = useState(0);

  // 设置 Game 的更新回调，自动触发 React 重新渲染
  useEffect(() => {
    game.setOnUpdate(() => {
      forceUpdate(x => x + 1); // 强制触发重新渲染
    });
  }, [game]);

  // 发牌状态
  const [isDealing, setIsDealing] = useState(false);
  const [pendingGameConfig, setPendingGameConfig] = useState<Game['config'] | null>(null);
  
  // 托管状态
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  
  // 同步托管状态到 Game 类
  useEffect(() => {
    game.setAutoPlay(isAutoPlay);
  }, [game, isAutoPlay]);
  
  useEffect(() => {
    game.subscribeControllerCallbacks({
      onScoreChange: () => {},
      onPlayerFinished: () => {},
      onRoundScoreAllocated: () => {},
      onGameEnd: () => {}
    });
  }, [game]);

  // ========== 开始游戏 ==========
  
  const startGameInternal = useCallback((config: Game['config'], hands: Card[][]) => {
    clearChatMessages();

    // 创建新的 Game 实例
    const newGame = new Game(config);
    newGame.setOnUpdate(() => {
      forceUpdate(x => x + 1);
    });
    newGame.setModuleCallbacks({
      recordTrackingPlay,
      announcePlayAudio
    });
    
    // 设置托管状态（在开始游戏前设置，这样 Game 类可以正确初始化调度器）
    newGame.setAutoPlay(isAutoPlay);
    
    // 调用 Game 类的方法开始游戏（所有游戏逻辑都在 Game 类中处理，包括自动出牌）
    newGame.startNewGame(hands);
    
    // 初始化追踪模块（外部模块，需要在 hook 中处理）
    if (cardTrackerEnabled) {
      try {
        initializeTracker(hands, Date.now());
        startTrackingRound(1, newGame.players);
      } catch (error) {
      }
    }
    
    setGame(newGame);
    forceUpdate(x => x + 1);
  }, [cardTrackerEnabled, initializeTracker, startTrackingRound, isAutoPlay]);

  const startGame = useCallback((config: Game['config']) => {
      const hands = dealCards(config.playerCount);
      startGameInternal(config, hands);
  }, [startGameInternal]);

  const handleDealingComplete = useCallback((hands: Card[][]) => {
    if (pendingGameConfig) {
      startGameInternal(pendingGameConfig, hands);
      setPendingGameConfig(null);
    }
    setIsDealing(false);
  }, [pendingGameConfig, startGameInternal]);

  const handleDealingCancel = useCallback(() => {
    setPendingGameConfig(null);
    setIsDealing(false);
  }, []);


  useEffect(() => {
    game.setPlayCallbacks({
      onPlay: async () => false,
      onPass: async () => {},
      isAutoPlay: () => isAutoPlay, // 直接使用状态值
      checkVoiceSpeaking: () => voiceService.isCurrentlySpeaking(),
      waitForVoice: async (initialPlayerIndex: number) => {
        await new Promise<void>((resolve) => {
          const checkInterval = setInterval(() => {
            if (!voiceService.isCurrentlySpeaking() || game.currentPlayerIndex !== initialPlayerIndex) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
        });
      }
    });
  }, [game, isAutoPlay]);

  const resetGame = useCallback(() => {
    game.reset();
    forceUpdate(x => x + 1);
  }, [game]);
  
  const toggleAutoPlay = useCallback(() => {
    setIsAutoPlay(prev => {
      const newValue = !prev;
      
      // 如果开启托管，且当前轮到人类玩家，立即触发自动出牌
      if (newValue && game.status === GameStatus.PLAYING) {
        const currentPlayer = game.players[game.currentPlayerIndex];
        if (currentPlayer && currentPlayer.isHuman) {
          // 延迟触发，确保状态已更新（setAutoPlay 会先执行）
          setTimeout(() => {
            game.triggerAutoPlay();
          }, 300);
        }
      }
      
      return newValue;
    });
  }, [game]);

  return {
    game,
    startGame,
    resetGame,
    isDealing,
    pendingGameConfig,
    handleDealingComplete,
    handleDealingCancel,
    isAutoPlay,
    toggleAutoPlay
  };
}
