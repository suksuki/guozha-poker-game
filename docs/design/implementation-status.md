# 实现状态总结

## ✅ 已实现的功能

### 1. 逻辑多通道并发播放 ✅
- **位置**: `src/services/ttsAudioService.ts`
- **实现**: 使用 `AudioBufferSourceNode` 同时 `start()` 多个音频
- **支持**: 最多2个玩家同时说话（可配置）
- **状态**: 已实现并符合ChatGPT讨论要求

### 2. AudioMixer（WebAudio混音器）✅
- **位置**: `src/services/ttsAudioService.ts`（已集成）
- **实现**: 
  - 每个角色一个 `roleGainNode + StereoPanner`
  - 每段音频一个 `segGain`（段增益节点）
  - 音频连接图：`source -> segGain -> roleGain -> panner -> masterGain -> destination`
- **状态**: 已实现，符合ChatGPT讨论的AudioMixer设计

### 3. Ducking机制 ✅
- **位置**: `src/services/ttsAudioService.ts` 的 `duckOthers()` 方法
- **实现**: 当某个角色说话时，其他角色音量降低到 `otherLevel` (0.25)
- **状态**: 已实现，符合ChatGPT讨论要求

### 4. 声像分离（Stereo Panning）✅
- **位置**: `src/services/ttsAudioService.ts`
- **实现**: 通过 `StereoPannerNode` 实现左右声像分离
- **配置**: 8个玩家分布在不同的pan值（-0.7 到 0.7）
- **状态**: 已实现

### 5. 优先级管理 ✅
- **位置**: `src/services/ttsAudioService.ts` 和 `src/audio/DialogueScheduler.ts`
- **实现**: 
  - 报牌（优先级4）可以中断其他播放
  - 对骂（优先级3）> 事件（优先级2）> 随机（优先级1）
- **状态**: 已实现

### 6. DialogueScheduler ✅
- **位置**: `src/audio/DialogueScheduler.ts`
- **实现**: 
  - 管理多个AI的语音播放
  - 最多2人同时说话（maxConcurrent=2）
  - 支持QUICK_JAB短插一句
- **状态**: 已实现，但需要与ttsAudioService集成

### 7. 南昌话改写规则 ✅
- **位置**: `src/ai/dialect/nanchang_rules.ts` 和 `src/utils/nanchangDialectMapper.ts`
- **实现**: 规则/词表改写
- **状态**: 已实现

### 8. 包龙星风格Prompt ✅
- **位置**: `src/ai/prompt/style_packlongxing.md`
- **实现**: 完整的system prompt和beats模板
- **状态**: 已实现

### 9. BeatsGenerator ✅
- **位置**: `src/ai/beatsGenerator.ts`
- **实现**: 长吵架节拍生成
- **状态**: 已实现

### 10. 不使用speechSynthesis ✅
- **位置**: `src/services/ttsAudioService.ts`
- **实现**: 已移除所有speechSynthesis回退逻辑
- **状态**: 已修复，只使用TTS API服务

## ⏳ 待完善的功能

### 1. DialogueScheduler与ttsAudioService集成 ⏳
- **问题**: DialogueScheduler和ttsAudioService是独立的，需要集成
- **方案**: 使用 `useAudioRoom` hook 或直接集成到 `multiChannelVoiceService`
- **状态**: 待实现

### 2. 长吵架分段播放集成 ⏳
- **问题**: BeatsGenerator已存在，但需要集成到播放流程
- **方案**: 在LLM生成台词时，检测长文本，调用BeatsGenerator，分段TTS和播放
- **状态**: 待实现

### 3. QUICK_JAB短插一句机制 ⏳
- **问题**: DialogueScheduler支持QUICK_JAB，但需要限制时长（≤1.5s）
- **方案**: 在提交Utter时检查文本长度，超过限制则拒绝或截断
- **状态**: 待实现

### 4. 主吵架声像优化 ⏳
- **问题**: 当前所有玩家pan值固定，主吵架应该左右分离（-0.35 / +0.35）
- **方案**: 根据对话上下文动态调整pan值
- **状态**: 待实现

### 5. 其他人随机分布 ⏳
- **问题**: 当前pan值固定，应该随机分布 [-0.6, 0.6]
- **方案**: 在初始化时或每次对话时随机分配pan值
- **状态**: 待实现

### 6. 多语言直出优化 ⏳
- **问题**: 当前多语言可能依赖翻译，应该优先让Qwen直接输出目标语言
- **方案**: 在LLMChatStrategy中加强语言约束
- **状态**: 部分实现，待优化

### 7. 南昌话LoRA训练 ⏳
- **问题**: 当前只有规则改写，需要LoRA训练增强地道度
- **方案**: 使用 `nanchang_rules.ts` 生成训练数据，训练LoRA
- **状态**: 待实现（需要显卡）

### 8. GPT-SoVITS南昌声线 ⏳
- **问题**: 需要录制南昌话素材并训练声线
- **方案**: 录制30-60分钟南昌话短句，用GPT-SoVITS微调
- **状态**: 待实现（需要素材和显卡）

## 📊 实现进度

### Phase 1：先跑通并发吵架 ✅ 100%
- [x] Qwen生成中文短句
- [x] TTS合成短音频（普通话占位）
- [x] WebAudio并发播放
- [x] maxConcurrent=2 + ducking

### Phase 2：长吵架节拍化 ⏳ 50%
- [x] beats生成（BeatsGenerator已实现）
- [ ] 分段出句边播（需要集成）
- [ ] 插嘴 QUICK_JAB（需要时长限制）

### Phase 3：南昌话上线 ⏳ 30%
- [x] 规则/词表改写
- [ ] 录素材 → GPT-SoVITS 南昌声线
- [ ] 南昌话文本 + 南昌 voice 组合

### Phase 4：多语言扩展 ⏳ 40%
- [x] 目标语直出短句（部分实现）
- [ ] 不自然则接本地轻量翻译
- [ ] 加对应语言 TTS 声线

### Phase 5：吵架王训练 ⏳ 0%
- [ ] 300~500条高质量互怼样本（含civility）
- [ ] QLoRA SFT学风格
- [ ] DPO偏好优化学节奏

## 🔧 下一步行动

### 立即可以做的（不需要显卡）

1. **集成DialogueScheduler和ttsAudioService**
   - 修改 `multiChannelVoiceService` 使用 `DialogueScheduler`
   - 或者创建新的集成层

2. **实现QUICK_JAB时长限制**
   - 在 `DialogueScheduler.submit()` 中检查文本长度
   - 超过1.5秒的QUICK_JAB拒绝或截断

3. **优化主吵架声像**
   - 在对话开始时识别主吵架双方
   - 动态设置pan值为 -0.35 和 +0.35

4. **实现长吵架分段播放**
   - 在LLM生成台词时检测长度（>40字）
   - 调用BeatsGenerator生成节拍
   - 按节拍分段TTS和播放

### 需要显卡的

1. **南昌话LoRA训练**
2. **GPT-SoVITS南昌声线训练**
3. **吵架王风格训练**

---

**最后更新**：2025-01-25  
**状态**：核心功能已实现，集成和优化待完成

