# LLM微调计划

## 📋 当前状态

### 已实现的预处理和后处理

1. **提示词构建**：
   - 游戏规则说明（首次调用时）
   - 玩家信息（名字、ID、性格）
   - 完整的游戏状态
   - 当前情况描述
   - 输出要求

2. **返回处理**：
   - 基础清理（移除引号、标记等）
   - 内容过滤（敏感词、HTML、代码标记）
   - 格式验证（空白、特殊字符检查）
   - 长度控制（最多15个字符）

3. **数据收集**：
   - 自动收集所有AI聊天数据
   - 包含完整的游戏状态、认知分析、上下文
   - 自动标注质量、分类、标签
   - 导出为JSONL格式（适合LLM训练）

## 🎯 微调目标

### 通过微调可以改进的部分

1. **提示词优化**：
   - 当前：手动构建的提示词模板
   - 微调后：LLM可以更好地理解游戏上下文，减少提示词长度
   - 效果：更快的响应、更低的token消耗

2. **返回处理简化**：
   - 当前：需要多层后处理（清理、过滤、验证）
   - 微调后：LLM直接输出符合要求的格式
   - 效果：减少后处理逻辑，提高可靠性

3. **内容质量提升**：
   - 当前：基于规则的内容生成
   - 微调后：基于真实游戏数据的个性化聊天
   - 效果：更自然、更符合游戏场景的聊天内容

4. **性格表达增强**：
   - 当前：通过提示词描述性格
   - 微调后：通过训练数据学习不同性格的表达方式
   - 效果：更真实的性格差异

## 📊 训练数据收集

### 当前收集的数据

```typescript
{
  // 输入
  input: {
    gameState: GameState,      // 完整游戏状态
    cognitive: any,            // 认知分析结果
    context: CommunicationContext  // 通信上下文
  },
  
  // 输出
  output: {
    communication: {
      message: string,          // 聊天内容
      intent: string,           // 意图
      emotion: string           // 情绪
    }
  },
  
  // 标注
  annotation: {
    quality: 'excellent' | 'good' | 'average' | 'poor',
    category: string[],
    tags: string[],
    notes: string
  }
}
```

### 需要增强的数据收集

1. **完整的提示词**：
   - 当前：只收集简化的游戏状态
   - 需要：收集完整的提示词（包含游戏规则、玩家信息等）

2. **原始LLM响应**：
   - 当前：只收集处理后的内容
   - 需要：收集原始响应和处理后的内容，用于对比学习

3. **后处理结果**：
   - 当前：只收集最终结果
   - 需要：记录后处理步骤（哪些被过滤、为什么被过滤）

4. **用户反馈**：
   - 当前：自动标注质量
   - 需要：收集用户反馈（哪些聊天好、哪些不好）

## 🔧 微调实施步骤

### 阶段1：数据收集增强（当前）

1. ✅ 自动收集所有聊天数据
2. ⚠️ 增强数据收集，包含完整提示词
3. ⚠️ 记录原始LLM响应和后处理结果
4. ⚠️ 添加用户反馈收集机制

### 阶段2：数据清洗和标注

1. 筛选高质量数据（quality >= 'good'）
2. 人工审核和标注
3. 构建训练集、验证集、测试集
4. 数据增强（同义词替换、场景扩展等）

### 阶段3：模型微调

1. 选择基础模型（如 qwen2.5:3b）
2. 准备训练数据（JSONL格式）
3. 使用LoRA或全量微调
4. 评估微调效果

### 阶段4：集成和优化

1. 集成微调后的模型
2. 简化后处理逻辑（因为模型已经学会输出正确格式）
3. 优化提示词（减少不必要的上下文）
4. A/B测试对比效果

## 📝 代码改进建议

### 1. 增强数据收集

```typescript
// 在 CommunicationScheduler 中
recordCommunicationData({
  playerId,
  context,
  personality,
  fullPrompt,        // 完整提示词
  rawLLMResponse,   // 原始LLM响应
  processedContent, // 处理后的内容
  postProcessingSteps: {
    removedQuotes: boolean,
    filteredContent: boolean,
    truncated: boolean,
    reason: string
  }
});
```

### 2. 用户反馈收集

```typescript
// 在游戏UI中
interface UserFeedback {
  messageId: string;
  rating: 1 | 2 | 3 | 4 | 5;  // 1-5星
  comment?: string;
  tags?: string[];  // 如：['有趣', '不合适', '太短']
}
```

### 3. 训练数据导出增强

```typescript
// 导出时包含更多信息
{
  messages: [
    {
      role: 'system',
      content: fullSystemPrompt  // 完整的系统提示词
    },
    {
      role: 'user',
      content: fullUserPrompt    // 完整的用户提示词（包含游戏状态）
    },
    {
      role: 'assistant',
      content: processedContent  // 处理后的内容（作为目标输出）
    }
  ],
  metadata: {
    rawResponse: rawLLMResponse,  // 原始响应（用于对比）
    postProcessing: {...},        // 后处理步骤
    quality: 'good',
    userFeedback: {...}          // 用户反馈（如果有）
  }
}
```

## 🎯 预期效果

### 微调前 vs 微调后

| 指标 | 微调前 | 微调后 |
|------|--------|--------|
| 提示词长度 | ~500-1000字符 | ~200-400字符 |
| 后处理步骤 | 5-7步 | 1-2步 |
| 内容质量 | 基于规则 | 基于真实数据 |
| 响应时间 | 较慢（长提示词） | 更快（短提示词） |
| 性格差异 | 通过提示词 | 通过训练数据 |
| 用户满意度 | 中等 | 高 |

## ⚠️ 注意事项

1. **数据隐私**：确保训练数据不包含敏感信息
2. **模型大小**：微调后的模型可能需要更多资源
3. **版本管理**：需要管理不同版本的微调模型
4. **回退机制**：如果微调效果不好，可以回退到当前规则版本
5. **持续学习**：定期收集新数据，持续改进模型

## 📅 时间线

- **阶段1（数据收集增强）**：1-2周
- **阶段2（数据清洗和标注）**：2-4周
- **阶段3（模型微调）**：1-2周
- **阶段4（集成和优化）**：1-2周

**总计**：5-10周

## 🔗 相关文档

- [聊天机制Review](./chat-mechanism-review.md)
- [LLM提示词和后处理增强](./llm-prompt-enhancement.md)
- [AI Core README](../../src/ai-core/README.md)

