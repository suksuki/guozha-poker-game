/**
 * 快速游戏运行器
 * 用于训练模式，无UI，加速对局
 */

import { Game } from '../../utils/Game';
import { Card, Play } from '../../types/card';
import { DecisionTrainingSample } from '../../types/training';
import { ChatTrainingSample } from '../../types/training';
import { aiChoosePlay } from '../../utils/aiPlayer';
import { SimplifiedGameSimulator } from './SimplifiedGameSimulator';
import { dealCards } from '../../utils/cardUtils';

export interface FastGameConfig {
  speedMultiplier?: number;  // 速度倍数
  skipUI?: boolean;          // 跳过UI渲染
  skipTTS?: boolean;        // 跳过TTS播放
}

export interface FastGameResult {
  gameId: string;
  winner: number;
  duration: number;
  decisions: DecisionTrainingSample[];
  chats: ChatTrainingSample[];
}

export interface GameRunOptions {
  playerCount: number;
  collectDecisions?: boolean;
  collectChats?: boolean;
}

export class FastGameRunner {
  private config: FastGameConfig;
  private stopRequested: boolean = false;
  private useSimplifiedSimulator: boolean = true; // 默认使用简化模拟器
  
  constructor(config: FastGameConfig) {
    this.config = {
      speedMultiplier: 10,
      skipUI: true,
      skipTTS: true,
      ...config
    };
  }
  
  /**
   * 设置是否使用简化模拟器
   */
  setUseSimplifiedSimulator(use: boolean): void {
    this.useSimplifiedSimulator = use;
  }
  
