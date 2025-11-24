#!/bin/bash

echo "安装语音引擎..."
echo ""

# 更新包列表
sudo apt-get update

# 安装语音引擎
echo "正在安装..."
sudo apt-get install -y speech-dispatcher espeak espeak-data espeak-data-zh

# 启动speech-dispatcher
echo ""
echo "启动speech-dispatcher..."
speech-dispatcher -d

echo ""
echo "安装完成！"
echo "请重启Electron应用：./start-electron.sh"
echo ""

