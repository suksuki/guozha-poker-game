# 方言映射训练方案

## 📋 方案概述

**核心思路**：使用映射表进行快速转换，LLM用于训练模式批量生成映射对，逐步扩展映射表。

### 架构设计

```
┌─────────────────┐
│   实时转换       │
│  (映射表)        │  ← 快速、同步、无延迟
└─────────────────┘
         ↑
         │ 扩展
         │
┌─────────────────┐
│   LLM训练模式    │  ← 批量生成映射对
└─────────────────┘
         │
         ↓
┌─────────────────┐
│   映射表存储     │  ← 本地存储 + 内置映射
└─────────────────┘
```

## 🔧 实现细节

### 1. 映射表转换（主要方案）

**文件**：`src/utils/nanchangDialectMapper.ts`

**特点**：
- ✅ 同步转换，无延迟
- ✅ 使用映射表，快速查找
- ✅ 支持本地存储，持久化扩展的映射

**使用方式**：
```typescript
import { convertToNanchangDialect } from './nanchangDialectMapper';

const nanchangText = convertToNanchangDialect('厉害'); // '恰噶'
```

### 2. LLM训练模式

**文件**：`src/utils/dialectMappingTrainer.ts`

**功能**：
- ✅ 批量生成映射对
- ✅ 自动添加到映射表
- ✅ 从训练数据中提取文本
- ✅ 支持手动审核后添加

**使用方式**：

#### 方式1：手动训练指定文本

```javascript
// 在浏览器控制台
const texts = ['厉害', '很好', '不错', '牛逼', '他妈的'];
const result = await window.dialectMappingTrainer.train(texts);
console.log('新增映射:', result.added);
```

#### 方式2：从训练数据批量训练

```javascript
// 从训练数据中提取文本并训练
const samples = window.trainingDataCollector.getAllSamples();
const result = await window.dialectMappingTrainer.batchTrain(samples);
console.log('训练完成:', result);
```

### 3. 映射表管理

**功能**：
- ✅ 添加单个映射：`addMapping(mandarin, nanchang)`
- ✅ 批量添加映射：`addMappings(mappings)`
- ✅ 获取映射表：`getMappingTable()`
- ✅ 清空自定义映射：`clearCustomMappings()`
- ✅ 自动保存到本地存储

**使用方式**：

```javascript
// 添加映射
import { addMapping, addMappings } from './nanchangDialectMapper';

// 单个添加
addMapping('厉害', '恰噶');

// 批量添加
addMappings([
  { mandarin: '很好', nanchang: '恰噶' },
  { mandarin: '不错', nanchang: '恰噶' }
]);
```

## 📊 工作流程

### 日常使用（实时转换）

```
用户聊天
  ↓
LLM生成文本（普通话）
  ↓
映射表转换（同步、快速）
  ↓
南昌话文本
  ↓
TTS播放
```

### 训练模式（扩展映射表）

```
收集训练数据
  ↓
提取需要映射的文本
  ↓
LLM批量生成映射对
  ↓
审核/自动添加
  ↓
保存到映射表（本地存储）
```

## 🚀 使用指南

### 步骤1：收集训练数据

运行游戏，让系统自动收集LLM输出：

```javascript
// 查看收集的样本
const samples = window.trainingDataCollector.getAllSamples();
console.log('已收集', samples.length, '条样本');
```

### 步骤2：提取需要映射的文本

```javascript
// 从训练数据中提取文本
const texts = window.dialectMappingTrainer.extractTexts(samples);
console.log('提取到', texts.length, '个文本');
```

### 步骤3：批量训练映射

```javascript
// 批量训练（自动添加到映射表）
const result = await window.dialectMappingTrainer.batchTrain(samples);
console.log('训练结果:', result);
// {
//   success: true,
//   mappings: [...],
//   added: 50,
//   skipped: 10,
//   errors: []
// }
```

### 步骤4：验证映射表

```javascript
// 查看当前映射表
import { getMappingTable } from './nanchangDialectMapper';
const mapping = getMappingTable();
console.log('映射表大小:', Object.keys(mapping).length);
```

### 步骤5：导出映射表

```javascript
// 导出为JSON
const mapping = getMappingTable();
const json = JSON.stringify(mapping, null, 2);
console.log(json);

// 或下载
const blob = new Blob([json], { type: 'application/json' });
const url = URL.createObjectURL(blob);
const a = document.createElement('a');
a.href = url;
a.download = 'nanchang_mapping.json';
a.click();
```

## 📝 映射表结构

### 内置映射（代码中）

```typescript
const NANCHANG_MAPPING = {
  // 常用词汇
  '厉害': '恰噶',
  '很好': '恰噶',
  '不错': '恰噶',
  
  // 脏话映射
  '逼': '别',
  '傻逼': '傻别',
  '他妈的': '他娘个',
  
  // ...
};
```

### 扩展映射（本地存储）

存储在 `localStorage` 的 `nanchang_dialect_mapping` 键中，格式相同。

## 🔍 调试工具

### 开发模式下的全局对象

```javascript
// 映射表工具
window.nanchangDialectMapper = {
  convert: convertToNanchangDialect,
  addMapping: addMapping,
  addMappings: addMappings,
  getMapping: getMappingTable,
  clear: clearCustomMappings
};

// 训练工具
window.dialectMappingTrainer = {
  train: trainDialectMapping,
  batchTrain: batchTrainFromSamples,
  extractTexts: extractTextsForTraining
};
```

## ⚙️ 配置

### LLM训练配置

```typescript
// 使用默认配置
const result = await trainDialectMapping(texts);

// 或自定义配置
const result = await trainDialectMapping(texts, {
  apiUrl: 'http://localhost:11434/api/chat',
  model: 'qwen2.5:7b',
  temperature: 0.3
});
```

### 批量训练配置

```typescript
// 默认每批20个文本
const result = await batchTrainFromSamples(samples);

// 自定义批次大小
const result = await batchTrainFromSamples(samples, undefined, 10);
```

## 📈 性能优化

### 映射表查找

- ✅ 按长度排序，优先匹配长词
- ✅ 使用正则替换，支持部分匹配
- ✅ 同步执行，无异步延迟

### LLM训练

- ✅ 批量处理，减少API调用
- ✅ 自动去重，避免重复训练
- ✅ 批次间延迟，避免过载

## 🎯 优势

1. **性能**：映射表转换是同步的，无延迟
2. **可扩展**：通过LLM训练逐步扩展映射表
3. **可维护**：映射表清晰，易于审核和修改
4. **离线支持**：映射表存储在本地，无需每次调用LLM
5. **成本低**：训练是批量进行的，不是实时调用

## 🔄 迁移说明

### 从实时LLM转换迁移

**之前**：
```typescript
// 实时LLM转换（异步、可能超时）
const result = await convertToNanchangDialect(text, config, true);
```

**现在**：
```typescript
// 映射表转换（同步、快速）
const result = convertToNanchangDialect(text);
```

### 训练映射

**新增功能**：
```typescript
// 批量训练映射
const result = await trainDialectMapping(texts);
addMappings(result.mappings);
```

---

**更新日期**：2024-12-19

