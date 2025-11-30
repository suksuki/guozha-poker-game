# i18n 框架迁移示例

本文档展示如何将一个组件从旧的翻译方式迁移到新的框架 Hooks。

## 示例：ErrorScreen 组件

### 迁移前（旧方式）

```typescript
import React from 'react';
import { useTranslation } from 'react-i18next';

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ onReset }) => {
  const { t } = useTranslation(['game']);

  return (
    <div className="game-container">
      <div className="error-screen">
        <h2>{t('game:error.title')}</h2>
        <p>{t('game:error.message')}</p>
        <button className="btn-primary" onClick={onReset}>
          {t('game:error.backToStart')}
        </button>
      </div>
    </div>
  );
};
```

### 迁移后（新方式 - 方法 1：使用功能翻译）

```typescript
import React from 'react';
import { useFeatureTranslation } from '@/i18n/hooks';

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ onReset }) => {
  const { t } = useFeatureTranslation('game');

  return (
    <div className="game-container">
      <div className="error-screen">
        <h2>{t('error.title')}</h2>
        <p>{t('error.message')}</p>
        <button className="btn-primary" onClick={onReset}>
          {t('error.backToStart')}
        </button>
      </div>
    </div>
  );
};
```

### 迁移后（新方式 - 方法 2：使用组件翻译）

如果组件有自己的翻译文件，可以使用组件级翻译：

```typescript
import React from 'react';
import { useComponentTranslation } from '@/i18n/hooks';

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ onReset }) => {
  const { t } = useComponentTranslation('ErrorScreen');

  return (
    <div className="game-container">
      <div className="error-screen">
        <h2>{t('title')}</h2>
        <p>{t('message')}</p>
        <button className="btn-primary" onClick={onReset}>
          {t('backToStart')}
        </button>
      </div>
    </div>
  );
};
```

## 迁移步骤

### 步骤 1: 选择 Hook

根据翻译的用途选择 Hook：
- **组件特有翻译** → `useComponentTranslation`
- **功能模块翻译** → `useFeatureTranslation`
- **共享翻译** → `useSharedTranslation`

### 步骤 2: 更新导入

```typescript
// 旧方式
import { useTranslation } from 'react-i18next';

// 新方式
import { useFeatureTranslation } from '@/i18n/hooks';
// 或
import { useComponentTranslation } from '@/i18n/hooks';
```

### 步骤 3: 更新 Hook 调用

```typescript
// 旧方式
const { t } = useTranslation(['game']);
t('game:error.title')

// 新方式（功能翻译）
const { t } = useFeatureTranslation('game');
t('error.title')

// 新方式（组件翻译）
const { t } = useComponentTranslation('ErrorScreen');
t('title')
```

### 步骤 4: 更新翻译键

- 移除命名空间前缀（Hook 会自动处理）
- `game:error.title` → `error.title`
- `ui:config.playerCount` → `config.playerCount`

### 步骤 5: 生成组件翻译文件（如果使用组件翻译）

```bash
# 扫描组件
npm run i18n:scan --component ErrorScreen

# 生成翻译文件
npm run i18n:generate --component ErrorScreen

# 填写翻译内容
# 编辑 i18n-resources/components/ErrorScreen/zh-CN.json
```

## 更多示例

### 示例 1: LanguageSwitcher（使用语言 Hook）

```typescript
import React from 'react';
import { useLanguage } from '@/i18n/hooks';

export const LanguageSwitcher: React.FC = () => {
  const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();

  return (
    <div>
      {supportedLanguages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => changeLanguage(lang.code)}
          className={currentLanguage === lang.code ? 'active' : ''}
        >
          {lang.flag} {lang.name}
        </button>
      ))}
    </div>
  );
};
```

### 示例 2: GameConfigPanel（混合使用）

```typescript
import React from 'react';
import { useComponentTranslation } from '@/i18n/hooks';
import { useSharedTranslation } from '@/i18n/hooks';
import { useFeatureTranslation } from '@/i18n/hooks';

export const GameConfigPanel: React.FC = (props) => {
  // 组件特定的翻译
  const { t: tComponent } = useComponentTranslation('GameConfigPanel');
  
  // UI 相关的共享翻译
  const { t: tUI } = useSharedTranslation('ui');
  
  // 游戏相关的功能翻译
  const { t: tGame } = useFeatureTranslation('game');

  return (
    <div>
      <h1>{tComponent('title')}</h1>
      <label>{tUI('config.playerCount')}</label>
      <button>{tGame('actions.startGame')}</button>
    </div>
  );
};
```

## 优势对比

### 旧方式

```typescript
const { t } = useTranslation(['game', 'ui']);
t('game:actions.play')    // 需要完整命名空间
t('ui:config.playerCount') // 需要完整命名空间
```

### 新方式

```typescript
const { t: tGame } = useFeatureTranslation('game');
const { t: tUI } = useSharedTranslation('ui');
tGame('actions.play')      // 简洁，自动命名空间
tUI('config.playerCount')  // 简洁，自动命名空间
```

**优势：**
- ✅ 更清晰的代码组织
- ✅ 更好的类型支持（可自动生成）
- ✅ 自动命名空间管理
- ✅ 更易于维护

## 迁移检查清单

- [ ] 识别组件使用的翻译命名空间
- [ ] 选择合适的 Hook
- [ ] 更新 import 语句
- [ ] 更新 Hook 调用
- [ ] 更新翻译键（移除命名空间前缀）
- [ ] 测试组件在不同语言下的显示
- [ ] 运行验证工具：`npm run i18n:validate`

## 渐进式迁移

- ✅ 新旧方式可以共存
- ✅ 可以逐步迁移，不需要一次性完成
- ✅ 旧代码仍然可以正常工作

## 下一步

1. 选择一个简单的组件开始迁移
2. 使用工具生成翻译文件（如需要）
3. 测试功能正常
4. 逐步迁移其他组件

