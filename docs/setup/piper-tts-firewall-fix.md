# Piper TTS 防火墙和网络问题修复

## 问题1: 生成器错误（已修复）

**错误信息：**
```
a bytes-like object is required, not 'generator'
```

**原因：** `voice.synthesize(text)` 返回的是生成器，不是字节数据

**修复：** 已更新代码，将生成器转换为字节：
```python
audio_generator = voice.synthesize(text)
audio_data = b''.join(audio_generator)
```

## 问题2: Windows浏览器无法访问WSL服务

### 检查服务绑定

服务应该绑定到 `0.0.0.0`（已配置），这样可以从Windows访问。

### 获取WSL IP地址

在WSL中运行：
```bash
hostname -I | awk '{print $1}'
```

或：
```bash
ip addr show eth0 | grep "inet " | awk '{print $2}' | cut -d/ -f1
```

### 在Windows浏览器中使用

1. **获取WSL IP地址**（例如：172.x.x.x）

2. **在浏览器控制台测试：**
```javascript
// 使用WSL的IP地址
const wslIP = '172.x.x.x'; // 替换为你的WSL IP
fetch(`http://${wslIP}:5000/health`)
  .then(r => r.json())
  .then(console.log);
```

3. **或者使用localhost（如果WSL端口转发已配置）：**
```javascript
fetch('http://localhost:5000/health')
  .then(r => r.json())
  .then(console.log);
```

### 配置Windows防火墙（如果需要）

如果无法访问，可能需要：

1. **允许WSL端口通过防火墙：**
   - 打开Windows防火墙设置
   - 添加入站规则，允许端口5000

2. **或者临时关闭防火墙测试**（不推荐，仅用于测试）

### 使用localhost访问（推荐）

WSL2默认支持端口转发，可以直接使用 `localhost:5000` 访问。

如果不行，检查：
```bash
# 在WSL中检查服务是否监听0.0.0.0
netstat -tuln | grep 5000
# 应该看到: 0.0.0.0:5000
```

## 重启服务测试修复

1. **停止旧服务：**
```bash
pkill -f piper-tts-server.py
```

2. **启动新服务：**
```bash
source venv-piper/bin/activate
python scripts/piper-tts-server.py
```

3. **测试修复：**
```bash
./scripts/test-piper-fix.sh
```

## 验证步骤

1. ✅ 服务健康检查：`curl http://localhost:5000/health`
2. ✅ TTS合成测试：`./scripts/test-piper-fix.sh`
3. ✅ 浏览器访问：在Windows浏览器中打开 `http://localhost:5000/health`

如果所有测试通过，就可以在游戏中使用Piper TTS了！

