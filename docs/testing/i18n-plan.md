# 多语言支持规划文档

## 📋 概述

本文档规划了过炸扑克游戏的多语言支持方案，第一版本支持：
- 🇨🇳 中文（简体）
- 🇺🇸 英文（English）
- 🇰🇷 韩文（한국어）
- 🇯🇵 日文（日本語）

## 🎯 技术选型

### 推荐方案：react-i18next

**优势：**
- React 生态中最成熟、最流行的 i18n 库
- 功能完善，支持命名空间、复数、插值等高级特性
- 良好的 TypeScript 支持
- 活跃的社区和维护
- 支持懒加载语言资源

**安装：**
```bash
npm install react-i18next i18next i18next-browser-languagedetector
```

## 📁 文件结构规划

```
src/
├── i18n/
│   ├── index.ts                    # i18n 初始化配置
│   ├── config.ts                   # 语言配置
│   └── locales/
│       ├── zh-CN/                 # 中文（简体）
│       │   ├── common.json        # 通用文本
│       │   ├── game.json          # 游戏相关
│       │   ├── cards.json         # 卡牌相关
│       │   ├── ui.json            # UI 组件
│       │   ├── chat.json           # 聊天内容
│       │   └── config.json        # 配置项
│       ├── en-US/                 # 英文
│       │   ├── common.json
│       │   ├── game.json
│       │   ├── cards.json
│       │   ├── ui.json
│       │   ├── chat.json
│       │   └── config.json
│       ├── ko-KR/                 # 韩文
│       │   └── ... (同上)
│       └── ja-JP/                 # 日文
│           └── ... (同上)
```

## 📝 需要翻译的内容分类

### 1. **通用文本** (`common.json`)
- 按钮：确定、取消、返回、开始、暂停、继续
- 状态：加载中、错误、成功、失败
- 提示：确认、警告、信息

### 2. **游戏相关** (`game.json`)
- 游戏标题："过炸扑克游戏"
- 游戏状态：
  - "等待开始"
  - "游戏中"
  - "游戏结束"
  - "你的回合"
  - "等待其他玩家"
- 游戏操作：
  - "出牌"
  - "要不起"
  - "AI建议"
  - "AI思考中..."
  - "必须出牌"
- 游戏结果：
  - "第X名"
  - "获胜者"
  - "游戏结束"

### 3. **卡牌相关** (`cards.json`)
- 卡牌点数：
  - 3, 4, 5, 6, 7, 8, 9, 10
  - J (钩), Q (圈圈), K, A (桌桌), 2 (喔喔)
  - 小王, 大王
- 牌型名称：
  - "单张"
  - "对子"
  - "三个"
  - "炸弹"
  - "墩"
- 语音播报格式：
  - "对{rank}"
  - "三个{rank}"
  - "{count}个{rank}"
  - "{count}张牌"

### 4. **UI 组件** (`ui.json`)
- 配置面板：
  - "玩家数量"
  - "你的位置"
  - "AI策略"
  - "AI算法"
  - "发牌算法"
  - "跳过发牌动画"
  - "发牌速度"
  - "排序方式"
- 模式选择：
  - "游戏模式"
  - "训练模式"
- 策略选项：
  - "激进"
  - "保守"
  - "平衡"
- 算法选项：
  - "MCTS蒙特卡洛树搜索（推荐）"
  - "智能策略算法"
- 排序选项：
  - "升序"
  - "降序"
  - "分组"

### 5. **聊天内容** (`chat.json`)
- 聊天事件类型：
  - 随机聊天
  - 大墩反应
  - 分数被抢反应
  - 好牌反应
  - 第一名完成反应
  - 中间完成反应
  - 出墩反应
  - 催促出牌反应
  - 嘲讽内容
- 注意：聊天内容可能需要根据语言文化调整，不仅仅是翻译

### 6. **配置项** (`config.json`)
- 系统提示词（LLM配置）
- 游戏规则说明
- 帮助文本

## 🔧 实现步骤

### 阶段一：基础架构搭建（1-2天）

1. **安装依赖**
   ```bash
   npm install react-i18next i18next i18next-browser-languagedetector
   ```

2. **创建 i18n 初始化文件**
   - `src/i18n/index.ts` - 初始化 i18next
   - `src/i18n/config.ts` - 语言配置

3. **创建语言文件结构**
   - 创建 4 个语言目录
   - 创建 6 个命名空间文件（common, game, cards, ui, chat, config）

4. **在 App 中集成**
   - 在 `App.tsx` 或 `main.tsx` 中初始化 i18n
   - 创建语言切换组件

### 阶段二：提取和翻译文本（2-3天）

1. **提取硬编码文本**
   - 扫描所有组件文件
   - 识别需要翻译的字符串
   - 创建翻译键（translation keys）

2. **创建中文翻译文件**
   - 将所有现有中文文本提取到语言文件
   - 建立完整的键值对映射

