# AI理解人类沟通并实时调整出牌策略 - 设计方案

## 📋 设计概述

设计一个**智能沟通系统**，让AI玩家能够理解人类玩家的对话内容，从中提取策略意图和牌信息，并实时调整出牌策略。这创造了真正的"团队配合"和"心理博弈"体验。

---

## 🎯 核心需求

### 1. 人类玩家可以"说话"

- ✅ 文字输入
- ✅ 语音输入（可选）
- ✅ 快捷短语（可选）

### 2. AI理解人类的话

- ✅ 理解策略意图（如"保留大牌"、"我来拿分"）
- ✅ 提取牌信息（如"我有炸弹"、"我没有大牌"）
- ✅ 识别配合请求（如"你来出"、"我保护"）

### 3. 实时调整出牌策略

- ✅ 根据理解的信息调整MCTS策略
- ✅ 根据策略意图调整评估函数权重
- ✅ 实时响应，立即生效

---

## ❌ 现有系统的问题

### 1. 聊天系统是单向的

**现有系统**：
- AI生成聊天内容
- 人类玩家只能看，不能输入

**问题**：
- ❌ 人类玩家无法主动沟通
- ❌ AI无法理解人类玩家的意图
- ❌ 没有团队配合机制

### 2. AI出牌策略是静态的

**现有系统**：
- AI按照固定的MCTS策略出牌
- 不考虑人类玩家的意图

**问题**：
- ❌ 无法配合人类玩家
- ❌ 无法响应人类玩家的策略要求

---

## ✅ 新系统设计

### 核心流程

```
人类玩家输入 → AI理解 → 信息提取 → 策略调整 → 实时生效
     ↓           ↓         ↓          ↓          ↓
  "我来出"    NLU分析   策略意图   调整权重   更新MCTS
  "我有炸弹"  提取信息   牌信息    调整参数   立即响应
```

---

## 第一部分：人类玩家输入系统

### 1.1 输入方式

#### 方式1：文字输入

```typescript
interface ChatInputProps {
  onSend: (message: string) => void;
  placeholder?: string;
  maxLength?: number;
}
```

**UI设计**：
```
┌─────────────────────────────────────────┐
│ 💬 和队友沟通                            │
├─────────────────────────────────────────┤
│                                         │
│ [输入框：我来出，你保留大牌]            │
│                                         │
│ [快捷短语]                              │
│ [我来] [你来] [保留大牌] [我有炸弹]    │
│                                         │
│ [发送]                                  │
│                                         │
└─────────────────────────────────────────┘
```

#### 方式2：快捷短语

```typescript
interface QuickPhrase {
  text: string;        // 显示文本
  meaning: string;     // 实际含义
  category: 'strategy' | 'information' | 'cooperation';
}

const quickPhrases: QuickPhrase[] = [
  { text: '我来', meaning: '让我来出牌', category: 'strategy' },
  { text: '你来', meaning: '你来出牌', category: 'strategy' },
  { text: '保留大牌', meaning: '保留大牌用于关键时刻', category: 'strategy' },
  { text: '我有炸弹', meaning: '我有炸弹，可以支援', category: 'information' },
  { text: '我没有大牌', meaning: '我没有大牌，需要帮助', category: 'information' },
  { text: '我来拿分', meaning: '让我来拿这一轮的分', category: 'cooperation' },
  { text: '你保护', meaning: '你来保护分牌', category: 'cooperation' },
];
```

### 1.2 消息创建

```typescript
interface HumanChatMessage extends ChatMessage {
  playerId: number;           // 人类玩家ID
  content: string;            // 原始输入
  timestamp: number;
  type: 'human_input';        // 人类输入类型
  processed?: ProcessedMessage;  // AI处理后的理解结果
}

interface ProcessedMessage {
  intent: CommunicationIntent;      // 沟通意图
  extractedInfo: ExtractedInfo;     // 提取的信息
  confidence: number;                // 理解置信度
}
```

---

## 第二部分：AI理解系统（NLU）

### 2.1 理解架构

```
人类输入文本
    ↓
┌───────────────────────┐
│   NLU分析模块         │
│  ┌─────────────────┐ │
│  │ 意图识别        │ │
│  └─────────────────┘ │
│  ┌─────────────────┐ │
│  │ 信息提取        │ │
│  └─────────────────┘ │
│  ┌─────────────────┐ │
│  │ 置信度评估      │ │
│  └─────────────────┘ │
└───────────────────────┘
    ↓
理解结果 → 策略调整
```

