# Git 提交和推送命令

由于终端环境问题，请手动执行以下命令：

## 方法1：使用脚本（推荐）

```bash
chmod +x do-commit-push.sh
bash do-commit-push.sh
```

## 方法2：手动执行命令

```bash
# 1. 添加所有更改
git add -A

# 2. 提交更改
git commit -m "修复 @broken 测试：chatService、chatSystem 和 dealingManualMode

- 修复 chatService.test.ts：更新 Mock 策略以支持 llm 和 rule-based，修正 generateTaunt 参数，修正 SCORE_STOLEN 事件类型期望
- 修复 chatSystem.test.ts：应用相同的 Mock 策略修复，修正对骂测试逻辑
- 修复 dealingManualMode.test.ts：添加完整的 i18n mock（包括 initReactI18next），更新 useTranslation 返回实际翻译文本，修正所有文本匹配，增加等待时间和超时时间
- 创建 ASYNC_TIMEOUT_TESTING_GUIDE.md：异步和超时测试最佳实践指南
- 更新 TEST_CATEGORIES.md：添加测试最佳实践引用

所有修复遵循异步测试最佳实践：
- 使用 vi.useFakeTimers() 和 vi.advanceTimersByTimeAsync()
- 使用 findBy* 自动等待
- 使用 act() 包装状态更新
- 精确控制时间，避免无限循环"

# 3. 推送到远程仓库
git push origin main
```

## 已更新的文件

- `.git/config` - 已更新 GitHub token
- `do-commit-push.sh` - 提交和推送脚本

## 修改的文件列表

1. `tests/chatService.test.ts` - 修复 Mock 策略和异步测试
2. `tests/chatSystem.test.ts` - 修复 Mock 策略和异步测试
3. `tests/dealingManualMode.test.ts` - 修复 i18n mock 和文本匹配
4. `tests/ASYNC_TIMEOUT_TESTING_GUIDE.md` - 新增异步测试指南
5. `tests/TEST_CATEGORIES.md` - 更新测试分类文档

