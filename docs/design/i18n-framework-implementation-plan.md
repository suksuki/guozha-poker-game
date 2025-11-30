# 多语言框架实施计划

## 📋 概述

本文档详细描述了多语言框架的实施步骤，包括每个阶段的具体任务、时间估算和验收标准。

## 🎯 实施目标

1. 建立独立的多语言框架
2. 实现自动化工具链
3. 迁移现有翻译系统
4. 提供完整的类型支持
5. 确保向后兼容

## 📅 实施时间表

**总预计时间**: 8-10 天

### 阶段划分

```
阶段一: 框架核心 (2天)
  ├─ 翻译管理器
  ├─ 资源加载器
  └─ 基础配置

阶段二: 工具开发 (3天)
  ├─ 扫描工具
  ├─ 生成工具
  ├─ 验证工具
  └─ CLI工具

阶段三: 类型系统 (1天)
  ├─ 类型生成器
  └─ 类型定义

阶段四: 迁移 (2天)
  ├─ 迁移现有翻译
  └─ 更新组件

阶段五: 测试优化 (1-2天)
  ├─ 功能测试
  └─ 性能优化
```

## 🔨 详细实施步骤

### 阶段一：框架核心开发

#### 任务 1.1: 创建目录结构
**时间**: 0.5小时

**任务内容**:
- 创建 `src/i18n/core/` 目录
- 创建 `src/i18n/hooks/` 目录
- 创建 `src/i18n/utils/` 目录
- 创建 `src/i18n/types/` 目录
- 创建 `i18n-resources/` 目录（项目根目录）
- 创建 `scripts/i18n/` 目录

**验收标准**:
- [ ] 所有目录创建完成
- [ ] 目录结构符合设计文档

#### 任务 1.2: 实现配置系统
**时间**: 1小时

**文件**: `src/i18n/config.ts`

**功能要求**:
- 支持语言配置
- 支持命名空间配置
- 支持加载策略配置
- 支持开发/生产环境配置

**配置项**:
```typescript
interface I18nConfig {
  // 支持的语言
  languages: LanguageConfig[];
  
  // 默认语言
  defaultLanguage: string;
  
  // 回退语言
  fallbackLanguage: string;
  
  // 资源路径
  resourcePath: string;
  
  // 命名空间策略
  namespaceStrategy: 'component' | 'feature' | 'shared';
  
  // 加载策略
  loadStrategy: 'eager' | 'lazy';
  
  // 开发模式
  devMode: boolean;
}
```

**验收标准**:
- [ ] 配置文件创建完成
- [ ] 所有配置项定义清晰
- [ ] 支持环境变量配置

#### 任务 1.3: 实现翻译管理器
**时间**: 4小时

**文件**: `src/i18n/core/manager.ts`

**核心功能**:
1. **初始化管理**
   - 加载配置
   - 初始化 i18next
   - 设置默认语言

2. **命名空间管理**
   - 注册命名空间
   - 解析命名空间
   - 管理命名空间层级

3. **翻译查找**
   - 键值解析
   - 多层级查找
   - 回退机制

4. **语言切换**
   - 切换语言
   - 重新加载资源
   - 通知订阅者

**API 设计**:
```typescript
class TranslationManager {
  private i18n: i18n;
  private config: I18nConfig;
  private namespaces: Map<string, NamespaceInfo>;
  
  // 初始化
  async init(config: I18nConfig): Promise<void>;
  
  // 注册命名空间
  registerNamespace(namespace: string, info: NamespaceInfo): void;
  
  // 获取翻译
  translate(key: string, options?: InterpolationOptions): string;
  
  // 切换语言
  async changeLanguage(language: string): Promise<void>;
  
  // 获取当前语言
  getCurrentLanguage(): string;
  
  // 检查翻译是否存在
  hasTranslation(key: string): boolean;
  
  // 获取命名空间
  getNamespace(namespace: string): NamespaceInfo | null;
}
```

**验收标准**:
- [ ] 管理器类实现完成
- [ ] 所有核心方法实现
- [ ] 单元测试通过
- [ ] 错误处理完善

#### 任务 1.4: 实现资源加载器
**时间**: 3小时

**文件**: `src/i18n/core/loader.ts`

