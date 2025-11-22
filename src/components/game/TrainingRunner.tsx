/**
 * 训练运行组件
 * 显示训练进度和结果
 */

import React, { useState, useEffect, useRef } from 'react';
import { MCTSConfig, runSingleGame } from '../../utils/mctsTuning';
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
  const startTimeRef = useRef<number>(0);
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

        setResult(trainingResult);
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
          elapsedTime: Date.now() - startTimeRef.current
        }));

        if (onComplete) {
          onComplete(trainingResult);
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
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setError('训练已取消');
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
          <button className="btn-back" onClick={onBack} style={{ 
            marginBottom: '30px',
            fontSize: '1.5em',
            padding: '15px 30px',
            cursor: 'pointer'
          }}>
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

          {!isRunning && !result && !error && (
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

          {isRunning && (
            <div>
              <div style={{
                padding: '30px',
                backgroundColor: '#f5f5f5',
                borderRadius: '7.5px',
                marginBottom: '30px'
              }}>
                <h3 style={{ marginTop: 0, fontSize: '1.8em' }}>训练进度</h3>
                
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
                  fontSize: '21px'
                }}>
                  <div>
                    <strong>当前进度:</strong> {progress.current} / {progress.total}
                  </div>
                  <div>
                    <strong>已用时间:</strong> {formatTime(progress.elapsedTime)}
                  </div>
                  <div>
                    <strong>预计剩余:</strong> {formatTime(progress.estimatedTimeRemaining)}
                  </div>
                  <div>
                    <strong>速度:</strong> {progress.gamesPerSecond.toFixed(2)} 游戏/秒
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

          {result && (
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
                  fontSize: '21px'
                }}>
                  <div>
                    <strong>总对局数:</strong> {result.totalGames}
                  </div>
                  <div>
                    <strong>AI胜率:</strong> {(result.winRate * 100).toFixed(2)}%
                  </div>
                  <div>
                    <strong>平均分数:</strong> {result.avgScore.toFixed(2)}
                  </div>
                  <div>
                    <strong>平均回合数:</strong> {result.avgTurns.toFixed(1)}
                  </div>
                </div>

                <div style={{ marginTop: '30px', padding: '22.5px', backgroundColor: '#fff', borderRadius: '7.5px' }}>
                  <strong style={{ fontSize: '1.2em' }}>配置信息:</strong>
                  <ul style={{ margin: '15px 0', paddingLeft: '30px', fontSize: '1em' }}>
                    <li>探索常数: {result.config.explorationConstant || '默认'}</li>
                    <li>迭代次数: {result.config.iterations || '默认'}</li>
                    <li>模拟深度: {result.config.simulationDepth || '默认'}</li>
                    <li>完全信息: {result.config.perfectInformation ? '是' : '否'}</li>
                  </ul>
                </div>
              </div>

              <button 
                className="btn-primary" 
                onClick={onBack}
                style={{ width: '100%', fontSize: '24px', padding: '18px', cursor: 'pointer' }}
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
