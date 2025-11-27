# 测试修复日志

## 2025-01-25 串行播放重构后的测试修复

### ✅ 已修复的问题

1. **SpeechSynthesisUtterance 未定义**
   - 问题：测试中 `SpeechSynthesisUtterance` 没有在全局定义
   - 修复：在所有测试文件中添加 `(global as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;`
   - 影响文件：
     - `tests/serialVoicePlayback.test.ts`
     - `tests/serialVoicePlaybackRegression.test.ts`
     - `tests/voiceServiceCleanup.test.ts`

2. **generateRandomVoiceConfig 导入路径错误**
   - 问题：`tests/chatAndVoiceRegression.test.ts` 中导入路径错误
   - 修复：从 `../src/utils/speechUtils` 改为 `../src/services/voiceConfigService`
   - 影响文件：`tests/chatAndVoiceRegression.test.ts`

3. **require 在 ES 模块中不工作**
   - 问题：`tests/voiceServiceCleanup.test.ts` 中使用 `require` 检查导出
   - 修复：改为使用动态 `import()` 或直接检查导入的对象
   - 影响文件：`tests/voiceServiceCleanup.test.ts`

4. **缺少定时器推进**
   - 问题：异步测试没有推进定时器，导致测试超时或失败
   - 修复：在所有异步测试中添加 `await vi.advanceTimersByTimeAsync()`
   - 影响文件：
     - `tests/serialVoicePlayback.test.ts`
     - `tests/serialVoicePlaybackRegression.test.ts`
     - `tests/voiceServiceCleanup.test.ts`

5. **triggerBigDunReaction 缺少 await**
   - 问题：`tests/chatAndVoiceRegression.test.ts` 中调用异步函数没有 await
   - 修复：添加 `await` 关键字
   - 影响文件：`tests/chatAndVoiceRegression.test.ts`

6. **事件回调使用错误**
   - 问题：优先级排序测试中使用 `.then()` 而不是 `onEnd` 回调
   - 修复：改为使用 `onEnd` 回调来记录事件
   - 影响文件：`tests/serialVoicePlayback.test.ts`

### ⚠️ 已知问题

1. **Mock 限制**
   - 由于使用 Mock 的 `speechSynthesis`，某些功能（如中断）可能无法完全模拟
   - 解决方案：测试重点验证逻辑正确性，而非完全模拟浏览器行为

2. **队列满测试可能不稳定**
   - 队列满时的丢弃逻辑可能因为定时器推进时间不够而不稳定
   - 解决方案：增加定时器推进时间，或调整测试断言

### 📝 测试运行建议

运行特定测试文件：
```bash
# 运行串行播放单元测试
npm test -- serialVoicePlayback.test.ts --run

# 运行串行播放回归测试
npm test -- serialVoicePlaybackRegression.test.ts --run

# 运行清理验证测试
npm test -- voiceServiceCleanup.test.ts --run
```

跳过异步测试（快速测试）：
```bash
npm test -- --exclude-tag @async
```

