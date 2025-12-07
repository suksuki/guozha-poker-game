# 启动本地 LLM (Ollama) 指南

## 在 WSL Ubuntu 中安装和启动 Ollama

### 1. 安装 Ollama

在 WSL Ubuntu 终端中运行：

```bash
curl -fsSL https://ollama.com/install.sh | sh
```

或者手动安装：

```bash
# 下载安装脚本
curl -fsSL https://ollama.com/install.sh -o install-ollama.sh

# 运行安装脚本
bash install-ollama.sh
```

### 2. 启动 Ollama 服务

安装后，Ollama 服务会自动启动。如果没有自动启动，可以手动启动：

```bash
# 启动 Ollama 服务（后台运行）
ollama serve &

# 或者使用 systemd（如果可用）
sudo systemctl start ollama
```

### 3. 下载模型

项目默认使用 `qwen2:0.5b` 模型，下载它：

```bash
ollama pull qwen2:0.5b
```

**推荐的小模型（适合聊天）：**
- `qwen2:0.5b` - 最小，速度快（推荐）
- `qwen2:1.5b` - 稍大，质量更好
- `deepseek-r1:1.5b` - 另一个选择

**下载其他模型：**
```bash
ollama pull qwen2:1.5b
ollama pull deepseek-r1:1.5b
```

### 4. 验证 Ollama 运行

检查 Ollama 是否正常运行：

```bash
# 检查服务状态
ollama list

# 测试 API
curl http://localhost:11434/api/tags
```

如果看到模型列表，说明 Ollama 正常运行。

### 5. 在游戏中使用

1. 启动游戏：`npm run dev`
2. 打开游戏配置面板
3. 检查 LLM 服务状态（应该显示"已连接"）
4. 选择模型（默认是 `qwen2:0.5b`）
5. 可以点击"测试 LLM"按钮验证

## 常见问题

### Q: Ollama 服务无法启动

**解决方案：**
```bash
# 检查 Ollama 是否已安装
which ollama

# 如果未安装，重新安装
curl -fsSL https://ollama.com/install.sh | sh

# 检查端口是否被占用
netstat -tuln | grep 11434

# 手动启动
ollama serve
```

### Q: 无法连接到 Ollama API

**检查：**
1. Ollama 服务是否运行：`ollama list`
2. 端口是否正确：默认是 `11434`
3. 防火墙是否阻止：WSL 通常不需要配置防火墙

**测试连接：**
```bash
curl http://localhost:11434/api/tags
```

### Q: 模型下载失败

**解决方案：**
```bash
# 检查网络连接
ping ollama.com

# 使用代理（如果需要）
export HTTP_PROXY=http://your-proxy:port
export HTTPS_PROXY=http://your-proxy:port
ollama pull qwen2:0.5b
```

### Q: 模型响应太慢

**解决方案：**
1. 使用更小的模型：`qwen2:0.5b` 比 `qwen2:1.5b` 快
2. 检查系统资源：`htop` 或 `top`
3. 确保有足够的内存（至少 2GB 可用）

### Q: 游戏无法连接到 Ollama

**检查：**
1. 游戏配置中的 API URL 是否正确：`http://localhost:11434/api/chat`
2. 在浏览器控制台查看错误信息
3. 尝试在终端测试：`curl http://localhost:11434/api/tags`

## 快速启动脚本

创建一个启动脚本 `start-ollama.sh`：

```bash
#!/bin/bash
# 检查 Ollama 是否已安装
if ! command -v ollama &> /dev/null; then
    echo "Ollama 未安装，正在安装..."
    curl -fsSL https://ollama.com/install.sh | sh
fi

# 检查 Ollama 服务是否运行
if ! curl -s http://localhost:11434/api/tags > /dev/null 2>&1; then
    echo "启动 Ollama 服务..."
    ollama serve &
    sleep 2
fi

# 检查模型是否存在
if ! ollama list | grep -q "qwen2:0.5b"; then
    echo "下载模型 qwen2:0.5b..."
    ollama pull qwen2:0.5b
fi

echo "✅ Ollama 已就绪！"
echo "模型列表："
ollama list
```

运行：
```bash
chmod +x start-ollama.sh
# 使用整理后的脚本路径
./docs/root-docs/scripts/start/start-ollama.sh

# 或创建符号链接后直接使用
./docs/root-docs/create-symlinks.sh
./start-ollama.sh
```

## 配置说明

### 默认配置

- **API URL**: `http://localhost:11434/api/chat`
- **默认模型**: `qwen2:0.5b`
- **超时时间**: 60秒

### 修改配置

在游戏配置面板中可以修改：
- LLM 模型：选择已下载的模型
- API URL：如果 Ollama 运行在其他端口或地址

## 性能优化

1. **使用小模型**：`qwen2:0.5b` 适合实时聊天
2. **限制并发**：游戏已限制最多2个并发请求
3. **启用缓存**：相同 prompt 5秒内使用缓存
4. **超时设置**：20秒超时，避免长时间阻塞

