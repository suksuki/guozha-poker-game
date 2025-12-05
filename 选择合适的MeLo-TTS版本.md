# 选择合适的 MeLo TTS 版本

## 📚 可用版本

### 1. 单语言版本（当前使用）- **推荐**
**文件**: `tts-server-debug.py`

**特点**：
- ✅ 只支持中文
- ✅ 启动快（2-3 秒）
- ✅ 内存占用小（~2GB）
- ✅ 稳定可靠
- ❌ 不支持其他语言

**适合**：
- 只需要中文语音
- 内存有限的服务器
- 需要快速启动

---

### 2. 中英文双语版本 - **推荐大多数用户**
**文件**: `melo-tts-server-zh-en.py` (新)

**特点**：
- ✅ 支持中文和英文
- ✅ 按需加载（节省内存）
- ✅ 两种最常用的语言
- ✅ 稳定可靠
- ⚠️  首次使用英文时需要加载（1-2 分钟）

**适合**：
- 需要中英文双语
- 国际化应用
- 大多数应用场景

**启动**：
```bash
cd ~/melotts/MeloTTS
source ../.venv/bin/activate

# 停止旧版本
pkill -f tts-server

# 启动中英文版本
python3 melo-tts-server-zh-en.py 2>&1 | tee server.log &
```

---

### 3. 多语言完整版本 - **高级用户**
**文件**: `melo-tts-server-multilang.py`

**特点**：
- ✅ 支持 6 种语言（ZH, EN, JP, KR, ES, FR）
- ✅ 按需加载
- ⚠️  每种语言首次使用需要加载（1-2 分钟）
- ⚠️  内存占用大（每种语言 1-2GB）
- ⚠️  日韩法西语可能不稳定

**适合**：
- 需要多语言支持
- 服务器内存充足（16GB+）
- 愿意等待模型加载

**启动**：
```bash
cd ~/melotts/MeloTTS
source ../.venv/bin/activate
python3 melo-tts-server-multilang.py 2>&1 | tee server.log &
```

---

## 🎯 推荐方案

### 普通用户（只需中文）
👉 **使用当前版本**（`tts-server-debug.py`）
- 无需改动
- 已经运行良好

### 需要中英文
👉 **使用双语版本**（`melo-tts-server-zh-en.py`）
- 复制并启动脚本
- 测试中英文

### 需要多语言
👉 **先测试语言支持**（见下方）
- 确认哪些语言实际可用
- 再决定是否使用

---

## 🧪 测试语言支持

运行这个测试，看看实际支持哪些语言：

```bash
cd ~/melotts/MeloTTS
source ../.venv/bin/activate

python3 << 'EOF'
from melo.api import TTS

languages = ['ZH', 'EN', 'JP', 'ES', 'FR', 'KR']
supported = []

for lang in languages:
    try:
        print(f"\n测试 {lang}...", end=' ')
        model = TTS(language=lang, device='auto')
        print(f"✅ 支持")
        supported.append(lang)
    except Exception as e:
        print(f"❌ 不支持")

print(f"\n\n{'='*50}")
print(f"实际支持的语言: {', '.join(supported)}")
print(f"{'='*50}")
EOF
```

**根据测试结果选择版本**。

---

## 💡 我的建议

**如果你的应用只需要中文**：
- ✅ 继续使用当前版本
- ✅ 已经工作良好
- ✅ 性能最佳

**如果偶尔需要英文**：
- ✅ 升级到双语版本
- ✅ 最实用的组合

**如果需要日韩等语言**：
- ⚠️  先运行上面的测试
- ⚠️  确认实际支持后再使用
- ⚠️  可能不稳定

---

## 🚀 快速切换版本

```bash
# 在 0.13 服务器上
cd ~/melotts/MeloTTS

# 停止当前版本
pkill -f tts-server

# 选择你要的版本：

# 选项 1: 仅中文（当前）
python3 tts-server-debug.py 2>&1 | tee server.log &

# 选项 2: 中英文（推荐）
python3 melo-tts-server-zh-en.py 2>&1 | tee server.log &

# 选项 3: 多语言（需先测试）
python3 melo-tts-server-multilang.py 2>&1 | tee server.log &
```

---

**建议先运行语言测试，看看实际支持哪些语言，然后再选择合适的版本！** 🎯
