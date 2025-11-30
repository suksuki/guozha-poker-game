# WSL环境下测试运行指南

## 前提条件

1. 确保已安装WSL（Windows Subsystem for Linux）
2. 确保已安装Node.js和npm（在WSL中）
3. 确保在WSL终端中运行，而不是Windows PowerShell

## 快速开始

### 1. 进入WSL终端

在Windows中打开WSL终端：
- 方法1：在Windows Terminal中选择Ubuntu
- 方法2：在PowerShell中运行 `wsl`
- 方法3：直接打开Ubuntu应用

### 2. 进入项目目录

```bash
cd ~/guozha_poker_game
```

### 3. 安装依赖（如果还没有安装）

```bash
npm install
```

### 4. 运行测试

#### 运行所有新测试
```bash
npm run test:quick -- comprehensiveUnitTests comprehensiveRegressionTests integrationTests
```

#### 运行单元测试
```bash
npm run test:quick -- comprehensiveUnitTests
```

#### 运行回归测试
```bash
npm run test:quick -- comprehensiveRegressionTests
```

#### 运行集成测试
```bash
npm run test:quick -- integrationTests
```

#### 运行所有测试（包括现有测试）
```bash
npm run test:all
```

#### 使用测试脚本（推荐）
```bash
bash scripts/run-all-tests.sh
```

## 测试文件说明

### 1. comprehensiveUnitTests.test.ts
完整的单元测试套件，覆盖所有核心模块：
- cardUtils模块测试
- Round类测试
- GameController类测试
- playManager模块测试
- Game类集成测试

### 2. comprehensiveRegressionTests.test.ts
回归测试套件，确保已修复的bug不会再次出现：
- 发牌随机性回归
- 牌型识别回归
- 牌型比较回归
- 分数计算回归
- 游戏状态回归
- 分数分配回归
- 边界情况回归

### 3. integrationTests.test.ts
集成测试套件，测试模块之间的交互：
- Game + Round + GameController集成
- RoundScheduler + Game集成
- 完整游戏流程集成
- 异步出牌处理集成
- 分数计算和排名集成

## 常见问题

### Q: 在Windows PowerShell中运行测试失败
A: 必须在WSL终端中运行测试，不要在Windows PowerShell中直接运行。使用 `wsl` 命令进入WSL环境。

### Q: 找不到npm命令
A: 确保在WSL中安装了Node.js：
```bash
# 检查Node.js版本
node --version

# 如果没有安装，使用以下命令安装
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs
```

### Q: 测试运行缓慢
A: 使用快速测试模式：
```bash
TEST_FAST=true npm run test:quick -- comprehensiveUnitTests
```

### Q: 测试失败
A: 检查以下几点：
1. 确保所有依赖已安装：`npm install`
2. 检查代码是否有语法错误
3. 查看测试输出中的具体错误信息

## 测试最佳实践

1. **提交前运行测试**：在提交代码前，运行所有测试确保没有破坏现有功能
2. **修复bug后运行回归测试**：确保bug不会再次出现
3. **修改模块后运行集成测试**：确保模块间交互正常
4. **定期查看覆盖率**：运行 `npm run test:coverage` 查看测试覆盖率

## 示例输出

成功运行测试后，你应该看到类似以下的输出：

```
✓ comprehensiveUnitTests.test.ts (XX tests) XXXms
  ✓ 完整单元测试套件
    ✓ cardUtils 模块测试
      ✓ 牌组创建和洗牌
        ✓ 应该创建包含54张牌的完整牌组
        ✓ 洗牌应该改变牌的顺序
        ...
    ✓ Round 类测试
      ...
    ✓ GameController 类测试
      ...
    ✓ playManager 模块测试
      ...
    ✓ Game 类集成测试
      ...

Test Files  1 passed (1)
     Tests  XX passed (XX)
      Time  XXXms
```

## 下一步

- 查看 `tests/README-TESTS.md` 了解更详细的测试说明
- 查看 `package.json` 了解所有可用的测试命令
- 添加新的测试用例来覆盖更多功能

