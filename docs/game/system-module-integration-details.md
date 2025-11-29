# 系统应用模块集成细节

## 一、当前初始化点分析

### 1.1 App.tsx 中的初始化
```typescript
// TTS 系统初始化
useEffect(() => {
  const config = getTTSConfigFromEnv();
  initTTS(config).catch((error) => {
    console.error('[App] TTS 系统初始化失败:', error);
  });
}, []);
```

### 1.2 MultiPlayerGameBoard 中的初始化
```typescript
// 音效服务初始化
useEffect(() => {
  soundService.preloadSounds().catch(error => {
    console.warn('[MultiPlayerGameBoard] 音效预加载失败', error);
  });
}, []);

// 验证错误监听
useEffect(() => {
  const handleValidationError = (event: CustomEvent) => {
    // 处理验证错误
  };
  window.addEventListener('cardValidationError', handleValidationError);
  return () => {
    window.removeEventListener('cardValidationError', handleValidationError);
  };
}, []);
```

### 1.3 useMultiPlayerGame 中的使用
- 直接调用 `validateAllRoundsOnUpdate`
- 直接使用 `cardTracker`
- 直接使用 `systemAnnouncementService`

## 二、集成方案

### 2.1 创建 React Hook 包装

为了在 React 中方便使用系统应用模块，创建一个自定义 Hook：

```typescript
// src/hooks/useSystemApplication.ts
import { useEffect, useState, useRef } from 'react';
import { SystemApplication } from '../services/system';
import type { SystemConfig } from '../services/system/types';

export function useSystemApplication(config?: Partial<SystemConfig>) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const systemAppRef = useRef<SystemApplication | null>(null);
  
  useEffect(() => {
    let mounted = true;
    
    async function init() {
      try {
        const systemApp = SystemApplication.getInstance();
        systemAppRef.current = systemApp;
        
        // 加载配置
        const fullConfig = loadSystemConfig(config);
        
        // 注册模块
        registerAllModules(systemApp);
        
        // 初始化
        await systemApp.initialize(fullConfig);
        
        // 启动
        await systemApp.start();
        
        if (mounted) {
          setIsInitialized(true);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    }
    
    init();
    
    return () => {
      mounted = false;
      systemAppRef.current?.shutdown().catch(console.error);
    };
  }, []); // 只在组件挂载时初始化一次
  
  return {
    systemApp: systemAppRef.current,
    isInitialized,
    error,
    // 便捷方法
    getModule: <T>(name: string) => systemAppRef.current?.getModule<T>(name) ?? null,
  };
}
```

### 2.2 模块访问 Hook

为每个模块创建便捷的访问 Hook：

```typescript
// src/hooks/useValidationModule.ts
import { useSystemApplication } from './useSystemApplication';
import type { ValidationModule } from '../services/system/modules/validation';

export function useValidationModule() {
  const { getModule, isInitialized } = useSystemApplication();
  
  return {
    validationModule: getModule<ValidationModule>('validation'),
    isReady: isInitialized && !!getModule<ValidationModule>('validation'),
  };
}

// src/hooks/useTrackingModule.ts
export function useTrackingModule() {
  const { getModule, isInitialized } = useSystemApplication();
  
  return {
    trackingModule: getModule<TrackingModule>('tracking'),
    isReady: isInitialized && !!getModule<TrackingModule>('tracking'),
  };
}

// src/hooks/useAudioModule.ts
export function useAudioModule() {
  const { getModule, isInitialized } = useSystemApplication();
  
  return {
    audioModule: getModule<AudioModule>('audio'),
    isReady: isInitialized && !!getModule<AudioModule>('audio'),
  };
}
```

### 2.3 配置加载函数

