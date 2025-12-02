/**
 * MCTS算法微调工具
 * 
 * 通过运行大量对局来评估和优化MCTS参数
 * 这不是训练大模型，而是通过统计方法找到最优参数配置
 */

import { Card, Play } from '../types/card';
import { 
  createDeck, 
  shuffleDeck, 
  dealCards, 
  canPlayCards, 
  canBeat, 
  findPlayableCards,
  isScoreCard,
  calculateCardsScore
} from './cardUtils';
import { mctsChoosePlay } from './mctsAI';
import { updateProgressBar, clearLine } from './progressBar';

// MCTS配置接口（从mctsAI.ts导出）
export interface MCTSConfig {
  iterations?: number;
  explorationConstant?: number;
  simulationDepth?: number;
  perfectInformation?: boolean;
  allPlayerHands?: Card[][];
  currentRoundScore?: number;
  playerCount?: number;
}

// 参数配置接口
export interface TuningConfig {
  // 要测试的参数组合
  explorationConstants: number[];  // UCT探索常数
  iterations: number[];            // MCTS迭代次数
  simulationDepths: number[];      // 模拟深度
  perfectInformation: boolean;     // 是否使用完全信息
  playerCount: number;             // 玩家数量
  gamesPerConfig: number;          // 每个配置运行的对局数
}

// 对局结果
export interface GameResult {
  config: MCTSConfig;
  aiWins: number;
  totalGames: number;
  winRate: number;
  avgScore: number;
  avgTurns: number;
}

// 简化的游戏状态（用于快速测试）
interface TestGameState {
  players: Card[][];
  currentPlayer: number;
  lastPlay: Play | null;
  lastPlayPlayer: number | null;
  roundScore: number;
  finished: boolean;
  winner: number | null;
  turnCount: number;
}

// 运行单局游戏测试
export function runSingleGame(
  config: MCTSConfig,
  playerCount: number,
  perfectInformation: boolean
): { winner: number; turns: number; aiScore: number } {
  // 创建并分发牌
  const decks: Card[][] = [];
  for (let i = 0; i < playerCount; i++) {
    const deck = createDeck();
    shuffleDeck(deck);
    decks.push(deck);
  }
  
  const players: Card[][] = decks.map(deck => [...deck]);
  let currentPlayer = 0;
  let lastPlay: Play | null = null;
  let lastPlayPlayer: number | null = null;
  let roundScore = 0;
  let turnCount = 0;
  let aiScore = 0;
  
  // 游戏主循环
  while (true) {
    turnCount++;
    const currentHand = players[currentPlayer];
    
    // 检查是否有人出完牌
    if (currentHand.length === 0) {
      // 游戏结束，分配分数
      if (lastPlayPlayer !== null) {
        if (lastPlayPlayer === 0) {
          aiScore += roundScore;
        }
      }
      return { winner: currentPlayer, turns: turnCount, aiScore };
    }
    
    // AI玩家（索引0）使用MCTS
    if (currentPlayer === 0) {
      const mctsConfig: MCTSConfig = {
        ...config,
        perfectInformation: perfectInformation,
        allPlayerHands: perfectInformation ? players.map(p => [...p]) : undefined,
        currentRoundScore: roundScore,
        playerCount: playerCount
      };
      
      const aiPlay = mctsChoosePlay(currentHand, lastPlay, mctsConfig);
      
      if (!aiPlay || aiPlay.length === 0) {
        // 要不起
        if (lastPlay) {
          lastPlay = null;
          lastPlayPlayer = null;
          currentPlayer = (currentPlayer + 1) % playerCount;
        } else {
          // 所有人都要不起，分配分数
          if (lastPlayPlayer !== null && lastPlayPlayer === 0) {
            aiScore += roundScore;
          }
          roundScore = 0;
          currentPlayer = (lastPlayPlayer !== null 
            ? (lastPlayPlayer + 1) 
            : (currentPlayer + 1)) % playerCount;
        }
        continue;
      }
      
      // 出牌
      const play = canPlayCards(aiPlay);
      if (!play) {
        currentPlayer = (currentPlayer + 1) % playerCount;
        continue;
      }
      
      // 移除已出的牌
      players[0] = currentHand.filter(card => !aiPlay.some(c => c.id === card.id));
      
      // 更新分数
      const scoreCards = aiPlay.filter(card => isScoreCard(card));
      roundScore += calculateCardsScore(scoreCards);
      
      lastPlay = play;
      lastPlayPlayer = 0;
      
      if (players[0].length === 0) {
        if (lastPlayPlayer === 0) {
          aiScore += roundScore;
        }
        return { winner: 0, turns: turnCount, aiScore };
      }
    } else {
      // 其他玩家使用简单策略（随机或启发式）
      const playableOptions = findPlayableCards(currentHand, lastPlay);
      
      if (playableOptions.length === 0) {
        // 要不起
        if (lastPlay) {
          lastPlay = null;
          lastPlayPlayer = null;
          currentPlayer = (currentPlayer + 1) % playerCount;
        } else {
          if (lastPlayPlayer !== null && lastPlayPlayer === 0) {
            aiScore += roundScore;
          }
          roundScore = 0;
          currentPlayer = (lastPlayPlayer !== null 
            ? (lastPlayPlayer + 1) 
            : (currentPlayer + 1)) % playerCount;
        }
        continue;
      }
      
      // 简单策略：随机选择或选择最小的能压过的牌
      let selectedPlay = playableOptions[0];
      if (playableOptions.length > 1) {
        const validPlays = playableOptions
          .map(cards => canPlayCards(cards))
          .filter((play): play is Play => {
            if (!play) return false;
            if (!lastPlay) return true;
            return canBeat(play, lastPlay);
          });
        
        if (validPlays.length > 0) {
          validPlays.sort((a, b) => a.value - b.value);
          selectedPlay = validPlays[0].cards;
        } else {
          selectedPlay = playableOptions[Math.floor(Math.random() * playableOptions.length)];
        }
      }
      
      const play = canPlayCards(selectedPlay);
      if (!play) {
        currentPlayer = (currentPlayer + 1) % playerCount;
        continue;
      }
      
      // 移除已出的牌
      players[currentPlayer] = currentHand.filter(
        card => !selectedPlay.some(c => c.id === card.id)
      );
      
      // 更新分数
      const scoreCards = selectedPlay.filter(card => isScoreCard(card));
      roundScore += calculateCardsScore(scoreCards);
      
      lastPlay = play;
      lastPlayPlayer = currentPlayer;
      
      if (players[currentPlayer].length === 0) {
        return { winner: currentPlayer, turns: turnCount, aiScore };
      }
    }
    
    currentPlayer = (currentPlayer + 1) % playerCount;
    
    // 防止无限循环
    if (turnCount > 1000) {
      // 按剩余手牌数判断胜负
      const minHandLength = Math.min(...players.map(p => p.length));
      const winner = players.findIndex(p => p.length === minHandLength);
      return { winner: winner >= 0 ? winner : 0, turns: turnCount, aiScore };
    }
  }
}

