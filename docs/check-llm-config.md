# 🔍 检查 LLM 配置是否保存

## 快速诊断命令

在浏览器控制台（F12）粘贴运行：

```javascript
console.clear();
console.log('================================');
console.log('🔍 LLM 配置检查');
console.log('================================\n');

// 1. 检查模型配置
const llmModel = localStorage.getItem('llmModel');
console.log('📦 LLM 模型:', llmModel || '❌ 未保存');

// 2. 检查启用状态
const llmEnabled = localStorage.getItem('llmEnabled');
console.log('🔘 LLM 启用:', llmEnabled || '❌ 未保存');

// 3. 检查服务器配置
const serversData = localStorage.getItem('ollama_servers');
if (serversData) {
  try {
    const servers = JSON.parse(serversData);
    console.log('\n🖥️  服务器配置:');
    console.log('   - 服务器总数:', servers.servers?.length || 0);
    console.log('   - 当前服务器ID:', servers.currentServerId);
    
    const current = servers.servers?.find(s => s.id === servers.currentServerId);
    if (current) {
      console.log('   - 当前地址:', `${current.protocol}://${current.host}:${current.port}`);
      console.log('   - 当前名称:', current.name);
    }
    
    console.log('\n📋 所有服务器:');
    servers.servers?.forEach((s, i) => {
      const marker = s.id === servers.currentServerId ? '👉' : '  ';
      console.log(`   ${marker} ${i+1}. ${s.name} (${s.host}:${s.port})`);
    });
  } catch (e) {
    console.log('❌ 服务器配置解析失败:', e.message);
  }
} else {
  console.log('\n❌ 未找到服务器配置');
}

// 4. 检查 localStorage 大小
let total = 0;
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    const item = localStorage.getItem(key);
    if (item) total += item.length;
  }
}
console.log('\n💾 存储使用:', `${(total/1024).toFixed(2)} KB / 5120 KB`);

console.log('\n================================');
if (llmModel && serversData) {
  console.log('✅ 配置正常保存！');
} else {
  console.log('⚠️  配置可能未保存，请检查！');
}
console.log('================================');
```

## 预期结果

### ✅ 正常情况
```
🔍 LLM 配置检查
================================
📦 LLM 模型: qwen2.5:3b
🔘 LLM 启用: true

🖥️  服务器配置:
   - 服务器总数: 2
   - 当前服务器ID: custom_1234567890
   - 当前地址: http://192.168.0.13:11434
   - 当前名称: 局域网服务器

📋 所有服务器:
     1. 本地服务器 (localhost:11434)
   👉 2. 局域网服务器 (192.168.0.13:11434)

💾 存储使用: 2.34 KB / 5120 KB

✅ 配置正常保存！
```

### ❌ 配置丢失
```
📦 LLM 模型: ❌ 未保存
❌ 未找到服务器配置

⚠️  配置可能未保存，请检查！
```

## 🔧 如果配置未保存

### 方法 1：手动保存配置

```javascript
// 保存模型
localStorage.setItem('llmModel', 'qwen2.5:3b');

// 启用 LLM
localStorage.setItem('llmEnabled', 'true');

// 保存服务器配置
const serverConfig = {
  servers: [
    {
      id: 'local',
      name: '本地服务器',
      host: 'localhost',
      port: 11434,
      protocol: 'http',
      isFavorite: true
    },
    {
      id: 'custom_' + Date.now(),
      name: '局域网服务器',
      host: '192.168.0.13',
      port: 11434,
      protocol: 'http',
      isFavorite: true,
      lastUsed: Date.now()
    }
  ],
  currentServerId: 'custom_' + Date.now()
};

localStorage.setItem('ollama_servers', JSON.stringify(serverConfig));

console.log('✅ 手动保存完成，请刷新页面');
```

### 方法 2：检查浏览器设置

1. **检查是否在隐私/无痕模式**
   - 隐私模式下 localStorage 可能被禁用

2. **检查浏览器 localStorage 权限**
   - Chrome: 设置 → 隐私和安全 → Cookie → 允许所有 Cookie

3. **清除损坏的数据**
   ```javascript
   // 清除所有 LLM 相关配置
   localStorage.removeItem('llmModel');
   localStorage.removeItem('llmEnabled');
   localStorage.removeItem('ollama_servers');
   
   // 刷新页面重新配置
   location.reload();
   ```

## 📝 测试保存功能

### 测试步骤：

1. **打开游戏配置**
2. **选择服务器**: 192.168.0.13
3. **选择模型**: qwen2.5:3b
4. **在控制台运行**:
   ```javascript
   console.log('模型:', localStorage.getItem('llmModel'));
   ```
   应该立即显示: `qwen2.5:3b`

5. **刷新页面** (F5)
6. **再次检查**:
   ```javascript
   console.log('模型:', localStorage.getItem('llmModel'));
   ```
   应该仍然显示: `qwen2.5:3b`

## 🐛 已知问题

### 问题 1：每次刷新配置丢失
**原因**：浏览器不支持 localStorage 或被禁用
**解决**：检查浏览器设置，启用 Cookie 和本地存储

### 问题 2：配置部分丢失
**原因**：localStorage 配额超出
**解决**：运行清理命令（见 `docs/emergency-storage-fix.md`）

### 问题 3：配置显示错误
**原因**：缓存的旧数据
**解决**：
```javascript
localStorage.clear();
location.reload();
```

## ✅ 验证清单

配置保存成功应该满足：

- [ ] `localStorage.getItem('llmModel')` 返回你选择的模型
- [ ] `localStorage.getItem('llmEnabled')` 返回 `"true"`
- [ ] `localStorage.getItem('ollama_servers')` 包含服务器配置
- [ ] 刷新页面后配置保持不变
- [ ] 游戏中 AI 使用正确的模型和服务器

---

**如果以上步骤都无效，请提供诊断命令的完整输出！**

