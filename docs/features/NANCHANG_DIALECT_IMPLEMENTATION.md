# 南昌话方言支持实现

## 📋 功能概述

实现了南昌话玩家的文本映射功能，通过将普通话文本转换为南昌话文本，然后使用普通话TTS播放，模拟南昌话发音。

## 🎯 实现原理

1. **文本映射**：LLM生成普通话文本后，如果玩家是南昌话，将文本转换为南昌话文本
2. **TTS播放**：使用普通话TTS播放南昌话文本（因为TTS不支持南昌话）
3. **脏话映射**：对骂场景中的脏话也会被映射（如：逼 -> 别）

## 📦 核心组件

### 1. 南昌话映射工具

**文件：** `src/utils/nanchangDialectMapper.ts`

**功能：**
- `convertToNanchangDialect(text: string)` - 将普通话文本转换为南昌话文本
- `containsSwearWords(text: string)` - 检查文本是否包含脏话
- `convertBatchToNanchangDialect(texts: string[])` - 批量转换

**映射表：**
- 常用词汇：厉害 -> 恰噶，很好 -> 恰噶，不错 -> 恰噶
- 脏话映射：逼 -> 别，傻逼 -> 傻别，妈的 -> 娘个

### 2. 语音配置更新

**文件：** `src/config/voiceConfig.ts`

**更新：**
- 添加 `'nanchang'` 到 `VoiceDialect` 类型
- 添加 `'nanchang'` 到 `SUPPORTED_DIALECTS`
- 添加 `nanchang: 'zh-CN'` 到 `DIALECT_LANG_MAP`（使用普通话TTS）

### 3. LLM策略集成

**文件：** `src/chat/strategy/LLMChatStrategy.ts`

**更新：**
- `generateRandomChat` - 添加南昌话转换
- `generateEventChat` - 添加南昌话转换
- `generateTaunt` - 添加南昌话转换（包括脏话映射）

## 🔄 工作流程

```
LLM生成普通话文本
  ↓
processContent处理（精简优化）
  ↓
检查玩家dialect是否为'nanchang'
  ↓
如果是，调用convertToNanchangDialect转换
  ↓
返回南昌话文本
  ↓
使用普通话TTS播放
```

## 📝 映射示例

### 常用词汇

| 普通话 | 南昌话 |
|--------|--------|
| 厉害 | 恰噶 |
| 很好 | 恰噶 |
| 不错 | 恰噶 |
| 好的 | 好个 |
| 这手不错 | 这手恰噶 |

### 脏话映射

| 普通话 | 南昌话 |
|--------|--------|
| 逼 | 别 |
| 傻逼 | 傻别 |
| 牛逼 | 牛别 |
| 妈的 | 娘个 |
| 他妈的 | 他娘个 |

## 🎮 使用方式

### 创建南昌话玩家

```typescript
const player: Player = {
  id: 0,
  name: '南昌玩家',
  voiceConfig: {
    gender: 'female',
    dialect: 'nanchang', // 设置为南昌话
    rate: 1.0,
    pitch: 1.0,
    volume: 1.0
  }
};
```

### 自动转换

当玩家说话时，系统会自动：
1. LLM生成普通话文本（如："厉害"）
2. 检测到玩家是南昌话
3. 转换为南昌话文本（"恰噶"）
4. 使用普通话TTS播放

## 🔍 调试

### 查看转换日志

在浏览器控制台会看到：

```
[LLMChatStrategy] 🗣️ 南昌话转换:
  原文: 厉害
  转换后: 恰噶
```

### 测试映射

在开发模式下，`nanchangDialectMapper.ts` 会自动运行测试用例：

```typescript
// 测试用例
'厉害' -> '恰噶'
'这手不错' -> '这手恰噶'
'傻逼' -> '傻别'
```

## ⚙️ 配置

### 添加新映射

在 `src/utils/nanchangDialectMapper.ts` 的 `NANCHANG_MAPPING` 中添加：

```typescript
const NANCHANG_MAPPING: Record<string, string> = {
  // 添加新映射
  '新词': '南昌话对应词',
  // ...
};
```

### 注意事项

1. **映射顺序**：按长度从长到短排序，优先匹配长词
2. **脏话处理**：脏话映射会应用到所有场景，包括对骂
3. **TTS限制**：使用普通话TTS播放，无法完全模拟南昌话发音

## 🚀 未来优化

1. **更多词汇**：扩展映射表，添加更多常用词汇
2. **上下文感知**：根据上下文选择更合适的映射
3. **发音优化**：使用音标或拼音标注，提高TTS发音准确性
4. **自定义映射**：允许用户自定义映射规则

---

**更新日期**：2024-12-19