// 运行参数微调
export async function tuneMCTSParameters(
  tuningConfig: TuningConfig,
  onProgress?: (current: number, total: number, configIndex: number, totalConfigs: number, gameIndex: number, gamesPerConfig: number) => Promise<void> | void
): Promise<GameResult[]> {
  const results: GameResult[] = [];
  const totalConfigs = 
    tuningConfig.explorationConstants.length *
    tuningConfig.iterations.length *
    tuningConfig.simulationDepths.length;
  
  const totalGames = totalConfigs * tuningConfig.gamesPerConfig;
  let configIndex = 0;
  let totalGameIndex = 0;
  const overallStartTime = Date.now();
  
  
  // 估算时间（基于之前的测试：每局约8秒）
  const estimatedTimePerGame = 8; // 秒
  const estimatedTotalTime = totalGames * estimatedTimePerGame;
  const estimatedMinutes = Math.floor(estimatedTotalTime / 60);
  const estimatedSeconds = estimatedTotalTime % 60;
  
  // 遍历所有参数组合
  for (const explorationConstant of tuningConfig.explorationConstants) {
    for (const iterations of tuningConfig.iterations) {
      for (const simulationDepth of tuningConfig.simulationDepths) {
        configIndex++;
        const config: MCTSConfig = {
          explorationConstant,
          iterations,
          simulationDepth,
          perfectInformation: tuningConfig.perfectInformation,
          playerCount: tuningConfig.playerCount
        };
        
        const configStartTime = Date.now();
        
        let aiWins = 0;
        let totalScore = 0;
        let totalTurns = 0;
        const gameStartTime = Date.now();
        
        // 运行多局游戏
        for (let game = 0; game < tuningConfig.gamesPerConfig; game++) {
          totalGameIndex++;
          
          // 调用进度回调（浏览器环境）
          if (onProgress) {
            const result = onProgress(totalGameIndex, totalGames, configIndex, totalConfigs, game + 1, tuningConfig.gamesPerConfig);
            // 如果回调返回 Promise，等待它完成（让UI有机会更新）
            if (result instanceof Promise) {
              await result;
            }
          }
          
          // 显示进度条（Node.js环境）
          if (typeof process !== 'undefined' && process.stdout) {
            updateProgressBar({
              total: totalGames,
              current: totalGameIndex,
              width: 40,
              showPercentage: true,
              showTime: true,
              startTime: overallStartTime,
              label: `配置${configIndex}/${totalConfigs} 游戏${game + 1}/${tuningConfig.gamesPerConfig}`
            });
          } else {
            // 浏览器环境，使用简单的日志
            if ((game + 1) % Math.max(1, Math.floor(tuningConfig.gamesPerConfig / 10)) === 0 || game === 0) {
              const progress = ((totalGameIndex / totalGames) * 100).toFixed(1);
            }
          }
          
          const result = runSingleGame(
            config,
            tuningConfig.playerCount,
            tuningConfig.perfectInformation
          );
          
          if (result.winner === 0) {
            aiWins++;
          }
          totalScore += result.aiScore;
          totalTurns += result.turns;
        }
        
        // 清除进度条
        if (typeof process !== 'undefined' && process.stdout) {
          clearLine();
        }
        
        const winRate = aiWins / tuningConfig.gamesPerConfig;
        const avgScore = totalScore / tuningConfig.gamesPerConfig;
        const avgTurns = totalTurns / tuningConfig.gamesPerConfig;
        const configTime = Date.now() - configStartTime;
        
        const gameResult: GameResult = {
          config,
          aiWins,
          totalGames: tuningConfig.gamesPerConfig,
          winRate,
          avgScore,
          avgTurns
        };
        
        results.push(gameResult);
      }
    }
  }
  
  const totalTime = Date.now() - overallStartTime;
  
  // 按胜率排序
  results.sort((a, b) => b.winRate - a.winRate);
  
  return results;
}

