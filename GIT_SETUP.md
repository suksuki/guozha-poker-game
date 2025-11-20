# Git 和 GitHub 设置指南

## 步骤 1: 在 WSL 终端中初始化 Git 仓库

```bash
cd /home/jin/guozha_poker_game

# 初始化 Git 仓库（如果还没有）
git init

# 检查状态
git status
```

## 步骤 2: 配置 Git（如果还没有配置）

```bash
# 设置用户名和邮箱（替换为你的信息）
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"
```

## 步骤 3: 添加所有文件到暂存区

```bash
# 添加所有文件
git add .

# 检查将要提交的文件
git status
```

## 步骤 4: 创建初始提交

```bash
git commit -m "Initial commit: 过炸扑克游戏 - 支持4-8人，AI对手，OpenAI辅助出牌"
```

## 步骤 5: 在 GitHub 上创建新仓库

1. 登录 GitHub (https://github.com)
2. 点击右上角的 "+" 号，选择 "New repository"
3. 填写仓库信息：
   - Repository name: `guozha-poker-game` (或你喜欢的名字)
   - Description: `本地手机过炸打牌游戏，支持4-8人，AI对手，OpenAI辅助出牌`
   - 选择 Public 或 Private
   - **不要**勾选 "Initialize this repository with a README"（因为我们已经有了）
4. 点击 "Create repository"

## 步骤 6: 连接本地仓库到 GitHub

GitHub 创建仓库后会显示一个页面，复制其中的命令。或者使用以下命令（替换 YOUR_USERNAME 和 REPO_NAME）：

```bash
# 添加远程仓库（替换为你的GitHub用户名和仓库名）
git remote add origin https://github.com/YOUR_USERNAME/guozha-poker-game.git

# 或者使用 SSH（如果你配置了SSH密钥）
# git remote add origin git@github.com:YOUR_USERNAME/guozha-poker-game.git

# 查看远程仓库
git remote -v
```

## 步骤 7: 推送到 GitHub

**重要**: GitHub 已不再支持密码认证，需要使用 Personal Access Token (PAT) 或 SSH 密钥。

### 使用 Personal Access Token (推荐)

1. 在 GitHub 创建 Personal Access Token：
   - Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token → 勾选 `repo` 权限 → Generate
   - **复制 token**（只显示一次）

2. 推送代码：
```bash
# 推送代码到 GitHub（main 分支）
git branch -M main
git push -u origin main
# 当提示输入密码时，输入你的 Personal Access Token（不是GitHub密码）
```

### 使用 SSH（更安全，推荐长期使用）

详见 `GITHUB_AUTH.md` 文件中的详细说明。

**如果遇到认证问题，请查看 `GITHUB_AUTH.md` 文件获取详细解决方案。**

## 后续更新代码

以后每次修改代码后，使用以下命令：

```bash
# 1. 查看修改
git status

# 2. 添加修改的文件
git add .

# 3. 提交修改
git commit -m "描述你的修改内容"

# 4. 推送到 GitHub
git push
```

## 常用 Git 命令

```bash
# 查看提交历史
git log

# 查看当前状态
git status

# 查看远程仓库
git remote -v

# 拉取远程更新
git pull

# 创建新分支
git checkout -b feature-name

# 切换分支
git checkout main
```

