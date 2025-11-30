# 吵架王文本加工Review

## 📋 问题总结

### 1. LLM返回文本未加工
**位置：** `src/chat/strategy/LLMChatStrategy.ts`

**问题：**
- LLM返回的文本可能很长，没有断句
- `parseResponse`方法只是简单清理引号和标记，没有断句处理
- 文本直接用于TTS播报，可能导致播报不自然

**当前实现：**
```typescript
private parseResponse(response: string): string {
  let content = response.trim();
  // 只移除引号和标记，没有断句处理
  if ((content.startsWith('"') && content.endsWith('"')) ||
      (content.startsWith("'") && content.endsWith("'"))) {
    content = content.slice(1, -1);
  }
  content = content.replace(/^(聊天内容|对骂内容|内容)[：:]\s*/i, '');
  return content.trim();
}
```

### 2. 提示词未要求短句和断句
**位置：** 
- `src/chat/strategy/LLMChatStrategy.ts` - `buildPrompt`, `buildTauntPrompt`
- `src/ai/beatsGenerator.ts` - `getSystemPrompt`, `getUserPrompt`

**问题：**
- 提示词中没有明确要求LLM输出短句、断句
- 没有要求每句话不超过一定长度
- 没有要求使用标点符号进行断句

**当前提示词示例：**
```typescript
// LLMChatStrategy.ts
return `${this.config.systemPrompt || ''}

## 任务
根据以上信息，生成一句符合当前游戏场景的聊天内容。要求：
1. 简短有力（1-2句话，不超过20字）
2. 符合玩家的性格和方言特色
3. 符合当前游戏状态和事件
4. 只返回要说的话，不要添加任何解释或标记
5. 必须严格遵守"语言要求"部分指定的语言

聊天内容：`;
```

**问题：** 虽然要求"简短有力"，但没有明确要求：
- 使用标点符号断句
- 每句话不超过一定长度（如15字）
- 长句必须分段

### 3. 文本分段逻辑不完善
**位置：** `src/services/quarrelVoiceService.ts` - `splitByPunctuation`

**问题：**
- 只按句号、问号、感叹号分段
- 没有处理逗号、分号等标点符号
- 没有处理长句（超过一定长度需要强制分段）

**当前实现：**
```typescript
private splitByPunctuation(text: string): string[] {
  // 按句号、问号、感叹号分段
  const segments = text.split(/[。！？]/).filter(s => s.trim().length > 0);
  return segments;
}
```

**问题：**
- 如果文本很长但没有句号、问号、感叹号，就无法分段
- 没有处理逗号、分号等标点符号
- 没有处理长句（如超过30字需要强制分段）

### 4. 缺少统一的文本加工流程
**位置：** 整个文本处理流程

**问题：**
- 没有统一的文本加工入口
- 不同地方使用不同的处理逻辑
- 播报前没有统一的断句处理

**当前流程：**
```
LLM生成文本 
  → parseResponse (简单清理)
  → 直接用于TTS播报
  → 或进入quarrelVoiceService分段
```

**问题：** 缺少统一的文本加工步骤，导致：
- 文本可能很长，没有断句
- 播报不自然
- 不同场景处理不一致

## 🔧 改进方案

### 1. 创建文本断句工具
**新建文件：** `src/utils/textSegmenter.ts`

**功能：**
- 智能断句（支持多种标点符号）
- 长句强制分段（超过一定长度）
- 保持语义完整
- 支持不同场景（聊天、对骂、报牌）

**实现要点：**
```typescript
export function segmentText(
  text: string, 
  options?: {
    maxSegmentLength?: number;  // 每段最大长度（默认15字）
    maxTotalLength?: number;     // 总长度限制（默认40字）
    preservePunctuation?: boolean; // 是否保留标点符号
  }
): string[] {
  // 1. 先按句号、问号、感叹号分段
  // 2. 如果某段超过maxSegmentLength，按逗号、分号进一步分段
  // 3. 如果某段仍然超过maxSegmentLength，强制按长度分段
  // 4. 返回分段后的文本数组
}
```

### 2. 修改LLM提示词
**修改文件：**
- `src/chat/strategy/LLMChatStrategy.ts`
- `src/ai/beatsGenerator.ts`

**改进要点：**
- 明确要求输出短句（每句不超过15字）
- 要求使用标点符号断句（句号、问号、感叹号、逗号）
- 长文本必须分段
- 每段之间用标点符号分隔

