# 使用 Screen 启动 MeloTTS 多语言服务

## 📋 概述

本文档介绍如何在 **192.168.0.13** 服务器上使用 `screen` 启动 MeloTTS 多语言服务，实现：
- ✅ 后台运行，关闭 PuTTY 不会停止服务
- ✅ 随时重新连接查看日志
- ✅ 方便管理和控制服务

---

## 🚀 完整启动流程

### 1. 连接到服务器

通过 PuTTY 或 SSH 连接到服务器：

```bash
ssh hlsystem@192.168.0.13
```

### 2. 安装 screen（如果未安装）

```bash
# 检查是否已安装
screen --version

# 如果未安装，执行安装
sudo apt install screen -y

# CentOS/RedHat 系统使用：
# sudo yum install screen -y
```

### 3. 清理旧的 screen 会话（可选）

```bash
# 查看现有的 screen 会话
screen -ls

# 如果有旧的 melo 会话，删除它
screen -S melo -X quit
```

### 4. 创建新的 screen 会话

```bash
# 创建名为 melo 的 screen 会话
screen -S melo
```

> 💡 执行后你会进入一个全新的终端界面

### 5. 在 screen 中启动 MeloTTS 服务

```bash
# 切换到 MeloTTS 目录
cd ~/melotts/MeloTTS

# 激活 Python 虚拟环境
source ../.venv/bin/activate

# 停止可能运行的旧服务
pkill -f tts-server
pkill -f melo-multilang

# 启动多语言 MeloTTS 服务
python3 melo-multilang.py 2>&1 | tee server.log
```

### 6. 等待服务启动成功

你应该看到类似以下输出：

```
2025-12-04 14:28:47,633 - INFO - 🎤 MeLo TTS 多语言: http://0.0.0.0:7860
2025-12-04 14:28:47,633 - INFO - 🌍 支持: ZH, EN(5种), JP, ES, FR, KR
INFO:     Started server process [2060712]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:7860 (Press CTRL+C to quit)
```

### 7. 分离 screen 会话

**这是最关键的步骤！**

1. **按键盘组合键**：同时按住 `Ctrl` 和 `A` 键，然后松开
2. **按字母键**：按一下小写字母 `d` 键（不要按 Ctrl）
3. **看到提示**：你会看到类似 `[detached from 2060407.melo]` 的提示

✅ **完成！现在可以关闭 PuTTY 窗口了，MeloTTS 服务会继续在后台运行！**

---

## 🔍 检查 MeloTTS 是否启动

### 方法 1：检查 screen 会话

```bash
# 查看运行中的 screen 会话
screen -ls

# 应该看到：
# There is a screen on:
#     2060407.melo    (Detached)
# 1 Socket in /run/screen/S-hlsystem.
```

### 方法 2：检查进程

```bash
# 查看 MeloTTS 进程
ps aux | grep melo-multilang

# 或查看所有 Python TTS 进程
ps aux | grep python3 | grep -E "tts|melo"

# 应该看到类似：
# hlsystem  2060712  ...  python3 melo-multilang.py
```

### 方法 3：检查端口占用

```bash
# 查看 7860 端口是否被占用
lsof -i :7860

# 或使用 netstat
netstat -tlnp | grep 7860

# 应该看到：
# python3   2060712  hlsystem  ...  *:7860  (LISTEN)
```

### 方法 4：健康检查（最可靠）✅

```bash
# 本地健康检查
curl http://localhost:7860/health

# 远程健康检查（从其他机器）
curl http://192.168.0.13:7860/health

# 预期返回：
# {"status":"ok","service":"MeLo TTS Multi-Language"}
```

### 方法 5：测试 TTS 功能

```bash
# 测试中文
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"你好世界", "lang":"ZH"}' \
  --output test-zh.wav

# 测试英文
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world", "lang":"EN"}' \
  --output test-en.wav

# 检查生成的文件
ls -lh test-*.wav
file test-zh.wav

# 预期输出：
# test-zh.wav: RIFF WAVE audio, Microsoft PCM, 16 bit, mono 44100 Hz
```

---

## 🛠️ 日常管理命令

### 查看服务日志

```bash
# 方法 1：重新连接到 screen 会话
screen -r melo

# 如果显示 (Attached)，说明已在其他窗口连接
# 使用强制分离：
screen -d melo
screen -r melo

# 方法 2：查看日志文件
tail -f ~/melotts/MeloTTS/server.log

# 方法 3：查看最近 100 行日志
tail -n 100 ~/melotts/MeloTTS/server.log
```

### 停止服务

```bash
# 方法 1：通过 screen 停止（推荐）
screen -r melo
# 然后按 Ctrl+C 停止服务
# 再输入 exit 退出 screen

# 方法 2：直接杀掉 screen 会话
screen -S melo -X quit

# 方法 3：杀掉进程
pkill -f melo-multilang
# 或
kill <进程ID>
```

### 重启服务

```bash
# 方法 1：通过 screen
screen -S melo -X quit  # 先停止
screen -S melo          # 创建新会话
cd ~/melotts/MeloTTS
source ../.venv/bin/activate
python3 melo-multilang.py 2>&1 | tee server.log
# 按 Ctrl+A 然后 D 分离

# 方法 2：一键重启脚本（见下方）
```

