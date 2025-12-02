# 紧急 localStorage 修复指南

## 🚨 问题：localStorage 配额超出

如果遇到以下错误：
```
QuotaExceededError: Failed to execute 'setItem' on 'Storage': Setting the value of 'ollama_servers' exceeded the quota.
```

## 🔧 快速修复方法

### 方法 1：浏览器控制台命令（推荐）

1. 打开浏览器开发者工具（F12）
2. 切换到 Console 标签
3. 复制粘贴以下命令并回车：

```javascript
// 清理 ollama_servers 数据
localStorage.removeItem('ollama_servers');

// 检查其他大数据
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    const item = localStorage.getItem(key);
    if (item && item.length > 50 * 1024) {
      console.log(`Large item: ${key} (${(item.length / 1024).toFixed(2)} KB)`);
      localStorage.removeItem(key);
    }
  }
}

// 刷新页面
location.reload();
```

### 方法 2：手动清理指定项

```javascript
// 只清理 ollama_servers
localStorage.removeItem('ollama_servers');
location.reload();
```

### 方法 3：完全重置（谨慎使用）

```javascript
// ⚠️ 这会清除所有游戏配置
localStorage.clear();
location.reload();
```

## 📊 检查 localStorage 使用情况

在控制台运行：

```javascript
let total = 0;
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    const item = localStorage.getItem(key);
    if (item) {
      const size = item.length / 1024;
      console.log(`${key}: ${size.toFixed(2)} KB`);
      total += size;
    }
  }
}
console.log(`Total: ${total.toFixed(2)} KB / ~5120 KB (${(total/5120*100).toFixed(1)}%)`);
```

## 🛠️ 已实施的修复措施

应用现在包含以下自动修复机制：

### 1. 启动时自动清理
- 检测超过 100KB 的 ollama_servers 数据并清除
- 自动清理损坏的配置

### 2. 保存时限制
- 最多保存 20 个服务器
- 优先保留：本地服务器、收藏的服务器、最近使用的
- 超过 1MB 时自动减少到 10 个服务器
- 配额超出时紧急降级到 5 个服务器

### 3. 数据大小检查
- 保存前检查 JSON 大小
- 超限时自动精简数据

## 🔍 诊断工具

应用已内置存储健康检查，在启动时自动运行。

在控制台查看输出：
```
localStorage usage: X.XX MB / 5.00 MB (XX.X%)
```

## 📝 预防措施

### 避免超出配额：
1. **定期清理**：删除不常用的服务器
2. **限制数量**：不要添加超过 15 个服务器
3. **收藏管理**：只收藏真正常用的服务器

### 最佳实践：
- 保留 3-5 个常用服务器即可
- 定期检查 localStorage 使用情况
- 不要在游戏中存储大量数据

## 🐛 如果问题仍然存在

### 检查其他应用数据：

```javascript
// 列出所有存储项
const items = [];
for (let key in localStorage) {
  if (localStorage.hasOwnProperty(key)) {
    const item = localStorage.getItem(key);
    if (item) {
      items.push({
        key: key,
        size: item.length / 1024
      });
    }
  }
}
items.sort((a, b) => b.size - a.size);
console.table(items);
```

### 手动清理特定项：

```javascript
// 清理训练结果
localStorage.removeItem('training_results');

// 清理聊天历史
localStorage.removeItem('chat_history');

// 清理游戏配置
localStorage.removeItem('game_config');
```

## 📞 联系支持

如果以上方法都无法解决问题，请：
1. 记录控制台的完整错误信息
2. 运行诊断工具并记录输出
3. 报告问题时附上以上信息

## ✅ 验证修复

修复后验证：
1. 刷新页面 (F5)
2. 打开游戏配置
3. 尝试添加/切换服务器
4. 检查控制台无错误

正常情况下应该看到：
```
localStorage usage: < 1 MB / 5.00 MB (< 20%)
```

