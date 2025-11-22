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
}

export function useGameConfig() {
  const [mode, setMode] = useState<GameMode>('game');
  const [playerCount, setPlayerCount] = useState(4);
  const [humanPlayerIndex, setHumanPlayerIndex] = useState(0);
  const [strategy, setStrategy] = useState<'aggressive' | 'conservative' | 'balanced'>('balanced');
  const [algorithm, setAlgorithm] = useState<'simple' | 'mcts'>('mcts');
  
  // 训练模式配置
  const [trainingConfig, setTrainingConfig] = useState<TrainingConfig>({
    gameCount: 1000,
    playerCount: 4,
    mctIterations: 200,
    mctsDepth: 50,
    showProgress: true
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
      aiConfigs
    });
  }, [playerCount, humanPlayerIndex, strategy, algorithm]);

  const [isTraining, setIsTraining] = useState(false);

  const handleStartTraining = useCallback(() => {
    // 切换到训练运行状态
    console.log('useGameConfig: handleStartTraining被调用，设置isTraining为true');
    setIsTraining(true);
  }, []);

  const handleTrainingComplete = useCallback(() => {
    setIsTraining(false);
  }, []);

  const handleTrainingBack = useCallback(() => {
    setIsTraining(false);
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
    trainingConfig,
    setTrainingConfig,
    handleStartGame,
    handleStartTraining,
    isTraining,
    handleTrainingComplete,
    handleTrainingBack
  };
}

