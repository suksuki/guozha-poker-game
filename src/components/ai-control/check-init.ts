/**
 * 初始化检查工具
 * 在浏览器控制台运行此代码来诊断初始化问题
 */

export function checkAIControlInit() {
  console.log('=== AI中控系统初始化诊断 ===');
  
  try {
    // 1. 检查SystemApplication
    const { SystemApplication } = require('../../services/system/SystemApplication');
    const systemApp = SystemApplication.getInstance();
    const systemStatus = systemApp.getStatus();
    
    console.log('1. SystemApplication状态:');
    console.log('  - 已初始化:', systemStatus.initialized);
    console.log('  - 已启动:', systemStatus.started);
    console.log('  - 模块数:', Object.keys(systemStatus.modules).length);
    console.log('  - 错误数:', systemStatus.errors.length);
    
    if (systemStatus.errors.length > 0) {
      console.error('  - 错误列表:');
      systemStatus.errors.forEach(err => {
        console.error(`    ${err.module}: ${err.error.message}`);
        console.error(`    堆栈:`, err.error.stack);
      });
    }
    
    // 2. 检查AIControlModule
    const aiControlModule = systemApp.getModule('ai-control');
    console.log('\n2. AIControlModule状态:');
    if (aiControlModule) {
      const moduleStatus = aiControlModule.getStatus();
      console.log('  - 已注册: ✅');
      console.log('  - 已初始化:', moduleStatus.initialized ? '✅' : '❌');
      console.log('  - 已启用:', moduleStatus.enabled ? '✅' : '❌');
      
      if (moduleStatus.initialized) {
        const aiControl = aiControlModule.getAIControl();
        console.log('  - AIControlCenter实例:', aiControl ? '✅' : '❌');
        if (aiControl) {
          const monitorLayer = aiControl.getMonitorLayer();
          console.log('  - MonitorLayer:', monitorLayer ? '✅' : '❌');
        }
      }
    } else {
      console.error('  - 未找到模块: ❌');
      console.error('  请检查registerModules.ts中是否注册了AIControlModule');
    }
    
    // 3. 检查AIControlCenter
    const { AIControlCenter } = require('../../services/ai/control/AIControlCenter');
    const aiControl = AIControlCenter.getInstance();
    console.log('\n3. AIControlCenter状态:');
    const monitorLayer = aiControl.getMonitorLayer();
    console.log('  - 实例存在: ✅');
    console.log('  - MonitorLayer:', monitorLayer ? '✅ 存在' : '❌ 不存在');
    
    // 4. 检查InteractionService
    const { getInteractionService } = require('../../services/ai/control/interaction/InteractionService');
    const interactionService = getInteractionService();
    const status = interactionService.getSystemStatus();
    console.log('\n4. InteractionService状态:');
    console.log('  - 已初始化:', status.initialized ? '✅' : '❌');
    console.log('  - 监控中:', status.monitoring ? '✅' : '❌');
    
    // 5. 总结
    console.log('\n=== 诊断总结 ===');
    if (!systemStatus.initialized) {
      console.error('❌ SystemApplication未初始化');
      console.log('建议: 检查App.tsx中的initSystemApplication函数');
    } else if (!aiControlModule) {
      console.error('❌ AIControlModule未注册');
      console.log('建议: 检查registerModules.ts');
    } else if (!aiControlModule.getStatus().initialized) {
      console.error('❌ AIControlModule未初始化');
      console.log('建议: 查看上面的错误信息');
    } else if (!monitorLayer) {
      console.error('❌ AIControlCenter未完全初始化');
      console.log('建议: 检查AIControlCenter.initialize()是否成功');
    } else {
      console.log('✅ 所有检查通过，系统应该正常工作');
    }
    
  } catch (error: any) {
    console.error('❌ 诊断过程出错:', error);
    console.error('堆栈:', error.stack);
  }
  
  console.log('\n=== 诊断完成 ===');
}

// 如果在浏览器控制台，可以直接调用
if (typeof window !== 'undefined') {
  (window as any).checkAIControlInit = checkAIControlInit;
  console.log('💡 提示: 在控制台运行 checkAIControlInit() 来诊断初始化问题');
}

