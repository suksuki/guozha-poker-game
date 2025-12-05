/**
 * 游戏配置 Hook
 * 管理游戏开始前的配置状态
 */

import { useState, useCallback } from 'react';
import { AIConfig } from '../utils/aiPlayer';
import { TrainingConfig } from '../components/game/TrainingConfigPanel';
import { updateChatLLMConfig } from '../services/chatService';

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
  dealingAlgorithm?: 'random' | 'fair' | 'favor-human' | 'favor-ai' | 'balanced-score' | 'clustered' | 'bomb-friendly' | 'monte-carlo';
  skipDealingAnimation?: boolean;
  dealingSpeed?: number;
  sortOrder?: 'asc' | 'desc' | 'grouped';
  teamMode?: boolean;  // 团队模式（4人或6人时启用）
}

export function useGameConfig() {
  const [mode, setMode] = useState<GameMode>('game');
  const [playerCount, setPlayerCount] = useState(4);
  const [humanPlayerIndex, setHumanPlayerIndex] = useState(0);
  const [strategy, setStrategy] = useState<'aggressive' | 'conservative' | 'balanced'>('balanced');
  const [algorithm, setAlgorithm] = useState<'simple' | 'mcts'>('mcts');
  const [dealingAlgorithm, setDealingAlgorithm] = useState<'random' | 'fair' | 'favor-human' | 'favor-ai' | 'balanced-score' | 'clustered' | 'bomb-friendly' | 'monte-carlo'>('random');
  const [skipDealingAnimation, setSkipDealingAnimation] = useState(false);
  const [dealingSpeed, setDealingSpeed] = useState(150); // 发牌速度（毫秒/张）
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | 'grouped'>('grouped'); // 排序规则
  
  // 团队模式（从 localStorage 读取，默认关闭）
  const [teamMode, setTeamMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('teamMode');
    return saved !== null ? saved === 'true' : false; // 默认关闭
  });

  // 更新团队模式并保存到 localStorage
  const updateTeamMode = useCallback((enabled: boolean) => {
    setTeamMode(enabled);
    localStorage.setItem('teamMode', enabled.toString());
  }, []);
  
  // LLM聊天配置
  const [llmModel, setLlmModel] = useState<string>(() => {
    const saved = localStorage.getItem('llmModel');
    return saved || 'qwen2:0.5b'; // 默认模型
  });
  
  // 更新 LLM 模型并保存到 localStorage
  const updateLlmModel = useCallback((model: string) => {
    setLlmModel(model);
    localStorage.setItem('llmModel', model);
  }, []);
  const [llmApiUrl, setLlmApiUrl] = useState<string>(() => {
    const saved = localStorage.getItem('llmApiUrl');
    return saved || 'http://115.93.10.51:11434/api/chat'; // 默认使用公司服务器
  });
  
  // 更新 LLM API URL 并保存到 localStorage
  const updateLlmApiUrl = useCallback((url: string) => {
    setLlmApiUrl(url);
    localStorage.setItem('llmApiUrl', url);
  }, []);
  
  // 想法生成开关（从 localStorage 读取，默认开启）
  const [ideaGenerationEnabled, setIdeaGenerationEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('ideaGenerationEnabled');
    return saved !== null ? saved === 'true' : true; // 默认开启
  });
  
  // 更新想法生成开关并保存到 localStorage
  const updateIdeaGenerationEnabled = useCallback((enabled: boolean) => {
    setIdeaGenerationEnabled(enabled);
    localStorage.setItem('ideaGenerationEnabled', enabled.toString());
  }, []);
  
  // 计分器开关（从 localStorage 读取，默认关闭）
  const [cardTrackerEnabled, setCardTrackerEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('cardTrackerEnabled');
    return saved !== null ? saved === 'true' : false; // 默认关闭
  });
  
  // 更新计分器开关并保存到 localStorage
  const updateCardTrackerEnabled = useCallback((enabled: boolean) => {
    setCardTrackerEnabled(enabled);
    localStorage.setItem('cardTrackerEnabled', enabled.toString());
  }, []);
  
  // 记牌器面板显示开关（从 localStorage 读取，默认关闭）
  const [cardTrackerPanelVisible, setCardTrackerPanelVisible] = useState<boolean>(() => {
    const saved = localStorage.getItem('cardTrackerPanelVisible');
    return saved !== null ? saved === 'true' : false; // 默认关闭
  });
  
  // 更新记牌器面板显示开关并保存到 localStorage
  const updateCardTrackerPanelVisible = useCallback((visible: boolean) => {
    setCardTrackerPanelVisible(visible);
    localStorage.setItem('cardTrackerPanelVisible', visible.toString());
  }, []);

  // 超时时间（从 localStorage 读取，默认30秒）
  const [playTimeout, setPlayTimeout] = useState<number>(() => {
    const saved = localStorage.getItem('playTimeout');
    return saved !== null ? parseInt(saved, 10) : 30000; // 默认30秒
  });

  // 更新超时时间并保存到 localStorage
  const updatePlayTimeout = useCallback((timeout: number) => {
    setPlayTimeout(timeout);
    localStorage.setItem('playTimeout', timeout.toString());
  }, []);

  // 报牌后延迟时间（从 localStorage 读取，默认1000毫秒）
  const [announcementDelay, setAnnouncementDelay] = useState<number>(() => {
    const saved = localStorage.getItem('announcementDelay');
    return saved !== null ? parseInt(saved, 10) : 1000; // 默认1000毫秒
  });

  // 更新报牌后延迟时间并保存到 localStorage
  const updateAnnouncementDelay = useCallback((delay: number) => {
    setAnnouncementDelay(delay);
    localStorage.setItem('announcementDelay', delay.toString());
  }, []);

  // 关单/关双提示开关（从 localStorage 读取，默认关闭）
  const [guanDanWarningEnabled, setGuanDanWarningEnabled] = useState<boolean>(() => {
    const saved = localStorage.getItem('guanDanWarningEnabled');
    return saved !== null ? saved === 'true' : false; // 默认关闭
  });

  // 更新关单/关双提示开关并保存到 localStorage
  const updateGuanDanWarningEnabled = useCallback((enabled: boolean) => {
    setGuanDanWarningEnabled(enabled);
    localStorage.setItem('guanDanWarningEnabled', enabled.toString());
  }, []);
  
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
    // 更新聊天服务的LLM配置
    updateChatLLMConfig({
      model: llmModel,
      apiUrl: llmApiUrl,
      enableMultilingual: true  // 🔥 启用多语言：LLM直接用目标语言回答
    });

    // 为每个AI玩家创建配置（使用本地算法，不需要API Key）
    const aiConfigs = Array.from({ length: playerCount }, () => ({
      apiKey: '', // 不需要API Key
      strategy: strategy,
      algorithm: algorithm || 'mcts' // 使用MCTS或智能策略
    }));

    // 如果启用团队模式，检查玩家数量是否为4或6
    const shouldEnableTeamMode = teamMode && (playerCount === 4 || playerCount === 6);
    
    startGame({
      playerCount,
      humanPlayerIndex,
      aiConfigs,
      dealingAlgorithm,
      skipDealingAnimation,
      dealingSpeed,
      sortOrder,
      teamMode: shouldEnableTeamMode
    });
  }, [playerCount, humanPlayerIndex, strategy, algorithm, dealingAlgorithm, skipDealingAnimation, dealingSpeed, sortOrder, llmModel, llmApiUrl, teamMode]);

  const [isTraining, setIsTraining] = useState(false);

  const handleStartTraining = useCallback(() => {
    // 切换到训练运行状态
    setIsTraining(true);
  }, []);

  const handleTrainingComplete = useCallback(() => {
    setIsTraining((prev) => {
      return false;
    });
  }, []);

  const handleTrainingBack = useCallback(() => {
    // 使用函数式更新确保状态正确更新
    setIsTraining((prev) => {
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
    llmModel,
    setLlmModel: updateLlmModel,
    llmApiUrl,
    setLlmApiUrl: updateLlmApiUrl,
    ideaGenerationEnabled,
    setIdeaGenerationEnabled: updateIdeaGenerationEnabled,
    cardTrackerEnabled,
    setCardTrackerEnabled: updateCardTrackerEnabled,
    cardTrackerPanelVisible,
    setCardTrackerPanelVisible: updateCardTrackerPanelVisible,
    playTimeout,
    setPlayTimeout: updatePlayTimeout,
    announcementDelay,
    setAnnouncementDelay: updateAnnouncementDelay,
    teamMode,
    setTeamMode: updateTeamMode,
    guanDanWarningEnabled,
    setGuanDanWarningEnabled: updateGuanDanWarningEnabled,
    trainingConfig,
    setTrainingConfig,
    handleStartGame,
    handleStartTraining,
    isTraining,
    handleTrainingComplete,
    handleTrainingBack
  };
}

