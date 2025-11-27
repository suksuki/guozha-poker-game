# 多语言LLM聊天机制说明

## 📋 当前机制

### 流程概述

```
LLM生成聊天内容（中文）
  ↓
ChatMessage创建（content: 中文文本）
  ↓
useChatBubbles检测到新消息
  ↓
检查当前i18n语言
  ├─> 如果是中文 → 直接使用原文
  └─> 如果不是中文 → 调用translateText()翻译
      ↓
  MyMemory Translation API
      ↓
  翻译后的文本（目标语言）
  ↓
显示气泡和播放语音（使用翻译后的文本）
```

### 关键点

1. **LLM始终生成中文**：所有LLM提示词都是中文，LLM返回的也是中文文本
2. **翻译在显示时进行**：翻译发生在`useChatBubbles`中，在显示气泡和播放语音之前
3. **翻译服务**：使用MyMemory Translation API（免费，无需API密钥）

## 🔍 代码实现

### 1. LLM生成（中文）

**位置**：`src/chat/strategy/LLMChatStrategy.ts`

```typescript
// System Prompt（中文）
systemPrompt: `你是一个过炸牌游戏的AI玩家，需要根据游戏情况生成自然、有趣的聊天内容。

重要要求：
1. 只返回一句话（不要多句）
2. 最多15个字（必须严格遵守）
3. 简洁自然，不要"好的，"、"我觉得，"等冗余开头
4. 符合游戏场景，口语化表达
...`

// 构建Prompt（中文）
private buildPrompt(player: Player, eventType: ChatEventType, context?: ChatContext): string {
  return `${this.config.systemPrompt || ''}

## 游戏信息
${gameInfo}

## 当前玩家信息
${playerInfo}

## 事件信息
${eventInfo}

## 任务
根据以上信息，生成一句符合当前游戏场景的聊天内容。要求：
1. 简短有力（1-2句话，不超过20字）
2. 符合玩家的性格和方言特色
3. 符合当前游戏状态和事件
4. 只返回要说的话，不要添加任何解释或标记

聊天内容：`;
}
```

**结果**：LLM返回中文文本，例如："好牌！"、"这手不错"、"要不起"

### 2. 翻译处理（显示时）

**位置**：`src/hooks/useChatBubbles.ts`

```typescript
// 翻译消息内容（如果当前语言不是中文）
const currentLang = i18n.language || 'zh-CN';
const player = gameState.players.find(p => p.id === latestMessage.playerId);

// 异步翻译并更新消息
translateText(latestMessage.content, currentLang).then(translatedContent => {
  // 创建翻译后的消息
  const translatedMessage: ChatMessage = {
    ...latestMessage,
    content: translatedContent,  // 翻译后的文本
    originalContent: latestMessage.content  // 保存原文（中文）
  };
  
  // 显示气泡和播放语音（使用翻译后的内容）
  // ...
});
```

### 3. 翻译服务

**位置**：`src/services/translationService.ts`

```typescript
export async function translateText(
  text: string,
  targetLang?: string
): Promise<string> {
  const currentLang = targetLang || i18n.language || 'zh-CN';
  const detectedLang = detectLanguage(text);

  // 如果文本已经是目标语言，不需要翻译
  if (detectedLang === currentLang || detectedLang.startsWith(currentLang.split('-')[0])) {
    return text;
  }

  // 如果目标语言是中文，不需要翻译
  if (currentLang.startsWith('zh')) {
    return text;
  }

  // 如果文本不是中文，也不需要翻译
  if (!detectedLang.startsWith('zh')) {
    return text;
  }

  // 调用MyMemory Translation API翻译
  const translated = await translateWithAPI(text, currentLang);
  return translated || text;
}
```

## 📊 当前机制的优势和劣势

### ✅ 优势

1. **简单统一**：LLM只需要生成中文，不需要考虑多语言
2. **翻译质量可控**：使用专门的翻译API，翻译质量较好
3. **易于维护**：所有提示词都是中文，维护简单
4. **成本低**：MyMemory Translation API免费

### ❌ 劣势

1. **翻译延迟**：需要额外的API调用，增加延迟
2. **翻译可能不准确**：自动翻译可能不如LLM直接生成地道
3. **上下文丢失**：翻译时可能丢失一些语言特色和文化背景
4. **依赖外部服务**：需要网络连接，翻译API可能不稳定

## 🎯 优化方案

### 方案A：LLM直接生成多语言（推荐）

**思路**：让LLM根据当前语言直接生成对应语言的文本

#### 实现方式

1. **在Prompt中添加语言要求**：
```typescript
private buildPrompt(player: Player, eventType: ChatEventType, context?: ChatContext): string {
  const currentLang = i18n.language || 'zh-CN';
  const langInstruction = currentLang.startsWith('zh') 
    ? '使用中文回复'
    : `使用${currentLang}语言回复（如：英语、日语、韩语等）`;
  
  return `${this.config.systemPrompt || ''}

