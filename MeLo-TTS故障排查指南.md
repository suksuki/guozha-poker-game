# MeLo TTS 故障排查指南

## 🚨 常见问题快速诊断

### 问题 1: 首次测试等很久，看起来卡住了

**症状**：
```bash
curl -X POST http://192.168.0.13:7860/tts ...
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
  0     0    0     0    0     0      0      0 --:--:--  0:00:30 --:--:--     0
# 等了很久，没有反应...
```

**原因**：
- ✅ **这是正常的！** 首次运行需要加载模型
- 模型加载：10-15 秒
- jieba 分词器初始化：5-10 秒
- 总计：约 1-2 分钟（仅首次）

**解决**：
1. **耐心等待**，不要中断
2. **查看服务器日志确认正在处理**：
   ```bash
   # 在服务器上
   tail -f ~/melotts/MeloTTS/server.log
   ```

**正常的日志输出**：
```
2025-12-03 17:01:11 - INFO - 🔄 开始加载 MeLo TTS 模型...
2025-12-03 17:01:13 - INFO - ✅ 模型加载完成
2025-12-03 17:01:13 - INFO - 📋 可用的说话人: ['ZH']
2025-12-03 17:01:13 - INFO - 📝 收到请求 - 文本: '你好', 语言: ZH
2025-12-03 17:01:13 - INFO - 🎵 开始合成语音...
Building prefix dict from the default dictionary ...
Loading model from cache /tmp/jieba.cache
2025-12-03 17:01:24 - INFO - ✅ 合成成功！音频大小: 69990 字节
```

**成功标志**：
- ✅ 文件大小 > 50KB
- ✅ 文件类型：`WAVE audio`
- ✅ 后续请求只需 2-3 秒

---

### 问题 2: 返回 "Internal Server Error" (21 字节)

**症状**：
```bash
$ curl http://192.168.0.13:7860/tts ...
$ ls -lh test.wav
-rw-r--r-- 1 jin jin 21 Dec 3 16:35 test.wav

$ cat test.wav
Internal Server Error
```

**原因**：
- 服务器端处理请求时出错
- 模型加载失败
- API 参数问题

**诊断步骤**：

#### 步骤 1: 查看服务器日志
```bash
# 在服务器上 (192.168.0.13)
tail -50 ~/melotts/MeloTTS/server.log
```

查找错误信息（❌ 或 ERROR）

#### 步骤 2: 使用调试版服务器
```bash
# 停止当前服务器
pkill -f tts-server

# 启动调试版
cd ~/melotts/MeloTTS
source ../.venv/bin/activate
python3 tts-server-debug.py 2>&1 | tee server.log &

# 等待几秒启动
sleep 5

# 重新测试
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"你好", "lang":"ZH"}' \
  --output test-new.wav

# 立即查看日志
tail -30 server.log
```

#### 步骤 3: 手动测试模型
```bash
# 在服务器上测试 Python 直接调用
cd ~/melotts/MeloTTS
source ../.venv/bin/activate

python3 << 'EOF'
from melo.api import TTS
import io

print("加载模型...")
model = TTS(language='ZH', device='auto')
print("✅ 模型加载成功")

print("可用说话人:", list(model.hps.data.spk2id.keys()))

text = "你好世界"
sid = model.hps.data.spk2id['ZH']
out = io.BytesIO()
model.tts_to_file(text, sid, out, format='wav', speed=1.0)
print(f"✅ 生成成功，大小: {len(out.getvalue())} 字节")
EOF
```

---

### 问题 3: NNPACK 警告

**症状**：
```
[W] Could not initialize NNPACK! Reason: Unsupported hardware.
```

**解决**：
- ✅ **可以完全忽略**
- 这只是 CPU 优化警告
- 不影响功能
- 语音合成正常工作

---

### 问题 4: 客户端无法连接

**症状**：
```bash
# 从客户端
$ curl http://192.168.0.13:7860/health
curl: (7) Failed to connect to 192.168.0.13 port 7860: Connection refused
```

**诊断清单**：

#### ✅ 1. 服务器是否运行？
```bash
# 在服务器上
ps aux | grep tts-server
netstat -tlnp | grep 7860  # 或 ss -tlnp | grep 7860
```

#### ✅ 2. 服务器本地是否正常？
```bash
# 在服务器上
curl http://localhost:7860/health
```

#### ✅ 3. 防火墙是否开放？
```bash
# Ubuntu/Debian
sudo ufw status
sudo ufw allow 7860/tcp

# CentOS/RHEL
sudo firewall-cmd --list-ports
sudo firewall-cmd --add-port=7860/tcp --permanent
sudo firewall-cmd --reload
```

#### ✅ 4. 网络是否连通？
```bash
# 从客户端
ping 192.168.0.13
telnet 192.168.0.13 7860
```