  /**
   * 运行游戏
   */
  async runGame(options: GameRunOptions): Promise<FastGameResult> {
    const startTime = Date.now();
    this.stopRequested = false;
    
    // 如果使用简化模拟器，使用更快的路径
    if (this.useSimplifiedSimulator) {
      return await this.runSimplifiedGame(options);
    }
    
    const decisions: DecisionTrainingSample[] = [];
    const chats: ChatTrainingSample[] = [];
    
    // 创建游戏配置
    const gameConfig = {
      playerCount: options.playerCount,
      humanPlayerIndex: 0,
      aiConfigs: Array(options.playerCount - 1).fill(null).map(() => ({
        strategy: 'balanced' as const,
        algorithm: 'mcts' as const
      })),
      skipDealingAnimation: true,
      dealingSpeed: 0
    };
    
    // 创建游戏实例
    const game = new Game(gameConfig);
    
    // 开始游戏（手牌会在内部生成）
    const hands: Card[][] = []; // Game会内部生成手牌
    game.startNewGame(hands);
    
    // 训练模式：减少初始化等待时间
    await new Promise(resolve => setTimeout(resolve, 50));
    
    // 设置所有玩家为AI模式（训练模式下）
    game.setAutoPlay(true);
    
    // 禁用语音服务检查（训练模式下不需要）
    // 注意：这需要在Game类中添加支持，或者通过配置禁用
    
    // 游戏循环（用于训练）
    let roundCount = 0;
    const maxRounds = 1000; // 防止无限循环
    let consecutivePasses = 0; // 连续要不起次数
    const maxConsecutivePasses = 4; // 最多连续4次要不起后重置
    let lastPlayerIndex = -1; // 记录上一个玩家，用于检测是否卡住
    
    while (game.status === 'playing' && roundCount < maxRounds && !this.stopRequested) {
      const currentPlayer = game.currentPlayerIndex;
      const player = game.players[currentPlayer];
      
      // 检查玩家是否存在
      if (!player) {
        console.warn(`[FastGameRunner] 玩家${currentPlayer}不存在，跳过`);
        roundCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        continue;
      }
      
      // 检查玩家是否已出完牌
      if (player.hand.length === 0) {
        // 玩家已出完牌，等待下一个玩家
        roundCount++;
        await new Promise(resolve => setTimeout(resolve, 10));
        continue;
      }
      
      // 检测是否卡住（同一个玩家连续多次）
      if (currentPlayer === lastPlayerIndex) {
        consecutivePasses++;
        if (consecutivePasses >= maxConsecutivePasses) {
          console.log('[FastGameRunner] 检测到游戏卡住，重置lastPlay');
          // 重置lastPlay，让下家可以自由出牌
          const currentRound = game.getCurrentRound();
          if (currentRound) {
            currentRound.lastPlay = null;
          }
          consecutivePasses = 0;
        }
      } else {
        consecutivePasses = 0;
      }
      lastPlayerIndex = currentPlayer;
      
      const currentRound = game.getCurrentRound();
      const lastPlay = currentRound?.getLastPlay() || null;
      
      try {
        // 获取AI决策（使用真实的AI逻辑）
        const decision = await this.getAIDecision(player.hand, lastPlay, currentPlayer);
        
        if (decision && decision.length > 0) {
          // 收集决策数据
          if (options.collectDecisions) {
            const sample = this.createDecisionSample(game, currentPlayer, decision);
            decisions.push(sample);
          }
          
          // 执行出牌（使用Game类的playCards方法）
          const success = await game.playCards(currentPlayer, decision);
          if (success) {
            consecutivePasses = 0; // 重置连续要不起计数
          } else {
            console.warn(`[FastGameRunner] 出牌失败，改为要不起`);
            // 出牌失败，改为要不起
            await game.passCards(currentPlayer);
            consecutivePasses++;
          }
        } else {
          // 要不起
          await game.passCards(currentPlayer);
          consecutivePasses++;
        }
      } catch (error) {
        console.error(`[FastGameRunner] AI决策失败:`, error);
        // 出错时改为要不起
        try {
          await game.passCards(currentPlayer);
        } catch (passError) {
          console.error(`[FastGameRunner] 要不起也失败:`, passError);
        }
        consecutivePasses++;
      }
      
      roundCount++;
      
      // 训练模式：移除延迟，最大化速度
      // 只在必要时短暂延迟（每100轮延迟1ms，避免阻塞）
      if (roundCount % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    // 如果游戏还没结束，强制结束
    if (game.status === 'playing') {
      console.log(`[FastGameRunner] 达到最大轮次限制(${maxRounds})，强制结束游戏`);
    }
    
    const duration = Date.now() - startTime;
    
    return {
      gameId: `fast-${Date.now()}`,
      winner: game.winner || 0,
      duration,
      decisions,
      chats
    };
  }
  
  /**
   * 停止游戏
   */
  stop(): void {
    this.stopRequested = true;
  }
  
  /**
   * 获取AI决策
   */
  private async getAIDecision(hand: Card[], lastPlay: Play | null, playerId: number): Promise<Card[] | null> {
    if (!hand || hand.length === 0) {
      return null;
    }
    
    try {
      // 训练模式下使用更少的MCTS迭代次数以提高速度
      // 正常游戏：100-1000次迭代
      // 训练模式：10-20次迭代（速度优先）
      const decision = await aiChoosePlay(hand, lastPlay, {
        strategy: 'balanced',
        algorithm: 'mcts',
        mctsIterations: 10 // 训练模式：大幅减少迭代次数
      });
      
      return decision;
    } catch (error) {
      console.error(`[FastGameRunner] AI决策出错:`, error);
      // 出错时返回null（要不起）
      return null;
    }
  }
  
  /**
   * 创建决策样本
   */
  private createDecisionSample(game: Game, playerId: number, decision: Card[]): DecisionTrainingSample {
    const player = game.players[playerId];
    const currentRound = game.currentRound;
    
    return {
      gameState: {
        hand: [...player.hand],
        lastPlay: currentRound?.lastPlay || null,
        playerCount: game.playerCount,
        scores: game.players.map(p => p.score),
        round: game.currentRoundIndex,
        phase: this.determinePhase(game)
      },
      decision: {
        action: decision,
        mctsScore: 0.5, // TODO: 从实际MCTS获取
        confidence: 0.5, // TODO: 从实际决策获取
        alternatives: [],
        reasoning: '训练模式决策'
      },
      mctsParams: {
        iterations: 100,
        explorationConstant: 1.414,
        simulationDepth: 20,
        perfectInformation: false
      },
      outcome: {
        gameWon: false, // 游戏结束后更新
        roundScore: 0,
        finalRank: 0,
        quality: 'neutral'
      },
      metadata: {
        timestamp: Date.now(),
        trainingRound: 0,
        modelVersion: '1.0.0'
      }
    };
  }
  
  /**
   * 确定游戏阶段
   */
  private determinePhase(game: Game): 'early' | 'mid' | 'late' | 'critical' {
    const totalRounds = game.rounds.length;
    const currentRound = game.currentRoundIndex;
    
    if (currentRound < totalRounds * 0.3) {
      return 'early';
    } else if (currentRound < totalRounds * 0.7) {
      return 'mid';
    } else if (currentRound < totalRounds * 0.9) {
      return 'late';
    } else {
      return 'critical';
    }
  }
  
  /**
   * 使用简化模拟器运行游戏（更快，完全信息模式，异步实现）
   */
  private async runSimplifiedGame(options: GameRunOptions): Promise<FastGameResult> {
    const simulator = new SimplifiedGameSimulator();
    
    // MCTS配置（训练模式：减少迭代次数以提高速度）
    const mctsConfig: MCTSConfig = {
      iterations: 10, // 训练模式：大幅减少迭代次数
      explorationConstant: 1.414,
      simulationDepth: 20,
      perfectInformation: true, // 完全信息模式
      playerCount: options.playerCount
    };
    
    // 运行游戏（异步，会定期让出控制权）
    const result = await simulator.runGame(
      undefined, // 不提供手牌，自动发牌
      options.collectDecisions || false,
      options.playerCount,
      mctsConfig
    );
    
    return {
      gameId: `fast-simplified-${Date.now()}`,
      winner: result.winner,
      duration: result.duration,
      decisions: result.decisions || [], // 确保返回数组
      chats: [] // 简化模拟器暂不支持聊天收集
    };
  }
}

