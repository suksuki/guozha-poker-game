# TTS配置系统重构设计文档

## 📋 概述

重构TTS配置系统，使其达到与LLM配置系统相同的功能水平，支持多服务器管理、动态启用/禁用、场景化配置等高级特性。

## 🎯 设计目标

### 核心需求
1. ✅ 支持连接远程和局域网TTS服务器
2. ✅ 可以测试和选择TTS服务器（多选）
3. ✅ TTS服务器内部配置（Azure语音选择等）
4. ✅ 可以启用和禁用TTS服务器，禁用后不再轮询健康检查
5. ✅ TTS场景设定（系统音/聊天音/报牌音/AI对话音分离配置）
6. ✅ 设置后自动保存，重启浏览器可以使用保存的配置

### 设计决策
- **服务器类型**: Piper / Azure / Browser（暂不扩展其他类型）
- **场景配置**: 精细化 - 系统音 / 聊天音 / 报牌音 / AI对话音
- **优先级策略**: 自动回退（第一个失败自动使用第二个）
- **测试功能**: 健康检查 + 完整语音合成测试
- **UI位置**: 集成到现有 GameConfigPanel

## 🏗️ 架构设计

### 1. 数据模型

#### TTSServerConfig - TTS服务器配置
```typescript
export interface TTSServerConfig {
  // 基本信息
  id: string;                        // 唯一标识
  name: string;                      // 显示名称（如"办公室Piper"）
  type: 'piper' | 'azure' | 'browser'; // 服务器类型
  enabled: boolean;                  // 启用/禁用开关
  priority: number;                  // 优先级（1-100，数字越小优先级越高）
  
  // 连接配置
  connection: {
    host: string;                    // 主机地址（localhost / 192.168.x.x / 域名）
    port: number;                    // 端口
    protocol: 'http' | 'https';      // 协议
    baseUrl?: string;                // 完整URL（可选，自动生成）
  };
  
  // 提供者特定配置
  providerConfig: {
    // Azure Speech 特定配置
    azure?: {
      subscriptionKey: string;
      region: string;                // eastus, westus, etc.
      voiceName: string;             // zh-CN-XiaoxiaoNeural, etc.
      voiceStyle?: string;           // cheerful, sad, angry, etc.
      rate?: number;                 // 语速 (-50 to 50)
      pitch?: number;                // 音调 (-50 to 50)
    };
    
    // Piper 特定配置
    piper?: {
      model: string;                 // 模型名称
      speakerId?: number;            // 说话人ID
    };
    
    // Browser TTS 特定配置
    browser?: {
      voice?: string;                // 浏览器语音名称
      rate?: number;                 // 语速 (0.1 - 10)
      pitch?: number;                // 音调 (0 - 2)
      volume?: number;               // 音量 (0 - 1)
    };
  };
  
  // 运行时状态（不持久化）
  status?: {
    health: 'available' | 'unavailable' | 'checking' | 'disabled';
    lastCheckTime?: number;
    latency?: number;               // 延迟（毫秒）
    errorMessage?: string;          // 错误信息
  };
  
  // 元数据
  metadata: {
    createdAt: number;
    lastUsed?: number;
    isFavorite: boolean;
    tags?: string[];                // 标签（如"生产"、"测试"）
  };
}
```

#### TTSSceneConfig - TTS场景配置
```typescript
export interface TTSSceneConfig {
  // 系统音效（过、要不起、出牌提示等）
  systemSound: {
    serverIds: string[];            // 按优先级排序的服务器ID列表
    fallbackToBrowser: boolean;     // 是否回退到浏览器TTS
  };
  
  // 聊天语音（AI玩家聊天）
  chatSound: {
    serverIds: string[];
    fallbackToBrowser: boolean;
    perPlayerConfig?: {             // 每个玩家可配置不同的TTS
      [playerId: string]: string[]; // 玩家ID -> 服务器ID列表
    };
  };
  
  // 报牌语音（大小王、同花顺等）
  announcementSound: {
    serverIds: string[];
    fallbackToBrowser: boolean;
  };
  
  // AI对话音（想法生成、策略分析等）
  aiDialogueSound: {
    serverIds: string[];
    fallbackToBrowser: boolean;
  };
}
```

