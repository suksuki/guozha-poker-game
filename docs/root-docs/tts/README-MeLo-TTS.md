# MeLo TTS 快速索引

## 🚀 一键启动

### 服务器端 (192.168.0.13)
```bash
cd ~/melotts/MeloTTS && source ../.venv/bin/activate && python3 melo-multilang.py 2>&1 | tee server.log &
```

### 客户端 (APP)
```bash
cd /Ubuntu/home/jin/guozha_poker_game && npm run dev
```

---

## 📚 文档导航

### 快速开始
- **MeLo-TTS配置完成总结.md** ⭐ 从这里开始！配置总结和关键信息
- **快速参考-MeLo-TTS.md** ⭐ 常用命令速查

### 详细配置
- **MeLo-TTS完整配置指南.md** - 完整的安装和配置步骤
- **选择合适的MeLo-TTS版本.md** - 版本对比（单语言/双语/多语言）
- **MeLo-TTS多语言配置.md** - 多语言支持详细说明

### 问题排查
- **MeLo-TTS故障排查指南.md** ⭐ 遇到问题看这个！
- **在0.13上启动TTS.md** - 服务器启动详细指南
- **docs/setup/melo-tts-remote-connection.md** - 远程连接配置

---

## ✅ 快速验证

```bash
# 服务器健康检查
curl http://192.168.0.13:7860/health

# 浏览器控制台（F12）
const { getTTSServiceManager } = await import('/src/tts/ttsServiceManager.ts');
console.table(getTTSServiceManager().getProviderStatus());
```

---

## 🎯 关键配置

- **服务器地址**: http://192.168.0.13:7860
- **端口**: 7860
- **默认语言**: ZH (中文)
- **支持语言**: ZH, EN, JP, ES, FR, KR

---

## 📞 快速诊断

```bash
# 在服务器上
ps aux | grep melo && curl http://localhost:7860/health

# 在客户端
curl http://192.168.0.13:7860/health
```

---

**所有文档都在项目根目录，按需查阅！** 📖

