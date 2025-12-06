# 运行说明

## 重要：由于 WSL 路径问题，请在 WSL Ubuntu 终端中运行

### 方法1：在 WSL Ubuntu 终端中运行（推荐）

1. 打开 **WSL Ubuntu 终端**（不是 Windows PowerShell）
2. 运行以下命令：

```bash
cd /home/jin/guozha_poker_game
npm install
npm run dev
```

3. 服务器启动后，在浏览器中打开显示的地址（通常是 `http://localhost:5173/` 或 `http://localhost:3000/`）

### 方法2：如果必须在 Windows 中运行

如果遇到 UNC 路径错误，可以尝试：

1. 在项目目录中打开 PowerShell
2. 运行：
```powershell
wsl -d Ubuntu -e bash -c "cd /home/jin/guozha_poker_game && npm run dev"
```

### 检查服务器是否运行

如果浏览器打不开，检查：
1. 服务器是否真的在运行（查看终端输出）
2. 防火墙是否阻止了端口
3. 尝试访问 `http://127.0.0.1:5173/` 或 `http://127.0.0.1:3000/`

### 常见问题

**问题：端口被占用**
- 解决方案：修改 `vite.config.ts` 中的端口号，或关闭占用端口的程序

**问题：UNC 路径错误**
- 解决方案：必须在 WSL Ubuntu 终端中运行，不要在 Windows PowerShell 中运行

**问题：浏览器无法访问**
- 检查服务器是否正常启动
- 尝试使用 `http://127.0.0.1:端口号` 而不是 `http://localhost:端口号`
- 检查防火墙设置

