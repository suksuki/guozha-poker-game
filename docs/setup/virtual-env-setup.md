# Python 虚拟环境设置指南

## 🚨 重要说明

**虚拟环境（venv-*）不应该被 git 跟踪！**

每个开发者应该在自己的机器上创建自己的虚拟环境。

## 📝 原因

1. **平台差异**: Mac/Linux/Windows 的虚拟环境不兼容
2. **符号链接问题**: Windows/WSL 处理符号链接的方式不同
3. **体积过大**: 虚拟环境包含大量依赖，会导致仓库膨胀
4. **换行符冲突**: CRLF vs LF 问题

## ✅ 正确的做法

### 初次设置（每个开发者）

#### 1. 创建 Piper TTS 虚拟环境

```bash
cd /home/jin/guozha_poker_game

# 创建虚拟环境
python3 -m venv venv-piper

# 激活虚拟环境
source venv-piper/bin/activate

# 安装依赖
pip install flask flask-cors piper-tts

# 退出虚拟环境
deactivate
```

#### 2. 创建 Coqui TTS 虚拟环境（如果需要）

```bash
# 创建虚拟环境
python3 -m venv venv-coqui

# 激活虚拟环境
source venv-coqui/bin/activate

# 安装依赖
pip install flask flask-cors TTS

# 退出虚拟环境
deactivate
```

#### 3. 安装其他 Python 依赖

如果项目有 `requirements.txt`：
```bash
source venv-piper/bin/activate
pip install -r requirements.txt
deactivate
```

## 🔧 如果虚拟环境损坏

### 删除并重新创建

```bash
cd /home/jin/guozha_poker_game

# 删除旧的虚拟环境
rm -rf venv-piper venv-coqui

# 重新创建（参考上面的步骤）
python3 -m venv venv-piper
source venv-piper/bin/activate
pip install flask flask-cors piper-tts
deactivate
```

## 📦 依赖管理

### 创建 requirements.txt（推荐）

在项目根目录创建 `requirements-piper.txt`:

```
flask==3.0.0
flask-cors==4.0.0
piper-tts==1.2.0
```

然后团队成员可以：
```bash
source venv-piper/bin/activate
pip install -r requirements-piper.txt
deactivate
```

## 🚫 .gitignore 规则

已添加到 `.gitignore`:

```
# Python virtual environments
venv/
venv-*/
env/
ENV/
*.pyc
__pycache__/
```

## 📋 清理 Git 历史中的虚拟环境

如果虚拟环境已经被提交到 git：

```bash
# 从 git 缓存中移除（不删除本地文件）
git rm -r --cached venv-piper venv-coqui

# 提交改动
git commit -m "Remove virtual environments from git tracking"

# 推送到远程
git push
```

## ⚠️ 注意事项

### 对于团队成员

1. **首次克隆仓库后**: 创建自己的虚拟环境
2. **更新代码后**: 检查是否需要更新依赖
3. **不要提交**: venv-* 目录
4. **不要 pull**: 如果远程有虚拟环境，忽略它们

### 对于仓库维护者

1. **确保 .gitignore 正确**: 包含 venv-*
2. **从历史中移除**: 使用 `git rm --cached`
3. **提供 requirements.txt**: 方便其他人安装依赖
4. **文档说明**: 告知团队成员如何设置

## 🔄 迁移步骤（从跟踪到不跟踪）

如果你是仓库维护者，需要清理虚拟环境：

```bash
# 1. 确保 .gitignore 包含虚拟环境规则
cat .gitignore | grep venv

# 2. 从 git 移除虚拟环境（保留本地文件）
git rm -r --cached venv-piper venv-coqui

# 3. 提交
git add .gitignore
git commit -m "chore: Remove virtual environments from git, use local venvs"

# 4. 推送
git push origin main

# 5. 通知团队成员创建自己的虚拟环境
```

## 📢 给其他开发者的消息

**重要更新：虚拟环境现在需要本地创建**

如果你拉取最新代码后发现虚拟环境消失了，这是正常的！

请按照以下步骤创建你自己的虚拟环境：

```bash
cd /path/to/guozha_poker_game

# 创建虚拟环境
python3 -m venv venv-piper

# 安装依赖
source venv-piper/bin/activate
pip install flask flask-cors piper-tts
deactivate

# 启动 TTS 服务
bash start-piper-tts.sh
```

## ✅ 验证

虚拟环境应该：
- ✅ 存在于你的本地文件系统
- ✅ 被 .gitignore 忽略
- ✅ 不出现在 `git status` 中
- ✅ 每个开发者独立创建和管理

---

**现在 App 能加载了吗？请刷新浏览器试试！** 🚀