// 快速测试单个配置
export async function quickTestConfig(
  config: MCTSConfig,
  playerCount: number = 4,
  games: number = 100
): Promise<GameResult> {
  
  // 估算时间
  const estimatedTime = games * 8; // 每局约8秒
  const estimatedMinutes = Math.floor(estimatedTime / 60);
  const estimatedSeconds = estimatedTime % 60;
  if (estimatedMinutes > 0 || estimatedSeconds > 10) {
  }
  
  const startTime = Date.now();
  let aiWins = 0;
  let totalScore = 0;
  let totalTurns = 0;
  
  for (let game = 0; game < games; game++) {
    // 显示进度条（在游戏开始前）
    if (typeof process !== 'undefined' && process.stdout) {
      updateProgressBar({
        total: games,
        current: game + 1,
        width: 40,
        showPercentage: true,
        showTime: true,
        startTime: startTime,
        label: `游戏${game + 1}/${games}`
      });
    } else {
      // 浏览器环境
      if ((game + 1) % Math.max(1, Math.floor(games / 10)) === 0 || game === 0) {
        const progress = ((game + 1) / games * 100).toFixed(1);
      }
    }
    
    // 显示当前正在运行的游戏
    const gameStartTime = Date.now();
    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write(`\r正在运行第 ${game + 1}/${games} 局游戏...`);
    }
    
    const result = runSingleGame(
      config,
      playerCount,
      config.perfectInformation || false
    );
    
    // 显示游戏完成信息
    const gameTime = Date.now() - gameStartTime;
    if (typeof process !== 'undefined' && process.stdout) {
      process.stdout.write(`\r第 ${game + 1}/${games} 局完成 (耗时: ${(gameTime / 1000).toFixed(1)}秒) - ${result.winner === 0 ? 'AI胜' : '对手胜'}\n`);
    }
    
    if (result.winner === 0) {
      aiWins++;
    }
    totalScore += result.aiScore;
    totalTurns += result.turns;
  }
  
  // 清除进度条
  if (typeof process !== 'undefined' && process.stdout) {
    clearLine();
  }
  
  const winRate = aiWins / games;
  const avgScore = totalScore / games;
  const avgTurns = totalTurns / games;
  const elapsed = Date.now() - startTime;
  
  const gameResult: GameResult = {
    config,
    aiWins,
    totalGames: games,
    winRate,
    avgScore,
    avgTurns
  };
  
  return gameResult;
}

