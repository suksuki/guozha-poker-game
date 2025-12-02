/**
 * 游戏配置 Hook
 * 管理游戏开始前的配置状态
 */

import { useState, useCallback, useEffect } from 'react';
import { AIConfig } from '../utils/aiPlayer';
import { TrainingConfig } from '../components/game/TrainingConfigPanel';
import { updateChatLLMConfig } from '../services/chatService';
import { getOllamaServerManager, OllamaServerConfig } from '../services/llm/OllamaServerManager';
import { getLLMAvailabilityManager, LLMAvailability } from '../services/llm/LLMAvailabilityManager';
import { saveConfig, loadConfig, testStorage } from '../utils/persistentConfig';

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
  const [dealingAlgorithm, setDealingAlgorithm] = useState<'random' | 'fair' | 'favor-human' | 'favor-ai' | 'balanced-score' | 'clustered'>('random');
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
  
  // LLM 服务器管理（使用单例）
  const [serverManager] = useState(() => getOllamaServerManager());
  const [availabilityManager] = useState(() => getLLMAvailabilityManager());
  
  // LLM 服务器配置（从单例获取）
  const [currentServer, setCurrentServer] = useState<OllamaServerConfig>(() => {
    return serverManager.getCurrentServer();
  });
  
  // LLM聊天配置
  const [llmModel, setLlmModel] = useState<string>(() => {
    const saved = loadConfig('llmModel');
    console.log('🔍 加载 LLM 模型:', saved || '使用默认值');
    return saved || 'qwen2.5:3b';  // 🔥 使用更通用的默认值
  }); // 当前选择的LLM模型
  
  const [llmApiUrl, setLlmApiUrl] = useState<string>(() => {
    const saved = loadConfig('llmApiUrl');
    if (saved) {
      return saved;
    }
    return serverManager.getServerApiUrl(currentServer);
  }); // LLM API地址
  
  // LLM 可用性状态
  const [llmAvailability, setLlmAvailability] = useState<LLMAvailability>('unknown');
  
  // LLM 功能开关（用户可手动禁用）
  const [llmEnabled, setLlmEnabled] = useState<boolean>(() => {
    const saved = loadConfig('llmEnabled');
    return saved !== null ? saved === 'true' : true; // 默认启用
  });
  
  // 更新 LLM 功能开关
  const updateLlmEnabled = useCallback((enabled: boolean) => {
    setLlmEnabled(enabled);
    saveConfig('llmEnabled', enabled.toString());
  }, []);
  
  // 更新 LLM 模型（带持久化）
  const updateLlmModel = useCallback((model: string) => {
    console.log('🔧 保存 LLM 模型:', model);
    setLlmModel(model);
    const success = saveConfig('llmModel', model);
    if (!success) {
      console.error('❌ 保存 LLM 模型失败');
    }
    // 同时更新 chatService 的配置
    updateChatLLMConfig({
      model: model,
      apiUrl: llmApiUrl
    });
  }, [llmApiUrl]);
  
  // 判断是否应该使用 LLM
  const shouldUseLLM = llmEnabled && llmAvailability === 'available';
  
  // 切换服务器
  const switchServer = useCallback((serverId: string) => {
    console.log('🔧 切换服务器:', serverId);
    const success = serverManager.setCurrentServer(serverId);
    if (success) {
      const newServer = serverManager.getCurrentServer();
      setCurrentServer(newServer);
      
      console.log('✅ 当前服务器:', newServer.name, `(${newServer.host}:${newServer.port})`);
      
      // 更新 API URL
      const newApiUrl = serverManager.getServerApiUrl(newServer);
      setLlmApiUrl(newApiUrl);
      console.log('✅ API URL 已更新:', newApiUrl);
      
      // 🔥 保存 API URL 到 localStorage
      saveConfig('llmApiUrl', newApiUrl);
      
      // 更新 chatService 配置
      updateChatLLMConfig({
        model: llmModel,
        apiUrl: newApiUrl
      });
      
      // 重置可用性状态，需要重新检测
      setLlmAvailability('unknown');
    } else {
      console.error('❌ 切换服务器失败:', serverId);
    }
    return success;
  }, [serverManager, llmModel]);
  
  // 添加服务器
  const addServer = useCallback((config: Partial<OllamaServerConfig>) => {
    const newServer = serverManager.addServer(config);
    return newServer;
  }, [serverManager]);
  
  // 删除服务器
  const removeServer = useCallback((serverId: string) => {
    return serverManager.removeServer(serverId);
  }, [serverManager]);
  
  // 收藏服务器
  const toggleServerFavorite = useCallback((serverId: string) => {
    return serverManager.toggleFavorite(serverId);
  }, [serverManager]);
  
  // 获取所有服务器
  const getAllServers = useCallback(() => {
    return serverManager.getAllServers();
  }, [serverManager]);
  
  // 获取最近使用的服务器
  const getRecentServers = useCallback((limit?: number) => {
    return serverManager.getRecentServers(limit);
  }, [serverManager]);
  
  // 检测服务器可用性
  const checkServerAvailability = useCallback(async (server: OllamaServerConfig, forceCheck: boolean = false) => {
    setLlmAvailability('checking');
    const serverUrl = serverManager.getServerUrl(server);
    const isAvailable = await availabilityManager.checkAvailability(serverUrl, forceCheck);
    
    const newStatus: LLMAvailability = isAvailable ? 'available' : 'unavailable';
    setLlmAvailability(newStatus);
    
    // 更新服务器状态
    serverManager.updateServerStatus(server.id, {
      available: isAvailable,
      latency: availabilityManager.getLatency(serverUrl)
    });
    
    return isAvailable;
  }, [serverManager, availabilityManager]);
  
  // 初始化时同步配置到 chatService
  useEffect(() => {
    console.log('🔄 初始化 LLM 配置...');
    
    // 确保使用保存的服务器配置
    const savedServer = serverManager.getCurrentServer();
    const savedApiUrl = serverManager.getServerApiUrl(savedServer);
    
    console.log('📦 从 localStorage 加载:');
    console.log('   - 模型:', llmModel);
    console.log('   - 服务器:', savedServer.name, `(${savedServer.host}:${savedServer.port})`);
    console.log('   - API URL:', savedApiUrl);
    
    if (savedServer.id !== currentServer.id) {
      console.log('🔧 更新当前服务器为保存的服务器');
      setCurrentServer(savedServer);
      setLlmApiUrl(savedApiUrl);
    }
    
    // 同步配置到 chatService（使用保存的值）
    updateChatLLMConfig({
      model: llmModel,
      apiUrl: savedApiUrl
    });
    
    console.log('✅ LLM 配置初始化完成');
  }, [serverManager]); // 依赖 serverManager
  
  // 初始化时自动检测当前服务器
  useEffect(() => {
    if (llmEnabled && llmAvailability === 'unknown') {
      checkServerAvailability(currentServer, false);
    }
  }, [llmEnabled, currentServer]); // 只在初始化和服务器切换时检测
  
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
      apiUrl: llmApiUrl
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
    setLlmApiUrl,
    llmEnabled,
    setLlmEnabled: updateLlmEnabled,
    llmAvailability,
    shouldUseLLM,
    currentServer,
    switchServer,
    addServer,
    removeServer,
    toggleServerFavorite,
    getAllServers,
    getRecentServers,
    checkServerAvailability,
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
    trainingConfig,
    setTrainingConfig,
    handleStartGame,
    handleStartTraining,
    isTraining,
    handleTrainingComplete,
    handleTrainingBack
  };
}