**核心功能**:
1. **动态加载**
   - 按需加载翻译资源
   - 支持懒加载
   - 支持预加载

2. **缓存管理**
   - 已加载资源缓存
   - 缓存失效策略
   - 内存管理

3. **错误处理**
   - 加载失败处理
   - 回退到默认语言
   - 错误日志记录

**API 设计**:
```typescript
class ResourceLoader {
  private cache: Map<string, TranslationResource>;
  private loading: Map<string, Promise<TranslationResource>>;
  
  // 加载资源
  async load(
    namespace: string, 
    language: string
  ): Promise<TranslationResource>;
  
  // 预加载
  async preload(namespaces: string[], language: string): Promise<void>;
  
  // 清除缓存
  clearCache(namespace?: string): void;
  
  // 获取资源路径
  getResourcePath(namespace: string, language: string): string;
}
```

**验收标准**:
- [ ] 加载器实现完成
- [ ] 支持懒加载
- [ ] 缓存机制工作正常
- [ ] 错误处理完善

#### 任务 1.5: 创建基础 Hooks
**时间**: 2小时

**文件**: 
- `src/i18n/hooks/useTranslation.ts`
- `src/i18n/hooks/useLanguage.ts`
- `src/i18n/hooks/useComponentTranslation.ts`

**功能要求**:
1. **useTranslation**: 基础翻译 Hook
2. **useLanguage**: 语言切换 Hook
3. **useComponentTranslation**: 组件级翻译 Hook

**API 设计**:
```typescript
// 组件级翻译 Hook
export function useComponentTranslation(
  componentName: string
): {
  t: (key: string, options?: InterpolationOptions) => string;
  language: string;
  changeLanguage: (lang: string) => Promise<void>;
};

// 功能级翻译 Hook
export function useFeatureTranslation(
  featureName: string
): {
  t: (key: string, options?: InterpolationOptions) => string;
};

// 共享翻译 Hook
export function useSharedTranslation(
  category: string
): {
  t: (key: string, options?: InterpolationOptions) => string;
};
```

**验收标准**:
- [ ] 所有 Hooks 实现完成
- [ ] 支持命名空间自动解析
- [ ] 类型定义完整
- [ ] 示例代码可用

### 阶段二：工具开发

#### 任务 2.1: 开发扫描工具
**时间**: 6小时

**文件**: `scripts/i18n/scan.ts`

**功能要求**:
1. **文件扫描**
   - 扫描组件文件
   - 识别翻译使用
   - 提取硬编码文本

2. **文本提取**
   - 识别 JSX 中的文本
   - 识别字符串字面量
   - 识别注释中的提示

3. **键生成**
   - 自动生成翻译键
   - 键名规范化
   - 去重处理

**扫描规则**:
```typescript
interface ScanResult {
  componentName: string;
  filePath: string;
  extractedTexts: ExtractedText[];
  suggestedKeys: SuggestedKey[];
}

interface ExtractedText {
  text: string;
  line: number;
  column: number;
  context: string;
  suggestedKey: string;
}
```

**验收标准**:
- [ ] 扫描工具实现完成
- [ ] 能正确识别需要翻译的文本
- [ ] 生成的键名规范
- [ ] 支持多种文本格式

#### 任务 2.2: 开发生成工具
**时间**: 4小时

**文件**: `scripts/i18n/generate.ts`

**功能要求**:
1. **文件生成**
   - 为新组件生成翻译文件
   - 为新语言生成翻译文件
   - 更新现有翻译文件结构

2. **模板生成**
   - 生成翻译文件模板
   - 保留现有翻译
   - 添加缺失的键

3. **结构维护**
   - 保持文件结构一致
   - 格式化 JSON
   - 验证 JSON 有效性

**生成规则**:
```typescript
interface GenerateOptions {
  component?: string;
  language?: string;
  template?: boolean;
  update?: boolean;
}

// 生成流程
1. 扫描组件或读取现有文件
2. 分析翻译键结构
3. 为所有语言生成/更新文件
4. 保持结构一致性
```

**验收标准**:
- [ ] 生成工具实现完成
- [ ] 能正确生成翻译文件
- [ ] 保留现有翻译内容
- [ ] 文件格式正确