### 2.2 意图识别

```typescript
interface CommunicationIntent {
  type: IntentType;
  parameters: IntentParameters;
  confidence: number;
}

type IntentType = 
  | 'strategy_request'      // 策略请求（"我来出"、"你来出"）
  | 'information_reveal'    // 信息透露（"我有炸弹"、"我没有大牌"）
  | 'cooperation_request'   // 配合请求（"我来拿分"、"你保护"）
  | 'tactical_suggestion'   // 战术建议（"保留大牌"、"拆牌出"）
  | 'warning'               // 警告（"小心"、"有危险"）
  | 'general'               // 一般对话

interface IntentParameters {
  action?: 'play' | 'pass' | 'hold' | 'break';
  target?: 'me' | 'teammate' | 'opponent';
  cardInfo?: CardInfo;
  strategy?: StrategyHint;
}

// 意图识别函数
async function recognizeIntent(
  text: string,
  gameContext: GameContext
): Promise<CommunicationIntent> {
  // 1. 使用LLM理解意图
  const llmResult = await analyzeIntentWithLLM(text, gameContext);
  
  // 2. 使用规则引擎验证
  const ruleResult = analyzeIntentWithRules(text, gameContext);
  
  // 3. 综合结果
  return combineIntentResults(llmResult, ruleResult);
}
```

### 2.3 LLM意图分析

```typescript
async function analyzeIntentWithLLM(
  text: string,
  gameContext: GameContext
): Promise<CommunicationIntent> {
  const prompt = `
你是一个过炸牌游戏的分析系统，需要理解人类玩家的对话意图。

## 游戏上下文
- 当前轮次分数：${gameContext.roundScore}分
- 我的队友：${gameContext.teammate?.name}
- 上家出牌：${formatPlay(gameContext.lastPlay)}

## 人类玩家说的话
"${text}"

## 任务
分析这句话的意图，从以下类型中选择：
1. strategy_request - 策略请求（如"我来出"、"你来出"）
2. information_reveal - 信息透露（如"我有炸弹"、"我没有大牌"）
3. cooperation_request - 配合请求（如"我来拿分"、"你保护"）
4. tactical_suggestion - 战术建议（如"保留大牌"、"拆牌出"）
5. warning - 警告（如"小心"、"有危险"）
6. general - 一般对话

## 输出格式（JSON）
{
  "type": "意图类型",
  "parameters": {
    "action": "动作（如果有）",
    "target": "目标（如果有）",
    "cardInfo": {
      "hasBomb": true/false,
      "hasBigCards": true/false,
      "handCount": "手牌数量（如果提到）"
    },
    "strategy": {
      "suggestion": "建议的策略"
    }
  },
  "confidence": 0.0-1.0
}

请返回JSON格式的分析结果。
  `;
  
  const response = await callLLM(prompt);
  return parseIntentResponse(response);
}
```

### 2.4 规则引擎分析

```typescript
function analyzeIntentWithRules(
  text: string,
  gameContext: GameContext
): CommunicationIntent {
  const lowerText = text.toLowerCase();
  
  // 策略请求模式
  const strategyPatterns = [
    { pattern: /我来|让我来|我出/, intent: { type: 'strategy_request', action: 'play', target: 'me' } },
    { pattern: /你来|你出/, intent: { type: 'strategy_request', action: 'play', target: 'teammate' } },
    { pattern: /要不起|不要/, intent: { type: 'strategy_request', action: 'pass' } },
    { pattern: /保留|留着/, intent: { type: 'strategy_request', action: 'hold' } },
  ];
  
  // 信息透露模式
  const infoPatterns = [
    { pattern: /我有炸弹|炸弹/, intent: { type: 'information_reveal', cardInfo: { hasBomb: true } } },
    { pattern: /没有大牌|没大牌/, intent: { type: 'information_reveal', cardInfo: { hasBigCards: false } } },
    { pattern: /我有.*张/, intent: { type: 'information_reveal', cardInfo: { handCount: extractNumber(text) } } },
  ];
  
  // 配合请求模式
  const cooperationPatterns = [
    { pattern: /我来拿分|我拿分/, intent: { type: 'cooperation_request', action: 'play', strategy: { suggestion: 'get_score' } } },
    { pattern: /你保护|你防守/, intent: { type: 'cooperation_request', action: 'play', target: 'teammate', strategy: { suggestion: 'protect' } } },
  ];
  
  // 匹配模式
  for (const pattern of [...strategyPatterns, ...infoPatterns, ...cooperationPatterns]) {
    if (pattern.pattern.test(lowerText)) {
      return {
        type: pattern.intent.type,
        parameters: pattern.intent,
        confidence: 0.8  // 规则匹配的置信度
      };
    }
  }
  
  // 默认：一般对话
  return {
    type: 'general',
    parameters: {},
    confidence: 0.5
  };
}
```

