# 多语言框架使用指南

## 🚀 快速开始

### 1. 在组件中使用翻译

```typescript
import { useComponentTranslation } from '@/i18n/hooks';

export const MyComponent: React.FC = () => {
  const { t } = useComponentTranslation('MyComponent');
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('buttons.submit')}</button>
    </div>
  );
};
```

### 2. 生成翻译文件

```bash
# 扫描组件并生成翻译文件
npm run i18n:scan --component MyComponent
npm run i18n:generate --component MyComponent
```

### 3. 填写翻译内容

编辑生成的翻译文件：
```json
// i18n-resources/components/MyComponent/zh-CN.json
{
  "title": "我的组件",
  "buttons": {
    "submit": "提交"
  }
}
```

### 4. 生成类型定义

```bash
npm run i18n:types
```

## 📖 详细使用

### 组件级翻译

```typescript
import { useComponentTranslation } from '@/i18n/hooks';

const { t, language, changeLanguage } = useComponentTranslation('GameConfigPanel');
```

### 功能级翻译

```typescript
import { useFeatureTranslation } from '@/i18n/hooks';

const { t } = useFeatureTranslation('game');
```

### 共享翻译

```typescript
import { useSharedTranslation } from '@/i18n/hooks';

const { t } = useSharedTranslation('common');
```

### 语言切换

```typescript
import { useLanguage } from '@/i18n/hooks';

const { currentLanguage, changeLanguage, supportedLanguages } = useLanguage();
```

## 🛠️ 工具使用

### 扫描组件

```bash
# 扫描单个组件
npm run i18n:scan --component GameConfigPanel

# 扫描所有组件
npm run i18n:scan

# 保存扫描结果
npm run i18n:scan --component GameConfigPanel --output scan-result.json
```

### 生成翻译文件

```bash
# 为组件生成翻译文件
npm run i18n:generate --component GameConfigPanel

# 为新语言生成所有翻译文件
npm run i18n:generate --language fr-FR

# 生成模板文件
npm run i18n:generate --component NewComponent --template

# 更新现有文件（添加新键）
npm run i18n:generate --component GameConfigPanel --update
```

### 验证翻译

```bash
# 验证所有翻译
npm run i18n:validate

# 保存验证报告
npm run i18n:validate --output validation-report.json
```

### 生成类型

```bash
# 生成所有类型定义
npm run i18n:types

# 为特定组件生成类型
npm run i18n:types --component GameConfigPanel

# 指定输出文件
npm run i18n:types --output src/i18n/types/custom-keys.ts
```

### 完整同步

```bash
# 完整工作流（扫描+生成+验证+类型）
npm run i18n:sync --component GameConfigPanel

# 同步所有组件
npm run i18n:sync
```

## 📝 最佳实践

1. **组件命名**: 使用 PascalCase，与组件文件名一致
2. **键命名**: 使用驼峰命名，保持简洁
3. **结构组织**: 使用嵌套对象组织相关翻译
4. **定期验证**: 开发过程中定期运行验证工具

## 🔍 故障排除

### 问题：翻译不显示
- 检查翻译文件是否存在
- 检查命名空间是否正确
- 运行验证工具检查完整性

### 问题：类型错误
- 运行 `npm run i18n:types` 重新生成类型
- 检查翻译文件格式是否正确

### 问题：工具无法运行
- 确保已安装依赖：`npm install`
- 检查 Node.js 版本（需要 >= 18）