#### TTSGlobalSettings - TTS全局设置
```typescript
export interface TTSGlobalSettings {
  // 健康检查配置
  healthCheck: {
    enabled: boolean;               // 是否启用定期健康检查
    interval: number;               // 检查间隔（毫秒）
    timeout: number;                // 单次检查超时（毫秒）
    retryCount: number;             // 失败重试次数
    exponentialBackoff: boolean;    // 是否使用指数退避
  };
  
  // 回退策略
  fallback: {
    autoFallback: boolean;          // 自动回退到下一个可用服务器
    fallbackDelay: number;          // 回退延迟（毫秒）
    maxRetries: number;             // 最大重试次数
  };
  
  // 缓存配置
  cache: {
    enabled: boolean;               // 启用音频缓存
    maxSize: number;                // 最大缓存大小（MB）
    ttl: number;                    // 缓存过期时间（毫秒）
  };
  
  // 性能配置
  performance: {
    preload: boolean;               // 预加载常用语音
    concurrent: number;             // 最大并发请求数
  };
}
```

### 2. 核心类设计

#### TTSServerManager - TTS服务器管理器
```typescript
export class TTSServerManager {
  private servers: Map<string, TTSServerConfig>;
  private healthCheckTimer: number | null;
  
  // 服务器管理
  addServer(config: Omit<TTSServerConfig, 'id'>): string;
  updateServer(id: string, updates: Partial<TTSServerConfig>): void;
  removeServer(id: string): void;
  getServer(id: string): TTSServerConfig | undefined;
  getAllServers(): TTSServerConfig[];
  getEnabledServers(): TTSServerConfig[];
  
  // 健康检查
  checkServerHealth(id: string): Promise<ServerHealthResult>;
  checkAllEnabledServers(): Promise<Map<string, ServerHealthResult>>;
  startHealthCheck(interval: number): void;
  stopHealthCheck(): void;
  
  // 测试功能
  testConnection(id: string): Promise<boolean>;
  testSynthesis(id: string, text: string): Promise<AudioBuffer | null>;
  
  // 持久化
  saveToStorage(): void;
  loadFromStorage(): void;
  
  // 优先级管理
  reorderPriority(serverIds: string[]): void;
  
  // 服务器查询
  findServersByType(type: TTSServerType): TTSServerConfig[];
  findAvailableServers(): TTSServerConfig[];
  getServerByPriority(): TTSServerConfig[];
}
```

#### TTSServiceManager - TTS服务管理器（重构）
```typescript
export class TTSServiceManager {
  private serverManager: TTSServerManager;
  private sceneConfig: TTSSceneConfig;
  private globalSettings: TTSGlobalSettings;
  private clients: Map<string, ITTSClient>;
  
  // 初始化
  constructor(serverManager: TTSServerManager);
  initialize(): Promise<void>;
  
  // 语音合成（场景化）
  synthesizeForScene(
    scene: 'system' | 'chat' | 'announcement' | 'dialogue',
    text: string,
    options?: TTSOptions
  ): Promise<TTSResult>;
  
  // 直接合成（指定服务器）
  synthesizeWithServer(
    serverId: string,
    text: string,
    options?: TTSOptions
  ): Promise<TTSResult>;
  
  // 场景配置
  updateSceneConfig(scene: string, config: Partial<TTSSceneConfig[keyof TTSSceneConfig]>): void;
  getSceneConfig(scene: string): TTSSceneConfig[keyof TTSSceneConfig];
  
  // 智能选择（自动回退）
  private selectServerForScene(scene: string): TTSServerConfig | null;
  private fallbackToNext(currentServerId: string, scene: string): TTSServerConfig | null;
  
  // 持久化
  saveConfiguration(): void;
  loadConfiguration(): void;
}
```