#### 任务 2.3: 开发验证工具
**时间**: 4小时

**文件**: `scripts/i18n/validate.ts`

**功能要求**:
1. **完整性检查**
   - 检查所有语言是否有相同键
   - 检查是否有缺失翻译
   - 检查是否有多余键

2. **一致性检查**
   - 检查键名规范
   - 检查命名空间
   - 检查文件结构

3. **使用检查**
   - 检查未使用的键
   - 检查未翻译的文本
   - 检查硬编码文本

**验证报告**:
```typescript
interface ValidationReport {
  summary: {
    totalKeys: number;
    missingTranslations: number;
    unusedKeys: number;
    hardcodedTexts: number;
  };
  issues: ValidationIssue[];
  recommendations: string[];
}

interface ValidationIssue {
  type: 'missing' | 'unused' | 'inconsistent' | 'hardcoded';
  severity: 'error' | 'warning' | 'info';
  namespace: string;
  key?: string;
  languages?: string[];
  message: string;
}
```

**验收标准**:
- [ ] 验证工具实现完成
- [ ] 能检测所有问题类型
- [ ] 报告格式清晰
- [ ] 提供修复建议

#### 任务 2.4: 开发 CLI 工具
**时间**: 3小时

**文件**: `scripts/i18n/cli.ts`

**功能要求**:
1. **命令支持**
   - `scan`: 扫描组件
   - `generate`: 生成翻译文件
   - `validate`: 验证翻译
   - `types`: 生成类型
   - `sync`: 完整同步

2. **参数处理**
   - 组件名参数
   - 语言参数
   - 选项参数

3. **输出格式**
   - 控制台输出
   - 报告文件
   - 错误处理

**CLI 命令**:
```bash
# 扫描组件
npm run i18n:scan -- --component GameConfigPanel

# 生成翻译文件
npm run i18n:generate -- --component GameConfigPanel

# 验证翻译
npm run i18n:validate

# 生成类型
npm run i18n:types

# 完整同步（扫描+生成+验证+类型）
npm run i18n:sync
```

**验收标准**:
- [ ] CLI 工具实现完成
- [ ] 所有命令可用
- [ ] 参数处理正确
- [ ] 错误提示清晰

### 阶段三：类型系统

#### 任务 3.1: 实现类型生成器
**时间**: 4小时

**文件**: `scripts/i18n/types.ts`

**功能要求**:
1. **类型生成**
   - 从翻译文件生成类型
   - 支持嵌套结构
   - 支持插值参数

2. **类型合并**
   - 合并所有命名空间类型
   - 生成联合类型
   - 生成完整类型定义

3. **类型验证**
   - 验证类型一致性
   - 检查类型错误
   - 提供类型提示

**生成规则**:
```typescript
// 翻译文件
{
  "title": "标题",
  "buttons": {
    "confirm": "确定",
    "cancel": "取消"
  }
}

// 生成的类型
interface GameConfigPanelKeys {
  title: string;
  buttons: {
    confirm: string;
    cancel: string;
  };
}

// 完整的翻译键类型
type TranslationKey = 
  | `component:GameConfigPanel:title`
  | `component:GameConfigPanel:buttons.confirm`
  | `component:GameConfigPanel:buttons.cancel`
  | ...;
```

**验收标准**:
- [ ] 类型生成器实现完成
- [ ] 能正确生成类型定义
- [ ] 支持复杂嵌套结构
- [ ] 类型文件自动更新

#### 任务 3.2: 集成类型系统
**时间**: 2小时

**文件**: `src/i18n/types/keys.ts`

**功能要求**:
1. **类型导出**
   - 导出所有翻译键类型
   - 导出命名空间类型
   - 导出语言类型

2. **类型安全**
   - 翻译函数类型安全
   - Hook 返回类型安全
   - 编译时检查

**验收标准**:
- [ ] 类型系统集成完成
- [ ] 编译时类型检查有效
- [ ] IDE 自动补全工作
- [ ] 类型错误能正确提示

### 阶段四：迁移

#### 任务 4.1: 迁移现有翻译文件
**时间**: 4小时

