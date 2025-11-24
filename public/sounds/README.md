# 音效文件说明

## 📁 文件位置

所有音效文件应放在 `public/sounds/` 目录下。

## 🎵 需要下载的 MP3 音效文件

### 出墩音效（根据墩的大小）

| 文件名 | 路径 | 用途 | 建议时长 | 音调建议 |
|--------|------|------|----------|----------|
| `dun-small.mp3` | `/sounds/dun-small.mp3` | 小墩（≤5张）音效 | 0.1-0.3秒 | 高音、短促、清脆 |
| `dun-medium.mp3` | `/sounds/dun-medium.mp3` | 中墩（6-8张）音效 | 0.2-0.4秒 | 中高音、中等长度 |
| `dun-large.mp3` | `/sounds/dun-large.mp3` | 大墩（9-12张）音效 | 0.3-0.5秒 | 中低音、较长、有冲击感 |
| `dun-huge.mp3` | `/sounds/dun-huge.mp3` | 超大墩（>12张）音效 | 0.4-0.6秒 | 低音、最长、震撼感 |

### 特殊音效

| 文件名 | 路径 | 用途 | 建议时长 | 音调建议 |
|--------|------|------|----------|----------|
| `bomb.mp3` | `/sounds/bomb.mp3` | 炸弹音效 | 0.5-1秒 | 爆炸声、有冲击力 |
| `explosion.mp3` | `/sounds/explosion.mp3` | 爆炸音效 | 0.5-1秒 | 爆炸声、震撼感 |

## 📋 文件要求

- **格式**: MP3
- **风格**: 卡通风格，适合游戏场景
- **时长**: 
  - 出墩音效：0.1-0.6秒（建议 0.2-0.5 秒）
  - 炸弹/爆炸：0.5-1秒
- **音量**: 适中，避免过大或过小
- **音质**: 清晰，无明显杂音

## 🔍 下载建议

### 推荐网站

1. **[Freesound.org](https://freesound.org/)**
   - 免费音效库，需要注册
   - 搜索关键词：`pop`, `click`, `whoosh`, `explosion`, `boom`

2. **[Zapsplat](https://www.zapsplat.com/)**
   - 免费音效库，需要注册
   - 分类清晰，质量较高

3. **[Mixkit](https://mixkit.co/free-sound-effects/)**
   - 完全免费，无需注册
   - 音效质量不错

4. **[OpenGameArt](https://opengameart.org/)**
   - 游戏资源网站
   - 有专门的音效分类

### 搜索关键词

**出墩音效**：
- `dun-small`: "pop", "click", "whoosh", "swish", "small explosion"
- `dun-medium`: "medium pop", "whoosh", "swoosh", "medium explosion"
- `dun-large`: "large pop", "boom", "explosion", "impact"
- `dun-huge`: "huge explosion", "big boom", "massive impact", "thunder"

**炸弹/爆炸音效**：
- `bomb`: "bomb", "explosion", "blast", "boom"
- `explosion`: "explosion", "blast", "boom", "detonation"

## 📝 文件命名规范

所有文件必须严格按照以下名称命名（区分大小写）：

```
public/sounds/
├── dun-small.mp3
├── dun-medium.mp3
├── dun-large.mp3
├── dun-huge.mp3
├── bomb.mp3
└── explosion.mp3
```

## ⚙️ 技术说明

- 代码会优先尝试加载 `.aiff` 格式（系统音效），如果不存在则加载 `.mp3` 格式
- 如果所有格式都加载失败，会使用合成的备用音效
- 支持 HTML5 Audio 和 Web Audio API 两种播放方式

## 🎨 音效设计建议

### 出墩音效设计思路

1. **dun-small**: 
   - 类似"啪"或"砰"的短促声音
   - 高音调，清脆
   - 适合小规模出牌

2. **dun-medium**: 
   - 中等长度的"呼"或"嗖"声
   - 中高音调
   - 有轻微的冲击感

3. **dun-large**: 
   - 较长的"轰"或"嘭"声
   - 中低音调
   - 有明显的冲击感和力量感

4. **dun-huge**: 
   - 最长的"轰隆"或"爆炸"声
   - 低音调
   - 有强烈的震撼感和冲击力

### 炸弹/爆炸音效

- 应该是有冲击力的爆炸声
- 可以包含低频的"轰"声和高频的"啪"声
- 持续时间稍长，营造震撼效果

## ✅ 检查清单

下载完成后，请确认：

- [ ] 所有 6 个 MP3 文件都已下载
- [ ] 文件命名正确（区分大小写）
- [ ] 文件已放置在 `public/sounds/` 目录下
- [ ] 文件格式为 MP3
- [ ] 音效风格符合游戏主题（卡通风格）
- [ ] 音量适中，不会过大或过小
- [ ] 音效清晰，无明显杂音

## 🚀 使用

下载并放置好文件后，重启应用即可自动加载音效。代码会自动：

1. 尝试加载 `.aiff` 格式（如果存在）
2. 如果不存在，尝试加载 `.mp3` 格式
3. 如果都失败，使用合成的备用音效

## 📞 问题反馈

如果音效无法正常播放，请检查：

1. 文件是否在正确的目录下
2. 文件名是否正确（区分大小写）
3. 文件格式是否为 MP3
4. 浏览器控制台是否有错误信息
