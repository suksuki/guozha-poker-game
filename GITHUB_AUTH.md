# GitHub 认证设置指南

GitHub 已经不再支持密码认证，需要使用以下两种方式之一：

## 方案 1: 使用 Personal Access Token (PAT) - 推荐

### 步骤 1: 创建 Personal Access Token

1. 登录 GitHub
2. 点击右上角头像 → **Settings**
3. 左侧菜单选择 **Developer settings**
4. 选择 **Personal access tokens** → **Tokens (classic)**
5. 点击 **Generate new token** → **Generate new token (classic)**
6. 填写信息：
   - **Note**: `guozha-poker-game` (描述用途)
   - **Expiration**: 选择过期时间（建议 90 天或 No expiration）
   - **Select scopes**: 勾选 `repo` (完整仓库访问权限)
7. 点击 **Generate token**
8. **重要**: 复制生成的 token（只显示一次！）

### 步骤 2: 使用 Token 推送代码

```bash
# 方法 1: 在 URL 中包含 token（一次性）
git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/guozha-poker-game.git
git push -u origin main

# 方法 2: 使用 Git Credential Manager（推荐）
# 当提示输入密码时，输入你的 Personal Access Token
git push -u origin main
# Username: YOUR_USERNAME
# Password: YOUR_PERSONAL_ACCESS_TOKEN
```

### 步骤 3: 保存凭据（可选，避免每次都输入）

```bash
# 使用 Git Credential Manager
git config --global credential.helper store

# 或者使用 cache（15分钟内有效）
git config --global credential.helper 'cache --timeout=3600'
```

## 方案 2: 使用 SSH 密钥 - 更安全

### 步骤 1: 检查是否已有 SSH 密钥

```bash
ls -al ~/.ssh
```

### 步骤 2: 生成新的 SSH 密钥（如果没有）

```bash
ssh-keygen -t ed25519 -C "your.email@example.com"
# 按 Enter 使用默认路径
# 可以设置密码（可选，更安全）
```

### 步骤 3: 添加 SSH 密钥到 ssh-agent

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

### 步骤 4: 复制公钥

```bash
cat ~/.ssh/id_ed25519.pub
# 复制输出的内容
```

### 步骤 5: 添加到 GitHub

1. 登录 GitHub
2. 点击右上角头像 → **Settings**
3. 左侧菜单选择 **SSH and GPG keys**
4. 点击 **New SSH key**
5. 填写：
   - **Title**: `WSL Ubuntu` (描述)
   - **Key**: 粘贴刚才复制的公钥
6. 点击 **Add SSH key**

### 步骤 6: 测试 SSH 连接

```bash
ssh -T git@github.com
# 应该看到: Hi YOUR_USERNAME! You've successfully authenticated...
```

### 步骤 7: 更改远程仓库 URL 为 SSH

```bash
git remote set-url origin git@github.com:YOUR_USERNAME/guozha-poker-game.git
git push -u origin main
```

## 快速解决方案（推荐使用 PAT）

如果你已经创建了 Personal Access Token，执行：

```bash
# 1. 更新远程仓库 URL（替换 YOUR_USERNAME 和 YOUR_TOKEN）
git remote set-url origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/guozha-poker-game.git

# 2. 推送代码
git push -u origin main
```

或者更安全的方式：

```bash
# 1. 更新远程仓库 URL（只包含用户名）
git remote set-url origin https://YOUR_USERNAME@github.com/YOUR_USERNAME/guozha-poker-game.git

# 2. 推送时会提示输入密码，输入你的 Personal Access Token
git push -u origin main
```

## 检查当前远程仓库配置

```bash
# 查看远程仓库 URL
git remote -v

# 如果需要删除并重新添加
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/guozha-poker-game.git
```

