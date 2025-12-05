# LLM 服务器选择器集成说明

## 更新日期
2025-12-03

## 概述
已将 `ServerSelector` 组件成功集成到 `GameConfigPanel` 中，现在用户可以像管理 TTS 服务器一样管理 LLM (Ollama) 服务器。

## 修改的文件

### 1. `src/components/game/GameConfigPanel.tsx`
**改动**：
- 引入 `ServerSelector` 组件和 `OllamaServerManager`
- 添加服务器管理状态（currentServer, allServers）
- 添加服务器管理处理函数：
  - `handleServerChange` - 切换服务器
  - `handleAddServer` - 添加新服务器
  - `handleRemoveServer` - 删除服务器
  - `handleToggleFavorite` - 收藏/取消收藏
  - `handleCheckServer` - 检查服务器可用性
- 将简单的 API URL 输入框替换为完整的 `ServerSelector` 组件
- 服务器切换时自动更新 API URL

### 2. `src/utils/llmModelService.ts`
**改动**：
- 修改 `getAvailableOllamaModels(baseUrl?)` 支持自定义服务器地址
- 修改 `checkOllamaService(baseUrl?)` 支持自定义服务器地址
- 默认值保持为 `http://localhost:11434` 以确保向后兼容

## 新功能

### 服务器管理
用户现在可以：
1. ✅ **添加服务器**：
   - 本地服务器（localhost）
   - 局域网服务器（192.168.x.x）
   - 自定义服务器（任意地址）

2. ✅ **查看服务器状态**：
   - 可用性检查
   - 延迟显示
   - 最后使用时间

3. ✅ **管理服务器**：
   - 切换当前服务器
   - 删除不需要的服务器
   - 收藏常用服务器
   - 查看最近使用的服务器

4. ✅ **自动刷新模型列表**：
   - 切换服务器时自动加载该服务器的模型列表
   - 点击刷新按钮时从当前服务器重新获取

### UI 位置
在游戏配置面板的"聊天配置"部分：
```
游戏配置面板
  └─ 聊天配置 (Chat)
      ├─ LLM 服务状态
      ├─ 模型选择
      ├─ Ollama 服务器 ← 新增！
      │   └─ ServerSelector 组件
      └─ 测试窗口
```

## 使用流程

### 添加局域网服务器
1. 打开"聊天配置"
2. 在 Ollama 服务器部分，选择"局域网服务器"
3. 输入 IP（如 `0.13` 会自动补全为 `192.168.0.13`）
4. 输入端口（默认 11434）
5. 点击"添加"
6. 系统自动检测可用性并切换到新服务器

### 切换服务器
1. 在已添加的服务器列表中点击想要使用的服务器
2. API URL 自动更新
3. 模型列表自动刷新

## 数据持久化
- 服务器配置保存在 `localStorage` 中（键：`ollama_servers`）
- 包括：
  - 所有服务器配置
  - 当前选择的服务器
  - 收藏状态
  - 最后使用时间

## 向后兼容性
- 如果没有保存的配置，默认使用本地服务器（localhost:11434）
- 现有的 API URL 输入仍然显示在服务器选择器下方
- 所有现有功能保持不变

## 与 TTS 配置的一致性
现在 LLM 和 TTS 的配置体验完全一致：
- 相同的服务器管理界面
- 相同的交互方式
- 相同的持久化机制

## 测试建议

### 手动测试步骤
1. **测试本地服务器**：
   - 启动本地 Ollama 服务
   - 刷新模型列表
   - 验证模型正常显示

2. **测试添加局域网服务器**：
   - 添加 `192.168.0.13:11434`
   - 验证健康检查
   - 验证模型列表

3. **测试切换服务器**：
   - 在多个服务器间切换
   - 验证 API URL 自动更新
   - 验证模型列表自动刷新

4. **测试删除服务器**：
   - 删除非当前服务器
   - 删除当前服务器（应自动切换到默认服务器）

5. **测试持久化**：
   - 添加几个服务器
   - 刷新浏览器
   - 验证配置保留

## 相关文件
- `src/components/llm/ServerSelector.tsx` - 服务器选择器组件
- `src/services/llm/OllamaServerManager.ts` - 服务器管理服务
- `tests/services/llm/OllamaServerManager.test.ts` - 单元测试

## 已知问题
无

## 后续改进建议
1. 添加服务器健康状态实时监控
2. 支持批量导入/导出服务器配置
3. 添加服务器性能统计（响应时间、成功率等）

