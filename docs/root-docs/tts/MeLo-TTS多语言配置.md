# MeLo TTS 多语言支持配置

## 🌍 支持的语言

MeLo TTS 支持以下语言：

| 语言代码 | 语言名称 | 别名 |
|---------|---------|------|
| **ZH** | 中文（普通话）| zh |
| **EN** | English（英语）| en |
| **JP** | 日本語（日语）| jp, ja |
| **KR** | 한국어（韩语）| kr, ko |
| **ES** | Español（西班牙语）| es |
| **FR** | Français（法语）| fr |

## 🚀 启用多语言支持

### 第 1 步：在服务器上使用多语言版本

在 **192.168.0.13 服务器**上：

```bash
# 停止当前服务器
pkill -f tts-server

# 复制多语言版本脚本
cp /Ubuntu/home/jin/guozha_poker_game/docs/setup/melo-tts-server-multilang.py ~/melotts/MeloTTS/

# 启动多语言服务器
cd ~/melotts/MeloTTS
source ../.venv/bin/activate
python3 melo-tts-server-multilang.py 2>&1 | tee server-multilang.log &
```

### 第 2 步：测试不同语言

```bash
# 测试中文
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"你好世界", "lang":"ZH"}' \
  --output test-zh.wav

# 测试英文
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world", "lang":"EN"}' \
  --output test-en.wav

# 测试日语
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"こんにちは", "lang":"JP"}' \
  --output test-jp.wav

# 测试韩语
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"안녕하세요", "lang":"KR"}' \
  --output test-kr.wav

# 查看生成的文件
ls -lh test-*.wav
```

### 第 3 步：查看支持的语言列表

```bash
# 查看服务器支持的语言
curl http://localhost:7860/languages
```

返回：
```json
{
  "supported_languages": [
    {"code": "ZH", "name": "中文", "aliases": ["zh"]},
    {"code": "EN", "name": "English", "aliases": ["en"]},
    {"code": "JP", "name": "日本語", "aliases": ["jp", "ja"]},
    {"code": "ES", "name": "Español", "aliases": ["es"]},
    {"code": "FR", "name": "Français", "aliases": ["fr"]},
    {"code": "KR", "name": "한국어", "aliases": ["kr", "ko"]}
  ]
}
```

---

## 🎯 在 APP 中使用不同语言

### 方法 1：通过代码配置默认语言

修改 `src/App.tsx`：

```typescript
// 配置 MeLo TTS（远程服务器）
config.enableMelo = true;
config.meloConfig = {
  baseUrl: 'http://192.168.0.13:7860',
  timeout: 30000,
  retryCount: 2,
  defaultSpeaker: 'JP',  // 改为日语：'JP'、韩语：'KR' 等
};
```

### 方法 2：在合成时指定语言

在代码中调用 TTS 时指定语言：

```typescript
import { getTTSServiceManager } from './tts/ttsServiceManager';

const ttsManager = getTTSServiceManager();

// 中文
await ttsManager.synthesize('你好世界', {
  lang: 'zh',
  voiceConfig: { speaker: 'ZH' }
});

// 英文
await ttsManager.synthesize('Hello world', {
  lang: 'en',
  voiceConfig: { speaker: 'EN' }
});

// 日语
await ttsManager.synthesize('こんにちは', {
  lang: 'ja',
  voiceConfig: { speaker: 'JP' }
});

// 韩语
await ttsManager.synthesize('안녕하세요', {
  lang: 'kr',
  voiceConfig: { speaker: 'KR' }
});
```

---

## 📝 多语言服务器特点

### 1. **按需加载**
- 首次使用某个语言时才加载该语言的模型
- 节省内存（只加载使用的语言）
- 自动缓存已加载的模型

### 2. **智能语言识别**
- 支持大小写（ZH、zh 都可以）
- 支持别名（JP、ja 都是日语）
- 自动回退到默认语言

### 3. **语速控制**
```bash
# 正常速度
{"text":"你好", "lang":"ZH", "speed":1.0}

# 慢速
{"text":"你好", "lang":"ZH", "speed":0.8}

# 快速
{"text":"你好", "lang":"ZH", "speed":1.5}
```

---

## 🧪 测试示例

### 测试所有语言

```bash
# 在服务器上创建测试脚本
cat > ~/melotts/MeloTTS/test-all-langs.sh << 'EOF'
#!/bin/bash
echo "测试 MeLo TTS 多语言支持"

# 中文
echo "测试中文..."
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"你好世界", "lang":"ZH"}' \
  --output zh.wav
echo "✅ 中文: $(ls -lh zh.wav | awk '{print $5}')"

# 英文
echo "测试英文..."
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello world", "lang":"EN"}' \
  --output en.wav
echo "✅ 英文: $(ls -lh en.wav | awk '{print $5}')"

# 日语
echo "测试日语..."
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"こんにちは", "lang":"JP"}' \
  --output jp.wav
echo "✅ 日语: $(ls -lh jp.wav | awk '{print $5}')"

# 韩语
echo "测试韩语..."
curl -X POST http://localhost:7860/tts \
  -H "Content-Type: application/json" \
  -d '{"text":"안녕하세요", "lang":"KR"}' \
  --output kr.wav
echo "✅ 韩语: $(ls -lh kr.wav | awk '{print $5}')"

echo ""
echo "所有测试文件："
ls -lh *.wav
EOF

chmod +x ~/melotts/MeloTTS/test-all-langs.sh
bash ~/melotts/MeloTTS/test-all-langs.sh
```

---

## ⚠️ 注意事项

### 1. **首次加载每个语言需要时间**
- 每个语言的模型约 200MB
- 首次使用需要下载和加载（1-2 分钟）
- 之后会缓存在内存中，速度很快

### 2. **内存占用**
- 每个语言模型约 1-2GB 内存
- 加载 6 个语言需要约 6-12GB 内存
- 建议只加载需要的语言

### 3. **性能建议**
- 如果只需要中文，使用单语言版本（更快）
- 如果需要多语言，使用多语言版本（按需加载）

---

## 🎯 快速启用多语言

在 **192.168.0.13 服务器**上：

```bash
# 一键启动多语言版本
cd ~/melotts/MeloTTS
source ../.venv/bin/activate

# 停止旧版本
pkill -f tts-server

# 启动多语言版本
python3 melo-tts-server-multilang.py 2>&1 | tee server-multilang.log &

# 测试
sleep 5
curl http://localhost:7860/health
curl http://localhost:7860/languages
```

---

## 📊 效果对比

### 单语言版本（当前）
```
✅ 启动快
✅ 内存占用小（~2GB）
❌ 只支持中文
```

### 多语言版本（新）
```
✅ 支持 6 种语言
✅ 按需加载（节省内存）
✅ 自动缓存模型
⚠️  首次使用每个语言需要加载
```

---

## 🎊 总结

**是的，MeLo TTS 支持多种语言！**

要启用：
1. 在服务器使用多语言版脚本：`melo-tts-server-multilang.py`
2. 在 APP 中调用时指定语言代码
3. 享受多语言语音合成！

**脚本位置**：`docs/setup/melo-tts-server-multilang.py`