```typescript
// src/services/system/config/configLoader.ts
import { SystemConfig, DefaultSystemConfig } from './SystemConfig';

export function loadSystemConfig(override?: Partial<SystemConfig>): SystemConfig {
  // 1. 从 localStorage 加载用户配置
  const userConfig = loadFromLocalStorage();
  
  // 2. 从环境变量加载配置
  const envConfig = loadFromEnv();
  
  // 3. 合并配置（优先级：override > localStorage > env > default）
  return {
    ...DefaultSystemConfig,
    ...envConfig,
    ...userConfig,
    ...override,
  };
}

function loadFromLocalStorage(): Partial<SystemConfig> {
  try {
    const saved = localStorage.getItem('systemConfig');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('[SystemConfig] 加载 localStorage 配置失败:', error);
  }
  return {};
}

function loadFromEnv(): Partial<SystemConfig> {
  return {
    validation: {
      enabled: import.meta.env.VITE_VALIDATION_ENABLED !== 'false',
      validateOnRoundEnd: import.meta.env.VITE_VALIDATE_ON_ROUND_END !== 'false',
      validateOnGameEnd: import.meta.env.VITE_VALIDATE_ON_GAME_END !== 'false',
      validateAfterPlay: import.meta.env.VITE_VALIDATE_AFTER_PLAY === 'true',
    },
    tracking: {
      enabled: import.meta.env.VITE_TRACKING_ENABLED !== 'false',
      cardTracker: {
        enabled: import.meta.env.VITE_CARD_TRACKER_ENABLED !== 'false',
        recordSnapshots: import.meta.env.VITE_CARD_TRACKER_SNAPSHOTS === 'true',
      },
    },
    audio: {
      enabled: import.meta.env.VITE_AUDIO_ENABLED !== 'false',
      announcement: {
        enabled: import.meta.env.VITE_ANNOUNCEMENT_ENABLED !== 'false',
      },
    },
  };
}
```

### 2.4 模块注册函数

```typescript
// src/services/system/modules/registerModules.ts
import { SystemApplication } from '../SystemApplication';
import { ValidationModule } from './validation/ValidationModule';
import { EventModule } from './event/EventModule';
import { TrackingModule } from './tracking/TrackingModule';
import { AudioModule } from './audio/AudioModule';

export function registerAllModules(systemApp: SystemApplication): void {
  // 注册核心模块
  systemApp.registerModule(new EventModule());      // 事件模块（无依赖）
  systemApp.registerModule(new ValidationModule()); // 验证模块（依赖事件）
  systemApp.registerModule(new TrackingModule());   // 追踪模块（无依赖）
  systemApp.registerModule(new AudioModule());      // 音频模块（依赖事件）
  
  // 可选模块（开发环境）
  if (import.meta.env.DEV) {
    // 可以在这里注册开发工具模块
  }
}
```

## 三、迁移步骤

### 3.1 第一步：在 App.tsx 中初始化系统应用

```typescript
// src/App.tsx
import { useSystemApplication } from './hooks/useSystemApplication';

function App() {
  const { isInitialized, error } = useSystemApplication();
  
  // TTS 初始化改为在 AudioModule 中处理
  // useEffect(() => { initTTS(...) }, []); // 移除
  
  if (error) {
    console.error('[App] 系统应用初始化失败:', error);
    // 可以显示错误提示
  }
  
  if (!isInitialized) {
    // 可以显示加载提示
    return <div>正在初始化系统...</div>;
  }
  
  // ... 其他代码
}
```

### 3.2 第二步：在 useMultiPlayerGame 中使用模块

```typescript
// src/hooks/useMultiPlayerGame.ts
import { useValidationModule } from './useValidationModule';
import { useTrackingModule } from './useTrackingModule';
import { useAudioModule } from './useAudioModule';

export function useMultiPlayerGame() {
  const { validationModule, isReady: validationReady } = useValidationModule();
  const { trackingModule, isReady: trackingReady } = useTrackingModule();
  const { audioModule, isReady: audioReady } = useAudioModule();
  
  const playerPlayAsync = useCallback(async (...) => {
    // ... 现有逻辑 ...
    
    // 轮次结束时验证
    const handleRoundEnd = async (finalRound: Round, players: Player[]) => {
      // ... 现有逻辑 ...
      
      // 使用验证模块
      if (validationModule && validationReady) {
        validationModule.validateCardIntegrity({
          players: updatedPlayers,
          allRounds: allRoundsWithCurrent,
          trigger: 'roundEnd',
          roundNumber: finalRound.roundNumber,
          context: `轮次 ${finalRound.roundNumber} 结束`,
          timestamp: Date.now()
        });
      }
      
      // 使用追踪模块
      if (trackingModule && trackingReady) {
        trackingModule.recordPlay(finalRound.roundNumber, roundRecord);
      }
    };
    
    // ... 其他逻辑 ...
  }, [validationModule, validationReady, trackingModule, trackingReady]);
  
  // 使用音频模块
  const announcePlay = useCallback(async (play: Play, voiceConfig?: VoiceConfig) => {
    if (audioModule && audioReady) {
      return audioModule.announcePlay(play, voiceConfig);
    }
  }, [audioModule, audioReady]);
  
  // ... 其他代码
}
```

### 3.3 第三步：在 MultiPlayerGameBoard 中使用音频模块

