# 快速启动指南

## ⚠️ 重要：必须在 WSL Ubuntu 终端中运行！

### 步骤：

1. **打开 WSL Ubuntu 终端**
   - 按 `Win` 键，输入 "Ubuntu"，点击打开
   - 或者在 PowerShell 中输入 `wsl` 或 `ubuntu`

2. **进入项目目录**
   ```bash
   cd /home/jin/guozha_poker_game
   ```

3. **安装依赖（如果还没安装）**
   ```bash
   npm install
   ```

4. **启动开发服务器**
   ```bash
   npm run dev
   ```

5. **在 Windows 浏览器中访问**
   - 查看终端输出的地址（通常是 `http://localhost:5173/` 或 `http://localhost:3000/`）
   - 在 Windows 浏览器中打开该地址

## ❌ 不要在 Windows PowerShell 中运行！

如果在 PowerShell 中运行，会出现：
- UNC 路径不支持错误
- 找不到模块错误
- 权限错误

## ✅ 正确的方式

**必须在 WSL Ubuntu 终端中运行！**

## 如果浏览器无法访问

1. **获取 WSL IP 地址**（在 WSL 终端中）：
   ```bash
   hostname -I
   ```

2. **在 Windows 浏览器中访问**：
   ```
   http://[WSL的IP地址]:5173/
   ```

3. **或者配置端口转发**（在 Windows PowerShell 管理员中）：
   ```powershell
   $wslIp = (wsl hostname -I).Trim()
   netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$wslIp
   ```
   然后访问 `http://localhost:5173/`

