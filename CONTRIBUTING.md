# 贡献指南

感谢你考虑为锅炸扑克项目做出贡献！

---

## 📋 目录

- [行为准则](#行为准则)
- [开始之前](#开始之前)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [测试要求](#测试要求)
- [提交规范](#提交规范)
- [Pull Request](#pull-request)
- [问题反馈](#问题反馈)

---

## 🤝 行为准则

### 我们的承诺

为了营造开放和友好的环境，我们承诺：

- 尊重不同的观点和经验
- 接受建设性的批评
- 关注对社区最有利的事情
- 对社区成员表示同理心

### 不可接受的行为

- 使用性别化的语言或图像
- 人身攻击或政治攻击
- 公开或私下的骚扰
- 未经许可发布他人的私人信息
- 其他不道德或不专业的行为

---

## 🚀 开始之前

### 环境准备

确保你的开发环境满足以下要求：

```bash
Node.js: >= 18.0.0
npm: >= 9.0.0
Git: >= 2.30.0
TypeScript: >= 5.0.0
```

### Fork项目

1. 访问[项目主页](https://github.com/your-username/guozha-poker-game)
2. 点击右上角的"Fork"按钮
3. 克隆你fork的仓库：

```bash
git clone https://github.com/YOUR-USERNAME/guozha-poker-game.git
cd guozha-poker-game
```

### 安装依赖

```bash
# 主项目
npm install

# Vue移动端
cd vue-mobile
npm install
```

### 配置上游仓库

```bash
git remote add upstream https://github.com/original-owner/guozha-poker-game.git
git fetch upstream
```

---

## 💻 开发流程

### 1. 创建特性分支

```bash
# 更新主分支
git checkout main
git pull upstream main

# 创建新分支
git checkout -b feature/your-feature-name
# 或
git checkout -b fix/your-bug-fix
```

### 2. 进行开发

遵循我们的[代码规范](#代码规范)和[测试要求](#测试要求)。

### 3. 运行测试

```bash
# 运行所有测试
npm test

# 运行特定测试
npm test tests/unit/your-test.test.ts

# 检查覆盖率
npm run test:coverage
```

### 4. 提交更改

```bash
git add .
git commit -m "type: description"
```

遵循我们的[提交规范](#提交规范)。

### 5. 推送分支

```bash
git push origin feature/your-feature-name
```

### 6. 创建Pull Request

访问GitHub并创建Pull Request。

---

## 📏 代码规范

### TypeScript规范

#### 类型定义

```typescript
// ✅ 好
interface Player {
  id: number;
  name: string;
  hand: Card[];
}

// ❌ 差
const player: any = { ... };
```

#### 纯函数

```typescript
// ✅ 好 - 纯函数
function calculateScore(player: Player): number {
  return player.hand.length * 10;
}

// ❌ 差 - 有副作用
function updateScore(player: Player): void {
  player.score += 10; // 修改输入参数
}
```

#### 不可变性

```typescript
// ✅ 好 - 返回新对象
function addCard(player: Player, card: Card): Player {
  return {
    ...player,
    hand: [...player.hand, card]
  };
}

// ❌ 差 - 修改原对象
function addCard(player: Player, card: Card): void {
  player.hand.push(card);
}
```

### 命名规范

```typescript
// 类名: PascalCase
class GameState { }

// 接口: PascalCase, 可以加I前缀
interface IPlayer { }
interface Player { } // 推荐

// 函数/变量: camelCase
function calculateScore() { }
const playerName = 'Alice';

// 常量: UPPER_SNAKE_CASE
const MAX_PLAYERS = 4;

// 私有成员: _开头
class Player {
  private _score: number;
}

// 类型: PascalCase
type GameStatus = 'WAITING' | 'PLAYING' | 'FINISHED';
```

### 文件命名

```
- 组件: PascalCase.vue
  例: GameBoard.vue

- 模块: PascalCase.ts
  例: ScoreModule.ts

- 工具: camelCase.ts
  例: cardUtils.ts

- 测试: *.test.ts
  例: GameState.test.ts
```

### 注释规范

```typescript
/**
 * 计算玩家总分
 * 
 * @param player - 玩家对象
 * @returns 总分数
 * 
 * @example
 * ```ts
 * const score = calculateScore(player);
 * ```
 */
function calculateScore(player: Player): number {
  // 计算手牌分数
  const handScore = player.hand.length * 10;
  
  // 添加奖励分数
  return handScore + player.bonus;
}
```

---

## 🧪 测试要求

### 测试覆盖率目标

- **语句覆盖率**: ≥ 85%
- **分支覆盖率**: ≥ 80%
- **函数覆盖率**: ≥ 90%
- **行覆盖率**: ≥ 85%

### 测试结构

```typescript
describe('ModuleName', () => {
  describe('functionName', () => {
    it('should do something when condition', () => {
      // Arrange - 准备
      const input = createTestData();
      
      // Act - 执行
      const result = functionName(input);
      
      // Assert - 断言
      expect(result).toBe(expected);
    });
    
    it('should handle edge case', () => {
      // 边界情况测试
    });
    
    it('should throw error on invalid input', () => {
      // 错误情况测试
      expect(() => functionName(null)).toThrow();
    });
  });
});
```

### 测试类型

1. **单元测试** - 测试单个函数/模块
   ```bash
   npm test tests/unit/
   ```

2. **集成测试** - 测试模块间协作
   ```bash
   npm test tests/integration/
   ```

3. **E2E测试** - 测试完整流程
   ```bash
   npm test tests/e2e/
   ```

### 测试最佳实践

- ✅ 测试要独立、可重复
- ✅ 使用描述性的测试名称
- ✅ 每个测试只验证一件事
- ✅ 使用AAA模式 (Arrange-Act-Assert)
- ✅ 测试边界情况和错误情况
- ❌ 不要测试第三方库
- ❌ 不要测试私有方法（测试公开API）

---

## 📝 提交规范

### Commit消息格式

```
type(scope): subject

body

footer
```

### Type类型

- `feat`: 新功能
- `fix`: Bug修复
- `docs`: 文档更新
- `style`: 代码格式调整（不影响功能）
- `refactor`: 重构（不是新功能也不是修复）
- `perf`: 性能优化
- `test`: 测试相关
- `chore`: 构建/工具相关

### Scope范围

- `state`: 状态管理
- `round`: Round相关
- `score`: 分数相关
- `ui`: UI相关
- `test`: 测试相关
- `docs`: 文档相关

### 示例

```bash
# 新功能
feat(state): add undo/redo support

# Bug修复
fix(round): fix score calculation bug

# 文档
docs: update API documentation

# 重构
refactor(score): extract score calculation to module

# 性能
perf(state): optimize state cloning

# 测试
test(round): add edge case tests
```

---

## 🔀 Pull Request

### PR标题

使用与commit相同的格式：

```
feat(state): add undo/redo support
```

### PR描述模板

```markdown
## 变更类型
- [ ] 新功能
- [ ] Bug修复
- [ ] 文档更新
- [ ] 代码重构
- [ ] 性能优化
- [ ] 测试添加

## 变更说明
<!-- 简要描述你的更改 -->

## 相关Issue
<!-- 引用相关的Issue，如 Closes #123 -->

## 测试
- [ ] 添加了单元测试
- [ ] 添加了集成测试
- [ ] 所有测试通过
- [ ] 覆盖率 ≥ 85%

## 检查清单
- [ ] 代码遵循项目规范
- [ ] 更新了相关文档
- [ ] 所有测试通过
- [ ] 无linter警告
- [ ] 已自测功能

## 截图
<!-- 如果有UI变更，请提供截图 -->
```

### PR流程

1. **创建PR** - 填写完整的PR描述
2. **自动检查** - CI会自动运行测试
3. **代码审查** - 等待维护者审查
4. **修改反馈** - 根据反馈修改代码
5. **合并** - 审查通过后会被合并

### PR要求

- ✅ 所有测试必须通过
- ✅ 代码覆盖率 ≥ 85%
- ✅ 无linter错误
- ✅ 文档已更新
- ✅ commit历史清晰

---

## 🐛 问题反馈

### 报告Bug

使用[Bug报告模板](https://github.com/your-repo/issues/new?template=bug_report.md)

应包含：
- 问题描述
- 复现步骤
- 期望行为
- 实际行为
- 环境信息
- 截图/日志

### 功能建议

使用[功能请求模板](https://github.com/your-repo/issues/new?template=feature_request.md)

应包含：
- 功能描述
- 使用场景
- 预期效果
- 备选方案

---

## 📚 资源

### 文档

- [架构设计](docs/migration/MIGRATION_ARCHITECTURE.md)
- [测试策略](docs/migration/TESTING_STRATEGY.md)
- [快速参考](docs/migration/QUICK_REFERENCE.md)
- [部署指南](docs/DEPLOYMENT_GUIDE.md)

### 工具

- [TypeScript](https://www.typescriptlang.org/)
- [Vitest](https://vitest.dev/)
- [ESLint](https://eslint.org/)
- [Vue 3](https://vuejs.org/)

---

## 💬 交流

- **GitHub Issues** - 报告问题
- **GitHub Discussions** - 讨论想法
- **Email** - your-email@example.com

---

## 🎉 感谢

感谢所有贡献者！

你的贡献让这个项目变得更好！

---

**最后更新:** 2024-12-05