**迁移策略**:
1. **分析现有结构**
   - 分析现有命名空间
   - 分析翻译键结构
   - 识别组件对应关系

2. **转换格式**
   - 将全局命名空间转换为组件命名空间
   - 重组翻译文件结构
   - 保持翻译内容不变

3. **验证迁移**
   - 检查所有翻译是否迁移
   - 验证翻译完整性
   - 测试翻译功能

**迁移映射**:
```
现有结构 → 新结构
common.json → shared/common/
game.json → feature/game/
ui.json → shared/ui/
config.json → feature/config/
cards.json → feature/cards/
chat.json → feature/chat/
```

**验收标准**:
- [ ] 所有翻译文件迁移完成
- [ ] 翻译内容完整
- [ ] 文件结构正确
- [ ] 无丢失翻译

#### 任务 4.2: 更新组件使用
**时间**: 6小时

**更新策略**:
1. **替换 Hook**
   - 将 `useTranslation` 替换为新的 Hook
   - 更新命名空间使用
   - 更新翻译键引用

2. **更新翻译键**
   - 更新键名格式
   - 更新命名空间引用
   - 保持功能不变

3. **测试验证**
   - 测试每个组件
   - 验证翻译显示
   - 验证语言切换

**更新示例**:
```typescript
// 旧代码
const { t } = useTranslation(['ui']);
t('ui:config.playerCount');

// 新代码
const { t } = useComponentTranslation('GameConfigPanel');
t('playerCount');
```

**验收标准**:
- [ ] 所有组件更新完成
- [ ] 翻译功能正常
- [ ] 语言切换正常
- [ ] 无功能回归

### 阶段五：测试和优化

#### 任务 5.1: 功能测试
**时间**: 4小时

**测试内容**:
1. **基础功能**
   - 翻译加载
   - 翻译显示
   - 语言切换

2. **高级功能**
   - 命名空间解析
   - 懒加载
   - 缓存机制

3. **工具功能**
   - 扫描工具
   - 生成工具
   - 验证工具

**测试用例**:
- [ ] 新组件自动生成翻译
- [ ] 新语言自动生成文件
- [ ] 翻译完整性验证
- [ ] 类型安全检查
- [ ] 性能测试

#### 任务 5.2: 性能优化
**时间**: 2小时

**优化项**:
1. **加载优化**
   - 懒加载优化
   - 预加载策略
   - 缓存优化

2. **运行时优化**
   - 翻译查找优化
   - 内存使用优化
   - 渲染优化

**验收标准**:
- [ ] 加载时间 < 100ms
- [ ] 内存使用合理
- [ ] 无性能回归

#### 任务 5.3: 文档完善
**时间**: 2小时

**文档内容**:
1. **使用文档**
   - 快速开始
   - API 文档
   - 最佳实践

2. **开发文档**
   - 工具使用
   - 扩展指南
   - 故障排除

**验收标准**:
- [ ] 使用文档完整
- [ ] 示例代码可用
- [ ] 常见问题解答

## 🔍 验收标准总结

### 功能验收
- [ ] 所有核心功能实现
- [ ] 所有工具可用
- [ ] 类型系统完整
- [ ] 迁移完成

### 质量验收
- [ ] 单元测试覆盖率 > 80%
- [ ] 无严重 Bug
- [ ] 性能达标
- [ ] 代码规范

### 文档验收
- [ ] 设计文档完整
- [ ] 使用文档完整
- [ ] 示例代码可用
- [ ] API 文档完整

## 🚨 风险与应对

### 风险1: 迁移复杂度高
**应对**: 分阶段迁移，保持向后兼容

### 风险2: 性能问题
**应对**: 提前性能测试，优化加载策略

### 风险3: 类型生成复杂
**应对**: 简化类型结构，使用工具辅助

### 风险4: 工具稳定性
**应对**: 充分测试，提供回退方案

## 📝 后续优化

### 短期优化（1-2周）
- 添加翻译管理界面
- 优化工具性能
- 完善错误处理

### 中期优化（1个月）
- 集成自动翻译 API
- 添加翻译版本控制
- 实现翻译质量检查

### 长期优化（3个月）
- 开发翻译管理平台
- 实现协作翻译功能
- 添加翻译分析工具

