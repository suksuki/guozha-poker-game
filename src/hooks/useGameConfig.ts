/**
 * 游戏配置 Hook
 * 管理游戏开始前的配置状态
 */

import { useState, useCallback } from 'react';
import { AIConfig } from '../utils/aiPlayer';
import { TrainingConfig } from '../components/game/TrainingConfigPanel';

export type GameMode = 'game' | 'training';

export interface GameConfigState {
  playerCount: number;
  humanPlayerIndex: number;
  strategy: 'aggressive' | 'conservative' | 'balanced';
  algorithm: 'simple' | 'mcts';
}

export interface GameStartConfig {
  playerCount: number;
  humanPlayerIndex: number;
  aiConfigs: AIConfig[];
  dealingAlgorithm?: 'random' | 'fair' | 'favor-human' | 'favor-ai' | 'balanced-score' | 'clustered';
  skipDealingAnimation?: boolean;
  dealingSpeed?: number;
  sortOrder?: 'asc' | 'desc' | 'grouped';
}

export function useGameConfig() {
  const [mode, setMode] = useState<GameMode>('game');
  const [playerCount, setPlayerCount] = useState(4);
  const [humanPlayerIndex, setHumanPlayerIndex] = useState(0);
  const [strategy, setStrategy] = useState<'aggressive' | 'conservative' | 'balanced'>('balanced');
  const [algorithm, setAlgorithm] = useState<'simple' | 'mcts'>('mcts');
  const [dealingAlgorithm, setDealingAlgorithm] = useState<'random' | 'fair' | 'favor-human' | 'favor-ai' | 'balanced-score' | 'clustered'>('random');
  const [skipDealingAnimation, setSkipDealingAnimation] = useState(false);
  const [dealingSpeed, setDealingSpeed] = useState(150); // 发牌速度（毫秒/张）
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'grouped'>('grouped'); // 排序规则
  
  // 训练模式配置
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>({
    gameCount: 1000,
    playerCount: 4,
    mctIterations: 200,
    mctsDepth: 50,
    showProgress: true,
    autoTune: false, // 默认不自动微调
    tuneGamesPerConfig: 50 // 微调时每个配置50局
  });

  const handleStartGame = useCallback((startGame: (config: GameStartConfig) => void) => {
    // 为每个AI玩家创建配置（使用本地算法，不需要API Key）
    const aiConfigs = Array.from({ length: playerCount }, (_, i) => ({
      apiKey: '', // 不需要API Key
      strategy: strategy,
      algorithm: algorithm || 'mcts' // 使用MCTS或智能策略
    }));

    startGame({
      playerCount,
      humanPlayerIndex,
      aiConfigs,
      dealingAlgorithm,
      skipDealingAnimation,
      dealingSpeed,
      sortOrder
    });
  }, [playerCount, humanPlayerIndex, strategy, algorithm, dealingAlgorithm, skipDealingAnimation, dealingSpeed, sortOrder]);

  const [isTraining, setIsTraining] = useState(false);

  const handleStartTraining = useCallback(() => {
    // 切换到训练运行状态
    console.log('useGameConfig: handleStartTraining被调用，设置isTraining为true');
    setIsTraining(true);
  }, []);

  const handleTrainingComplete = useCallback(() => {
    console.log('handleTrainingComplete被调用，设置isTraining为false');
    setIsTraining((prev) => {
      console.log('handleTrainingComplete: setIsTraining: prev =', prev, '设置为 false');
      return false;
    });
  }, []);

  const handleTrainingBack = useCallback(() => {
    console.log('handleTrainingBack被调用，设置isTraining为false');
    // 使用函数式更新确保状态正确更新
    setIsTraining((prev) => {
      console.log('setIsTraining: prev =', prev, '设置为 false');
      return false;
    });
  }, []);

  return {
    mode,
    setMode,
    playerCount,
    setPlayerCount,
    humanPlayerIndex,
    setHumanPlayerIndex,
    strategy,
    setStrategy,
    algorithm,
    setAlgorithm,
    dealingAlgorithm,
    setDealingAlgorithm,
    skipDealingAnimation,
    setSkipDealingAnimation,
    dealingSpeed,
    setDealingSpeed,
    sortOrder,
    setSortOrder,
    trainingConfig,
    setTrainingConfig,
    handleStartGame,
    handleStartTraining,
    isTraining,
    handleTrainingComplete,
    handleTrainingBack
  };
}

