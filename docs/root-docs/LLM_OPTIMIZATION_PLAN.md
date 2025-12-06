# LLM调用优化方案

## 📊 问题分析

### 当前问题
应用启动缓慢，主要原因是**LLM调用超时/失败导致的等待延迟**：

1. **默认使用LLM策略**
   - `chatService.ts` 第39行：默认策略是 `'llm'`
   - 每次触发聊天都会调用 LLM API
   
2. **超时时间过长**
   - 配置文件中：`timeout: 60000` (60秒)
   - 每次失败的LLM调用最多等待60秒
   
3. **频繁的LLM调用**
   - 随机闲聊、事件触发、对骂等多个场景都会调用LLM
   - 即使有回退策略，也要先等LLM超时才会回退

4. **LLM服务可能未启动**
   - 默认连接 `http://localhost:11434/api/chat` (Ollama)
   - 如果服务未运行，每次调用都会超时

### 性能影响
- **首次聊天**：等待60秒超时 → 回退到规则策略
- **后续聊天**：每次都重试LLM → 累计多次60秒超时
- **用户体验**：游戏卡顿，响应缓慢

---

## 🎯 优化方案

### 方案1：自动检测LLM可用性（推荐）

#### 核心思路
在应用启动时检测LLM服务是否可用，自动选择合适的策略。

#### 实现步骤

1. **创建LLM健康检查工具**
   ```typescript
   // src/utils/llmHealthCheck.ts
   
   /**
    * 检查LLM服务是否可用
    * @param apiUrl LLM API地址
    * @param timeout 超时时间（毫秒）
    * @returns 是否可用
    */
   export async function checkLLMAvailability(
     apiUrl: string = 'http://localhost:11434/api/chat',
     timeout: number = 3000 // 3秒快速检测
   ): Promise<boolean> {
     try {
       const controller = new AbortController();
       const timeoutId = setTimeout(() => controller.abort(), timeout);
       
       // 尝试获取模型列表（轻量级检测）
       const response = await fetch('http://localhost:11434/api/tags', {
         method: 'GET',
         signal: controller.signal
       });
       
       clearTimeout(timeoutId);
       
       if (response.ok) {
         const data = await response.json();
         const hasModels = data.models && data.models.length > 0;
         console.log('[LLM Health Check] ✅ LLM服务可用，模型数量:', data.models?.length || 0);
         return hasModels;
       }
       
       console.warn('[LLM Health Check] ⚠️ LLM服务响应异常:', response.status);
       return false;
     } catch (error: any) {
       if (error.name === 'AbortError') {
         console.warn('[LLM Health Check] ⚠️ LLM服务连接超时（3秒）');
       } else {
         console.warn('[LLM Health Check] ⚠️ LLM服务不可用:', error.message);
       }
       return false;
     }
   }
   
   /**
    * 获取推荐的聊天策略
    * @returns 推荐的策略名称
    */
   export async function getRecommendedChatStrategy(): Promise<'llm' | 'rule-based'> {
     const isLLMAvailable = await checkLLMAvailability();
     
     if (isLLMAvailable) {
       console.log('[Chat Strategy] 使用LLM策略');
       return 'llm';
     } else {
       console.log('[Chat Strategy] LLM不可用，使用规则策略');
       return 'rule-based';
     }
   }
   ```

2. **修改chatService初始化**
   ```typescript
   // src/services/chatService.ts
   
   import { getRecommendedChatStrategy } from '../utils/llmHealthCheck';
   
   class ChatService {
     constructor(
       strategy: 'rule-based' | 'llm' = 'rule-based', // 改为默认使用规则策略
       config: ChatServiceConfig = DEFAULT_CHAT_SERVICE_CONFIG,
       bigDunConfig: BigDunConfig = DEFAULT_BIG_DUN_CONFIG,
       tauntConfig: TauntConfig = DEFAULT_TAUNT_CONFIG,
       llmConfig?: any
     ) {
       this.config = config;
       this.bigDunConfig = bigDunConfig;
       this.tauntConfig = tauntConfig;
       this.strategy = getChatStrategy(strategy, config, bigDunConfig, tauntConfig, llmConfig);
       
       // 如果使用LLM策略，创建规则策略作为回退
       if (strategy === 'llm') {
         this.fallbackStrategy = getChatStrategy('rule-based', config, bigDunConfig, tauntConfig);
       }
     }
     
     // 新增：异步初始化方法
     async initializeWithAutoDetection(): Promise<void> {
       const recommendedStrategy = await getRecommendedChatStrategy();
       if (recommendedStrategy !== this.strategy.name) {
         this.setStrategy(recommendedStrategy);
       }
     }
   }
   ```

3. **在应用启动时检测**
   ```typescript
   // src/main.tsx 或 App.tsx
   
   import { chatService } from './services/chatService';
   
   // 在应用启动时初始化
   chatService.initializeWithAutoDetection().catch(console.error);
   ```

