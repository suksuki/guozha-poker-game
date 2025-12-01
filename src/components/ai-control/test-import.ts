/**
 * 快速导入测试
 * 验证所有组件能否正常导入
 */

// 测试主组件导入
try {
  const { AIControlDashboard } = require('./AIControlDashboard');
  console.log('✅ AIControlDashboard 导入成功');
} catch (error) {
  console.error('❌ AIControlDashboard 导入失败:', error);
}

// 测试优化中心导入
try {
  const { OptimizationCenter } = require('./OptimizationCenter');
  console.log('✅ OptimizationCenter 导入成功');
} catch (error) {
  console.error('❌ OptimizationCenter 导入失败:', error);
}

// 测试数据中心导入
try {
  const { DataCenter } = require('./DataCenter');
  console.log('✅ DataCenter 导入成功');
} catch (error) {
  console.error('❌ DataCenter 导入失败:', error);
}

// 测试知识库导入
try {
  const { KnowledgeBase } = require('./KnowledgeBase');
  console.log('✅ KnowledgeBase 导入成功');
} catch (error) {
  console.error('❌ KnowledgeBase 导入失败:', error);
}

// 测试设置中心导入
try {
  const { SettingsCenter } = require('./SettingsCenter');
  console.log('✅ SettingsCenter 导入成功');
} catch (error) {
  console.error('❌ SettingsCenter 导入失败:', error);
}

console.log('\n🎉 所有组件导入测试完成！');

