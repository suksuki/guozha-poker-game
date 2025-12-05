/**
 * AI Brain 配置管理
 */

import { BrainConfig, PersonalityConfig, ModuleConfigs } from '../core/types';

/**
 * 默认配置
 */
export const DEFAULT_BRAIN_CONFIG: BrainConfig = {
  personality: {
    preset: 'balanced'
  },
  
  modules: {
    mcts: {
      enabled: true,
      baseWeight: 0.7,
      weightRules: [
        { condition: 'simple_situation', weight: 0.9 },
        { condition: 'late_game', weight: 0.8 }
      ],
      options: {
        iterations: 1000,
        explorationConstant: 1.414
      }
    },
    
    rule: {
      enabled: true,
      baseWeight: 0.3,
      weightRules: [
        { condition: 'early_game', weight: 0.5 }
      ]
    },
    
    llm: {
      enabled: false,  // 默认禁用，需要手动启用
      baseWeight: 0.5,
      weightRules: [
        { condition: 'complex_situation', weight: 0.7 },
        { condition: 'team_mode', weight: 0.6 }
      ],
      options: {
        provider: 'local',
        model: 'qwen2.5-7b',
        endpoint: 'http://localhost:11434',
        temperature: 0.7,
        maxTokens: 500
      }
    }
  },
  
  fusion: {
    strategy: 'weighted_average',
    dynamicWeighting: true,
    learningRate: 0.01,
    minConfidence: 0.3
  },
  
  communication: {
    enabled: true,
    tacticalEnabled: true,
    signalStyle: 'moderate',
    socialEnabled: true,
    chatFrequency: 0.5,
    usePersonality: true,
    emotionExpression: true
  },
  
  learning: {
    enabled: true,
    collectData: true,
    dataQuality: 'all',
    onlineLearning: false,  // 默认禁用在线学习
    updateInterval: '24h',
    autoUpdate: false,
    updateStrategy: 'conservative',
    enableABTest: false,
    testRatio: 0.1
  },
  
  performance: {
    enableCache: true,
    cacheSize: 1000,
    enablePrediction: false,
    predictionDepth: 2,
    asyncMode: true,
    timeout: 5000,
    fallbackModule: 'mcts'
  }
};

/**
 * 激进型配置
 */
export const AGGRESSIVE_CONFIG: BrainConfig = {
  ...DEFAULT_BRAIN_CONFIG,
  
  personality: {
    preset: 'aggressive',
    aggression: 0.9,
    cooperation: 0.4,
    riskTolerance: 0.8,
    chattiness: 0.7,
    toxicity: 0.6,
    adaptability: 0.5
  },
  
  modules: {
    ...DEFAULT_BRAIN_CONFIG.modules,
    mcts: {
      enabled: true,
      baseWeight: 0.6,
      options: {
        iterations: 800,
        strategicPassEnabled: false  // 激进型不主动Pass
      }
    }
  }
};

/**
 * 保守型配置
 */
export const CONSERVATIVE_CONFIG: BrainConfig = {
  ...DEFAULT_BRAIN_CONFIG,
  
  personality: {
    preset: 'conservative',
    aggression: 0.3,
    cooperation: 0.8,
    riskTolerance: 0.3,
    chattiness: 0.3,
    toxicity: 0.1,
    adaptability: 0.6
  },
  
  modules: {
    ...DEFAULT_BRAIN_CONFIG.modules,
    mcts: {
      enabled: true,
      baseWeight: 0.8,
      options: {
        iterations: 1500,
        strategicPassEnabled: true
      }
    },
    rule: {
      enabled: true,
      baseWeight: 0.5  // 更依赖规则
    }
  }
};

/**
 * 平衡型配置
 */
export const BALANCED_CONFIG: BrainConfig = {
  ...DEFAULT_BRAIN_CONFIG,
  
  personality: {
    preset: 'balanced',
    aggression: 0.5,
    cooperation: 0.6,
    riskTolerance: 0.5,
    chattiness: 0.5,
    toxicity: 0.3,
    adaptability: 0.7
  }
};

/**
 * 自适应配置
 */
export const ADAPTIVE_CONFIG: BrainConfig = {
  ...DEFAULT_BRAIN_CONFIG,
  
  personality: {
    preset: 'adaptive',
    aggression: 0.5,
    cooperation: 0.5,
    riskTolerance: 0.5,
    chattiness: 0.5,
    toxicity: 0.3,
    adaptability: 0.9  // 高度适应性
  },
  
  fusion: {
    ...DEFAULT_BRAIN_CONFIG.fusion,
    strategy: 'adaptive',  // 自适应融合策略
    dynamicWeighting: true,
    learningRate: 0.05  // 更快的学习速率
  }
};

