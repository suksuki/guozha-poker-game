# 更新日志

## [2024-12-19] - UI优化、声道分配修复、测试完善

### 新增功能
- ✨ 真实扑克牌样式UI（左上角/右下角数字+花色，中间大花色图案）
- ✨ Joker特殊样式（黑色背景、金色文字）

### 修复
- 🐛 **修复报牌和聊天声道冲突问题**
  - 报牌独占ANNOUNCEMENT声道（中央声道）
  - 所有聊天消息（包括系统消息）使用玩家声道（PLAYER_0-PLAYER_7）
  - 报牌和聊天可以同时播放，互不干扰
- 🐛 修复`playAudioBuffer`方法忽略传入channel参数的问题

### 改进
- 🧹 清理不必要的调试日志，保留关键错误和状态日志
- 📝 创建全面的自动化测试套件
  - 新增`comprehensive.test.ts`（26个测试用例）
  - 新增`tts-channel-allocation.test.ts`（TTS声道分配测试）
  - 新增`card-announcement-sync.test.ts`（报牌同步测试）
  - 新增测试文档`docs/tests/README.md`

### 技术细节
- **声道分配规则**：
  - 报牌：`ChannelType.ANNOUNCEMENT`，优先级4，独占
  - 聊天：`ChannelType.PLAYER_0`到`PLAYER_7`，优先级1-3，共享
- **报牌同步机制**：
  - 使用回调机制（`onAudioGenerated`）
  - 在音频完全播放完成后触发（`onEnd`回调中）
  - 确保游戏流程在报牌完成后才继续

### 测试
- 总测试文件：32个
- 通过测试：198个
- 测试覆盖：游戏核心、TTS、多声道、设置、AI Brain、聊天等

### 文档
- 新增`docs/daily-updates/2024-12-19-improvements.md`（详细改进记录）
- 更新`docs/tests/README.md`（测试文档）

---

## 测试运行

```bash
# 运行所有测试
npm test

# 运行全面测试套件
npm test -- comprehensive.test.ts

# 运行TTS声道分配测试
npm test -- tts-channel-allocation.test.ts

# 运行报牌同步测试
npm test -- card-announcement-sync.test.ts
```

