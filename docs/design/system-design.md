# AI 吵架王棋牌游戏（浏览器版）流程/架构文档

## 目标

在浏览器（React）里实现一个最多 8 人的打牌聊天游戏：

1. AI 玩家由本地 Qwen 模型生成台词（可能是长段互怼）。
2. 支持多语言输出（中文为主，日/韩/英等可扩展）。
3. 支持南昌话（文本像 + 声音像）。
4. 多个 AI 能 **同时说话 / 抢话 / 插嘴**（并发混音），达到《九品芝麻官》包龙星×老鸨"吵架王对轰"效果。
5. 文明等级可控（测试期允许粗口，正式期可降级；禁止歧视/仇恨词）。

---

## 总体流水线（端到端）

### 0. 事件触发

* 游戏逻辑/剧情/玩家行为触发 AI 发言
  例如：出牌、被挑衅、失败、胜利、房间闲聊、对骂升级等。

### 1. 中文意图台词生成（本地 Qwen）

**输入：**

* 当前牌局状态 / 上下文
* 角色人设（包龙星式吵架王、老鸨式毒舌等）
* 文明等级 civility_level（0~4）
* 需要的节奏参数（吵架/闲聊/插嘴）

**输出（中文意图）：**

```json
{
  "intent_zh": "我跟一手。你莫急咧。你一张嘴就输钱气！"
}
```

> 原则：先用中文生成"语义+笑点+节奏"最好的台词，不要在这一层分散到多语言。

---

### 2. 文本分流与改写（多语言 + 南昌话）

#### 2.1 多语言文本生成

**优先顺序：**

1. 让 Qwen 直接输出目标语言短句（强约束、口语、短句）
2. 若日/韩效果不佳 → 用本地轻量翻译器（Argos/OPUS-MT）做 zh→ja / zh→ko

**输出：**

```json
{
  "zh": "我跟一手。你别急啊。",
  "ja": "コールするよ。焦らないで。",
  "ko": "나 콜할게. 너무 급하지 마."
}
```

#### 2.2 南昌话文本改写

两阶段：

1. **先规则/词表改写**（快速落地）
2. **再 LoRA 训练"南昌话改写器"**（增强地道度）

**输出：**

```json
{
  "nanchang": "我跟噻，你莫急咧。"
}
```

> 南昌话改写器只要覆盖"牌桌/互怼常见表达"即可，不追求全域翻译。

---

### 3. 语音合成（本地）

#### 3.1 语音策略

* 不使用 `speechSynthesis`（它是单通道队列，会让 AI 排队）
* 每个 AI 话语 → 先合成 **独立音频段**（mp3/wav/ArrayBuffer）

#### 3.2 多语言 TTS

* 每种语言使用对应 voice 的本地 TTS 或本地声音克隆
* 逐语言扩展（先普通话/南昌话，后续再补 ja/ko/en 声线）

#### 3.3 南昌口音 TTS（你的声线）

* 你录 30–60 分钟南昌话短句素材
* 用 GPT-SoVITS / SoVITS few-shot 微调/克隆
* 得到 `speaker=nanchang_role_x` 的声线

**输出：**

```json
{
  "audio_url": "/cache/role3_seg_102.wav",
  "duration_ms": 1480
}
```

---

### 4. 浏览器播放（WebAudio 并发混音）

**目标：逻辑多通道并发，不追求物理 5.1/7.1。**

* 一个 `AudioContext`
* 每个角色一个 **roleGainNode + StereoPanner**
* 每段音频一个 `AudioBufferSourceNode`
* 多段同时 `start()` → 多 AI 同时说话

---

## 吵架王长段台词机制（关键）

### A. "节拍 → 分段生成 → 分段播报"

长吵架 **不能一次生成/合成 40 秒**：

1. **节拍生成（beats）**

```json
{
  "beats": [
    "反讽开场",
    "抓对方上一句话反击",
    "夸张比喻升级",
    "短狠收尾"
  ]
}
```

2. **按 beat 分段出句**

* 每段 1~3 句
* 每段可独立合成音频
* 实现边生成边播放 + 抢话插嘴

---

## 文明等级（civility_level）设计

### civility_level 建议

* 0：文明（无粗口）
* 1：轻微讽刺
* 2：允许口头粗话（非侮辱性）
* 3：强烈粗口（仍禁止歧视/仇恨）
* 4：极限测试档（仍禁仇恨/群体攻击）

### 训练与推理统一用标签

**训练样本：**

```json
{
  "input": "你算什么东西！",
  "civility": 3,
  "output": "你嘴巴跟漏斗一样，别在这儿放屁！"
}
```

**推理 system 强制写入：**

> 当前文明等级=3
> 允许粗口但禁止任何针对受保护群体的侮辱
> 若触发禁用词 → 自动降级重写

---

## 8 人房间语音调度（电影吵架感）

### 设计目标

* 房间最多 8 人
* 同时发声 **最多 2 人**（maxConcurrent=2）
* 其他人只能短插一句（QUICK_JAB ≤ 1.5s）

### DialogueScheduler（伪实现）