---

## 第三部分：信息提取系统

### 3.1 提取的信息类型

```typescript
interface ExtractedInfo {
  // 牌信息
  cardInfo?: {
    hasBomb?: boolean;           // 是否有炸弹
    hasBigCards?: boolean;        // 是否有大牌
    handCount?: number;           // 手牌数量
    hasScoreCards?: boolean;      // 是否有分牌
  };
  
  // 策略信息
  strategyInfo?: {
    preferredAction?: 'play' | 'pass' | 'hold';
    suggestion?: string;          // 策略建议
    priority?: 'high' | 'medium' | 'low';
  };
  
  // 配合信息
  cooperationInfo?: {
    requestType?: 'support' | 'attack' | 'defend';
    target?: 'me' | 'teammate';
    urgency?: 'high' | 'medium' | 'low';
  };
  
  // 置信度
  confidence: number;
}
```

### 3.2 信息提取逻辑

```typescript
function extractInfoFromText(
  text: string,
  intent: CommunicationIntent,
  gameContext: GameContext
): ExtractedInfo {
  const extracted: ExtractedInfo = {
    confidence: intent.confidence
  };
  
  // 根据意图类型提取信息
  switch (intent.type) {
    case 'information_reveal':
      extracted.cardInfo = extractCardInfo(text, intent);
      break;
      
    case 'strategy_request':
      extracted.strategyInfo = extractStrategyInfo(text, intent);
      break;
      
    case 'cooperation_request':
      extracted.cooperationInfo = extractCooperationInfo(text, intent);
      break;
  }
  
  // 额外的信息提取（无论意图类型）
  extracted.cardInfo = {
    ...extracted.cardInfo,
    ...extractCardInfoFromText(text)
  };
  
  return extracted;
}

// 从文本中提取牌信息
function extractCardInfoFromText(text: string): Partial<ExtractedInfo['cardInfo']> {
  const lowerText = text.toLowerCase();
  const cardInfo: any = {};
  
  // 检测炸弹
  if (/炸弹|bomb/.test(lowerText)) {
    cardInfo.hasBomb = true;
  }
  
  // 检测大牌
  if (/大牌|大点/.test(lowerText)) {
    cardInfo.hasBigCards = true;
  } else if (/没有大牌|没大牌/.test(lowerText)) {
    cardInfo.hasBigCards = false;
  }
  
  // 检测手牌数量
  const countMatch = lowerText.match(/(\d+)张/);
  if (countMatch) {
    cardInfo.handCount = parseInt(countMatch[1]);
  }
  
  // 检测分牌
  if (/分牌|有分/.test(lowerText)) {
    cardInfo.hasScoreCards = true;
  }
  
  return cardInfo;
}
```

---

## 第四部分：实时策略调整系统

### 4.1 策略调整架构

```typescript
interface StrategyAdjustment {
  type: 'weight' | 'parameter' | 'preference';
  target: string;              // 调整目标
  value: number;               // 调整值
  duration?: number;           // 持续时间（毫秒），undefined表示永久
  priority: number;            // 优先级
}

interface AIDynamicStrategy {
  // 基础策略（MCTS配置）
  baseConfig: MCTSConfig;
  
  // 动态调整
  adjustments: StrategyAdjustment[];
  
  // 理解的信息
  understoodInfo: ExtractedInfo;
  
  // 最后更新时间
  lastUpdateTime: number;
}
```

### 4.2 策略调整规则

#### 规则1：根据策略请求调整