#### TTSClientFactory - TTS客户端工厂
```typescript
export class TTSClientFactory {
  static createClient(config: TTSServerConfig): ITTSClient;
  static createPiperClient(config: TTSServerConfig): PiperTTSClient;
  static createAzureClient(config: TTSServerConfig): AzureSpeechTTSClient;
  static createBrowserClient(config: TTSServerConfig): BrowserTTSClient;
}
```

### 3. UI组件设计

#### TTSConfigPanel - TTS配置面板
```tsx
export const TTSConfigPanel: React.FC = () => {
  return (
    <div className="tts-config-panel">
      <TTSServerList />
      <TTSSceneConfig />
      <TTSGlobalSettings />
    </div>
  );
};
```

#### TTSServerList - 服务器列表
```tsx
export const TTSServerList: React.FC = () => {
  // 显示所有TTS服务器
  // 支持添加、删除、启用/禁用、测试、编辑
  return (
    <div className="tts-server-list">
      <div className="server-list-header">
        <h3>TTS 服务器</h3>
        <button onClick={handleAddServer}>➕ 添加服务器</button>
      </div>
      
      <div className="server-items">
        {servers.map(server => (
          <TTSServerItem
            key={server.id}
            server={server}
            onTest={handleTest}
            onToggle={handleToggle}
            onEdit={handleEdit}
            onRemove={handleRemove}
          />
        ))}
      </div>
    </div>
  );
};
```

#### TTSServerItem - 服务器项
```tsx
export const TTSServerItem: React.FC<TTSServerItemProps> = ({
  server,
  onTest,
  onToggle,
  onEdit,
  onRemove
}) => {
  return (
    <div className={`tts-server-item ${server.enabled ? 'enabled' : 'disabled'}`}>
      <div className="server-info">
        <div className="server-header">
          <span className="server-name">{server.name}</span>
          <span className="server-type-badge">{server.type}</span>
          <StatusIndicator status={server.status} />
        </div>
        
        <div className="server-details">
          <span className="server-url">
            {server.connection.protocol}://{server.connection.host}:{server.connection.port}
          </span>
          {server.status?.latency && (
            <span className="server-latency">{server.status.latency}ms</span>
          )}
        </div>
      </div>
      
      <div className="server-actions">
        <button onClick={() => onTest(server.id)} title="测试连接">
          🔍
        </button>
        <button onClick={() => onTest(server.id, true)} title="测试语音合成">
          🔊
        </button>
        <Switch checked={server.enabled} onChange={() => onToggle(server.id)} />
        <button onClick={() => onEdit(server.id)}>✏️</button>
        <button onClick={() => onRemove(server.id)}>🗑️</button>
      </div>
    </div>
  );
};
```

#### TTSServerEditor - 服务器编辑器
```tsx
export const TTSServerEditor: React.FC<TTSServerEditorProps> = ({
  server,
  onSave,
  onCancel
}) => {
  const [inputMode, setInputMode] = useState<'local' | 'lan' | 'custom'>('local');
  
  return (
    <div className="tts-server-editor">
      <h3>{server ? '编辑服务器' : '添加服务器'}</h3>
      
      {/* 基本信息 */}
      <div className="editor-section">
        <label>服务器类型</label>
        <select value={type} onChange={handleTypeChange}>
          <option value="piper">Piper TTS</option>
          <option value="azure">Azure Speech</option>
          <option value="browser">浏览器TTS</option>
        </select>
      </div>
      
      {/* 连接配置 */}
      <div className="editor-section">
        <label>连接方式</label>
        <div className="input-mode-selector">
          <button onClick={() => setInputMode('local')}>本地</button>
          <button onClick={() => setInputMode('lan')}>局域网</button>
          <button onClick={() => setInputMode('custom')}>自定义</button>
        </div>
        
        {inputMode === 'lan' && (
          <div className="lan-input">
            <span>192.168.</span>
            <input placeholder="0.13" />
            <span>:</span>
            <input placeholder="5000" />
          </div>
        )}
        
        {inputMode === 'custom' && (
          <div className="custom-input">
            <input placeholder="主机地址" />
            <input placeholder="端口" />
          </div>
        )}
      </div>
      
      {/* 提供者特定配置 */}
      {type === 'azure' && (
        <AzureTTSConfig config={providerConfig.azure} onChange={handleAzureConfigChange} />
      )}
      
      {type === 'piper' && (
        <PiperTTSConfig config={providerConfig.piper} onChange={handlePiperConfigChange} />
      )}
      
      {type === 'browser' && (
        <BrowserTTSConfig config={providerConfig.browser} onChange={handleBrowserConfigChange} />
      )}
      
      <div className="editor-actions">
        <button onClick={handleTestAndSave}>测试并保存</button>
        <button onClick={onCancel}>取消</button>
      </div>
    </div>
  );
};
```