## 语言要求
${langInstruction}

## 游戏信息
${gameInfo}
...`;
}
```

2. **修改System Prompt**：
```typescript
systemPrompt: `你是一个过炸牌游戏的AI玩家，需要根据游戏情况生成自然、有趣的聊天内容。

语言要求：
- 如果要求使用中文，使用中文回复
- 如果要求使用其他语言，使用对应语言回复（如英语、日语、韩语等）
- 保持语言地道自然

重要要求：
1. 只返回一句话（不要多句）
2. 最多15个字（必须严格遵守）
...`
```

#### 优点
- ✅ 更地道：LLM直接生成，语言更自然
- ✅ 无延迟：不需要翻译API调用
- ✅ 保留上下文：语言特色和文化背景不会丢失
- ✅ 不依赖外部服务：完全本地化

#### 缺点
- ❌ 需要多语言模型：LLM需要支持多语言生成
- ❌ Prompt更复杂：需要处理多语言情况
- ❌ 质量可能不稳定：不同语言的生成质量可能不同

### 方案B：混合方案（当前 + LLM多语言）

**思路**：优先使用LLM直接生成，如果失败则回退到翻译

#### 实现方式

```typescript
// 1. 尝试让LLM直接生成目标语言
let content = await llmStrategy.generateEventChat(player, eventType, context);

// 2. 检查生成的语言是否正确
const detectedLang = detectLanguage(content);
if (detectedLang !== currentLang) {
  // 3. 如果语言不对，使用翻译
  content = await translateText(content, currentLang);
}
```

#### 优点
- ✅ 兼顾两者优势
- ✅ 有回退机制

#### 缺点
- ❌ 实现复杂
- ❌ 可能产生不一致

### 方案C：保持当前机制（翻译方案）

**思路**：继续使用当前机制，优化翻译质量

#### 优化方向

1. **使用更好的翻译服务**：
   - Google Translate API（质量更好，但需要API密钥）
   - DeepL API（质量最好，但需要API密钥）
   - 本地翻译模型（完全本地化）

2. **翻译缓存**：
   - 缓存常用翻译，减少API调用
   - 提高响应速度

3. **翻译后处理**：
   - 优化翻译结果，使其更符合游戏场景
   - 保留语言特色

## 🔄 推荐方案

### 短期（立即可用）

**保持当前机制，优化翻译**：
1. 添加翻译缓存
2. 优化翻译API选择（如果可用）
3. 添加翻译后处理

### 中期（1-2周）

**实现方案A：LLM直接生成多语言**：
1. 修改Prompt，添加语言要求
2. 测试多语言生成质量
3. 如果质量好，完全切换到LLM多语言
4. 如果质量不好，保持翻译方案

### 长期（可选）

**实现方案B：混合方案**：
1. 优先使用LLM多语言
2. 翻译作为回退
3. 根据质量自动选择

## 📝 实现示例

### 示例1：修改LLM Prompt支持多语言

```typescript
// src/chat/strategy/LLMChatStrategy.ts
private buildPrompt(player: Player, eventType: ChatEventType, context?: ChatContext): string {
  const currentLang = i18n.language || 'zh-CN';
  
  // 确定语言要求
  let langRequirement = '';
  if (currentLang.startsWith('zh')) {
    langRequirement = '使用中文回复';
  } else if (currentLang.startsWith('en')) {
    langRequirement = 'Use English to reply';
  } else if (currentLang.startsWith('ja')) {
    langRequirement = '日本語で返信してください';
  } else if (currentLang.startsWith('ko')) {
    langRequirement = '한국어로 답변하세요';
  } else {
    langRequirement = `Use ${currentLang} language to reply`;
  }
  
  return `${this.config.systemPrompt || ''}

## 语言要求
${langRequirement}

## 游戏信息
${gameInfo}
...`;
}
```

### 示例2：添加翻译缓存

```typescript
// src/services/translationService.ts
private translationCache: Map<string, string> = new Map();

export async function translateText(
  text: string,
  targetLang?: string
): Promise<string> {
  // 检查缓存
  const cacheKey = `${text}_${targetLang}`;
  const cached = this.translationCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  // 翻译
  const translated = await translateWithAPI(text, targetLang);
  
  // 保存到缓存
  if (translated) {
    this.translationCache.set(cacheKey, translated);
  }
  
  return translated || text;
}
```

## 🎯 建议

根据你的需求，我建议：

1. **如果LLM支持多语言**（如qwen2等）：使用方案A，让LLM直接生成多语言
2. **如果LLM不支持多语言或质量不好**：保持当前机制，优化翻译缓存

你希望我实现哪个方案？