```typescript
function adjustStrategyFromIntent(
  intent: CommunicationIntent,
  extractedInfo: ExtractedInfo,
  currentStrategy: AIDynamicStrategy
): StrategyAdjustment[] {
  const adjustments: StrategyAdjustment[] = [];
  
  if (intent.type === 'strategy_request') {
    if (intent.parameters.action === 'play' && intent.parameters.target === 'me') {
      // 人类玩家说"我来出"
      adjustments.push({
        type: 'preference',
        target: 'action_preference',
        value: -50,  // 降低AI出牌的倾向
        priority: 10
      });
    } else if (intent.parameters.action === 'play' && intent.parameters.target === 'teammate') {
      // 人类玩家说"你来出"
      adjustments.push({
        type: 'preference',
        target: 'action_preference',
        value: +50,  // 提高AI出牌的倾向
        priority: 10
      });
    } else if (intent.parameters.action === 'hold') {
      // 人类玩家说"保留大牌"
      adjustments.push({
        type: 'weight',
        target: 'bigCardPreservationWeight',
        value: +0.3,  // 提高保留大牌的权重
        priority: 8
      });
    }
  }
  
  return adjustments;
}
```

#### 规则2：根据牌信息调整

```typescript
function adjustStrategyFromCardInfo(
  cardInfo: ExtractedInfo['cardInfo'],
  currentStrategy: AIDynamicStrategy
): StrategyAdjustment[] {
  const adjustments: StrategyAdjustment[] = [];
  
  if (cardInfo?.hasBomb) {
    // 人类玩家有炸弹，AI可以更激进
    adjustments.push({
      type: 'weight',
      target: 'aggressiveWeight',
      value: +0.2,
      priority: 7
    });
    adjustments.push({
      type: 'preference',
      target: 'supportHuman',
      value: +30,  // 提高支援人类玩家的倾向
      priority: 9
    });
  }
  
  if (cardInfo?.hasBigCards === false) {
    // 人类玩家没有大牌，AI应该更主动
    adjustments.push({
      type: 'preference',
      target: 'action_preference',
      value: +40,  // 提高AI出牌的倾向
      priority: 9
    });
  }
  
  if (cardInfo?.handCount !== undefined) {
    // 根据人类玩家手牌数量调整
    if (cardInfo.handCount < 8) {
      // 人类玩家手牌少，AI应该支援
      adjustments.push({
        type: 'weight',
        target: 'supportWeight',
        value: +0.3,
        priority: 8
      });
    }
  }
  
  return adjustments;
}
```

#### 规则3：根据配合请求调整

```typescript
function adjustStrategyFromCooperation(
  cooperationInfo: ExtractedInfo['cooperationInfo'],
  currentStrategy: AIDynamicStrategy
): StrategyAdjustment[] {
  const adjustments: StrategyAdjustment[] = [];
  
  if (cooperationInfo?.requestType === 'support') {
    // 人类玩家请求支援
    adjustments.push({
      type: 'weight',
      target: 'supportWeight',
      value: +0.4,  // 大幅提高支援权重
      priority: 10
    });
    adjustments.push({
      type: 'preference',
      target: 'action_preference',
      value: +50,  // 提高AI出牌的倾向
      priority: 10
    });
  } else if (cooperationInfo?.requestType === 'attack') {
    // 人类玩家请求攻击
    adjustments.push({
      type: 'weight',
      target: 'aggressiveWeight',
      value: +0.3,
      priority: 9
    });
  }
  
  return adjustments;
}
```

### 4.3 应用到MCTS评估函数

