# 完整测试套件说明

本项目包含完整的单元测试、回归测试和集成测试套件。

## 测试文件结构

### 1. 单元测试 (`comprehensiveUnitTests.test.ts`)
覆盖所有核心模块的功能测试：
- `cardUtils` 模块：牌组创建、洗牌、发牌、牌型识别、牌型比较、分数计算
- `Round` 类：轮次创建、出牌记录、分数计算、轮次结束
- `GameController` 类：游戏初始化、分数分配
- `playManager` 模块：墩的计分、玩家更新
- `Game` 类：游戏初始化、轮次管理

### 2. 回归测试 (`comprehensiveRegressionTests.test.ts`)
确保已修复的bug不会再次出现：
- 发牌随机性回归测试
- 牌型识别回归测试
- 牌型比较回归测试
- 分数计算回归测试
- 游戏状态回归测试
- 分数分配回归测试
- 边界情况回归测试

### 3. 集成测试 (`integrationTests.test.ts`)
测试模块之间的交互和完整流程：
- Game + Round + GameController 集成
- RoundScheduler + Game 集成
- 完整游戏流程集成测试
- 异步出牌处理集成
- 分数计算和排名集成

## 运行测试

### 在WSL环境下运行

#### 方法1：使用测试脚本（推荐）
```bash
# 运行所有测试
bash scripts/run-all-tests.sh

# 或者在Windows PowerShell中
.\scripts\run-all-tests.bat
```

#### 方法2：使用npm命令
```bash
# 运行所有新测试
npm run test:quick -- comprehensiveUnitTests comprehensiveRegressionTests integrationTests

# 运行单元测试
npm run test:quick -- comprehensiveUnitTests

# 运行回归测试
npm run test:quick -- comprehensiveRegressionTests

# 运行集成测试
npm run test:quick -- integrationTests

# 运行所有测试（包括现有测试）
npm run test:all

# 运行测试并显示覆盖率
npm run test:coverage
```

### 在Windows环境下运行

```cmd
# 使用批处理脚本
scripts\run-all-tests.bat

# 或使用npm命令
npm run test:quick -- comprehensiveUnitTests comprehensiveRegressionTests integrationTests
```

## 测试覆盖范围

### 核心功能覆盖
- ✅ 牌组创建和洗牌
- ✅ 发牌逻辑
- ✅ 牌型识别（单张、对子、三张、炸弹、墩）
- ✅ 牌型比较和压牌规则
- ✅ 分牌识别和计算
- ✅ 墩的计算和分数分配
- ✅ 轮次管理
- ✅ 游戏状态管理
- ✅ 分数分配和排名
- ✅ 异步出牌处理

### 边界情况覆盖
- ✅ 空手牌处理
- ✅ 单张牌处理
- ✅ 最大墩数处理
- ✅ 多次发牌随机性
- ✅ 多轮次分数分配

### 回归测试覆盖
- ✅ 发牌随机性
- ✅ 牌型识别准确性
- ✅ 牌型比较正确性
- ✅ 分数计算准确性
- ✅ 游戏状态一致性

## 测试最佳实践

1. **运行完整测试套件**：在提交代码前，运行所有测试确保没有破坏现有功能
2. **运行回归测试**：在修复bug后，运行回归测试确保bug不会再次出现
3. **运行集成测试**：在修改模块间交互时，运行集成测试确保整体流程正常
4. **查看覆盖率**：定期运行 `npm run test:coverage` 查看测试覆盖率

## 添加新测试

### 添加单元测试
在 `comprehensiveUnitTests.test.ts` 中添加新的测试用例，遵循现有测试的结构和命名规范。

### 添加回归测试
在 `comprehensiveRegressionTests.test.ts` 中添加新的回归测试，确保已修复的bug不会再次出现。

### 添加集成测试
在 `integrationTests.test.ts` 中添加新的集成测试，测试模块之间的交互。

## 故障排除

### 测试失败
1. 检查测试输出中的错误信息
2. 确保所有依赖已正确安装：`npm install`
3. 确保代码没有语法错误：`npm run build`

### 测试运行缓慢
- 使用 `npm run test:quick` 跳过慢测试
- 使用 `TEST_FAST=true npm run test:quick` 只运行快速测试

### 在WSL中运行问题
- 确保Node.js和npm已正确安装
- 确保在项目根目录运行测试
- 检查文件权限（如果需要，使用 `chmod +x scripts/run-all-tests.sh`）

## 持续集成

这些测试可以集成到CI/CD流程中：
```yaml
# 示例 GitHub Actions 配置
- name: Run tests
  run: |
    npm install
    npm run test:all
```

