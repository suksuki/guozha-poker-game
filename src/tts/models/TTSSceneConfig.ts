/**
 * TTS 场景配置模型
 */

/**
 * TTS 场景类型
 */
export type TTSSceneType = 'system' | 'chat' | 'announcement' | 'dialogue';

/**
 * 场景 TTS 配置
 */
export interface SceneTTSConfig {
  serverIds: string[];               // 按优先级排序的服务器ID列表
  fallbackToBrowser: boolean;        // 是否回退到浏览器TTS
}

/**
 * 每个玩家的 TTS 配置
 */
export interface PerPlayerTTSConfig {
  [playerId: string]: string[];      // 玩家ID -> 服务器ID列表
}

/**
 * TTS 场景配置
 */
export interface TTSSceneConfig {
  // 系统音效（过、要不起、出牌提示等）
  systemSound: SceneTTSConfig;
  
  // 聊天语音（AI玩家聊天）
  chatSound: SceneTTSConfig & {
    perPlayerConfig?: PerPlayerTTSConfig; // 每个玩家可配置不同的TTS
  };
  
  // 报牌语音（大小王、同花顺等）
  announcementSound: SceneTTSConfig;
  
  // AI对话音（想法生成、策略分析等）
  aiDialogueSound: SceneTTSConfig;
}

/**
 * 默认场景配置
 */
export const DEFAULT_SCENE_CONFIG: TTSSceneConfig = {
  systemSound: {
    serverIds: [],                   // 空数组表示使用全局优先级
    fallbackToBrowser: true
  },
  chatSound: {
    serverIds: [],
    fallbackToBrowser: true
  },
  announcementSound: {
    serverIds: [],
    fallbackToBrowser: true
  },
  aiDialogueSound: {
    serverIds: [],
    fallbackToBrowser: true
  }
};

/**
 * 场景显示名称映射
 */
export const SCENE_DISPLAY_NAMES: Record<TTSSceneType, string> = {
  system: '系统音效',
  chat: '聊天语音',
  announcement: '报牌语音',
  dialogue: 'AI对话音'
};

/**
 * 场景描述映射
 */
export const SCENE_DESCRIPTIONS: Record<TTSSceneType, string> = {
  system: '过、要不起、出牌提示等系统音效',
  chat: 'AI玩家的聊天对话内容',
  announcement: '大小王、同花顺等牌型播报',
  dialogue: '想法生成、策略分析等AI对话'
};

/**
 * 场景图标映射
 */
export const SCENE_ICONS: Record<TTSSceneType, string> = {
  system: '🔔',
  chat: '💬',
  announcement: '📢',
  dialogue: '🤖'
};

/**
 * 获取场景的TTS配置
 */
export function getSceneConfig(
  sceneConfig: TTSSceneConfig,
  scene: TTSSceneType
): SceneTTSConfig {
  const sceneKey = `${scene}Sound` as keyof TTSSceneConfig;
  return sceneConfig[sceneKey];
}

/**
 * 更新场景的TTS配置
 */
export function updateSceneConfig(
  sceneConfig: TTSSceneConfig,
  scene: TTSSceneType,
  updates: Partial<SceneTTSConfig>
): TTSSceneConfig {
  const sceneKey = `${scene}Sound` as keyof TTSSceneConfig;
  return {
    ...sceneConfig,
    [sceneKey]: {
      ...sceneConfig[sceneKey],
      ...updates
    }
  };
}

