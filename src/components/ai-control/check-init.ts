/**
 * 初始化检查工具
 * 在浏览器控制台运行此代码来诊断初始化问题
 */

export function checkAIControlInit() {
  
  try {
    // 1. 检查SystemApplication
    const { SystemApplication } = require('../../services/system/SystemApplication');
    const systemApp = SystemApplication.getInstance();
    const systemStatus = systemApp.getStatus();
    
    if (systemStatus.errors.length > 0) {
      systemStatus.errors.forEach(err => {
      });
    }
    
    // 2. 检查AIControlModule
    const aiControlModule = systemApp.getModule('ai-control');
    if (aiControlModule) {
      const moduleStatus = aiControlModule.getStatus();
      
      if (moduleStatus.initialized) {
        const aiControl = aiControlModule.getAIControl();
        if (aiControl) {
          const monitorLayer = aiControl.getMonitorLayer();
        }
      }
    } else {
    }
    
    // 3. 检查AIControlCenter
    const { AIControlCenter } = require('../../services/ai/control/AIControlCenter');
    const aiControl = AIControlCenter.getInstance();
    const monitorLayer = aiControl.getMonitorLayer();
    
    // 4. 检查InteractionService
    const { getInteractionService } = require('../../services/ai/control/interaction/InteractionService');
    const interactionService = getInteractionService();
    const status = interactionService.getSystemStatus();
    
    // 5. 总结
    if (!systemStatus.initialized) {
    } else if (!aiControlModule) {
    } else if (!aiControlModule.getStatus().initialized) {
    } else if (!monitorLayer) {
    } else {
    }
    
  } catch (error: any) {
  }
  
}

// 如果在浏览器控制台，可以直接调用
if (typeof window !== 'undefined') {
  (window as any).checkAIControlInit = checkAIControlInit;
}

