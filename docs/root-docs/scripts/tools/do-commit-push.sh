#!/bin/bash

# 提交并推送代码

echo "📝 检查Git状态..."
git status --short

echo ""
echo "📦 添加所有更改的文件..."
git add -A

echo ""
echo "💾 提交更改..."
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

echo ""
echo "🚀 推送到远程仓库..."
git push origin main

echo ""
echo "✅ 完成！"

