# MeLo TTS 快速参考卡

## 🚀 快速启动命令

### 服务器端 (192.168.0.13)

```bash
# 方法 1: 前台运行（测试用）
cd ~/melotts/MeloTTS
python3 tts-server.py

# 方法 2: 使用 screen（推荐）
screen -S melotts
python3 tts-server.py
# 按 Ctrl+A, D 分离
# 重新连接: screen -r melotts

# 方法 3: 后台运行
nohup python3 tts-server.py > tts.log 2>&1 &
```

### 客户端 (APP 机器)

```bash
# 启动游戏
cd /Ubuntu/home/jin/guozha_poker_game
npm run dev
```

## ✅ 快速测试

```bash
# 服务器本地测试
curl http://localhost:7860/health

# 客户端远程测试
curl http://192.168.0.13:7860/health

# 预期返回
{"status":"ok","service":"Melo TTS"}
```

## 🔍 验证成功

### 浏览器控制台应该显示：

```
✅ TTS 系统初始化完成
[TTS] ✅ MeLo TTS 服务可用: http://192.168.0.13:7860
```

### 查看 TTS 状态（F12 控制台）

```javascript
const { getTTSServiceManager } = await import('/src/tts/ttsServiceManager.ts');
console.table(getTTSServiceManager().getProviderStatus());
```

## 🛠️ 常用命令

```bash
# 查看服务进程
ps aux | grep tts-server

# 停止服务
pkill -f tts-server.py

# 查看日志（如果用 nohup）
tail -f tts.log

# 查看端口占用
lsof -i :7860
```

## 📝 服务器配置

- **地址**: http://192.168.0.13:7860
- **端口**: 7860
- **健康检查**: GET /health
- **TTS API**: POST /tts
- **优先级**: 0（最高）

## 📚 完整文档

详细步骤和故障排查请查看：`MeLo-TTS完整配置指南.md`