```ts
type Utter = {
  roleId: string
  text: string
  priority: "MAIN_FIGHT"|"QUICK_JAB"|"NORMAL_CHAT"
  civility: number
  lang: "zh"|"ja"|"ko"|"nanchang"
}

class DialogueScheduler {
  maxConcurrent = 2
  playing = new Set<string>()
  queue: Utter[] = []

  submit(u: Utter) {
    if (u.priority === "QUICK_JAB") this.queue.unshift(u)
    else this.queue.push(u)
    this.tick()
  }

  tick() {
    while (this.playing.size < this.maxConcurrent && this.queue.length) {
      const next = this.pickNext()
      this.playing.add(next.roleId)
      speak(next).finally(() => {
        this.playing.delete(next.roleId)
        this.tick()
      })
    }
  }

  pickNext() {
    this.queue.sort((a,b)=>priorityScore(b)-priorityScore(a))
    return this.queue.shift()!
  }
}
```

---

## AudioMixer（WebAudio 混音器）

```ts
class AudioMixer {
  ctx = new AudioContext()
  roleNodes = new Map<string, {gain: GainNode, pan: StereoPannerNode}>()

  async init() { await this.ctx.resume() }

  ensureRole(roleId: string, panValue=0) {
    if (this.roleNodes.has(roleId)) return this.roleNodes.get(roleId)!
    const gain = this.ctx.createGain()
    gain.gain.value = 1.0
    const pan = this.ctx.createStereoPanner()
    pan.pan.value = panValue
    gain.connect(pan).connect(this.ctx.destination)
    const nodes = { gain, pan }
    this.roleNodes.set(roleId, nodes)
    return nodes
  }

  async play(roleId: string, arrayBuffer: ArrayBuffer, volume=1) {
    const buf = await this.ctx.decodeAudioData(arrayBuffer.slice(0))
    const src = this.ctx.createBufferSource()
    src.buffer = buf
    const segGain = this.ctx.createGain()
    segGain.gain.value = volume
    const role = this.ensureRole(roleId)
    src.connect(segGain).connect(role.gain)
    src.start()
    return new Promise<void>(res => { src.onended = () => res() })
  }

  duckOthers(activeRoleId: string, otherLevel=0.25) {
    for (const [id, role] of this.roleNodes) {
      const target = id === activeRoleId ? 1.0 : otherLevel
      role.gain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.05)
    }
  }
}
```

### 推荐参数

* `maxConcurrent = 2`
* `otherLevel = 0.2 ~ 0.35`
* 主吵架左右声像：`pan=-0.35` / `+0.35`
* 其他人随机分布 `[-0.6, 0.6]`（制造一桌人围吵感）

---

## 目录/文件结构建议（Cursor 友好）

```
/src
  /ai
    qwenClient.ts            # 本地 Qwen 调用
    prompt/
      style_packlongxing.md  # 吵架王风格 system+模板
      beats_template.md      # 节拍生成模板
    dialect/
      nanchang_rules.ts      # 南昌话规则/词表改写
      nanchang_lora.md       # LoRA 训练说明与数据格式
    translate/
      argosClient.ts         # 轻量本地翻译（可选）
  /tts
    ttsClient.ts             # 本地 TTS 接口（统一封装）
    speakers.ts              # voice/角色声线映射
  /audio
    AudioMixer.ts
    DialogueScheduler.ts
    useAudioRoom.ts          # React hook，把 mixer+scheduler 打包
  /game
    events.ts
    aiController.ts          # 游戏事件 -> submit utter
```

---

## 实现顺序（最小落地 → 逐步增强）

### Phase 1：先跑通并发吵架

1. Qwen 生成中文短句
2. TTS 合成短音频（普通话占位）
3. WebAudio 并发播放
4. maxConcurrent=2 + ducking

### Phase 2：长吵架节拍化

1. beats 生成
2. 分段出句边播
3. 插嘴 QUICK_JAB

### Phase 3：南昌话上线

1. 规则/词表改写
2. 你录素材 → GPT-SoVITS 南昌声线
3. 南昌话文本 + 南昌 voice 组合

### Phase 4：多语言扩展

1. 目标语直出短句
2. 不自然则接本地轻量翻译
3. 加对应语言 TTS 声线

### Phase 5：吵架王训练

1. 300~500 条高质量互怼样本（含 civility）
2. QLoRA SFT 学风格
3. DPO 偏好优化学节奏
4. 上线 A/B 迭代

---

## 关键提示（保证风格的 system）

（放在 `style_packlongxing.md`）

* **角色定位**：包龙星式"吵架王"，市井、机智、夸张比喻、节奏短促、强反击
* **输出结构**：短句为主，必要时 2~3 句连发
* **禁止项**：受保护群体歧视/仇恨/恶意人身攻击
* **文明等级参数**：决定粗口密度与狠劲
* **节奏**：必须有 punchline / 绝杀尾句

---

## 最终效果

* 八人牌桌，主角对轰、旁人插嘴
* 台词长段但不散
* 语音可抢话并发
* 南昌话"文本+声音"双地道
* 文明等级一键切换
* 训练出"包龙星级吵架王 AI"

---

