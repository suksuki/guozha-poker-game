# 多语言实现指南

## ✅ 已完成的工作

### 1. 基础配置
- ✅ 安装 vue-i18n
- ✅ 创建 i18n 配置文件 (`vue-mobile/src/i18n/index.ts`)
- ✅ 创建语言资源文件（中文、英文、日文、韩文）
- ✅ 在 `main.ts` 中注册 i18n
- ✅ 在 `settingsStore` 中集成语言切换
- ✅ 在 `SettingsPanel` 中添加语言选择器

### 2. 语言资源文件
所有语言资源文件位于 `vue-mobile/src/i18n/locales/`：
- `zh-CN.json` - 中文（简体）
- `en-US.json` - 英文
- `ja-JP.json` - 日文
- `ko-KR.json` - 韩文

## 📝 如何在组件中使用 i18n

### 方法1：在模板中使用 `$t`

```vue
<template>
  <div>
    <button>{{ $t('game.startNewGame') }}</button>
    <span>{{ $t('common.settings') }}</span>
  </div>
</template>
```

### 方法2：在 script 中使用 `useI18n`

```vue
<script setup lang="ts">
import { useI18n } from '../../i18n/composable';

const { t } = useI18n();

const message = t('game.startNewGame');
</script>
```

### 方法3：使用组合式 API

```vue
<script setup lang="ts">
import { useI18n as useVueI18n } from 'vue-i18n';

const { t } = useVueI18n();
</script>
```

## 🔄 切换语言

### 在组件中切换

```typescript
import { useI18n } from '../../i18n/composable';

const { changeLanguage } = useI18n();

// 切换到英文
changeLanguage('en-US');

// 切换到日文
changeLanguage('ja-JP');
```

### 在设置中切换

语言选择器已添加到 `SettingsPanel` 的 UI 标签页中，用户可以直接选择语言。

## 📋 待完成的工作

### 1. 替换所有组件中的硬编码文本

需要更新以下组件：
- [ ] `GameBoard.vue` - 游戏主界面
- [ ] `GameResultScreen.vue` - 游戏结果界面
- [ ] `PlayerInfo.vue` - 玩家信息
- [ ] `ChatInput.vue` - 聊天输入
- [ ] `ChatBubble.vue` - 聊天气泡
- [ ] `TrainingPanel.vue` - 训练面板
- [ ] `DecisionTrainingPanel.vue` - 决策训练面板
- [ ] `ChatTrainingPanel.vue` - 聊天训练面板
- [ ] `HybridTrainingPanel.vue` - 混合训练面板

### 2. 聊天消息多语言支持

聊天消息需要根据当前语言显示。有两种方案：

#### 方案A：AI生成多语言消息
修改 AI Brain 集成，让 LLM 根据当前语言生成消息。

#### 方案B：翻译现有消息
在显示聊天消息时，根据当前语言翻译。

推荐使用方案A，因为：
- 更自然
- 支持文化差异
- 不需要额外的翻译服务

### 3. 语音播报多语言（待讨论）

语音播报的多语言支持需要：
- TTS 服务器支持多语言
- 根据当前语言选择 TTS 模型
- 报牌文本的多语言翻译

## 🎯 实现步骤

### 步骤1：更新 GameBoard.vue

```vue
<template>
  <!-- 替换所有硬编码文本 -->
  <van-button>{{ $t('game.startNewGame') }}</van-button>
  <van-button>{{ $t('game.intelligentTraining') }}</van-button>
  <van-button>{{ $t('common.settings') }}</van-button>
</template>

<script setup lang="ts">
import { useI18n } from '../../i18n/composable';
const { t } = useI18n();
</script>
```

### 步骤2：更新其他组件

按照相同的模式，将所有硬编码文本替换为 `$t('key')` 或 `t('key')`。

### 步骤3：实现聊天多语言

在 `chatStore.ts` 中，修改消息生成逻辑：

```typescript
import { getCurrentLanguage } from '../i18n';

// 生成聊天消息时，传入当前语言
const generateChatMessage = async (context: GameContext) => {
  const currentLang = getCurrentLanguage();
  // 让 LLM 根据语言生成消息
  const message = await aiBrain.generateChat(context, { language: currentLang });
  return message;
};
```

### 步骤4：测试语言切换

1. 启动应用
2. 打开设置面板
3. 切换到 UI 标签页
4. 选择不同语言
5. 验证所有文本都已更新

## 📚 语言资源键名规范

### 命名空间
- `common.*` - 通用文本（按钮、状态等）
- `game.*` - 游戏相关
- `chat.*` - 聊天相关
- `settings.*` - 设置相关
- `training.*` - 训练相关
- `cards.*` - 卡牌相关

### 键名示例
```json
{
  "common": {
    "confirm": "确定",
    "cancel": "取消"
  },
  "game": {
    "startNewGame": "开始新游戏",
    "intelligentTraining": "智能训练"
  }
}
```

## ⚠️ 注意事项

1. **实时切换**：语言切换会立即生效，无需刷新页面
2. **持久化**：语言选择会保存到 localStorage
3. **回退语言**：如果某个键缺失，会回退到中文（zh-CN）
4. **类型安全**：建议使用 TypeScript 类型定义（可选）

## 🔍 调试技巧

### 查看当前语言
```typescript
import { getCurrentLanguage } from '../i18n';
console.log('当前语言:', getCurrentLanguage());
```

### 检查翻译键是否存在
```typescript
import { useI18n } from 'vue-i18n';
const { t, te } = useI18n();

if (te('game.startNewGame')) {
  console.log('键存在');
} else {
  console.log('键不存在');
}
```

## 📖 参考资源

- [Vue I18n 官方文档](https://vue-i18n.intlify.dev/)
- [语言资源文件](./locales/)

