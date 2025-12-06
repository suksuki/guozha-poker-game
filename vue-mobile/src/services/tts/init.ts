/**
 * TTS服务初始化
 * 从settingsStore加载配置并初始化TTS服务
 */

import { getTTSService } from './ttsService';
import { getMultiChannelAudioService } from '../multiChannelAudioService';
import type { TTSServerConfig } from './types';

/**
 * 初始化TTS服务
 */
export async function initTTSService(servers: TTSServerConfig[]): Promise<void> {
  const ttsService = getTTSService();
  const audioService = getMultiChannelAudioService();
  
  // 添加所有TTS服务器
  servers.forEach(server => {
    if (server.enabled) {
      ttsService.addServer(server);
    }
  });
  
  // 配置音频服务
  audioService.updateConfig({
    enabled: true,
    maxConcurrentPlayers: 3  // 默认最多3个玩家同时发声
  });
}

/**
 * 更新TTS服务配置
 */
export function updateTTSServiceConfig(servers: TTSServerConfig[]): void {
  const ttsService = getTTSService();
  
  // 清除所有现有服务器
  const existingServerIds = ttsService.getServers().map(s => s.id);
  existingServerIds.forEach(id => ttsService.removeServer(id));
  
  // 添加新服务器
  servers.forEach(server => {
    if (server.enabled) {
      ttsService.addServer(server);
    }
  });
  
  // 清空现有服务器
  const currentServers = ttsService.getServers();
  currentServers.forEach(server => {
    ttsService.removeServer(server.id);
  });
  
  // 添加新服务器
  servers.forEach(server => {
    if (server.enabled) {
      ttsService.addServer(server);
    }
  });
}