/**
 * LLM增强配置（启用LLM）
 */
export const LLM_ENHANCED_CONFIG: BrainConfig = {
  ...BALANCED_CONFIG,
  
  modules: {
    ...BALANCED_CONFIG.modules,
    llm: {
      enabled: true,
      baseWeight: 0.6,
      weightRules: [
        { condition: 'complex_situation', weight: 0.8 },
        { condition: 'team_mode', weight: 0.7 },
        { condition: 'critical', weight: 0.5 }  // 关键时刻降低LLM权重
      ],
      options: {
        provider: 'local',
        model: 'qwen2.5-7b',
        endpoint: 'http://localhost:11434',
        temperature: 0.7,
        maxTokens: 500,
        enableCache: true,
        asyncMode: true
      }
    },
    mcts: {
      enabled: true,
      baseWeight: 0.4,
      weightRules: [
        { condition: 'critical', weight: 0.8 },  // 关键时刻提高MCTS权重
        { condition: 'simple_situation', weight: 0.9 }
      ]
    }
  },
  
  learning: {
    ...BALANCED_CONFIG.learning,
    onlineLearning: true,
    autoUpdate: true,
    updateInterval: '24h'
  }
};

/**
 * 预设配置映射
 */
export const PRESET_CONFIGS: Record<string, BrainConfig> = {
  default: DEFAULT_BRAIN_CONFIG,
  aggressive: AGGRESSIVE_CONFIG,
  conservative: CONSERVATIVE_CONFIG,
  balanced: BALANCED_CONFIG,
  adaptive: ADAPTIVE_CONFIG,
  llm_enhanced: LLM_ENHANCED_CONFIG
};

/**
 * 根据预设名称获取配置
 */
export function getPresetConfig(preset: string): BrainConfig {
  return PRESET_CONFIGS[preset] || DEFAULT_BRAIN_CONFIG;
}

/**
 * 合并配置
 */
export function mergeConfig(base: BrainConfig, override: Partial<BrainConfig>): BrainConfig {
  return {
    personality: { ...base.personality, ...override.personality },
    modules: mergeModuleConfigs(base.modules, override.modules || {}),
    fusion: { ...base.fusion, ...override.fusion },
    communication: { ...base.communication, ...override.communication },
    learning: { ...base.learning, ...override.learning },
    performance: { ...base.performance, ...override.performance }
  };
}

/**
 * 合并模块配置
 */
function mergeModuleConfigs(
  base: ModuleConfigs,
  override: Partial<ModuleConfigs>
): ModuleConfigs {
  const result: ModuleConfigs = { ...base };
  
  for (const [key, config] of Object.entries(override)) {
    if (config) {
      result[key] = {
        ...base[key],
        ...config,
        options: {
          ...(base[key]?.options || {}),
          ...(config.options || {})
        }
      };
    }
  }
  
  return result;
}

/**
 * 验证配置
 */
export function validateConfig(config: BrainConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // 验证权重
  const totalWeight = Object.values(config.modules)
    .filter(m => m?.enabled)
    .reduce((sum, m) => sum + (m?.baseWeight || 0), 0);
  
  if (totalWeight === 0) {
    errors.push('At least one module must be enabled with non-zero weight');
  }
  
  // 验证性格参数
  if (config.personality.aggression !== undefined) {
    if (config.personality.aggression < 0 || config.personality.aggression > 1) {
      errors.push('Personality aggression must be between 0 and 1');
    }
  }
  
  // 验证融合配置
  if (config.fusion.minConfidence !== undefined) {
    if (config.fusion.minConfidence < 0 || config.fusion.minConfidence > 1) {
      errors.push('Fusion minConfidence must be between 0 and 1');
    }
  }
  
  // 验证性能配置
  if (config.performance.timeout <= 0) {
    errors.push('Performance timeout must be positive');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * 从性格参数生成配置
 */
export function configFromPersonality(personality: PersonalityConfig): BrainConfig {
  const base = personality.preset 
    ? getPresetConfig(personality.preset)
    : DEFAULT_BRAIN_CONFIG;
  
  return mergeConfig(base, {
    personality
  });
}