3. **翻译其他语言**
   - 英文翻译
   - 韩文翻译
   - 日文翻译
   - 注意文化适应性（特别是聊天内容）

### 阶段三：替换硬编码文本（2-3天）

1. **替换组件中的文本**
   - `ActionButtons.tsx` - 按钮文本
   - `GameConfigPanel.tsx` - 配置面板
   - `MultiPlayerGameBoard.tsx` - 游戏界面
   - `GameResultScreen.tsx` - 结果界面
   - 其他 UI 组件

2. **替换工具函数中的文本**
   - `speechUtils.ts` - 卡牌语音转换
   - `chatContent.ts` - 聊天内容（需要特殊处理）

3. **替换服务中的文本**
   - `systemAnnouncementService.ts` - 系统播报
   - 错误消息和提示

### 阶段四：语言切换功能（1天）

1. **创建语言切换组件**
   - 语言选择器（下拉菜单或按钮组）
   - 保存用户语言偏好（localStorage）

2. **实现动态切换**
   - 切换语言时更新所有文本
   - 保持游戏状态不丢失

### 阶段五：测试和优化（1-2天）

1. **功能测试**
   - 测试所有语言的显示
   - 测试语言切换功能
   - 测试边界情况

2. **UI 适配**
   - 检查不同语言下的布局
   - 处理长文本溢出问题
   - 调整字体大小（如果需要）

3. **性能优化**
   - 懒加载语言资源
   - 优化翻译键查找

## 🎨 UI 设计建议

### 语言切换器位置
- **推荐位置**：游戏配置面板右上角
- **样式**：下拉菜单或国旗图标按钮组
- **默认语言**：根据浏览器语言自动检测

### 语言标识
- 使用语言代码：`zh-CN`, `en-US`, `ko-KR`, `ja-JP`
- 显示名称：中文、English、한국어、日本語
- 可选：添加国旗图标（🇨🇳 🇺🇸 🇰🇷 🇯🇵）

## 🔍 特殊考虑

### 1. **聊天内容的多语言**
聊天内容不仅仅是翻译，还需要考虑：
- 文化适应性（不同国家的表达习惯）
- 方言特色（中文有普通话和粤语，其他语言可能也有方言）
- 可能需要为每种语言单独编写聊天内容库

### 2. **卡牌名称的本地化**
- 中文：钩、圈圈、桌桌、喔喔（特殊命名）
- 英文：J, Q, A, 2（标准命名）
- 韩文/日文：可能需要使用本地化命名

### 3. **语音播报**
- 不同语言需要不同的语音合成
- 可能需要调整 `voiceService` 以支持多语言 TTS

### 4. **数字格式**
- 不同语言可能有不同的数字表示方式
- 需要处理复数形式（英文：1 card vs 2 cards）

## 📊 翻译键命名规范

### 命名空间.模块.具体项

示例：
```json
{
  "game": {
    "actions": {
      "play": "出牌",
      "pass": "要不起",
      "aiSuggest": "AI建议"
    },
    "status": {
      "waiting": "等待开始",
      "playing": "游戏中"
    }
  },
  "cards": {
    "ranks": {
      "three": "三",
      "jack": "钩"
    },
    "types": {
      "single": "单张",
      "pair": "对子"
    }
  }
}
```

## 🚀 快速开始示例

### 1. 初始化 i18n

```typescript
// src/i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import zhCN from './locales/zh-CN/common.json';
import enUS from './locales/en-US/common.json';
// ... 其他语言

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      'zh-CN': { common: zhCN },
      'en-US': { common: enUS },
      // ...
    },
    fallbackLng: 'zh-CN',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    }
  });
```

### 2. 在组件中使用

```typescript
// 组件中
import { useTranslation } from 'react-i18next';

function ActionButtons() {
  const { t } = useTranslation(['game', 'ui']);
  
  return (
    <button>{t('game:actions.play')}</button>
  );
}
```

## 📋 检查清单

- [ ] 安装 i18n 依赖
- [ ] 创建文件结构
- [ ] 初始化 i18n 配置
- [ ] 提取所有中文文本
- [ ] 创建中文翻译文件
- [ ] 翻译英文
- [ ] 翻译韩文
- [ ] 翻译日文
- [ ] 替换组件中的硬编码文本
- [ ] 替换工具函数中的文本
- [ ] 实现语言切换功能
- [ ] 测试所有语言
- [ ] UI 适配和优化
- [ ] 文档更新

## 🎯 优先级建议

1. **高优先级**：游戏核心功能（按钮、状态、卡牌名称）
2. **中优先级**：配置面板、游戏结果
3. **低优先级**：聊天内容、帮助文档

## 💡 后续扩展

- 支持更多语言
- 语言包热更新
- 用户自定义翻译
- 语言特定的游戏规则说明

---

**预计总工作量**：7-10 个工作日

**建议开始时间**：完成当前游戏逻辑修复后