```typescript
// src/components/MultiPlayerGameBoard.tsx
import { useAudioModule } from '../hooks/useAudioModule';

export const MultiPlayerGameBoard: React.FC = () => {
  const { audioModule, isReady: audioReady } = useAudioModule();
  
  // 移除音效服务的直接初始化
  // useEffect(() => {
  //   soundService.preloadSounds()...
  // }, []); // 移除，改由 AudioModule 管理
  
  // 使用音频模块预加载音效
  useEffect(() => {
    if (audioModule && audioReady) {
      audioModule.preloadSounds().catch(error => {
        console.warn('[MultiPlayerGameBoard] 音效预加载失败', error);
      });
    }
  }, [audioModule, audioReady]);
  
  // 验证错误监听改为使用事件模块
  useEffect(() => {
    if (!validationModule || !validationReady) return;
    
    const unsubscribe = validationModule.onValidationError((error) => {
      // 处理验证错误
      console.error('[MultiPlayerGameBoard] 验证错误:', error);
    });
    
    return unsubscribe;
  }, [validationModule, validationReady]);
  
  // ... 其他代码
}
```

## 四、向后兼容策略

### 4.1 保留现有导出

为了不破坏现有代码，我们可以保留现有的导出，但内部调用新模块：

```typescript
// src/services/scoringService.ts
import { SystemApplication } from './system';

// 保留现有函数，但内部调用新模块
export function validateAllRoundsOnUpdate(
  players: Player[],
  allRounds: RoundRecord[],
  currentRoundPlays?: RoundPlayRecord[],
  initialHands?: Card[][],
  context?: string
): void {
  const systemApp = SystemApplication.getInstance();
  const validationModule = systemApp.getModule<ValidationModule>('validation');
  
  if (validationModule) {
    validationModule.validateCardIntegrity({
      players,
      allRounds,
      currentRoundPlays: currentRoundPlays || [],
      initialHands,
      trigger: 'roundEnd',
      context: context || '手动验证',
      timestamp: Date.now()
    });
  } else {
    // 降级：使用旧的验证逻辑
    console.warn('[validateAllRoundsOnUpdate] 验证模块未初始化，使用降级方案');
    // ... 旧的验证逻辑 ...
  }
}
```

### 4.2 渐进式迁移

1. **阶段1**: 创建新模块，但保留旧代码
2. **阶段2**: 新代码使用新模块，旧代码继续工作
3. **阶段3**: 逐步迁移旧代码到新模块
4. **阶段4**: 移除旧代码

## 五、配置管理 UI

### 5.1 在游戏设置中添加系统配置

```typescript
// src/components/game/GameConfigPanel.tsx
export const GameConfigPanel: React.FC = ({ ... }) => {
  const { systemApp } = useSystemApplication();
  const config = systemApp?.getConfig();
  
  const handleValidationToggle = (enabled: boolean) => {
    systemApp?.configure({
      validation: {
        ...config?.validation,
        enabled
      }
    });
    
    // 保存到 localStorage
    saveSystemConfigToLocalStorage(systemApp?.getConfig());
  };
  
  return (
    <div className="config-panel">
      {/* 现有配置项 */}
      
      {/* 系统配置组 */}
      <div className="config-group">
        <h2>系统配置</h2>
        
        <div className="config-item">
          <label>
            <input
              type="checkbox"
              checked={config?.validation?.enabled ?? true}
              onChange={(e) => handleValidationToggle(e.target.checked)}
            />
            启用验证系统
          </label>
        </div>
        
        <div className="config-item">
          <label>
            <input
              type="checkbox"
              checked={config?.validation?.validateOnRoundEnd ?? true}
              onChange={(e) => {
                systemApp?.configure({
                  validation: {
                    ...config?.validation,
                    validateOnRoundEnd: e.target.checked
                  }
                });
              }}
            />
            轮次结束时验证
          </label>
        </div>
        
        {/* 更多配置项 */}
      </div>
    </div>
  );
};
```

## 六、错误处理和降级策略

### 6.1 模块初始化失败处理

