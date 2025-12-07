# 安装 vue-i18n 说明

## 问题
由于 Windows PowerShell 通过 WSL 路径（\\wsl$...）安装 npm 包会遇到路径问题，需要直接在 WSL 终端中运行。

## 解决方案

### 方法1：在 WSL 终端中安装（推荐）

1. 打开 WSL 终端（Ubuntu）
2. 进入项目目录：
   ```bash
   cd /home/jin/guozha-poker-game/vue-mobile
   ```
3. 运行安装命令：
   ```bash
   npm install
   ```
   或者只安装 vue-i18n：
   ```bash
   npm install vue-i18n@9
   ```

### 方法2：手动编辑 package.json（已完成）

我已经在 `package.json` 中添加了 `vue-i18n` 依赖，你只需要在 WSL 终端中运行：

```bash
cd /home/jin/guozha-poker-game/vue-mobile
npm install
```

### 方法3：使用 VS Code 终端

如果你在 VS Code 中：
1. 打开 VS Code 终端（Ctrl + `）
2. 选择终端类型为 "WSL" 或 "Ubuntu"
3. 运行：
   ```bash
   cd vue-mobile
   npm install
   ```

## 验证安装

安装完成后，检查 `node_modules` 中是否有 `vue-i18n`：

```bash
ls node_modules | grep vue-i18n
```

或者检查 `package.json` 和 `package-lock.json` 中是否包含 vue-i18n。

## 如果仍然遇到问题

如果安装过程中遇到权限问题，可以尝试：

```bash
# 清理缓存
npm cache clean --force

# 删除 node_modules 和 package-lock.json（可选）
rm -rf node_modules package-lock.json

# 重新安装
npm install
```

