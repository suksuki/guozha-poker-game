import { useEffect, useState } from 'react';
import { MultiPlayerGameBoard } from './components/MultiPlayerGameBoard';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { IdeasManager } from './components/IdeasManager';
import { DesignDocManager } from './components/DesignDocManager';
import { TTSStatusMonitor } from './components/TTSStatusMonitor';
import { CodeReviewManager } from './components/CodeReviewManager';
import { TestManagementManager } from './components/TestManagementManager';
import { SelfIterationManager } from './components/SelfIterationManager';
import { IdeaConfirmationDialog } from './components/IdeaConfirmationDialog';
import { useIdeaGeneration } from './hooks/useIdeaGeneration';
import { useGameConfigContext } from './contexts/GameConfigContext';
import { getIdeaGenerationService, GameIdea } from './services/ideaGenerationService';
import { initTTS, getTTSConfigFromEnv } from './tts/initTTS';
import { SystemApplication } from './services/system';
import { registerAllModules } from './services/system/modules/registerModules';
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
        
        if (mounted) {
          console.log('[App] 系统应用模块初始化完成', systemApp.getStatus());
        }
      } catch (error) {
        console.error('[App] 系统应用模块初始化失败:', error);
      }
    }
    
    initSystemApplication();
    
    // 清理函数：组件卸载时不清理系统应用（因为是单例，其他组件可能在使用）
    return () => {
      mounted = false;
      // 如果需要在应用关闭时清理，可以在这里调用 shutdown
      // SystemApplication.getInstance().shutdown().catch(console.error);
    };
  }, []);

  // 初始化 TTS 系统
  useEffect(() => {
    const config = getTTSConfigFromEnv();
    initTTS(config).catch((error) => {
      console.error('[App] TTS 系统初始化失败:', error);
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
        console.log('[App] 想法已采纳并加入设计队列');
      } catch (error) {
        console.error('[App] 采纳想法失败:', error);
      }
    });
  };

  // 处理想法拒绝
  const handleRejectIdea = (idea: GameIdea) => {
    clearCurrentIdea();
    console.log('[App] 想法已拒绝');
  };

  return (
    <div className="App">
      <LanguageSwitcher />
      <MultiPlayerGameBoard />
      <IdeasManager />
      <DesignDocManager />
      <TTSStatusMonitor />
      <CodeReviewManager />
      <TestManagementManager />
      <SelfIterationManager />
      
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

