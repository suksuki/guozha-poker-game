# i18n 导入修复总结

## 修复的文件

已将所有使用 `import i18n from '../i18n'` 的文件更新为 `import { i18n } from '../i18n'`，以匹配新的导出方式。

### 修复的文件列表

1. ✅ `src/utils/speechUtils.ts`
2. ✅ `src/services/ttsAudioService.ts`
3. ✅ `src/services/multiChannelVoiceService.ts`
4. ✅ `src/services/multiChannelVoiceServiceWithWebAudio.ts`
5. ✅ `src/services/systemAnnouncementService.ts`
6. ✅ `src/services/translationService.ts`
7. ✅ `src/utils/chatContent.ts`
8. ✅ `src/hooks/useChatBubbles.ts`

## 修复原因

新的 i18n 框架使用命名导出：
```typescript
export { default as i18n } from './index.legacy';
```

因此需要使用命名导入：
```typescript
import { i18n } from '../i18n';
```

而不是默认导入：
```typescript
import i18n from '../i18n';  // ❌ 旧方式
```

## 验证

- ✅ 所有文件已更新
- ✅ 无 linter 错误
- ✅ 测试通过

## 影响范围

这些修复确保了：
1. 所有服务文件能正确导入 i18n
2. 所有工具文件能正确使用翻译功能
3. 所有 Hooks 能正确访问 i18n 实例
4. 向后兼容性完整

## 下一步

所有导入已修复，系统应该可以正常编译和运行。