**示例：**
```typescript
## 任务
根据以上信息，生成符合当前游戏场景的聊天内容。要求：
1. 简短有力（1-2句话，总长度不超过20字）
2. 每句话不超过15字，使用标点符号断句（句号、问号、感叹号、逗号）
3. 如果内容较长，必须分段，每段之间用标点符号分隔
4. 符合玩家的性格和方言特色
5. 符合当前游戏状态和事件
6. 只返回要说的话，不要添加任何解释或标记
7. 必须严格遵守"语言要求"部分指定的语言

聊天内容：
```

### 3. 改进文本分段逻辑
**修改文件：** `src/services/quarrelVoiceService.ts`

**改进要点：**
- 支持更多标点符号（逗号、分号、顿号等）
- 长句强制分段（超过30字）
- 保持语义完整

**实现：**
```typescript
private splitByPunctuation(text: string): string[] {
  // 1. 先按句号、问号、感叹号分段
  let segments = text.split(/[。！？]/).filter(s => s.trim().length > 0);
  
  // 2. 如果某段超过30字，按逗号、分号进一步分段
  const longSegments: string[] = [];
  segments.forEach(seg => {
    if (seg.length > 30) {
      const subSegments = seg.split(/[，；、]/).filter(s => s.trim().length > 0);
      longSegments.push(...subSegments);
    } else {
      longSegments.push(seg);
    }
  });
  
  // 3. 如果某段仍然超过30字，强制按长度分段
  const finalSegments: string[] = [];
  longSegments.forEach(seg => {
    if (seg.length > 30) {
      // 按30字强制分段
      for (let i = 0; i < seg.length; i += 30) {
        finalSegments.push(seg.substring(i, i + 30));
      }
    } else {
      finalSegments.push(seg);
    }
  });
  
  return finalSegments.filter(s => s.trim().length > 0);
}
```

### 4. 统一文本加工流程
**修改文件：**
- `src/chat/strategy/LLMChatStrategy.ts` - `parseResponse`
- `src/services/quarrelVoiceService.ts` - `submitUtter`
- `src/services/ttsAudioService.ts` - `speak`

**改进要点：**
- 在`parseResponse`中添加断句处理
- 在`submitUtter`中统一调用文本加工
- 在`speak`前统一调用文本加工

**流程：**
```
LLM生成文本 
  → parseResponse (清理 + 断句)
  → segmentText (统一断句处理)
  → 用于TTS播报
```

## 📝 实施步骤

1. **创建文本断句工具** (`src/utils/textSegmenter.ts`)
   - 实现智能断句逻辑
   - 支持多种标点符号
   - 支持长句强制分段

2. **修改LLM提示词**
   - `LLMChatStrategy.ts` - 添加短句和断句要求
   - `beatsGenerator.ts` - 添加短句和断句要求

3. **改进文本分段逻辑**
   - `quarrelVoiceService.ts` - 改进`splitByPunctuation`
   - 使用新的`textSegmenter`工具

4. **统一文本加工流程**
   - `LLMChatStrategy.ts` - 在`parseResponse`中调用断句
   - `quarrelVoiceService.ts` - 在`submitUtter`中调用断句
   - `ttsAudioService.ts` - 在`speak`前调用断句（可选）

5. **测试验证**
   - 测试短文本（正常断句）
   - 测试长文本（强制分段）
   - 测试无标点文本（强制分段）
   - 测试不同场景（聊天、对骂、报牌）

## 🎯 预期效果

1. **LLM返回的文本自动断句**
   - 短句（≤15字）直接使用
   - 长句（>15字）自动分段
   - 无标点文本强制分段

2. **提示词明确要求短句和断句**
   - LLM生成时就会注意断句
   - 减少后续加工工作量

3. **播报更自然**
   - 每段长度适中
   - 断句位置合理
   - 语义完整

4. **统一处理流程**
   - 所有文本都经过统一加工
   - 不同场景处理一致
   - 易于维护和扩展

## ⚠️ 注意事项

1. **保持语义完整**
   - 断句时不能破坏语义
   - 优先在标点符号处断句
   - 避免在词语中间断句

2. **性能考虑**
   - 断句处理应该快速
   - 避免复杂的文本分析
   - 可以缓存处理结果

3. **兼容性**
   - 保持向后兼容
   - 不影响现有功能
   - 逐步迁移

4. **测试覆盖**
   - 测试各种长度的文本
   - 测试各种标点符号组合
   - 测试边界情况

---

**最后更新：** 2025-01-25  
**状态：** 待实施  
**优先级：** 高