#### TTSSceneConfigPanel - 场景配置面板
```tsx
export const TTSSceneConfigPanel: React.FC = () => {
  return (
    <div className="tts-scene-config">
      <h3>场景配置</h3>
      
      {/* 系统音效 */}
      <div className="scene-config-item">
        <h4>🔔 系统音效</h4>
        <p className="scene-description">过、要不起、出牌提示等</p>
        <ServerSelector
          selectedIds={sceneConfig.systemSound.serverIds}
          onChange={handleSystemSoundChange}
        />
      </div>
      
      {/* 聊天语音 */}
      <div className="scene-config-item">
        <h4>💬 聊天语音</h4>
        <p className="scene-description">AI玩家聊天内容</p>
        <ServerSelector
          selectedIds={sceneConfig.chatSound.serverIds}
          onChange={handleChatSoundChange}
        />
      </div>
      
      {/* 报牌语音 */}
      <div className="scene-config-item">
        <h4>📢 报牌语音</h4>
        <p className="scene-description">大小王、同花顺等牌型播报</p>
        <ServerSelector
          selectedIds={sceneConfig.announcementSound.serverIds}
          onChange={handleAnnouncementSoundChange}
        />
      </div>
      
      {/* AI对话音 */}
      <div className="scene-config-item">
        <h4>🤖 AI对话音</h4>
        <p className="scene-description">想法生成、策略分析等</p>
        <ServerSelector
          selectedIds={sceneConfig.aiDialogueSound.serverIds}
          onChange={handleAiDialogueSoundChange}
        />
      </div>
    </div>
  );
};
```

### 4. 健康检查优化

#### 关键改进点
```typescript
// ⭐ 核心改进：禁用的服务器不检查
async checkAllProvidersHealth(): Promise<void> {
  // 只检查启用的服务器
  const enabledServers = this.serverManager.getEnabledServers();
  
  if (enabledServers.length === 0) {
    return;
  }
  
  const results = await Promise.allSettled(
    enabledServers.map(server => this.checkServerHealth(server.id))
  );
  
  // 更新状态
  results.forEach((result, index) => {
    const server = enabledServers[index];
    if (result.status === 'fulfilled') {
      this.updateServerStatus(server.id, {
        health: result.value.available ? 'available' : 'unavailable',
        latency: result.value.latency,
        lastCheckTime: Date.now()
      });
    } else {
      this.updateServerStatus(server.id, {
        health: 'unavailable',
        errorMessage: result.reason?.message,
        lastCheckTime: Date.now()
      });
    }
  });
}

// 指数退避策略
private getBackoffDelay(retryCount: number): number {
  return Math.min(1000 * Math.pow(2, retryCount), 30000); // 最大30秒
}
```

### 5. 持久化设计

