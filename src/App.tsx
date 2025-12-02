import { useEffect } from 'react';
import { MultiPlayerGameBoard } from './components/MultiPlayerGameBoard';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { IdeasManager } from './components/IdeasManager';
import { DesignDocManager } from './components/DesignDocManager';
import { TTSStatusMonitor } from './components/TTSStatusMonitor';
import { GameRulesGuide } from './components/GameRulesGuide';
import { CodeReviewManager } from './components/CodeReviewManager';
import { TestManagementManager } from './components/TestManagementManager';
import { SelfIterationManager } from './components/SelfIterationManager';
import { IdeaConfirmationDialog } from './components/IdeaConfirmationDialog';
import { AIControlDashboard } from './components/ai-control/AIControlDashboard';
import { useIdeaGeneration } from './hooks/useIdeaGeneration';
import { useGameConfigContext } from './contexts/GameConfigContext';
import { getIdeaGenerationService, GameIdea } from './services/ideaGenerationService';
import { initTTS, getTTSConfigFromEnv } from './tts/initTTS';
import { setTTSProvider } from './services/multiChannelVoiceService';
import { SystemApplication } from './services/system';
import { registerAllModules } from './services/system/modules/registerModules';
import { AIControlCenter } from './services/ai/control/AIControlCenter';
import './App.css';

function App() {
  // 获取游戏配置（包括想法生成开关）
  const gameConfig = useGameConfigContext();

  // 初始化系统应用模块
  useEffect(() => {
    let mounted = true;
    
    async function initSystemApplication() {
      try {
        const systemApp = SystemApplication.getInstance();
        
        // 注册所有模块
        registerAllModules(systemApp);
        
        // 初始化系统应用
        await systemApp.initialize();
        
        // 启动系统应用
        await systemApp.start();
        
        // 检查AI中控系统初始化状态
        try {
          const aiControlModule = systemApp.getModule('ai-control');
          if (aiControlModule) {
            const moduleStatus = aiControlModule.getStatus();
            if (mounted) {
              if (moduleStatus.initialized) {
              } else {
              }
            }
          } else {
            if (mounted) {
            }
          }
        } catch (error) {
        }
        
        if (mounted) {
          const finalStatus = systemApp.getStatus();
          
          // 详细输出每个模块的状态
          Object.entries(finalStatus.modules).forEach(([name, status]) => {
          });
          
          // 如果有错误，详细输出
          if (finalStatus.errors.length > 0) {
            finalStatus.errors.forEach(err => {
              if (err.error.stack) {
              }
            });
          }
        }
      } catch (error) {
        if (error instanceof Error) {
        }
      }
    }
    
    initSystemApplication();
    
    // 清理函数：组件卸载时不清理系统应用（因为是单例，其他组件可能在使用）
    return () => {
      mounted = false;
      // 如果需要在应用关闭时清理，可以在这里调用 shutdown
      // SystemApplication.getInstance().shutdown().catch(() => {});
    };
  }, []);

  // 初始化 TTS 系统
  useEffect(() => {
    const config = getTTSConfigFromEnv();
    
    // 配置 Azure Speech Service（如果提供了 Subscription Key）
    const azureKey = 
      import.meta.env.VITE_AZURE_SPEECH_KEY ||
      (typeof window !== 'undefined' && (window as any).AZURE_SPEECH_KEY) ||
      null;
    
    const azureRegion = 
      import.meta.env.VITE_AZURE_SPEECH_REGION ||
      (typeof window !== 'undefined' && (window as any).AZURE_SPEECH_REGION) ||
      'eastus';
    
    if (azureKey) {
      config.enableAzure = true;
      config.azureConfig = {
        subscriptionKey: azureKey,
        region: azureRegion,
        timeout: 30000,
        retryCount: 2,
      };
    } else {
    }
    
    initTTS(config).then(() => {
      // TTS 初始化完成后，设置默认场景配置
      // 报牌使用 Azure，聊天使用 Piper（在 TTSStatusMonitor 中配置）
      if (typeof window !== 'undefined') {
        if (!localStorage.getItem('tts_provider_announcement')) {
          localStorage.setItem('tts_provider_announcement', 'azure');
        }
        if (!localStorage.getItem('tts_provider_chat')) {
          localStorage.setItem('tts_provider_chat', 'piper');
        }
      }
      setTTSProvider('auto');  // 使用自动选择（根据场景）
    }).catch((error) => {
    });
  }, []);

  // 想法生成系统 - 使用配置中的开关状态
  const { currentIdea, clearCurrentIdea } = useIdeaGeneration({
    enabled: gameConfig.ideaGenerationEnabled,
    checkInterval: 30000,  // 30秒检查一次
  });

  const ideaService = getIdeaGenerationService();

  // 处理想法采纳（优化性能，避免阻塞）
  const handleAdoptIdea = (idea: GameIdea, documentTitle?: string) => {
    // 先清除对话框，立即响应用户操作
    clearCurrentIdea();
    
    // 使用 queueMicrotask 在下一个微任务中执行，避免阻塞主线程
    queueMicrotask(() => {
      try {
        ideaService.adoptIdea(idea, documentTitle);
      } catch (error) {
      }
    });
  };

  // 处理想法拒绝
  const handleRejectIdea = (idea: GameIdea) => {
    clearCurrentIdea();
  };

  return (
    <div className="App">
      <LanguageSwitcher />
      <MultiPlayerGameBoard />
      <IdeasManager />
      <DesignDocManager />
      <TTSStatusMonitor />
      <GameRulesGuide />
      <CodeReviewManager />
      <TestManagementManager />
      <SelfIterationManager />
      <AIControlDashboard />
      
      {/* 想法确认对话框 */}
      {currentIdea && (
        <IdeaConfirmationDialog
          idea={currentIdea}
          onAdopt={handleAdoptIdea}
          onReject={handleRejectIdea}
          onClose={clearCurrentIdea}
        />
      )}
    </div>
  );
}

export default App;