```typescript
// src/services/system/SystemApplication.ts
async initialize(config?: Partial<SystemConfig>): Promise<void> {
  const initErrors: Array<{ module: string; error: Error }> = [];
  
  for (const module of this.modules.values()) {
    try {
      await module.initialize(config, this.context);
    } catch (error) {
      initErrors.push({
        module: module.name,
        error: error instanceof Error ? error : new Error(String(error))
      });
      
      // 非关键模块失败时，记录错误但继续初始化
      if (this.isCriticalModule(module.name)) {
        throw error; // 关键模块失败时，中断初始化
      } else {
        console.warn(`[SystemApplication] 模块 ${module.name} 初始化失败，已跳过`, error);
      }
    }
  }
  
  if (initErrors.length > 0) {
    console.warn('[SystemApplication] 部分模块初始化失败', initErrors);
  }
}

private isCriticalModule(name: string): boolean {
  // 关键模块：事件模块、验证模块
  return ['event', 'validation'].includes(name);
}
```

### 6.2 降级方案

```typescript
// 如果验证模块不可用，使用降级方案
function validateWithFallback(...args) {
  const systemApp = SystemApplication.getInstance();
  const validationModule = systemApp?.getModule<ValidationModule>('validation');
  
  if (validationModule && validationModule.isEnabled()) {
    // 使用新模块
    return validationModule.validateCardIntegrity(...);
  } else {
    // 降级：使用旧的验证逻辑或禁用验证
    console.warn('[验证] 验证模块不可用，跳过验证');
    return { isValid: true }; // 或使用旧的验证逻辑
  }
}
```

## 七、测试策略

### 7.1 模块单元测试

```typescript
// tests/services/system/ValidationModule.test.ts
describe('ValidationModule', () => {
  let module: ValidationModule;
  let systemApp: SystemApplication;
  
  beforeEach(async () => {
    systemApp = SystemApplication.getInstance();
    systemApp.reset(); // 重置为初始状态
    
    module = new ValidationModule();
    systemApp.registerModule(module);
    
    // 注册依赖模块
    const eventModule = new EventModule();
    systemApp.registerModule(eventModule);
    
    await systemApp.initialize();
    await systemApp.start();
  });
  
  it('应该正确初始化', () => {
    expect(module.getStatus().initialized).toBe(true);
  });
  
  it('应该能验证牌数完整性', () => {
    const result = module.validateCardIntegrity({
      players: [...],
      allRounds: [...],
      trigger: 'roundEnd',
      timestamp: Date.now()
    });
    
    expect(result.isValid).toBe(true);
  });
});
```

### 7.2 集成测试

```typescript
// tests/services/system/SystemApplication.integration.test.ts
describe('SystemApplication 集成测试', () => {
  it('应该正确初始化所有模块', async () => {
    const systemApp = SystemApplication.getInstance();
    registerAllModules(systemApp);
    
    await systemApp.initialize();
    await systemApp.start();
    
    expect(systemApp.getModule('validation')).toBeDefined();
    expect(systemApp.getModule('event')).toBeDefined();
    expect(systemApp.getModule('tracking')).toBeDefined();
    expect(systemApp.getModule('audio')).toBeDefined();
  });
  
  it('应该正确处理模块依赖', async () => {
    // 测试模块初始化顺序
  });
});
```

## 八、性能考虑

### 8.1 延迟初始化

```typescript
// 某些非关键模块可以延迟初始化
class AudioModule implements SystemModule {
  async initialize(config: AudioConfig, context: SystemContext): Promise<void> {
    // 延迟初始化：只创建服务实例，不立即加载资源
    this.announcementService = systemAnnouncementService;
    
    // 预加载在首次使用时进行
    this.preloadPromise = null;
  }
  
  async announcePlay(...): Promise<void> {
    // 首次使用时预加载
    if (!this.preloadPromise) {
      this.preloadPromise = this.preloadSounds();
    }
    await this.preloadPromise;
    
    // 执行报牌
    return this.announcementService.announcePlay(...);
  }
}
```

### 8.2 配置缓存

```typescript
// 缓存配置，避免重复计算
class ConfigManager {
  private configCache: SystemConfig | null = null;
  
  getConfig(): SystemConfig {
    if (!this.configCache) {
      this.configCache = this.loadConfig();
    }
    return this.configCache;
  }
  
  invalidateCache(): void {
    this.configCache = null;
  }
}
```

## 九、总结

这个集成方案提供了：

1. **React Hook 包装**: 方便在 React 组件中使用
2. **向后兼容**: 保留现有导出，渐进式迁移
3. **配置管理**: 统一的配置加载和保存
4. **错误处理**: 完善的错误处理和降级策略
5. **测试支持**: 清晰的测试策略

通过这个方案，我们可以：
- 逐步迁移现有代码，不破坏现有功能
- 提供统一的管理接口，简化代码
- 支持动态配置，提升灵活性
- 便于测试和维护