#### LocalStorage 结构
```typescript
// 存储键名
const STORAGE_KEYS = {
  SERVERS: 'tts_servers',
  SCENE_CONFIG: 'tts_scene_config',
  GLOBAL_SETTINGS: 'tts_global_settings'
};

// 保存
function saveConfiguration() {
  localStorage.setItem(STORAGE_KEYS.SERVERS, JSON.stringify(servers));
  localStorage.setItem(STORAGE_KEYS.SCENE_CONFIG, JSON.stringify(sceneConfig));
  localStorage.setItem(STORAGE_KEYS.GLOBAL_SETTINGS, JSON.stringify(globalSettings));
}

// 加载
function loadConfiguration() {
  const servers = JSON.parse(localStorage.getItem(STORAGE_KEYS.SERVERS) || '[]');
  const sceneConfig = JSON.parse(localStorage.getItem(STORAGE_KEYS.SCENE_CONFIG) || '{}');
  const globalSettings = JSON.parse(localStorage.getItem(STORAGE_KEYS.GLOBAL_SETTINGS) || '{}');
  
  // 合并默认配置
  return {
    servers: servers.map(s => ({ ...DEFAULT_SERVER_CONFIG, ...s })),
    sceneConfig: { ...DEFAULT_SCENE_CONFIG, ...sceneConfig },
    globalSettings: { ...DEFAULT_GLOBAL_SETTINGS, ...globalSettings }
  };
}
```

### 6. 自动回退策略

```typescript
async synthesizeForScene(
  scene: 'system' | 'chat' | 'announcement' | 'dialogue',
  text: string,
  options?: TTSOptions
): Promise<TTSResult> {
  const sceneConfig = this.sceneConfig[`${scene}Sound`];
  const serverIds = sceneConfig.serverIds;
  
  // 按优先级尝试每个服务器
  for (const serverId of serverIds) {
    const server = this.serverManager.getServer(serverId);
    
    // 跳过禁用的服务器
    if (!server || !server.enabled) {
      continue;
    }
    
    // 跳过不健康的服务器
    if (server.status?.health === 'unavailable') {
      continue;
    }
    
    try {
      const result = await this.synthesizeWithServer(serverId, text, options);
      
      // 成功，标记服务器为健康
      this.updateServerHealth(serverId, true);
      
      return result;
    } catch (error) {
      // 失败，标记服务器为不健康
      this.updateServerHealth(serverId, false);
      
      // 继续尝试下一个服务器
      continue;
    }
  }
  
  // 所有配置的服务器都失败了
  if (sceneConfig.fallbackToBrowser) {
    // 回退到浏览器TTS
    return this.synthesizeWithBrowser(text, options);
  }
  
  throw new Error(`场景 ${scene} 的所有TTS服务器都不可用`);
}
```

## 📝 文件结构

```
src/
├── tts/
│   ├── manager/
│   │   ├── TTSServerManager.ts          # 服务器管理器
│   │   ├── TTSServiceManager.ts         # 服务管理器（重构）
│   │   └── TTSClientFactory.ts          # 客户端工厂
│   ├── models/
│   │   ├── TTSServerConfig.ts           # 服务器配置模型
│   │   ├── TTSSceneConfig.ts            # 场景配置模型
│   │   └── TTSGlobalSettings.ts         # 全局设置模型
│   ├── clients/
│   │   ├── ITTSClient.ts                # TTS客户端接口
│   │   ├── PiperTTSClient.ts            # Piper客户端
│   │   ├── AzureSpeechTTSClient.ts      # Azure客户端
│   │   └── BrowserTTSClient.ts          # 浏览器客户端
│   ├── utils/
│   │   ├── healthCheck.ts               # 健康检查工具
│   │   ├── storage.ts                   # 持久化工具
│   │   └── validation.ts                # 配置验证
│   └── constants.ts                     # 常量定义
│
├── components/
│   ├── tts/
│   │   ├── TTSConfigPanel.tsx           # TTS配置面板
│   │   ├── TTSConfigPanel.css
│   │   ├── TTSServerList.tsx            # 服务器列表
│   │   ├── TTSServerItem.tsx            # 服务器项
│   │   ├── TTSServerEditor.tsx          # 服务器编辑器
│   │   ├── TTSSceneConfigPanel.tsx      # 场景配置面板
│   │   ├── AzureTTSConfig.tsx           # Azure配置
│   │   ├── PiperTTSConfig.tsx           # Piper配置
│   │   ├── BrowserTTSConfig.tsx         # 浏览器配置
│   │   └── StatusIndicator.tsx          # 状态指示器
│   └── game/
│       └── GameConfigPanel.tsx          # 游戏配置面板（集成TTS配置）
│
└── hooks/
    └── useTTSConfig.ts                  # TTS配置Hook
```

