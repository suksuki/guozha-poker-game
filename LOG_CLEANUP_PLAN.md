# 日志清理方案

## 📊 当前日志统计

| 类型 | 数量 | 分布 |
|------|------|------|
| **总计** | 1294个 | 145个文件 |
| `console.log` | 735个 | 102个文件 |
| `console.warn` | ~300个 | 估计 |
| `console.error` | ~250个 | 估计 |
| 其他 | ~9个 | debug/info |

---

## 🎯 清理策略建议

### 方案A：智能清理（推荐）⭐

**保留**：
- ✅ `console.error` - 错误追踪（生产环境需要）
- ✅ `console.warn` - 重要警告（可选保留）

**移除**：
- ❌ `console.log` - 调试日志（735个）
- ❌ `console.debug` - 调试日志
- ❌ `console.info` - 信息日志

**优点**：
- 保留错误追踪能力
- 清理调试日志
- 减少约57%的日志输出

---

### 方案B：完全清理

**移除**：
- ❌ 所有 `console.*` 调用（1294个）

**优点**：
- 彻底清理
- 最小的控制台输出

**缺点**：
- ❌ 失去错误追踪
- ❌ 生产问题难以调试
- ❌ 工作量大

---

### 方案C：条件编译（最佳实践）

使用环境变量控制日志：

```typescript
// src/utils/logger.ts
const isDev = import.meta.env.DEV;

export const logger = {
  log: (...args: any[]) => {
    if (isDev) console.log(...args);
  },
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  error: (...args: any[]) => {
    console.error(...args); // 总是输出错误
  }
};
```

**优点**：
- ✅ 开发环境：完整日志
- ✅ 生产环境：自动禁用
- ✅ 保留错误追踪
- ✅ 一次性配置

**缺点**：
- ❌ 需要替换所有console调用
- ❌ 工作量最大

---

## 💡 我的建议

### 推荐：方案A（智能清理）

**原因**：
1. **快速见效** - 移除735个console.log
2. **保留关键** - 保留error和warn用于调试
3. **平衡实用** - 兼顾清理和可维护性

### 实施步骤

1. **批量移除console.log**
   ```bash
   # 使用自动化工具移除所有console.log
   ```

2. **保留重要日志**
   - console.error保留（错误追踪）
   - console.warn可选保留（警告信息）

3. **特殊处理**
   - 测试文件的日志保留
   - 关键功能的错误日志保留

---

## 🚨 需要确认

请确认您希望使用哪个方案：

### 选项1：智能清理（推荐）
- 移除所有 `console.log`（735个）
- 保留 `console.error` 和 `console.warn`
- 预计清理时间：5-10分钟

### 选项2：完全清理
- 移除所有 `console.*`（1294个）
- 包括error和warn
- 预计清理时间：10-15分钟

### 选项3：条件编译
- 创建logger工具
- 替换所有console调用
- 预计清理时间：30-60分钟

---

## ⚡ 快速清理命令（仅供参考）

如果选择完全清理，可以使用：

```bash
# 移除所有console.log
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' '/console\.log/d'

# 移除所有console调用
find src -name "*.ts" -o -name "*.tsx" | xargs sed -i '' '/console\./d'
```

**⚠️ 警告**：直接使用sed命令可能会误删代码，建议人工审核。

---

## 🎯 推荐行动

1. **选择方案A（智能清理）**
2. **保留关键错误日志**
3. **测试验证功能正常**
4. **准备推送代码**

请告诉我您选择哪个方案，我会立即开始清理！

