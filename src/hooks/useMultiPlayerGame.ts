/**
 * 多人游戏主 Hook（使用 Game 类重构版）
 * 使用 Game 类统一管理所有游戏数据和状态
 */

import { useState, useCallback, useEffect } from 'react';
import { Card } from '../types/card';
import { Game } from '../utils/Game';

export function useMultiPlayerGame() {

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
  
  // 托管状态（从 Game 类读取）
  const isAutoPlay = game.getAutoPlay();

  // ========== 开始游戏 ==========
  
  // 辅助函数：创建新游戏并设置 React 更新回调
  const createAndSetupGame = useCallback((newGame: Game) => {
    // 设置更新回调（React 特有的逻辑，需要在 hook 中处理）
    newGame.setOnUpdate(() => {
      forceUpdate(x => x + 1);
    });
    setGame(newGame);
    forceUpdate(x => x + 1);
  }, [forceUpdate]);
  
  const startGame = useCallback((config: Game['config']) => {
    // 使用 Game 类的静态方法自动发牌并开始游戏
    // 追踪模块初始化已在 Game.startGameWithDealing -> createAndStartNewGame 中处理
    const newGame = Game.startGameWithDealing(config, game.getAutoPlay());
    createAndSetupGame(newGame);
  }, [game, createAndSetupGame]);

  const handleDealingComplete = useCallback((hands: Card[][]) => {
    if (pendingGameConfig) {
      // 使用 Game 类的静态方法处理发牌完成
      const newGame = Game.handleDealingComplete(pendingGameConfig, hands, game.getAutoPlay());
      createAndSetupGame(newGame);
      setPendingGameConfig(null);
    }
    setIsDealing(false);
  }, [pendingGameConfig, game, createAndSetupGame]);

  const handleDealingCancel = useCallback(() => {
    // 调用 Game 类的静态方法（保持 API 一致性，虽然这里主要是 React 状态管理）
    Game.handleDealingCancel();
    // React 状态管理（需要在 hook 中处理）
    setPendingGameConfig(null);
    setIsDealing(false);
  }, []);


  const resetGame = useCallback(() => {
    game.reset();
    // reset() 方法内部已经调用了 triggerUpdate()，这里不需要再次 forceUpdate
  }, [game]);
  
  const toggleAutoPlay = useCallback(() => {
    game.toggleAutoPlay();
    // toggleAutoPlay() 方法内部已经处理了所有逻辑，包括触发更新
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