## 🔄 迁移计划

### 从现有系统迁移

1. **保留兼容性**
   - 保留现有的 `initTTS()` API
   - 提供迁移工具转换旧配置

2. **默认配置**
   ```typescript
   // 如果没有保存的配置，使用默认配置
   const DEFAULT_TTS_SERVERS: TTSServerConfig[] = [
     {
       id: 'default-piper',
       name: '本地 Piper TTS',
       type: 'piper',
       enabled: true,
       priority: 1,
       connection: {
         host: 'localhost',
         port: 5000,
         protocol: 'http'
       },
       providerConfig: {
         piper: {
           model: 'zh_CN-huayan-medium'
         }
       },
       metadata: {
         createdAt: Date.now(),
         isFavorite: true
       }
     },
     {
       id: 'default-browser',
       name: '浏览器 TTS',
       type: 'browser',
       enabled: true,
       priority: 2,
       connection: {
         host: 'browser',
         port: 0,
         protocol: 'http'
       },
       providerConfig: {
         browser: {}
       },
       metadata: {
         createdAt: Date.now(),
         isFavorite: false
       }
     }
   ];
   ```

3. **自动检测和迁移**
   ```typescript
   async function migrateFromLegacyConfig(): Promise<void> {
     const legacyConfig = localStorage.getItem('tts_config');
     if (!legacyConfig) return;
     
     // 转换为新格式
     const newServers = convertLegacyToNew(JSON.parse(legacyConfig));
     
     // 保存新格式
     localStorage.setItem(STORAGE_KEYS.SERVERS, JSON.stringify(newServers));
     
     // 删除旧配置
     localStorage.removeItem('tts_config');
   }
   ```

## 🧪 测试计划

### 单元测试
- TTSServerManager 的所有方法
- TTSServiceManager 的场景选择和回退逻辑
- 健康检查功能
- 持久化和恢复

### 集成测试
- 多服务器配置和切换
- 场景化语音合成
- 自动回退机制
- UI组件交互

### 性能测试
- 健康检查性能
- 并发语音合成
- 缓存效果

## 📊 成功指标

1. ✅ 可以添加、配置、启用/禁用多个TTS服务器
2. ✅ 禁用的服务器不再被健康检查轮询
3. ✅ 场景化配置生效，不同场景使用不同TTS
4. ✅ 测试连接和语音合成测试正常工作
5. ✅ 配置持久化，重启浏览器后恢复
6. ✅ 自动回退机制工作正常
7. ✅ UI友好，操作流畅

## 🚀 实施优先级

### P0 - 核心功能（第一阶段）
1. TTSServerManager 实现
2. TTSServiceManager 重构
3. 基本UI组件
4. 持久化功能

### P1 - 高级功能（第二阶段）
5. 场景化配置
6. 健康检查优化
7. 自动回退机制
8. 完整UI实现

### P2 - 优化功能（第三阶段）
9. 性能优化
10. 缓存机制
11. 测试完善
12. 文档完善

## 📖 相关文档

- [TTS系统使用指南](../usage/tts-usage-guide.md)
- [LLM配置系统设计](./llm-config-design.md)
- [音频系统架构](./audio-system-architecture.md)

