# Windows 脚本

本目录包含Windows平台相关的脚本文件。

## 文件类型

- **.bat** - Windows批处理脚本
- **.ps1** - PowerShell脚本

## 脚本说明

### 启动脚本
- `start-all.bat` - 启动所有服务
- `start-dev.bat` - 启动开发服务器
- `start.bat` - 启动应用
- `run-dev.bat` - 运行开发模式

### 安装脚本
- `install-deps.bat` - 安装依赖

### 其他脚本
- `start-app-with-piper.ps1` - PowerShell启动脚本

## 使用方式

在Windows命令行或PowerShell中运行：
```cmd
start-all.bat
```

或在PowerShell中：
```powershell
.\start-app-with-piper.ps1
```

