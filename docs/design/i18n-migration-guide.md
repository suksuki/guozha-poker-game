# 翻译系统迁移指南

## 概述

我们已经完成了翻译文件从旧结构到新结构的迁移。现在可以逐步将组件迁移到使用新的 Hooks。

## 迁移步骤

### 步骤 1: 识别组件使用的翻译

查看组件中使用的翻译命名空间：

```typescript
// 旧方式
const { t } = useTranslation(['game', 'ui']);
t('game:actions.play')
t('ui:config.playerCount')
```

### 步骤 2: 选择合适的 Hook

- **组件级翻译** (`useComponentTranslation`): 组件特定的翻译
- **功能级翻译** (`useFeatureTranslation`): 游戏、聊天等功能
- **共享翻译** (`useSharedTranslation`): 通用按钮、UI 元素

### 步骤 3: 更新组件代码

#### 示例：GameConfigPanel 组件迁移

**迁移前：**
```typescript
import { useTranslation } from 'react-i18next';

export const GameConfigPanel: React.FC = (props) => {
  const { t } = useTranslation(['ui', 'game']);
  
  return (
    <div>
      <label>{t('ui:config.playerCount')}</label>
      <button>{t('game:actions.startGame')}</button>
    </div>
  );
};
```

**迁移后：**
```typescript
import { useSharedTranslation } from '@/i18n/hooks';
import { useFeatureTranslation } from '@/i18n/hooks';

export const GameConfigPanel: React.FC = (props) => {
  const { t: tUI } = useSharedTranslation('ui');
  const { t: tGame } = useFeatureTranslation('game');
  
  return (
    <div>
      <label>{tUI('config.playerCount')}</label>
      <button>{tGame('actions.startGame')}</button>
    </div>
  );
};
```

或者使用组件级翻译（如果组件有自己的翻译文件）：

```typescript
import { useComponentTranslation } from '@/i18n/hooks';
import { useSharedTranslation } from '@/i18n/hooks';
import { useFeatureTranslation } from '@/i18n/hooks';

export const GameConfigPanel: React.FC = (props) => {
  const { t: tComponent } = useComponentTranslation('GameConfigPanel');
  const { t: tUI } = useSharedTranslation('ui');
  const { t: tGame } = useFeatureTranslation('game');
  
  return (
    <div>
      {/* 使用组件特定的翻译 */}
      <h1>{tComponent('title')}</h1>
      
      {/* 使用共享翻译 */}
      <label>{tUI('config.playerCount')}</label>
      
      {/* 使用功能翻译 */}
      <button>{tGame('actions.startGame')}</button>
    </div>
  );
};
```

## 翻译命名空间映射

| 旧命名空间 | 新类型 | 新命名空间 | Hook |
|-----------|--------|-----------|------|
| `common` | shared | `shared:common` | `useSharedTranslation('common')` |
| `ui` | shared | `shared:ui` | `useSharedTranslation('ui')` |
| `game` | feature | `feature:game` | `useFeatureTranslation('game')` |
| `chat` | feature | `feature:chat` | `useFeatureTranslation('chat')` |
| `cards` | feature | `feature:cards` | `useFeatureTranslation('cards')` |
| `config` | feature | `feature:config` | `useFeatureTranslation('config')` |

## 向后兼容性

### 旧代码仍然可以工作

旧的 `useTranslation(['ui'])` 和 `t('ui:config.playerCount')` 仍然可以正常工作，因为：

1. 翻译文件已经迁移到新结构
2. i18next 仍然使用相同的命名空间名称（`ui`, `game`, `common` 等）
3. 新的 Hooks 是对旧方式的增强，不是替换

### 逐步迁移

您可以：
1. 新组件使用新的 Hooks
2. 逐步迁移旧组件
3. 两者可以共存

## 迁移检查清单

- [ ] 识别组件使用的所有翻译键
- [ ] 选择合适的 Hook（组件/功能/共享）
- [ ] 更新 import 语句
- [ ] 更新翻译键引用（移除命名空间前缀）
- [ ] 测试组件在不同语言下的显示
- [ ] 运行 `npm run i18n:validate` 检查完整性

## 工具命令

```bash
# 扫描组件并生成翻译文件
npm run i18n:scan --component GameConfigPanel

# 生成组件翻译文件
npm run i18n:generate --component GameConfigPanel

# 验证翻译完整性
npm run i18n:validate

# 生成类型定义
npm run i18n:types
```

## 常见问题

### Q: 如何知道应该使用哪个 Hook？

A: 
- 如果翻译是组件特有的，使用 `useComponentTranslation`
- 如果翻译是某个功能模块的，使用 `useFeatureTranslation`
- 如果翻译是通用的（按钮、状态等），使用 `useSharedTranslation`

### Q: 可以混用新旧方式吗？

A: 可以。两者完全兼容。

### Q: 组件翻译文件在哪里？

A: `i18n-resources/components/[ComponentName]/[language].json`

## 下一步

1. 选择一个组件作为试点（如 `GameConfigPanel`）
2. 扫描组件生成翻译文件
3. 更新组件使用新的 Hooks
4. 验证功能正常
5. 逐步迁移其他组件