#### 优点
- ✅ 自动检测，无需手动配置
- ✅ 快速失败（3秒检测超时）
- ✅ 用户体验好，无感知切换
- ✅ 支持运行时切换策略

#### 缺点
- ❌ 需要额外的检测逻辑
- ❌ 首次启动有3秒延迟（可接受）

---

### 方案2：减少LLM超时时间

#### 核心思路
保持LLM策略，但大幅减少超时时间，快速回退到规则策略。

#### 实现步骤

修改配置文件：
```typescript
// src/config/chatConfig.ts

export const DEFAULT_LLM_CHAT_CONFIG: LLMChatConfig = {
  provider: 'custom',
  apiUrl: 'http://localhost:11434/api/chat',
  model: 'qwen2:0.5b',
  temperature: 0.8,
  maxTokens: 50,
  enableContext: true,
  enableHistory: true,
  maxHistoryLength: 10,
  timeout: 3000, // 从60秒改为3秒
  // ... 其他配置
};
```

#### 优点
- ✅ 实现简单，只需修改配置
- ✅ 快速失败，减少等待时间
- ✅ 仍然保留LLM功能

#### 缺点
- ❌ 可能导致LLM生成被过早中断
- ❌ 仍然会尝试LLM调用（消耗资源）
- ❌ 不能彻底解决问题

---

### 方案3：完全禁用LLM（最快）

#### 核心思路
默认使用规则策略，完全不尝试LLM调用。

#### 实现步骤

1. **修改默认策略**
   ```typescript
   // src/services/chatService.ts
   
   constructor(
     strategy: 'rule-based' | 'llm' = 'rule-based', // 改为rule-based
     // ... 其他参数
   ) {
     // ...
   }
   ```

2. **修改初始化代码**
   ```typescript
   // src/main.tsx 或其他初始化文件
   
   // 确保使用规则策略
   const chatConfig = getChatConfigByMode('rule-based');
   ```

#### 优点
- ✅ 最快的启动速度
- ✅ 零延迟，无等待
- ✅ 不依赖外部服务

#### 缺点
- ❌ 失去LLM的智能聊天能力
- ❌ 对话内容单一，缺乏变化

---

## 📋 推荐实施方案

### 组合方案：方案1 + 方案2

结合自动检测和快速超时，达到最佳效果：

1. **短期优化（立即生效）**
   - 修改默认策略为 `'rule-based'`
   - 减少LLM超时到3秒
   - 优化回退逻辑

2. **中期优化（完善体验）**
   - 实现自动检测功能
   - 添加策略切换UI
   - 支持用户手动选择

3. **长期优化（增强功能）**
   - 缓存LLM结果
   - 实现离线模式
   - 优化prompt减少token

---

## 🔧 修改文件清单

### 必须修改
1. `src/config/chatConfig.ts` - 减少超时时间
2. `src/services/chatService.ts` - 修改默认策略

### 可选修改
3. `src/utils/llmHealthCheck.ts` - 新建健康检查工具
4. `src/main.tsx` - 添加自动检测逻辑
5. `src/components/game/GameConfigPanel.tsx` - 添加策略选择UI

---

## 📈 预期效果

### 方案1+2（推荐）
- 启动速度：**从60秒+ 降到 3秒内**
- LLM可用时：智能聊天
- LLM不可用时：规则聊天
- 用户体验：**流畅自然**

### 方案3（最快）
- 启动速度：**即时（<100ms）**
- 聊天质量：基本
- 用户体验：**快速但单调**

---

## 🎯 下一步行动

1. **先确认LLM服务状态**
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. **选择实施方案**
   - 推荐：方案1+2（平衡）
   - 快速：方案3（临时）

3. **测试验证**
   - 测试LLM可用时的表现
   - 测试LLM不可用时的回退
   - 测试性能提升效果

---

## 📝 补充说明

### 关于规则策略
规则策略（RuleBasedStrategy）已经实现，包含：
- ✅ 随机闲聊模板
- ✅ 事件触发模板
- ✅ 对骂模板库
- ✅ 方言支持

功能完整，可以满足基本的聊天需求。

### 关于LLM回退
当前代码已有回退机制：
```typescript
// chatService.ts 第448行
if (!message && this.fallbackStrategy && this.strategy.name === 'llm') {
  console.warn('[ChatService] ⚠️ LLM策略返回null，切换到规则策略回退');
  message = await this.fallbackStrategy.generateTaunt(player, targetPlayer, fullContext);
}
```

但回退前会先等待LLM超时（60秒），这是性能瓶颈所在。

---

## ✅ 总结

**问题根源**：LLM调用超时导致游戏卡顿  
**最佳方案**：自动检测 + 快速超时 + 规则回退  
**预期效果**：启动时间从60秒+降到3秒内，用户体验大幅提升

**立即可做**：
1. 修改 `chatConfig.ts` 中的 `timeout: 3000`
2. 修改 `chatService.ts` 中的默认策略为 `'rule-based'`

这两步即可立即见效！🚀