```typescript
function evaluateActionWithAdjustments(
  action: Card[],
  hand: Card[],
  lastPlay: Play | null,
  state: GameState,
  dynamicStrategy: AIDynamicStrategy
): number {
  // 基础评估
  let score = evaluateActionQuality(action, hand, lastPlay, state);
  
  // 应用动态调整
  for (const adjustment of dynamicStrategy.adjustments) {
    switch (adjustment.type) {
      case 'weight':
        score = applyWeightAdjustment(score, adjustment, action, state);
        break;
        
      case 'preference':
        score = applyPreferenceAdjustment(score, adjustment, action, state);
        break;
        
      case 'parameter':
        score = applyParameterAdjustment(score, adjustment, action, state);
        break;
    }
  }
  
  // 应用理解的信息
  score = applyUnderstoodInfo(score, dynamicStrategy.understoodInfo, action, state);
  
  return score;
}

// 应用权重调整
function applyWeightAdjustment(
  baseScore: number,
  adjustment: StrategyAdjustment,
  action: Card[],
  state: GameState
): number {
  if (adjustment.target === 'bigCardPreservationWeight') {
    // 如果保留了大牌，加分
    const preservesBigCards = checkPreservesBigCards(action, state);
    if (preservesBigCards) {
      return baseScore + (adjustment.value * 50);  // 按权重调整
    }
  }
  
  if (adjustment.target === 'supportWeight') {
    // 如果支援了人类玩家，加分
    const supportsHuman = checkSupportsHuman(action, state);
    if (supportsHuman) {
      return baseScore + (adjustment.value * 50);
    }
  }
  
  return baseScore;
}

// 应用偏好调整
function applyPreferenceAdjustment(
  baseScore: number,
  adjustment: StrategyAdjustment,
  action: Card[],
  state: GameState
): number {
  if (adjustment.target === 'action_preference') {
    // 直接调整基础分
    return baseScore + adjustment.value;
  }
  
  if (adjustment.target === 'supportHuman') {
    // 如果支援人类玩家，加分
    if (checkSupportsHuman(action, state)) {
      return baseScore + adjustment.value;
    }
  }
  
  return baseScore;
}
```

---

## 第五部分：实时响应机制

### 5.1 实时更新流程

```typescript
class RealTimeStrategyManager {
  private dynamicStrategies: Map<number, AIDynamicStrategy> = new Map();
  
  // 处理人类玩家的消息
  async processHumanMessage(
    message: HumanChatMessage,
    gameState: GameState
  ): Promise<void> {
    // 1. 理解意图
    const intent = await recognizeIntent(message.content, gameState);
    
    // 2. 提取信息
    const extractedInfo = extractInfoFromText(message.content, intent, gameState);
    
    // 3. 生成策略调整
    const adjustments = generateStrategyAdjustments(intent, extractedInfo, gameState);
    
    // 4. 更新AI策略
    const aiPlayerId = getTeammateId(message.playerId, gameState);
    this.updateAIStrategy(aiPlayerId, adjustments, extractedInfo);
    
    // 5. 立即生效（如果AI正在决策）
    if (isAITurn(aiPlayerId, gameState)) {
      this.triggerImmediateUpdate(aiPlayerId);
    }
  }
  
  // 更新AI策略
  private updateAIStrategy(
    aiPlayerId: number,
    adjustments: StrategyAdjustment[],
    understoodInfo: ExtractedInfo
  ): void {
    const currentStrategy = this.dynamicStrategies.get(aiPlayerId) || {
      baseConfig: getDefaultMCTSConfig(),
      adjustments: [],
      understoodInfo: {},
      lastUpdateTime: Date.now()
    };
    
    // 合并调整
    currentStrategy.adjustments = mergeAdjustments(
      currentStrategy.adjustments,
      adjustments
    );
    
    // 更新理解的信息
    currentStrategy.understoodInfo = mergeExtractedInfo(
      currentStrategy.understoodInfo,
      understoodInfo
    );
    
    currentStrategy.lastUpdateTime = Date.now();
    
    // 保存
    this.dynamicStrategies.set(aiPlayerId, currentStrategy);
  }
  
  // 立即触发更新
  private triggerImmediateUpdate(aiPlayerId: number): void {
    // 如果AI正在运行MCTS，中断并重新开始
    this.interruptMCTS(aiPlayerId);
    
    // 触发新的决策
    this.triggerNewDecision(aiPlayerId);
  }
}
```

### 5.2 MCTS中断和重启

