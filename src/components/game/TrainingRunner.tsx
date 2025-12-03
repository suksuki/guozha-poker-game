/**
 * 训练运行组件
 * 显示训练进度和结果
 */

import React, { useState, useEffect, useRef } from 'react';
import { MCTSConfig, runSingleGame, tuneMCTSParameters, TuningConfig, GameResult } from '../../utils/mctsTuning';
import { TrainingConfig } from './TrainingConfigPanel';

interface TrainingRunnerProps {
  config: TrainingConfig;
  onBack: () => void;
  onComplete?: (result: any) => void;
}

interface TrainingProgress {
  current: number;
  total: number;
  percentage: number;
  elapsedTime: number;
  estimatedTimeRemaining: number;
  gamesPerSecond: number;
  currentGame: number;
}

// 带进度更新的训练函数
async function runTrainingWithProgress(
  config: MCTSConfig,
  playerCount: number,
  games: number,
  onProgress: (current: number, total: number) => void,
  cancelled: () => boolean
): Promise<any> {
  console.log('runTrainingWithProgress开始，游戏数量:', games);
  const startTime = Date.now();
  let aiWins = 0;
  let totalScore = 0;
  let totalTurns = 0;
  
  // 立即更新初始进度
  onProgress(0, games);
  await new Promise(resolve => setTimeout(resolve, 10));
  
  for (let game = 0; game < games; game++) {
    // 检查是否已取消
    if (cancelled()) {
      console.log('训练被取消');
      throw new Error('训练已取消');
    }
    
    // 更新进度（在游戏开始前）
    onProgress(game + 1, games);
    
    // 每局游戏后让出控制权，让UI更新
    if (game > 0) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    // 运行单局游戏
    try {
      const result = runSingleGame(
        config,
        playerCount,
        config.perfectInformation || false
      );
      
      if (result.winner === 0) {
        aiWins++;
      }
      totalScore += result.aiScore;
      totalTurns += result.turns;
      
      // 每10局让出更多控制权
      if ((game + 1) % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    } catch (err: any) {
      console.error(`游戏 ${game + 1} 出错:`, err);
      throw err;
    }
  }
  
  const winRate = aiWins / games;
  const avgScore = totalScore / games;
  const avgTurns = totalTurns / games;
  const elapsed = Date.now() - startTime;
  
  return {
    config,
    aiWins,
    totalGames: games,
    winRate,
    avgScore,
    avgTurns
  };
}

export const TrainingRunner: React.FC<TrainingRunnerProps> = ({
  config,
  onBack,
  onComplete
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState<TrainingProgress>({
    current: 0,
    total: config.gameCount,
    percentage: 0,
    elapsedTime: 0,
    estimatedTimeRemaining: 0,
    gamesPerSecond: 0,
    currentGame: 0
  });
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [tuningResult, setTuningResult] = useState<any>(null);
  const [isTuning, setIsTuning] = useState(false);
  const [tuningProgress, setTuningProgress] = useState({
    current: 0,
    total: 0,
    configIndex: 0,
    totalConfigs: 0,
    gameIndex: 0,
    gamesPerConfig: 0,
    percentage: 0
  });
  const startTimeRef = useRef<number>(0);
  const trainingEndTimeRef = useRef<number>(0);
  const tuningStartTimeRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const cancelledRef = useRef<boolean>(false);
  const trainingPromiseRef = useRef<Promise<any> | null>(null);

  // 组件挂载时自动开始训练
  useEffect(() => {
    console.log('TrainingRunner挂载，isRunning:', isRunning, 'result:', result, 'error:', error);
    if (!isRunning && !result && !error) {
      console.log('TrainingRunner: 准备自动开始训练');
      // 延迟一点，确保UI已经渲染
      const timer = setTimeout(() => {
        console.log('TrainingRunner: 自动开始训练');
        cancelledRef.current = false;
        setIsRunning(true);
        setProgress({
          current: 0,
          total: config.gameCount,
          percentage: 0,
          elapsedTime: 0,
          estimatedTimeRemaining: 0,
          gamesPerSecond: 0,
          currentGame: 0
        });
        setResult(null);
        setError(null);
        startTraining();
      }, 200);
      return () => {
        clearTimeout(timer);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []); // 只在挂载时执行一次

  // 当结果更新时记录日志
  useEffect(() => {
    if (result) {
      console.log('=== TrainingRunner: 结果已设置 ===');
      console.log('result:', result);
      console.log('isTuning:', isTuning);
      console.log('onBack:', onBack);
    }
  }, [result, isTuning, onBack]);

  // 当 isTuning 状态变化时记录日志
  useEffect(() => {
    console.log('=== isTuning 状态变化 ===');
    console.log('isTuning:', isTuning);
    console.log('result:', result);
    console.log('isRunning:', isRunning);
  }, [isTuning, result, isRunning]);

  const startTraining = async () => {
    console.log('startTraining被调用');
    try {
      setError(null);
      startTimeRef.current = Date.now();
      
      // 创建MCTS配置
      const mctsConfig: MCTSConfig = {
        explorationConstant: 1.414,
        iterations: config.mctIterations,
        simulationDepth: config.mctsDepth,
        perfectInformation: true, // 训练时使用完全信息
        playerCount: config.playerCount
      };
      
      console.log('MCTS配置:', mctsConfig);
      console.log('游戏数量:', config.gameCount);

      // 启动进度更新
      if (config.showProgress) {
        intervalRef.current = setInterval(() => {
          const elapsed = Date.now() - startTimeRef.current;
          setProgress(prev => {
            const percentage = prev.current > 0 ? (prev.current / prev.total) * 100 : 0;
            if (prev.current > 0) {
              const avgTimePerGame = elapsed / prev.current;
              const remaining = (prev.total - prev.current) * avgTimePerGame;
              const gamesPerSecond = prev.current / (elapsed / 1000);
              
              return {
                ...prev,
                percentage,
                elapsedTime: elapsed,
                estimatedTimeRemaining: remaining,
                gamesPerSecond: gamesPerSecond
              };
            }
            return {
              ...prev,
              percentage,
              elapsedTime: elapsed
            };
          });
        }, 100);
      }

      // 运行训练（使用异步方式，让UI有机会更新）
      console.log('开始运行训练...');
      trainingPromiseRef.current = runTrainingWithProgress(
        mctsConfig,
        config.playerCount,
        config.gameCount,
        (current, total) => {
          if (!cancelledRef.current) {
            console.log(`进度更新: ${current}/${total}`);
            setProgress(prev => ({
              ...prev,
              current,
              total,
              percentage: (current / total) * 100
            }));
          }
        },
        () => cancelledRef.current
      ).then((trainingResult) => {
        console.log('训练完成:', trainingResult);
        if (cancelledRef.current) {
          setError('训练已取消');
          setIsRunning(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          throw new Error('训练已取消');
        }

        console.log('=== 训练完成，设置结果 ===');
        console.log('trainingResult:', trainingResult);
        trainingEndTimeRef.current = Date.now();
        const trainingElapsed = trainingEndTimeRef.current - startTimeRef.current;
        setResult({
          ...trainingResult,
          trainingElapsedTime: trainingElapsed
        });
        setIsRunning(false);
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }

        // 更新最终进度
        setProgress(prev => ({
          ...prev,
          current: config.gameCount,
          percentage: 100,
          elapsedTime: trainingElapsed
        }));

        // 如果启用了自动微调，开始微调
        console.log('=== 检查自动微调条件 ===');
        console.log('config.autoTune:', config.autoTune);
        console.log('typeof config.autoTune:', typeof config.autoTune);
        console.log('cancelledRef.current:', cancelledRef.current);
        console.log('条件判断结果:', config.autoTune && !cancelledRef.current);
        
        if (config.autoTune && !cancelledRef.current) {
          console.log('=== 检测到自动微调已启用 ===');
          console.log('准备启动自动微调...');
          // 延迟一点，让UI更新
          setTimeout(() => {
            console.log('setTimeout 回调执行，调用 startAutoTuning');
            startAutoTuning(mctsConfig, trainingResult);
          }, 500);
        } else {
          console.log('训练完成，不进行自动微调');
          console.log('onComplete 函数:', onComplete);
          if (onComplete) {
            console.log('调用 onComplete...');
            try {
              onComplete(trainingResult);
              console.log('onComplete 调用完成');
            } catch (err) {
              console.error('onComplete 调用出错:', err);
            }
          } else {
            console.log('onComplete 未定义，跳过调用');
          }
        }
        return trainingResult;
      }).catch((err: any) => {
        console.error('训练错误:', err);
        if (!cancelledRef.current) {
          setError(err.message || '训练过程中发生错误');
          setIsRunning(false);
        }
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        throw err;
      });
    } catch (err: any) {
      console.error('startTraining捕获错误:', err);
      setError(err.message || '训练过程中发生错误');
      setIsRunning(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const handleStart = () => {
    console.log('开始训练按钮被点击');
    try {
      cancelledRef.current = false;
      setIsRunning(true);
      setProgress({
        current: 0,
        total: config.gameCount,
        percentage: 0,
        elapsedTime: 0,
        estimatedTimeRemaining: 0,
        gamesPerSecond: 0,
        currentGame: 0
      });
      setResult(null);
      setError(null);
      console.log('调用startTraining，配置:', config);
      startTraining();
    } catch (err: any) {
      console.error('handleStart错误:', err);
      setError(err.message || '启动训练时发生错误');
      setIsRunning(false);
    }
  };

  const handleStop = () => {
    cancelledRef.current = true;
    setIsRunning(false);
    setIsTuning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setError('训练已取消');
  };

  const startAutoTuning = async (baseConfig: MCTSConfig, trainingResult: any) => {
    console.log('=== startAutoTuning 被调用 ===');
    console.log('baseConfig:', baseConfig);
    console.log('trainingResult:', trainingResult);
    console.log('config.autoTune:', config.autoTune);
    try {
      console.log('设置 isTuning = true');
      setIsTuning(true);
      setError(null);
      tuningStartTimeRef.current = Date.now();
      
      // 创建微调配置
      const tuningConfig: TuningConfig = {
        explorationConstants: [1.0, 1.414, 2.0], // 测试3个探索常数
        iterations: [config.mctIterations], // 使用训练时的迭代次数
        simulationDepths: [config.mctsDepth], // 使用训练时的模拟深度
        perfectInformation: true,
        playerCount: config.playerCount,
        gamesPerConfig: config.tuneGamesPerConfig || 50
      };

      console.log('微调配置:', tuningConfig);
      console.log('准备调用 tuneMCTSParameters...');
      
      // 初始化微调进度
      const totalGames = tuningConfig.explorationConstants.length * 
                         tuningConfig.iterations.length * 
                         tuningConfig.simulationDepths.length * 
                         tuningConfig.gamesPerConfig;
      const totalConfigs = tuningConfig.explorationConstants.length * 
                           tuningConfig.iterations.length * 
                           tuningConfig.simulationDepths.length;
      
      console.log('初始化微调进度:', { totalGames, totalConfigs, gamesPerConfig: tuningConfig.gamesPerConfig });
      
      setTuningProgress({
        current: 0,
        total: totalGames,
        configIndex: 0,
        totalConfigs: totalConfigs,
        gameIndex: 0,
        gamesPerConfig: tuningConfig.gamesPerConfig,
        percentage: 0
      });
      
      // 运行参数微调，传入进度回调
      const tuningResults: GameResult[] = await tuneMCTSParameters(
        tuningConfig,
        async (current, total, configIndex, totalConfigs, gameIndex, gamesPerConfig) => {
          const percentage = (current / total) * 100;
          
          console.log('微调进度更新:', { current, total, percentage, configIndex, totalConfigs, gameIndex, gamesPerConfig });
          
          // 更新进度状态
          setTuningProgress({
            current,
            total,
            configIndex,
            totalConfigs,
            gameIndex,
            gamesPerConfig,
            percentage
          });
          
          // 每5个游戏或每个配置的第一个游戏时，让UI有机会更新
          if (current % 5 === 0 || gameIndex === 1 || current === total) {
            await new Promise(resolve => setTimeout(resolve, 0));
          }
        }
      );
      
      if (cancelledRef.current) {
        setError('微调已取消');
        setIsTuning(false);
        return;
      }

      // 找到最佳配置（已经按胜率排序）
      const bestConfig = tuningResults[0];
      const tuningEndTime = Date.now();
      const tuningElapsed = tuningEndTime - tuningStartTimeRef.current;
      const totalElapsed = tuningEndTime - startTimeRef.current; // 总耗时 = 训练 + 微调
      
      setTuningResult({
        bestConfig,
        allResults: tuningResults,
        tuningElapsedTime: tuningElapsed,
        totalElapsedTime: totalElapsed
      });
      setIsTuning(false);      

      console.log('微调完成，最佳配置:', bestConfig);
      console.log('微调耗时:', formatTime(tuningElapsed));
      console.log('总耗时:', formatTime(totalElapsed));
      console.log('微调完成，不立即调用onComplete，等待用户点击返回按钮');
      
      // 注意：不在微调完成后立即调用 onComplete
      // 因为这会立即设置 isTraining=false，导致组件卸载
      // 用户应该先看到结果，然后手动点击返回按钮
      // onComplete 会在用户点击返回按钮时通过 handleTrainingBack 间接调用
    } catch (err: any) {
      console.error('微调错误:', err);
      if (!cancelledRef.current) {
        setError(err.message || '微调过程中发生错误');
        setIsTuning(false);
      }
    }
  };

  const formatTime = (ms: number): string => {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}秒`;
    } else if (ms < 3600000) {
      const minutes = Math.floor(ms / 60000);
      const seconds = Math.floor((ms % 60000) / 1000);
      return `${minutes}分${seconds}秒`;
    } else {
      const hours = Math.floor(ms / 3600000);
      const minutes = Math.floor((ms % 3600000) / 60000);
      return `${hours}小时${minutes}分`;
    }
  };

  return (
    <div className="game-container" style={{ overflowY: 'auto', height: '100vh' }}>
      <div className="start-screen" style={{ 
        minHeight: '100%', 
        padding: '20px',
        fontSize: '1.5em' // 放大1.5倍
      }}>
        <h1 style={{ fontSize: '2.5em' }}>🏋️ MCTS训练中...</h1>
        <div className="config-panel" style={{ 
          fontSize: '1.5em',
          padding: '45px', // 30px * 1.5
          minWidth: '450px', // 300px * 1.5
          maxWidth: '750px' // 500px * 1.5
        }}>
          <button className="btn-back" onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('返回按钮被点击, onBack:', onBack);
            if (onBack && typeof onBack === 'function') {
              onBack();
            } else {
              console.error('onBack 不是一个函数:', onBack);
            }
          }} style={{ 
            marginBottom: '30px',
            fontSize: '1.5em',
            padding: '15px 30px',
            cursor: 'pointer',
            backgroundColor: 'rgba(255, 255, 255, 0.2)',
            border: '2px solid white',
            borderRadius: '8px',
            color: 'white',
            position: 'relative',
            zIndex: 10
          }}
          type="button"
          >
            ← 返回
          </button>

          {error && (
            <div style={{
              padding: '22.5px',
              backgroundColor: '#ffebee',
              borderRadius: '7.5px',
              marginBottom: '30px',
              color: '#c62828',
              fontSize: '1em'
            }}>
              <strong>错误：</strong> {error}
            </div>
          )}

          {!isRunning && !result && !error && !isTuning && (
            <div>
              <div className="info-box" style={{
                padding: '22.5px',
                backgroundColor: '#e3f2fd',
                borderRadius: '7.5px',
                marginBottom: '30px',
                fontSize: '21px',
                color: '#1976d2'
              }}>
                <strong>训练配置：</strong>
                <ul style={{ margin: '15px 0', paddingLeft: '30px' }}>
                  <li>模拟牌局数量: {config.gameCount}</li>
                  <li>玩家数量: {config.playerCount}</li>
                  <li>MCTS迭代次数: {config.mctIterations}</li>
                  <li>MCTS模拟深度: {config.mctsDepth}</li>
                  <li>完全信息模式: 是</li>
                </ul>
              </div>
              <button 
                className="btn-primary" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('按钮被点击');
                  handleStart();
                }}
                style={{ width: '100%', fontSize: '24px', padding: '18px', cursor: 'pointer' }}
                type="button"
              >
                🚀 开始训练
              </button>
            </div>
          )}

          {isTuning && (
            <div>
              {console.log('渲染微调界面, isTuning:', isTuning, 'result:', result)}
              <div style={{
                padding: '30px',
                backgroundColor: '#fff3cd',
                borderRadius: '7.5px',
                marginBottom: '30px'
              }}>
                <h3 style={{ marginTop: 0, fontSize: '1.8em', color: '#856404', fontWeight: 'bold' }}>
                  🔧 正在自动微调参数...
                </h3>
                <p style={{ fontSize: '21px', color: '#856404', marginBottom: '22.5px' }}>
                  正在测试多个参数组合，寻找最佳配置。这可能需要一些时间...
                </p>
                
                {/* 微调进度条 */}
                <div style={{ marginBottom: '22.5px' }}>
                  {tuningProgress.total > 0 ? (
                    <>
                      <div style={{ marginBottom: '10px', fontSize: '18px', color: '#856404', fontWeight: 'bold' }}>
                        微调进度: {tuningProgress.current} / {tuningProgress.total} ({tuningProgress.percentage.toFixed(1)}%)
                      </div>
                    <div style={{
                      width: '100%',
                      height: '45px',
                      backgroundColor: '#e0e0e0',
                      borderRadius: '22.5px',
                      overflow: 'hidden',
                      position: 'relative'
                    }}>
                      <div style={{
                        width: `${tuningProgress.percentage}%`,
                        height: '100%',
                        backgroundColor: '#ff9800',
                        transition: 'width 0.3s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1.2em'
                      }}>
                        {tuningProgress.percentage.toFixed(1)}%
                      </div>
                    </div>
                      <div style={{
                        marginTop: '15px',
                        fontSize: '16px',
                        color: '#856404'
                      }}>
                        <div>配置: {tuningProgress.configIndex} / {tuningProgress.totalConfigs}</div>
                        <div>当前配置游戏: {tuningProgress.gameIndex} / {tuningProgress.gamesPerConfig}</div>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: '18px', color: '#856404', textAlign: 'center', padding: '20px' }}>
                      正在初始化微调... (total: {tuningProgress.total})
                    </div>
                  )}
                </div>
                
                {result && (
                  <div style={{
                    marginTop: '22.5px',
                    padding: '15px',
                    backgroundColor: '#fff',
                    borderRadius: '7.5px',
                    fontSize: '18px',
                    color: '#333'
                  }}>
                    <strong style={{ color: '#856404' }}>训练结果：</strong>
                    <div style={{ marginTop: '10px', color: '#333' }}>
                      <div>AI胜率: {(result.winRate * 100).toFixed(2)}%</div>
                      <div>平均分数: {result.avgScore.toFixed(2)}</div>
                      <div>平均回合数: {result.avgTurns.toFixed(1)}</div>
                    </div>
                  </div>
                )}
              </div>
              <button 
                className="btn-secondary" 
                onClick={handleStop}
                style={{ width: '100%', fontSize: '24px', padding: '18px', cursor: 'pointer' }}
              >
                ⏸️ 停止微调
              </button>
            </div>
          )}

          {isRunning && (
            <div>
              <div style={{
                padding: '30px',
                backgroundColor: '#ffffff',
                borderRadius: '7.5px',
                marginBottom: '30px',
                border: '2px solid #e0e0e0'
              }}>
                <h3 style={{ marginTop: 0, fontSize: '1.8em', color: '#333', fontWeight: 'bold' }}>训练进度</h3>
                
                <div style={{ marginBottom: '22.5px' }}>
                  <div style={{
                    width: '100%',
                    height: '45px',
                    backgroundColor: '#e0e0e0',
                    borderRadius: '22.5px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      width: `${progress.percentage}%`,
                      height: '100%',
                      backgroundColor: '#4CAF50',
                      transition: 'width 0.3s ease',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      fontWeight: 'bold',
                      fontSize: '1.2em'
                    }}>
                      {progress.percentage.toFixed(1)}%
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '15px',
                  fontSize: '21px',
                  color: '#333'
                }}>
                  <div style={{ color: '#333' }}>
                    <strong style={{ color: '#1976d2' }}>当前进度:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{progress.current} / {progress.total}</span>
                  </div>
                  <div style={{ color: '#333' }}>
                    <strong style={{ color: '#1976d2' }}>已用时间:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{formatTime(progress.elapsedTime)}</span>
                  </div>
                  <div style={{ color: '#333' }}>
                    <strong style={{ color: '#1976d2' }}>预计剩余:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{formatTime(progress.estimatedTimeRemaining)}</span>
                  </div>
                  <div style={{ color: '#333' }}>
                    <strong style={{ color: '#1976d2' }}>速度:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{progress.gamesPerSecond.toFixed(2)} 游戏/秒</span>
                  </div>
                </div>
              </div>

              <button 
                className="btn-secondary" 
                onClick={handleStop}
                style={{ width: '100%', fontSize: '24px', padding: '18px', cursor: 'pointer' }}
              >
                ⏸️ 停止训练
              </button>
            </div>
          )}

          {result && !isTuning && (
            <div>
              <div style={{
                padding: '30px',
                backgroundColor: '#e8f5e9',
                borderRadius: '7.5px',
                marginBottom: '30px'
              }}>
                <h3 style={{ marginTop: 0, color: '#2e7d32', fontSize: '1.8em' }}>✅ 训练完成！</h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '22.5px',
                  marginTop: '22.5px',
                  fontSize: '21px',
                  color: '#333'
                }}>
                  <div style={{ color: '#333' }}>
                    <strong style={{ color: '#2e7d32' }}>总对局数:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{result.totalGames}</span>
                  </div>
                  <div style={{ color: '#333' }}>
                    <strong style={{ color: '#2e7d32' }}>AI胜率:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{(result.winRate * 100).toFixed(2)}%</span>
                  </div>
                  <div style={{ color: '#333' }}>
                    <strong style={{ color: '#2e7d32' }}>平均分数:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{result.avgScore.toFixed(2)}</span>
                  </div>
                  <div style={{ color: '#333' }}>
                    <strong style={{ color: '#2e7d32' }}>平均回合数:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{result.avgTurns.toFixed(1)}</span>
                  </div>
                  {result.trainingElapsedTime && (
                    <div style={{ color: '#333', gridColumn: '1 / -1', paddingTop: '15px', borderTop: '2px solid #2e7d32' }}>
                      <strong style={{ color: '#2e7d32', fontSize: '1.1em' }}>训练耗时:</strong> <span style={{ color: '#2e7d32', fontWeight: 'bold', fontSize: '1.2em' }}>{formatTime(result.trainingElapsedTime)}</span>
                    </div>
                  )}
                </div>

                <div style={{ marginTop: '30px', padding: '22.5px', backgroundColor: '#fff', borderRadius: '7.5px', border: '1px solid #e0e0e0' }}>
                  <strong style={{ fontSize: '1.2em', color: '#2e7d32' }}>训练配置:</strong>
                  <ul style={{ margin: '15px 0', paddingLeft: '30px', fontSize: '1em', color: '#333' }}>
                    <li style={{ color: '#333', marginBottom: '8px' }}><strong style={{ color: '#1976d2' }}>探索常数:</strong> <span style={{ fontWeight: 'bold' }}>{result.config.explorationConstant || '默认'}</span></li>
                    <li style={{ color: '#333', marginBottom: '8px' }}><strong style={{ color: '#1976d2' }}>迭代次数:</strong> <span style={{ fontWeight: 'bold' }}>{result.config.iterations || '默认'}</span></li>
                    <li style={{ color: '#333', marginBottom: '8px' }}><strong style={{ color: '#1976d2' }}>模拟深度:</strong> <span style={{ fontWeight: 'bold' }}>{result.config.simulationDepth || '默认'}</span></li>
                    <li style={{ color: '#333' }}><strong style={{ color: '#1976d2' }}>完全信息:</strong> <span style={{ fontWeight: 'bold' }}>{result.config.perfectInformation ? '是' : '否'}</span></li>
                  </ul>
                </div>
              </div>

              {tuningResult && (
                <div style={{
                  padding: '30px',
                  backgroundColor: '#d1ecf1',
                  borderRadius: '7.5px',
                  marginBottom: '30px'
                }}>
                  <h3 style={{ marginTop: 0, color: '#0c5460', fontSize: '1.8em' }}>🎯 参数微调完成！</h3>
                  
                  {/* 显示时间信息 */}
                  {tuningResult.tuningElapsedTime && (
                    <div style={{
                      padding: '15px',
                      backgroundColor: '#fff',
                      borderRadius: '7.5px',
                      marginTop: '22.5px',
                      fontSize: '18px',
                      color: '#333',
                      border: '1px solid #0c5460'
                    }}>
                      {result.trainingElapsedTime && (
                        <div style={{ marginBottom: '10px' }}>
                          <strong style={{ color: '#0c5460' }}>训练耗时:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{formatTime(result.trainingElapsedTime)}</span>
                        </div>
                      )}
                      <div style={{ marginBottom: '10px' }}>
                        <strong style={{ color: '#0c5460' }}>微调耗时:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{formatTime(tuningResult.tuningElapsedTime)}</span>
                      </div>
                      {tuningResult.totalElapsedTime && (
                        <div style={{ 
                          paddingTop: '10px', 
                          borderTop: '2px solid #0c5460',
                          fontSize: '1.1em',
                          marginTop: '10px'
                        }}>
                          <strong style={{ color: '#0c5460' }}>总耗时:</strong> <span style={{ color: '#0c5460', fontWeight: 'bold', fontSize: '1.2em' }}>{formatTime(tuningResult.totalElapsedTime)}</span>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <div style={{
                    padding: '22.5px',
                    backgroundColor: '#fff',
                    borderRadius: '7.5px',
                    marginTop: '22.5px'
                  }}>
                    <h4 style={{ marginTop: 0, fontSize: '1.5em', color: '#0c5460' }}>🏆 最佳配置:</h4>
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '15px',
                      marginTop: '15px',
                      fontSize: '21px',
                      color: '#333'
                    }}>
                      <div style={{ color: '#333' }}>
                        <strong style={{ color: '#0c5460' }}>探索常数:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{tuningResult.bestConfig.config.explorationConstant}</span>
                      </div>
                      <div style={{ color: '#333' }}>
                        <strong style={{ color: '#0c5460' }}>迭代次数:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{tuningResult.bestConfig.config.iterations}</span>
                      </div>
                      <div style={{ color: '#333' }}>
                        <strong style={{ color: '#0c5460' }}>模拟深度:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{tuningResult.bestConfig.config.simulationDepth}</span>
                      </div>
                      <div style={{ color: '#333' }}>
                        <strong style={{ color: '#0c5460' }}>胜率:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{(tuningResult.bestConfig.winRate * 100).toFixed(2)}%</span>
                      </div>
                      <div style={{ color: '#333' }}>
                        <strong style={{ color: '#0c5460' }}>平均分数:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{tuningResult.bestConfig.avgScore.toFixed(2)}</span>
                      </div>
                      <div style={{ color: '#333' }}>
                        <strong style={{ color: '#0c5460' }}>平均回合数:</strong> <span style={{ color: '#333', fontWeight: 'bold' }}>{tuningResult.bestConfig.avgTurns.toFixed(1)}</span>
                      </div>
                    </div>
                  </div>

                  {tuningResult.allResults && tuningResult.allResults.length > 1 && (
                    <div style={{
                      marginTop: '22.5px',
                      padding: '22.5px',
                      backgroundColor: '#fff',
                      borderRadius: '7.5px',
                      border: '1px solid #e0e0e0'
                    }}>
                      <strong style={{ fontSize: '1.2em', color: '#0c5460' }}>所有测试配置:</strong>
                      <ul style={{ margin: '15px 0', paddingLeft: '30px', fontSize: '1em', color: '#333' }}>
                        {tuningResult.allResults.slice(0, 5).map((r: any, idx: number) => (
                          <li key={idx} style={{ color: '#333', marginBottom: '8px' }}>
                            <strong style={{ color: '#1976d2' }}>配置{idx + 1}:</strong> 探索常数=<span style={{ fontWeight: 'bold' }}>{r.config.explorationConstant}</span>, 
                            胜率=<span style={{ fontWeight: 'bold' }}>{(r.winRate * 100).toFixed(2)}%</span>, 
                            分数=<span style={{ fontWeight: 'bold' }}>{r.avgScore.toFixed(2)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div style={{
                    marginTop: '22.5px',
                    padding: '15px',
                    backgroundColor: '#fff3cd',
                    borderRadius: '7.5px',
                    fontSize: '18px',
                    color: '#856404'
                  }}>
                    <strong style={{ color: '#856404' }}>💡 提示:</strong> <span style={{ color: '#856404' }}>最佳配置已找到，但这些参数需要手动应用到游戏配置中。当前游戏仍使用默认参数。</span>
                  </div>
                </div>
              )}

              <button 
                className="btn-primary" 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  console.log('=== 返回配置按钮被点击 ===');
                  console.log('onBack 函数:', onBack);
                  console.log('onBack 类型:', typeof onBack);
                  console.log('result:', result);
                  console.log('isTuning:', isTuning);
                  console.log('tuningResult:', tuningResult);
                  
                  // 如果有微调结果，在返回前调用 onComplete
                  if (tuningResult && onComplete) {
                    console.log('有微调结果，先调用 onComplete...');
                    try {
                      onComplete({ trainingResult: result, tuningResult: tuningResult.bestConfig });
                      console.log('onComplete 调用完成');
                    } catch (err) {
                      console.error('onComplete 调用出错:', err);
                    }
                  } else if (result && onComplete && !tuningResult) {
                    // 只有训练结果，没有微调结果
                    console.log('只有训练结果，调用 onComplete...');
                    try {
                      onComplete(result);
                      console.log('onComplete 调用完成');
                    } catch (err) {
                      console.error('onComplete 调用出错:', err);
                    }
                  }
                  
                  // 然后调用 onBack 返回
                  if (onBack && typeof onBack === 'function') {
                    console.log('调用 onBack()...');
                    try {
                      onBack();
                      console.log('onBack() 调用完成');
                    } catch (err) {
                      console.error('onBack() 调用出错:', err);
                    }
                  } else {
                    console.error('onBack 不是一个函数:', onBack);
                  }
                }}
                style={{ 
                  width: '100%', 
                  fontSize: '24px', 
                  padding: '18px', 
                  cursor: 'pointer',
                  position: 'relative',
                  zIndex: 10,
                  marginTop: '30px'
                }}
                type="button"
              >
                ← 返回配置
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