---

## 📝 一键启动脚本（推荐）

创建一个启动脚本，以后使用更方便：

```bash
# 创建启动脚本
cat > ~/start-melo-tts.sh << 'EOF'
#!/bin/bash

# 切换到 MeloTTS 目录
cd ~/melotts/MeloTTS

# 激活虚拟环境
source ../.venv/bin/activate

# 停止旧服务
pkill -f tts-server
pkill -f melo-multilang

echo "🚀 启动 MeloTTS 多语言服务..."

# 启动服务
python3 melo-multilang.py 2>&1 | tee server.log
EOF

# 添加执行权限
chmod +x ~/start-melo-tts.sh
```

### 使用启动脚本：

```bash
# 方法 1：在 screen 中使用
screen -S melo
~/start-melo-tts.sh
# 按 Ctrl+A 然后 D 分离

# 方法 2：直接后台启动
screen -dmS melo ~/start-melo-tts.sh

# 查看日志
screen -r melo
```

---

## 🎯 完整的一键启动命令

```bash
# 复制以下命令，一键启动 MeloTTS
screen -dmS melo bash -c "cd ~/melotts/MeloTTS && source ../.venv/bin/activate && python3 melo-multilang.py 2>&1 | tee server.log"

# 检查是否启动成功
sleep 3
curl http://localhost:7860/health

# 查看日志
screen -r melo
```

---

## 🆘 常见问题

### Q1: 按 Ctrl+A 没反应？

**解决**：
1. 确保先按住 `Ctrl` 和 `A`，然后松开
2. 再单独按小写字母 `d`
3. 不是 `Ctrl+D`，而是先 `Ctrl+A`，再按 `d`

### Q2: 显示 "Attaching from inside of screen?"

**原因**：你当前已经在一个 screen 会话中了

**解决**：
```bash
# 先退出当前 screen
exit

# 然后重新连接
screen -r melo
```

### Q3: 显示 "There is no screen to be resumed matching melo"

**原因**：
1. screen 会话不存在（已被删除）
2. 或者会话名字不对

**解决**：
```bash
# 查看所有 screen 会话
screen -ls

# 使用完整的 screen ID 连接
screen -r <screen_id>

# 或者创建新的会话
screen -S melo
```

### Q4: screen 会话显示 (Attached)，无法连接

**原因**：会话已在其他 PuTTY 窗口中连接

**解决**：
```bash
# 强制分离
screen -d melo

# 然后重新连接
screen -r melo

# 或者使用共享连接（多个窗口同时查看）
screen -x melo
```

### Q5: 找不到 melo-multilang.py 文件

**解决**：
```bash
# 查看有哪些可用的 TTS 脚本
ls -la ~/melotts/MeloTTS/*.py | grep -E "tts|melo"

# 如果有 melo-multilang.py，使用它
# 如果只有 tts-server-debug.py，可以先用它（仅中文）
python3 tts-server-debug.py 2>&1 | tee server.log
```

### Q6: 服务启动失败

**排查步骤**：
```bash
# 1. 检查虚拟环境是否激活
which python3

# 2. 检查依赖是否安装
pip list | grep -E "melo|fastapi|uvicorn"

# 3. 手动测试启动
cd ~/melotts/MeloTTS
source ../.venv/bin/activate
python3 melo-multilang.py

# 4. 查看错误信息
```

---

## 📊 服务信息

### 服务配置

| 项目 | 值 |
|------|------|
| 服务器地址 | 192.168.0.13 |
| 端口 | 7860 |
| 协议 | HTTP |
| 健康检查 | GET /health |
| TTS API | POST /tts |
| 日志文件 | ~/melotts/MeloTTS/server.log |

### 支持的语言

| 语言代码 | 语言名称 | 说话人数量 |
|---------|---------|-----------|
| ZH | 中文（普通话）| 1 |
| EN | English | 5（US/BR/INDIA/AU/Default）|
| JP | 日本語 | 1 |
| KR | 한국어 | 1 |
| ES | Español | 1 |
| FR | Français | 1 |

---

## 📚 相关文档

- **MeloTTS 多语言配置**：`MeLo-TTS多语言配置.md`
- **选择合适的版本**：`选择合适的MeLo-TTS版本.md`
- **完整配置指南**：`MeLo-TTS完整配置指南.md`
- **快速启动**：`快速启动MeLo-TTS.md`

---

## ✅ 验证清单

启动完成后，请确认以下项目：

- [ ] screen 会话已创建：`screen -ls`
- [ ] 进程正在运行：`ps aux | grep melo-multilang`
- [ ] 端口已监听：`lsof -i :7860`
- [ ] 健康检查通过：`curl http://localhost:7860/health`
- [ ] 远程访问正常：`curl http://192.168.0.13:7860/health`（从其他机器）
- [ ] TTS 功能正常：测试生成音频文件
- [ ] screen 会话已分离：可以关闭 PuTTY

---

**🎉 完成！现在 MeloTTS 服务已在后台运行，你可以安全关闭 PuTTY 窗口了！**