```typescript
class InterruptibleMCTS {
  private runningMCTS: Map<number, { promise: Promise<Card[] | null>; cancel: () => void }> = new Map();
  
  async runMCTS(
    playerId: number,
    hand: Card[],
    lastPlay: Play | null,
    config: MCTSConfig,
    dynamicStrategy: AIDynamicStrategy
  ): Promise<Card[] | null> {
    // 如果已有正在运行的MCTS，先取消
    const existing = this.runningMCTS.get(playerId);
    if (existing) {
      existing.cancel();
    }
    
    // 创建可中断的Promise
    let cancelled = false;
    const cancel = () => {
      cancelled = true;
    };
    
    const promise = this.runInterruptibleMCTS(hand, lastPlay, config, dynamicStrategy, () => cancelled);
    
    this.runningMCTS.set(playerId, { promise, cancel });
    
    try {
      const result = await promise;
      this.runningMCTS.delete(playerId);
      return result;
    } catch (error) {
      this.runningMCTS.delete(playerId);
      throw error;
    }
  }
  
  private async runInterruptibleMCTS(
    hand: Card[],
    lastPlay: Play | null,
    config: MCTSConfig,
    dynamicStrategy: AIDynamicStrategy,
    isCancelled: () => boolean
  ): Promise<Card[] | null> {
    // 在每次迭代中检查是否被取消
    for (let i = 0; i < config.iterations; i++) {
      if (isCancelled()) {
        throw new Error('MCTS被中断');
      }
      
      // 运行一次迭代，使用动态策略
      this.runOneIteration(hand, lastPlay, config, dynamicStrategy);
      
      // 让出控制权，允许中断
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    return this.selectBestAction(hand, lastPlay, config, dynamicStrategy);
  }
}
```

---

## 第六部分：UI组件设计

### 6.1 聊天输入组件

```typescript
interface CommunicationInputProps {
  onSend: (message: string) => void;
  isEnabled: boolean;
  teammateName?: string;
}
```

**UI设计**：
```
┌─────────────────────────────────────────┐
│ 💬 和 ${teammateName} 沟通               │
├─────────────────────────────────────────┤
│                                         │
│ [输入框]                                │
│ "我来出，你保留大牌"                    │
│                                         │
│ [快捷短语]                              │
│ ┌────┐ ┌────┐ ┌────┐ ┌────┐          │
│ │我来│ │你来│ │保留│ │我有│          │
│ │出  │ │出  │ │大牌│ │炸弹│          │
│ └────┘ └────┘ └────┘ └────┘          │
│                                         │
│ [发送] [取消]                           │
│                                         │
└─────────────────────────────────────────┘
```

### 6.2 AI理解反馈组件

```typescript
interface AIUnderstandingFeedbackProps {
  message: HumanChatMessage;
  processedMessage: ProcessedMessage;
  onConfirm?: () => void;
}
```

**UI设计**：
```
┌─────────────────────────────────────────┐
│ 🤖 AI理解了你的话                       │
├─────────────────────────────────────────┤
│                                         │
│ 💬 你说："我来出，你保留大牌"          │
│                                         │
│ ✅ 理解结果：                           │
│ • 意图：策略请求                        │
│ • 动作：你来保留大牌                    │
│ • 置信度：85%                           │
│                                         │
│ 📊 AI将调整策略：                       │
│ • 提高保留大牌权重 +30%                │
│ • 降低出牌倾向 -20%                    │
│                                         │
│ [确认] [取消]                           │
│                                         │
└─────────────────────────────────────────┘
```

---

## 第七部分：实施步骤

### 阶段1：基础输入系统（2-3天）

1. ✅ 创建聊天输入组件
2. ✅ 实现快捷短语
3. ✅ 集成到游戏界面

### 阶段2：NLU理解系统（3-4天）

1. ✅ 实现意图识别（规则引擎）
2. ✅ 集成LLM意图分析
3. ✅ 实现信息提取

### 阶段3：策略调整系统（3-4天）

1. ✅ 设计动态策略调整机制
2. ✅ 集成到MCTS评估函数
3. ✅ 实现实时更新

### 阶段4：测试和优化（2-3天）

1. ✅ 单元测试
2. ✅ 集成测试
3. ✅ 用户体验测试

---

## 📊 总结

### 核心功能

1. ✅ **人类玩家可以输入**：文字或快捷短语
2. ✅ **AI理解人类的话**：意图识别 + 信息提取
3. ✅ **实时调整策略**：动态权重 + 立即生效

### 预期效果

- ✅ 真正的团队配合
- ✅ 增强游戏体验
- ✅ 心理博弈深度

---

## 📚 相关文档

- 信息提取设计：`docs/review/information-extraction-from-chat.md`
- 团队作战设计：`docs/review/team-scoring-and-chat-redesign.md`
- 多方案建议设计：`docs/design/multiple-ai-suggestions-redesign.md`

