# 在终端中粘贴 Token 的方法

## 方法 1: 使用环境变量（推荐，最安全）

```bash
# 1. 设置环境变量（替换 YOUR_TOKEN 为你的实际 token）
export GITHUB_TOKEN="YOUR_PERSONAL_ACCESS_TOKEN"

# 2. 使用 token 设置远程仓库
git remote remove origin
git remote add origin https://suksuki:${GITHUB_TOKEN}@github.com/suksuki/guozha-poker-game.git

# 3. 推送
git push -u origin main

# 4. 推送完成后，清除环境变量（安全考虑）
unset GITHUB_TOKEN
```

## 方法 2: 直接在命令中使用 token（一次性）

```bash
# 删除旧远程仓库
git remote remove origin

# 直接在 URL 中包含 token（替换 YOUR_TOKEN）
git remote add origin https://suksuki:YOUR_TOKEN@github.com/suksuki/guozha-poker-game.git

# 推送
git push -u origin main
```

## 方法 3: 使用 Git Credential Helper（推荐长期使用）

```bash
# 1. 配置 Git 使用 credential helper
git config --global credential.helper store

# 2. 设置远程仓库（不包含 token）
git remote remove origin
git remote add origin https://suksuki@github.com/suksuki/guozha-poker-game.git

# 3. 推送时会提示输入密码，这时你可以：
#    - 在 WSL 中右键点击可以粘贴
#    - 或者使用 Shift+Insert 粘贴
git push -u origin main
# Username: suksuki
# Password: [在这里粘贴你的 token]
```

## 方法 4: 在 WSL 中粘贴的技巧

### Windows Terminal / PowerShell 中：
- **右键点击**终端窗口可以粘贴
- 或者 **Shift + Insert** 粘贴

### 如果右键不行，尝试：
1. 在 Windows 中复制 token
2. 在 WSL 终端中，尝试：
   - `Ctrl + Shift + V` (某些终端)
   - `Shift + Insert`
   - 或者使用鼠标中键点击

## 方法 5: 使用临时文件（如果粘贴完全不行）

```bash
# 1. 在 Windows 中创建一个文本文件，保存你的 token
# 例如：C:\Users\YourName\token.txt

# 2. 在 WSL 中读取文件
cat /mnt/c/Users/YourName/token.txt

# 3. 手动复制输出的内容，或者：

# 4. 使用环境变量
export GITHUB_TOKEN=$(cat /mnt/c/Users/YourName/token.txt)

# 5. 使用 token
git remote remove origin
git remote add origin https://suksuki:${GITHUB_TOKEN}@github.com/suksuki/guozha-poker-game.git
git push -u origin main

# 6. 清除
unset GITHUB_TOKEN
rm /mnt/c/Users/YourName/token.txt  # 删除临时文件
```

## 方法 6: 使用 SSH（最推荐，不需要粘贴 token）

```bash
# 1. 生成 SSH 密钥（如果还没有）
ssh-keygen -t ed25519 -C "your.email@example.com"
# 按 Enter 使用默认路径，可以设置密码（可选）

# 2. 启动 ssh-agent
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519

# 3. 显示公钥（复制这个）
cat ~/.ssh/id_ed25519.pub

# 4. 在 GitHub 添加 SSH 密钥
# GitHub → Settings → SSH and GPG keys → New SSH key
# 粘贴刚才复制的公钥

# 5. 测试连接
ssh -T git@github.com

# 6. 更改远程仓库为 SSH
git remote remove origin
git remote add origin git@github.com:suksuki/guozha-poker-game.git

# 7. 推送（不需要 token）
git push -u origin main
```

## 最简单的方法（推荐）

如果你在 Windows Terminal 或 PowerShell 中使用 WSL：

1. **复制你的 Personal Access Token**
2. **在 WSL 终端中右键点击**（应该可以粘贴）
3. 如果右键不行，尝试 **Shift + Insert**

然后使用：
```bash
git remote remove origin
git remote add origin https://suksuki@github.com/suksuki/guozha-poker-game.git
git push -u origin main
# 当提示输入密码时，右键粘贴你的 token
```

