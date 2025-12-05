/**
 * TTS 配置 Hook
 * 管理 TTS 配置状态和操作
 */

import { useState, useEffect, useCallback } from 'react';
import { getTTSServiceManager } from '../tts/ttsServiceManager';
import { TTSServerConfig, TTSServerType, createDefaultServerConfig } from '../tts/models/TTSServerConfig';
import { TTSSceneConfig, TTSSceneType } from '../tts/models/TTSSceneConfig';
import { TTSGlobalSettings } from '../tts/models/TTSGlobalSettings';

export function useTTSConfig() {
  const [servers, setServers] = useState<TTSServerConfig[]>([]);
  const [sceneConfig, setSceneConfig] = useState<TTSSceneConfig | null>(null);
  const [globalSettings, setGlobalSettings] = useState<TTSGlobalSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const ttsManager = getTTSServiceManager();
  const serverManager = ttsManager.getServerManager();

  // 加载配置
  useEffect(() => {
    try {
      const loadedServers = serverManager.getAllServers();
      const loadedSceneConfig = ttsManager.getSceneConfig();
      const loadedGlobalSettings = ttsManager.getGlobalSettings();

      setServers(loadedServers);
      setSceneConfig(loadedSceneConfig);
      setGlobalSettings(loadedGlobalSettings);
    } catch (error) {
      console.error('[useTTSConfig] 加载配置失败:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 刷新服务器列表
  const refreshServers = useCallback(() => {
    const updated = serverManager.getAllServers();
    setServers([...updated]);
  }, [serverManager]);

  // 添加服务器
  const addServer = useCallback((config: Partial<TTSServerConfig>) => {
    const id = serverManager.addServer(config as any);
    refreshServers();
    ttsManager.saveAllConfiguration();
    return id;
  }, [serverManager, refreshServers, ttsManager]);

  // 更新服务器
  const updateServer = useCallback((id: string, updates: Partial<TTSServerConfig>) => {
    serverManager.updateServer(id, updates);
    refreshServers();
    ttsManager.saveAllConfiguration();
  }, [serverManager, refreshServers, ttsManager]);

  // 删除服务器
  const removeServer = useCallback((id: string) => {
    serverManager.removeServer(id);
    refreshServers();
    ttsManager.saveAllConfiguration();
  }, [serverManager, refreshServers, ttsManager]);

  // 切换服务器启用状态
  const toggleServer = useCallback((id: string) => {
    serverManager.toggleServer(id);
    refreshServers();
    ttsManager.saveAllConfiguration();
  }, [serverManager, refreshServers, ttsManager]);

  // 切换收藏状态
  const toggleFavorite = useCallback((id: string) => {
    serverManager.toggleFavorite(id);
    refreshServers();
    ttsManager.saveAllConfiguration();
  }, [serverManager, refreshServers, ttsManager]);

  // 测试服务器连接
  const testConnection = useCallback(async (id: string): Promise<boolean> => {
    const result = await serverManager.checkServerHealth(id);
    refreshServers();
    return result.available;
  }, [serverManager, refreshServers]);

  // 测试语音合成
  const testSynthesis = useCallback(async (id: string, text: string = '测试语音合成'): Promise<boolean> => {
    const result = await ttsManager.testServerSynthesis(id, text);
    refreshServers();
    return result;
  }, [ttsManager, refreshServers]);

  // 更新场景配置
  const updateScene = useCallback((scene: TTSSceneType, serverIds: string[]) => {
    if (!sceneConfig) return;

    const sceneKey = `${scene}Sound` as keyof TTSSceneConfig;
    const updated = {
      ...sceneConfig,
      [sceneKey]: {
        ...sceneConfig[sceneKey],
        serverIds
      }
    };

    setSceneConfig(updated);
    ttsManager.updateSceneConfig(updated);
    ttsManager.saveAllConfiguration(); // 确保完整保存
  }, [sceneConfig, ttsManager]);

  // 更新全局设置
  const updateSettings = useCallback((updates: Partial<TTSGlobalSettings>) => {
    if (!globalSettings) return;

    const updated = {
      ...globalSettings,
      ...updates
    };

    setGlobalSettings(updated);
    ttsManager.updateGlobalSettings(updated);
  }, [globalSettings, ttsManager]);

  // 创建默认服务器
  const createDefault = useCallback((type: TTSServerType, name?: string) => {
    const config = createDefaultServerConfig(type, name);
    return addServer(config);
  }, [addServer]);

  return {
    servers,
    sceneConfig,
    globalSettings,
    isLoading,
    
    // 服务器操作
    addServer,
    updateServer,
    removeServer,
    toggleServer,
    toggleFavorite,
    refreshServers,
    
    // 测试
    testConnection,
    testSynthesis,
    
    // 场景配置
    updateScene,
    
    // 全局设置
    updateSettings,
    
    // 便捷方法
    createDefault
  };
}

