# 服务器访问问题排查

## 问题：Windows 浏览器无法访问 WSL 中的服务器

### 解决方案

#### 方案1：使用 WSL 的 localhost 转发（推荐）

WSL2 会自动将 localhost 转发到 Windows，所以应该可以直接访问：

1. **确保服务器正在运行**，查看终端输出，应该看到类似：
   ```
   ➜  Local:   http://localhost:3000/
   ```

2. **在 Windows 浏览器中访问**：
   - `http://localhost:3000/`
   - 或 `http://127.0.0.1:3000/`

#### 方案2：获取 WSL IP 地址

如果 localhost 不行，可以获取 WSL 的 IP 地址：

1. 在 WSL 终端中运行：
   ```bash
   hostname -I
   ```
   会显示类似 `172.x.x.x` 的 IP

2. 在 Windows 浏览器中访问：
   ```
   http://172.x.x.x:3000/
   ```

#### 方案3：配置 Windows 防火墙

如果还是不行，可能需要配置防火墙：

1. 打开 Windows 防火墙设置
2. 允许 Node.js 通过防火墙
3. 或者临时关闭防火墙测试

#### 方案4：使用 Windows 本地运行（如果 WSL 有问题）

如果 WSL 网络问题无法解决，可以：

1. 在 Windows PowerShell 中（不是 WSL）：
   ```powershell
   cd \\wsl.localhost\Ubuntu\home\jin\guozha_poker_game
   npm install
   npm run dev
   ```

2. 但要注意权限问题，可能需要以管理员身份运行

### 检查服务器是否真的在运行

在终端中应该看到类似输出：
```
VITE v7.x.x  ready in xxx ms

➜  Local:   http://localhost:3000/
➜  Network: http://0.0.0.0:3000/
```

如果没有看到这些，说明服务器没有正常启动。

### 常见问题

**Q: 看到 "port 3000 is in use"**
- A: 端口被占用，Vite 会自动选择其他端口（如 5173），使用新端口访问

**Q: 浏览器显示 "无法访问此网站"**
- A: 检查服务器是否真的在运行，查看终端是否有错误

**Q: 防火墙阻止**
- A: 在 Windows 防火墙中允许 Node.js 或临时关闭防火墙测试

