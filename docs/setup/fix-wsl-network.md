# WSL2 网络访问问题解决方案

## 问题：Windows 无法访问 WSL 中的服务

### 解决方案

#### 方案1：检查 WSL 版本和网络模式

1. **检查 WSL 版本**：
   ```bash
   wsl --list --verbose
   ```
   确保 Ubuntu 是 WSL2

2. **如果 WSL2 网络有问题，可以尝试**：
   - 在 Windows PowerShell（管理员）中运行：
   ```powershell
   wsl --shutdown
   ```
   然后重新打开 WSL

#### 方案2：获取 WSL IP 地址并访问

1. **在 WSL 终端中获取 IP**：
   ```bash
   ip addr show eth0 | grep "inet\b" | awk '{print $2}' | cut -d/ -f1
   ```
   或者简单点：
   ```bash
   hostname -I
   ```

2. **在 Windows 浏览器中访问**：
   ```
   http://[WSL的IP地址]:5173/
   ```

#### 方案3：配置 Windows 端口转发（推荐）

在 Windows PowerShell（管理员）中运行：

```powershell
# 获取 WSL IP
$wslIp = (wsl hostname -I).Trim()

# 添加端口转发规则（5173端口）
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$wslIp

# 检查规则
netsh interface portproxy show all
```

#### 方案4：使用 localhost（最简单，但可能不工作）

WSL2 应该自动转发 localhost，尝试：
- `http://localhost:5173/`
- `http://127.0.0.1:5173/`

#### 方案5：修改 Vite 配置使用 Windows 可访问的地址

如果以上都不行，可以尝试在 Windows 中直接运行项目（但可能有权限问题）。

### 快速测试

在 WSL 终端中运行：
```bash
# 检查服务器是否在监听
netstat -tuln | grep 5173

# 或者
ss -tuln | grep 5173
```

如果看到 `0.0.0.0:5173` 或 `:::5173`，说明服务器在监听所有接口。

### 临时解决方案：使用 Windows 本地运行

如果 WSL 网络问题无法解决，可以在 Windows PowerShell 中：

```powershell
cd \\wsl.localhost\Ubuntu\home\jin\guozha_poker_game
npm run dev
```

但要注意权限问题。

