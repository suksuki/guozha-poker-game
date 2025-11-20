# 解决 GitHub 403 权限错误

## 错误原因

`Permission denied` 和 `403` 错误通常由以下原因导致：
1. Personal Access Token 权限不足
2. Token 已过期
3. 使用了错误的 token
4. 远程仓库 URL 配置错误

## 解决方案

### 方案 1: 检查并重新创建 Personal Access Token

1. **检查现有 Token 权限**：
   - GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - 查看你的 token 是否勾选了 `repo` 权限

2. **创建新的 Token（推荐）**：
   - 删除旧的 token（如果存在）
   - 创建新 token：
     - **Note**: `guozha-poker-game`
     - **Expiration**: 选择合适的时间
     - **Select scopes**: **必须勾选以下权限**：
       - ✅ `repo` (完整仓库访问权限) - **这是最重要的**
       - ✅ `workflow` (如果需要 GitHub Actions)
     - 点击 **Generate token**
     - **立即复制 token**（只显示一次）

### 方案 2: 清除旧的凭据并重新配置

```bash
# 1. 查看当前远程仓库配置
git remote -v

# 2. 清除旧的凭据缓存
git credential-cache exit
git config --global --unset credential.helper

# 3. 删除并重新添加远程仓库
git remote remove origin

# 4. 使用新的 token 添加远程仓库
git remote add origin https://YOUR_USERNAME@github.com/YOUR_USERNAME/guozha-poker-game.git

# 5. 推送时输入 token
git push -u origin main
# Username: YOUR_USERNAME
# Password: YOUR_PERSONAL_ACCESS_TOKEN (粘贴刚才复制的token)
```

### 方案 3: 直接在 URL 中使用 Token（临时方案）

```bash
# 删除旧的远程仓库
git remote remove origin

# 使用 token 直接添加到 URL（替换 YOUR_TOKEN 和 YOUR_USERNAME）
git remote add origin https://YOUR_TOKEN@github.com/YOUR_USERNAME/guozha-poker-game.git

# 推送
git push -u origin main
```

**注意**: 这种方式 token 会保存在 `.git/config` 中，不够安全，建议推送后清除。

### 方案 4: 使用 SSH（最安全，推荐长期使用）

```bash
# 1. 检查是否已有 SSH 密钥
ls -al ~/.ssh

# 2. 如果没有，生成新的 SSH 密钥
ssh-keygen -t ed25519 -C "your.email@example.com"
# 按 Enter 使用默认路径

# 3. 启动 ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 4. 复制公钥
cat ~/.ssh/id_ed25519.pub
# 复制输出的内容

# 5. 在 GitHub 添加 SSH 密钥
# GitHub → Settings → SSH and GPG keys → New SSH key
# 粘贴刚才复制的公钥

# 6. 测试连接
ssh -T git@github.com

# 7. 更改远程仓库为 SSH
git remote remove origin
git remote add origin git@github.com:YOUR_USERNAME/guozha-poker-game.git
git push -u origin main
```

## 快速修复步骤（推荐）

```bash
# 1. 清除所有凭据
git credential-cache exit
git config --global --unset credential.helper

# 2. 删除远程仓库
git remote remove origin

# 3. 重新添加（使用你的用户名）
git remote add origin https://YOUR_USERNAME@github.com/YOUR_USERNAME/guozha-poker-game.git

# 4. 查看配置
git remote -v

# 5. 推送（会提示输入用户名和密码，密码处输入 Personal Access Token）
git push -u origin main
```

## 验证 Token 权限

确保你的 Personal Access Token 有以下权限：
- ✅ **repo** - 完整仓库访问权限（包括私有仓库）
- ✅ **workflow** - GitHub Actions 工作流（如果需要）

## 常见问题

### Q: Token 权限看起来正确，但还是 403？
A: 检查 token 是否过期，或者尝试创建新的 token。

### Q: 如何查看当前使用的凭据？
A: 
```bash
git config --list | grep credential
cat ~/.git-credentials  # 如果使用 store helper
```

### Q: 如何清除保存的凭据？
A:
```bash
# 清除全局凭据
git config --global --unset credential.helper
rm ~/.git-credentials  # 如果存在

# 清除缓存
git credential-cache exit
```

