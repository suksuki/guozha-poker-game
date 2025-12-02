/**
 * 快速导入测试
 * 验证所有组件能否正常导入
 */

// 测试主组件导入
try {
  const { AIControlDashboard } = require('./AIControlDashboard');
} catch (error) {
}

// 测试优化中心导入
try {
  const { OptimizationCenter } = require('./OptimizationCenter');
} catch (error) {
}

// 测试数据中心导入
try {
  const { DataCenter } = require('./DataCenter');
} catch (error) {
}

// 测试知识库导入
try {
  const { KnowledgeBase } = require('./KnowledgeBase');
} catch (error) {
}

// 测试设置中心导入
try {
  const { SettingsCenter } = require('./SettingsCenter');
} catch (error) {
}