---

### 问题 5: 浏览器中 TTS 测试失败

**症状**：
在 APP 的 TTS 配置面板测试服务器时失败

**解决步骤**：

#### 1. 硬刷新浏览器
```
Windows: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

#### 2. 检查浏览器控制台 (F12)
查找错误信息：
- `TTSClientFactory` 相关错误
- 网络请求失败
- CORS 错误

#### 3. 验证服务器地址
确保配置正确：
- IP: `192.168.0.13` 或 `0.13`
- 端口: `7860`
- 不要加 `http://` 前缀（系统会自动添加）

#### 4. 测试网络连接
在浏览器控制台执行：
```javascript
fetch('http://192.168.0.13:7860/health')
  .then(r => r.json())
  .then(d => console.log('✅ 连接成功:', d))
  .catch(e => console.error('❌ 连接失败:', e));
```

---

## 🔍 完整诊断流程

### 步骤 1: 确认服务器状态

```bash
# 在服务器上 (192.168.0.13)

# 1. 检查进程
ps aux | grep tts-server

# 2. 检查端口
ss -tlnp | grep 7860

# 3. 查看日志
tail -30 ~/melotts/MeloTTS/server.log

# 4. 测试健康检查
curl http://localhost:7860/health
```

### 步骤 2: 本地测试

```bash
# 在服务器上

# 测试简单文本
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"你好", "lang":"ZH"}' \
  --output test-local.wav

# 验证文件
ls -lh test-local.wav
file test-local.wav

# 应该看到：
# test-local.wav: RIFF WAVE audio, Microsoft PCM, 16 bit, mono 44100 Hz
# 大小 > 50KB
```

### 步骤 3: 远程测试

```bash
# 在客户端机器上

# 测试健康检查
curl http://192.168.0.13:7860/health

# 测试 TTS
curl -X POST http://192.168.0.13:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"远程测试", "lang":"ZH"}' \
  --output test-remote.wav

# 验证
ls -lh test-remote.wav
```

### 步骤 4: APP 集成测试

1. 打开游戏 APP
2. 硬刷新浏览器 (Ctrl+Shift+R)
3. F12 打开控制台
4. 进入 TTS 配置面板
5. 添加服务器
6. 测试连接
7. 查看控制台输出

---

## 📊 成功标准

### 服务器端

- ✅ 进程运行：`ps aux | grep tts-server` 有输出
- ✅ 端口监听：`ss -tlnp | grep 7860` 显示 LISTEN
- ✅ 日志正常：显示 "✅ 模型加载完成"
- ✅ 健康检查：`{"status":"ok","service":"Melo TTS"}`

### 文件输出

- ✅ 文件大小：> 50KB (通常 50KB - 200KB)
- ✅ 文件类型：`RIFF WAVE audio, Microsoft PCM, 16 bit, mono 44100 Hz`
- ❌ 错误标志：21 字节 + `ASCII text` = 失败

### APP 集成

- ✅ 控制台显示：`[TTS] ✅ MeLo TTS 服务可用`
- ✅ 测试按钮：返回成功
- ✅ TTS 状态：`melo: { enabled: true, healthy: true }`

---

## 🆘 仍然无法解决？

### 收集诊断信息

```bash
# 在服务器上运行
cat > ~/melo-tts-diagnostic.sh << 'EOF'
#!/bin/bash
echo "===== MeLo TTS 诊断信息 ====="
echo "1. 进程状态:"
ps aux | grep tts-server
echo ""
echo "2. 端口状态:"
ss -tlnp | grep 7860 || netstat -tlnp | grep 7860
echo ""
echo "3. Python 环境:"
source ~/melotts/.venv/bin/activate
python3 --version
pip list | grep -E "melo|torch|fastapi"
echo ""
echo "4. 最近日志:"
tail -30 ~/melotts/MeloTTS/server.log 2>/dev/null || echo "日志文件不存在"
echo ""
echo "5. 测试模型:"
python3 -c "from melo.api import TTS; print('模型可以导入')"
echo ""
echo "6. 内存状态:"
free -h
EOF

bash ~/melo-tts-diagnostic.sh
```

把输出发给技术支持。

---

## 📞 联系支持

如果问题持续存在，请提供：

1. **服务器日志**：`~/melotts/MeloTTS/server.log`
2. **诊断信息**：运行上面的 `melo-tts-diagnostic.sh`
3. **错误截图**：浏览器控制台和网络请求
4. **系统信息**：
   - OS 版本：`cat /etc/os-release`
   - Python 版本：`python3 --version`
   - 内存：`free -h`

---

**大部分问题都是首次加载慢导致的超时，请耐心等待首次请求完成！** ⏱️

