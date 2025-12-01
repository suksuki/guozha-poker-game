/**
 * 初始化诊断组件
 * 用于调试初始化问题
 */

import React, { useEffect, useState } from 'react';
import { SystemApplication } from '../../services/system/SystemApplication';
import { AIControlCenter } from '../../services/ai/control/AIControlCenter';
import { getInteractionService } from '../../services/ai/control/interaction/InteractionService';

export const InitDiagnostic: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<string[]>([]);
  const [showDiagnostic, setShowDiagnostic] = useState(false);
  
  useEffect(() => {
    // 检查是否有初始化问题
    const checkDiagnostics = () => {
      const logs: string[] = [];
      
      try {
        // 1. 检查SystemApplication
        const systemApp = SystemApplication.getInstance();
        const systemStatus = systemApp.getStatus();
        logs.push(`SystemApplication: ${systemStatus.initialized ? '✅ 已初始化' : '❌ 未初始化'}`);
        logs.push(`SystemApplication Started: ${systemStatus.started ? '✅ 已启动' : '❌ 未启动'}`);
        
        // 2. 检查模块
        const modules = Object.keys(systemStatus.modules);
        logs.push(`已注册模块: ${modules.join(', ')}`);
        
        // 3. 检查AIControlModule
        const aiControlModule = systemApp.getModule('ai-control');
        if (aiControlModule) {
          const moduleStatus = aiControlModule.getStatus();
          logs.push(`AIControlModule: ${moduleStatus.initialized ? '✅ 已初始化' : '❌ 未初始化'}`);
          logs.push(`AIControlModule Enabled: ${moduleStatus.enabled ? '✅ 已启用' : '❌ 未启用'}`);
        } else {
          logs.push('AIControlModule: ❌ 未找到');
        }
        
        // 4. 检查AIControlCenter
        const aiControl = AIControlCenter.getInstance();
        const monitorLayer = aiControl.getMonitorLayer();
        logs.push(`AIControlCenter MonitorLayer: ${monitorLayer ? '✅ 存在' : '❌ 不存在'}`);
        
        // 5. 检查InteractionService
        const interactionService = getInteractionService();
        const status = interactionService.getSystemStatus();
        logs.push(`InteractionService Status: ${status.initialized ? '✅ 已初始化' : '❌ 未初始化'}`);
        
        // 6. 检查错误
        if (systemStatus.errors.length > 0) {
          logs.push(`❌ 错误数量: ${systemStatus.errors.length}`);
          systemStatus.errors.forEach(err => {
            logs.push(`  ❌ ${err.module}: ${err.error.message}`);
            if (err.error.stack) {
              logs.push(`     堆栈: ${err.error.stack.split('\n')[0]}`);
            }
          });
        } else {
          logs.push('✅ 无初始化错误');
        }
        
        // 7. 检查初始化顺序
        logs.push(`初始化顺序: ${modules.join(' → ')}`);
        
        // 8. 检查是否所有模块都已初始化
        const uninitializedModules = modules.filter(name => {
          const status = systemStatus.modules[name];
          return !status || !status.initialized;
        });
        if (uninitializedModules.length > 0) {
          logs.push(`⚠️ 未初始化模块: ${uninitializedModules.join(', ')}`);
        } else {
          logs.push('✅ 所有模块已初始化');
        }
        
      } catch (error: any) {
        logs.push(`诊断检查失败: ${error.message}`);
      }
      
      setDiagnostics(logs);
    };
    
    // 立即检查一次
    checkDiagnostics();
    
    // 每2秒检查一次
    const interval = setInterval(checkDiagnostics, 2000);
    
    return () => clearInterval(interval);
  }, []);
  
  if (!showDiagnostic) {
    return (
      <button
        onClick={() => setShowDiagnostic(true)}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          padding: '8px 12px',
          background: '#ffc107',
          color: '#000',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          fontSize: '12px',
          zIndex: 2001
        }}
        title="显示初始化诊断"
      >
        🔍 诊断
      </button>
    );
  }
  
  return (
    <div
      style={{
        position: 'fixed',
        bottom: '80px',
        right: '20px',
        width: '400px',
        maxHeight: '400px',
        background: '#2a2a2a',
        border: '1px solid #333',
        borderRadius: '10px',
        padding: '15px',
        color: '#e0e0e0',
        fontSize: '12px',
        zIndex: 2001,
        overflow: 'auto',
        boxShadow: '0 4px 15px rgba(0,0,0,0.3)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <h3 style={{ margin: 0, color: '#667eea' }}>初始化诊断</h3>
        <button
          onClick={() => setShowDiagnostic(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: '#999',
            cursor: 'pointer',
            fontSize: '16px'
          }}
        >
          ✕
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
        {diagnostics.map((log, i) => (
          <div key={i} style={{ padding: '5px', background: '#1e1e1e', borderRadius: '3px' }}>
            {log}
          </div>
        ))}
      </div>
    </div>
  );
};

