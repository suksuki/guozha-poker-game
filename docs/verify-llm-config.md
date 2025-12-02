# 验证 LLM 配置保存

## ✅ 已修复的问题

1. **LLM 模型选择** - 现在会保存到 localStorage
2. **LLM 启用状态** - 保存开关状态
3. **服务器选择** - 通过 OllamaServerManager 持久化
4. **配置同步** - 自动同步到 chatService

## 🧪 验证步骤

### 1. 检查当前保存的配置

在浏览器控制台（F12）运行：

```javascript
// 查看所有 LLM 相关配置
console.log('LLM 模型:', localStorage.getItem('llmModel'));
console.log('LLM 启用:', localStorage.getItem('llmEnabled'));
console.log('服务器配置:', JSON.parse(localStorage.getItem('ollama_servers')));
```

### 2. 测试配置保存

#### 步骤 A：选择模型
1. 打开游戏配置 → 聊天/语音配置
2. 选择一个模型（如 `qwen2:1.5b`）
3. 刷新页面 (F5)
4. 重新打开配置，检查模型是否还是你选择的

#### 步骤 B：切换服务器
1. 添加远程服务器 (192.168.0.13)
2. 切换到该服务器
3. 刷新页面 (F5)
4. 检查当前服务器是否保持

#### 步骤 C：测试 LLM 开关
1. 禁用 LLM 功能
2. 刷新页面 (F5)
3. 检查 LLM 是否仍然禁用

### 3. 验证配置生效

在浏览器控制台运行：

```javascript
// 检查配置是否正确加载
setTimeout(() => {
  console.log('当前使用的模型:', localStorage.getItem('llmModel'));
  console.log('预期结果: 应该是你选择的模型名称');
}, 2000);
```

## 🔧 如果配置仍然丢失

### 手动设置配置

```javascript
// 设置模型
localStorage.setItem('llmModel', 'qwen2:1.5b');

// 启用 LLM
localStorage.setItem('llmEnabled', 'true');

// 刷新页面
location.reload();
```

### 检查 localStorage 配额

```javascript
// 检查是否有空间
let total = 0;
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    const item = localStorage.getItem(key);
    if (item) total += item.length;
  }
}
console.log(`localStorage 使用: ${(total/1024).toFixed(2)} KB / 5120 KB`);
```

## 📝 配置说明

### 保存的配置项

1. **`llmModel`** - 当前选择的模型名称
   - 示例: `"qwen2:1.5b"`
   - 位置: localStorage

2. **`llmEnabled`** - LLM 功能开关
   - 值: `"true"` 或 `"false"`
   - 位置: localStorage

3. **`ollama_servers`** - 服务器配置
   - 格式: JSON 对象
   - 包含: 所有服务器、当前服务器ID
   - 位置: localStorage

### 配置优先级

1. **localStorage** - 用户保存的配置（最高优先级）
2. **默认值** - 如果 localStorage 为空，使用 `qwen2:0.5b`

## ✨ 新功能

### 自动配置同步

配置会自动同步到：
- ✅ chatService（聊天生成）
- ✅ LLMChatStrategy（LLM 策略）
- ✅ GameConfigPanel（UI 显示）

### 配置触发时机

配置会在以下时机更新：
1. 应用启动时（从 localStorage 加载）
2. 用户选择模型时（立即保存）
3. 切换服务器时（更新 API URL）
4. 开始游戏时（同步到 chatService）

## 🎯 预期行为

### 正常情况

1. **首次使用**
   - 默认模型: `qwen2:0.5b`
   - 默认服务器: localhost:11434
   - LLM 启用: true

2. **选择模型后**
   - 立即保存到 localStorage
   - UI 显示更新
   - chatService 配置更新

3. **刷新页面后**
   - 自动加载保存的模型
   - 自动加载保存的服务器
   - UI 显示正确的配置

### 异常情况

如果配置丢失，可能原因：
- localStorage 被清除（隐私模式）
- localStorage 配额超出
- 浏览器不支持 localStorage

## 🐛 调试命令

```javascript
// 完整的配置诊断
console.log('=== LLM 配置诊断 ===');
console.log('1. 模型:', localStorage.getItem('llmModel') || '未设置');
console.log('2. 启用:', localStorage.getItem('llmEnabled') || '未设置');
console.log('3. 服务器配置:');
try {
  const servers = JSON.parse(localStorage.getItem('ollama_servers'));
  console.log('   - 服务器数量:', servers?.servers?.length || 0);
  console.log('   - 当前服务器:', servers?.currentServerId || '未设置');
  const current = servers?.servers?.find(s => s.id === servers?.currentServerId);
  if (current) {
    console.log('   - 当前地址:', `${current.protocol}://${current.host}:${current.port}`);
  }
} catch (e) {
  console.log('   - 解析失败:', e.message);
}
console.log('===================');
```

## ✅ 验证成功标志

配置保存成功后，你应该看到：

1. **刷新页面后**
   - 模型选择保持不变
   - 服务器选择保持不变
   - LLM 开关状态保持不变

2. **开始游戏后**
   - AI 使用正确的模型聊天
   - 连接到正确的服务器

3. **浏览器控制台**
   - 无配置相关错误
   - localStorage 有对应的键值

