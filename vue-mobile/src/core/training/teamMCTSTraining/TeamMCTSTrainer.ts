/**
 * 团队MCTS训练系统（增强版）
 * 支持自对弈训练、参数自动调优、训练数据分析
 */

import { Game } from '@/core/game-engine/Game';
import { GameEngine } from '@/core/game-engine/GameEngine';
import { MCTSTeamConfig } from '@/core/ai/types';
import { TeamConfig } from '@/core/types/team';
import { Card, Play } from '@/core/types/card';
import { teamMCTS } from '@/core/ai/mcts/teamMCTS';
import { AIConfigStore } from '@/core/ai/config/AIConfigStore';
import { TeamSimulatedGameState } from '@/core/ai/types';
import { canPlayCards } from '@/core/utils/cardUtils';

export interface TrainingGameResult {
  gameId: string;
  winningTeam: number;
  finalTeamScores: Map<number, number>;
  finishOrder: number[];
  strategicPassCount: number;
  strategicPassSuccessCount: number;
  cooperationEvents: CooperationEvent[];
  turns: number;
  rounds: number;
  config: MCTSTeamConfig;
  duration: number;
}

export interface CooperationEvent {
  type: 'strategic_pass' | 'teammate_support' | 'opponent_block';
  playerId: number;
  teammateId?: number;
  round: number;
  benefit: number;
  successful: boolean;
}

export interface TrainingMetrics {
  totalGames: number;
  teamWinRate: number;
  avgTeamScore: number;
  avgStrategicPassPerGame: number;
  strategicPassSuccessRate: number;
  avgCooperationScore: number;
  avgTurns: number;
  avgRounds: number;
}

export interface TrainingProgress {
  currentGame: number;
  totalGames: number;
  currentConfig: number;
  totalConfigs: number;
  metrics: TrainingMetrics;
  bestConfig?: MCTSTeamConfig;
  bestScore: number;
}

/**
 * 团队MCTS训练器
 */
export class TeamMCTSTrainer {
  private onProgress?: (progress: TrainingProgress) => void;
  private shouldStop: boolean = false;
  private errorCount: number = 0;
  private maxErrors: number = 50; // 最大错误数，超过后自动停止

  /**
   * 运行单局训练游戏（使用真实GameEngine）
   */
  async runTrainingGame(
    config: MCTSTeamConfig,
    teamConfig: TeamConfig
  ): Promise<TrainingGameResult> {
    const startTime = Date.now();
    const gameId = `training-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // 创建游戏实例
    const game = new Game({
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: true
    });

    game.startGame();

    // 验证初始手牌总数
    const initialTotalCards = game.players.reduce((sum, p) => sum + (p?.hand.length || 0), 0);
    const expectedTotalCards = 216; // 4副牌，每副54张
    if (initialTotalCards !== expectedTotalCards) {
      // 如果初始手牌就不对，这个游戏无法继续，返回一个失败的结果
      throw new Error(`游戏初始化失败：手牌总数异常（${initialTotalCards} != ${expectedTotalCards}）`);
    }

    const strategicPassEvents: CooperationEvent[] = [];
    let turnCount = 0;
    let roundCount = 1;

    // 游戏主循环
    // 正常一局游戏：总共216张牌，4人平均每人54张
    // 如果平均每次出4张牌，每人最多出13-14次，4人总共最多52-56次出牌
    // 加上一些pass，正常游戏最多70回合左右
    // 设置上限为100回合，超过肯定卡住了
    const maxTurns = 100; // 最大回合数（每次玩家行动算一个回合）
    const maxRounds = 20; // 最大轮次数（有人出完牌开始新轮，正常游戏10-15轮）
    const startGameTime = Date.now();
    const maxGameTime = 2 * 60 * 1000; // 最多2分钟一局游戏

    while (game.status === 'playing' && turnCount < maxTurns && roundCount <= maxRounds) {
      // 每10个回合让出一次控制权，避免长时间阻塞主线程
      if (turnCount % 10 === 0 && turnCount > 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // 检查是否应该停止
      if (this.shouldStop || this.errorCount >= this.maxErrors) {
        break;
      }

      // 检查游戏超时
      if (Date.now() - startGameTime > maxGameTime) {
        break;
      }

      // 检查游戏状态（可能在上一轮已经结束）
      if ((game.status as string) === 'finished') {
        break;
      }

      const currentPlayerIndex = game.currentPlayerIndex;
      if (currentPlayerIndex < 0) {
        break;
      }

      const currentPlayer = game.players[currentPlayerIndex];
      if (!currentPlayer) {
        turnCount++;
        continue;
      }

      // 如果玩家手牌为空，检查游戏是否应该结束
      if (currentPlayer.hand.length === 0) {
        // 等待一小段时间，让游戏引擎更新状态
        await new Promise(resolve => setTimeout(resolve, 10));

        // 再次检查游戏状态
        if ((game.status as string) === 'finished') {
          break;
        }

        // 如果游戏还在进行，继续下一轮
        turnCount++;
        continue;
      }

      // 所有玩家都使用MCTS（自对弈训练）
      let action: { type: 'play'; cards: Card[] } | { type: 'pass'; strategic: boolean } | null = null;
      try {
        action = await this.getMCTSAction(
          currentPlayer.hand,
          game,
          currentPlayerIndex,
          config,
          teamConfig
        );
      } catch (error) {
        this.errorCount++;

        // 如果错误太多，停止训练
        if (this.errorCount >= this.maxErrors) {
          this.shouldStop = true;
          break;
        }

        // 出错时自动pass
        action = null;
      }

      if (!action) {
        // 没有可用动作，自动pass
        const passResult = game.pass(currentPlayerIndex);
        if (!passResult.success) {
          this.errorCount++;

          // 如果错误太多，停止训练
          if (this.errorCount >= this.maxErrors) {
            this.shouldStop = true;
            break;
          }

          // 如果pass也失败，尝试跳过这个玩家
          turnCount++;
          continue;
        }
        turnCount++;
        continue;
      }

      if (action.type === 'play') {
        const result = game.playCards(currentPlayerIndex, action.cards);
        if (!result.success) {
          this.errorCount++;

          // 出牌失败，自动pass
          const passResult = game.pass(currentPlayerIndex);
          if (!passResult.success) {
            this.errorCount++;

            // 如果错误太多，停止训练
            if (this.errorCount >= this.maxErrors) {
              this.shouldStop = true;
              break;
            }

            // 跳过这个玩家
            turnCount++;
            continue;
          }
        }
      } else if (action.type === 'pass') {
        const passResult = game.pass(currentPlayerIndex);
        if (!passResult.success) {
          this.errorCount++;

          // 如果错误太多，停止训练
          if (this.errorCount >= this.maxErrors) {
            this.shouldStop = true;
            break;
          }

          // 跳过这个玩家
          turnCount++;
          continue;
        }
        if (action.strategic) {
          strategicPassEvents.push({
            type: 'strategic_pass',
            playerId: currentPlayerIndex,
            round: roundCount,
            benefit: 0, // 稍后评估
            successful: false // 稍后评估
          });
        }
      }

      turnCount++;

      // 检查是否进入新轮次
      if (game.state.currentRoundIndex !== roundCount - 1) {
        roundCount = game.state.currentRoundIndex + 1;
      }

      // 检查游戏是否结束（在每次操作后都检查）
      if ((game.status as string) === 'finished') {
        break;
      }

      // 防止无限循环：如果连续很多回合都没有进展，强制结束
      if (turnCount > 30 && turnCount % 50 === 0) {
        const activePlayers = game.players.filter(p => p && p.hand.length > 0).length;
        const totalCards = game.players.reduce((sum, p) => sum + (p?.hand.length || 0), 0);

        // 检查手牌总数是否异常（应该是216张）
        if (totalCards > 216) {
          this.shouldStop = true;
          break;
        }

        // 如果回合数超过70，肯定卡住了（正常游戏最多70回合）
        if (turnCount > 70 && activePlayers > 0) {
          break;
        }

        // 如果轮次过多，也可能卡住了（正常游戏10-15轮）
        if (roundCount > 15) {
          break;
        }
      }
    }

    const duration = Date.now() - startTime;

    // 计算最终结果
    const finalTeamScores = new Map<number, number>();
    const gameTeamConfig = game.state.teamConfig;
    if (gameTeamConfig) {
      gameTeamConfig.teams.forEach(team => {
        finalTeamScores.set(team.id, team.teamScore);
      });
    }

    // 确定获胜团队
    let winningTeam = -1;
    let maxScore = -Infinity;
    for (const [teamId, score] of finalTeamScores.entries()) {
      if (score > maxScore) {
        maxScore = score;
        winningTeam = teamId;
      }
    }

    // 评估strategic pass的成功率
    const strategicPassSuccessCount = this.evaluateStrategicPasses(
      strategicPassEvents,
      game,
      teamConfig
    );

    return {
      gameId,
      winningTeam,
      finalTeamScores,
      finishOrder: [...game.finishOrder],
      strategicPassCount: strategicPassEvents.length,
      strategicPassSuccessCount,
      cooperationEvents: strategicPassEvents,
      turns: turnCount,
      rounds: roundCount,
      config,
      duration
    };
  }

  /**
   * 获取MCTS动作
   */
  private async getMCTSAction(
    hand: Card[],
    game: Game,
    playerIndex: number,
    config: MCTSTeamConfig,
    teamConfig: TeamConfig
  ): Promise<{ type: 'play'; cards: Card[] } | { type: 'pass'; strategic: boolean } | null> {
    try {
      // 验证输入
      if (!hand || hand.length === 0) {
        return null;
      }

      if (!game || !game.players || playerIndex < 0 || playerIndex >= game.players.length) {
        return null;
      }

      // 构建TeamSimulatedGameState
      const state = this.convertGameStateToTeamState(game, playerIndex, teamConfig);

      // 验证状态
      if (!state || !state.allHands || state.allHands.length !== game.players.length) {
        return null;
      }

      // 验证hand和state的兼容性
      if (!state.allHands[playerIndex] || state.allHands[playerIndex].length !== hand.length) {
        // 尝试修复：使用实际的手牌
        hand = state.allHands[playerIndex] || hand;
      }

      // 调用teamMCTS（用try-catch包装，防止内部异常）
      let action;
      try {
        action = teamMCTS(hand, state, config);
      } catch (mctsError) {
        return null;
      }

      if (!action) {
        return null;
      }

      return action;
    } catch (error) {
      // 重新抛出错误，让调用者处理
      throw error;
    }
  }

  /**
   * 将Game状态转换为TeamSimulatedGameState
   */
  private convertGameStateToTeamState(
    game: Game,
    currentPlayerIndex: number,
    teamConfig: TeamConfig
  ): TeamSimulatedGameState {
    try {
      const currentRound = game.currentRound;
      // 检查 currentRound 是否存在，以及 plays 是否有记录
      const lastPlayRecord = (currentRound && currentRound.plays.length > 0)
        ? currentRound.plays[currentRound.plays.length - 1]
        : null;

      // 将RoundPlayRecord转换为Play类型
      let lastPlay: Play | null = null;
      if (lastPlayRecord && lastPlayRecord.cards.length > 0) {
        const play = canPlayCards(lastPlayRecord.cards);
        if (play) {
          lastPlay = play;
        }
      }

      const playerTeams = new Map<number, number>();
      teamConfig.teams.forEach(team => {
        team.players.forEach(playerId => {
          playerTeams.set(playerId, team.id);
        });
      });

      const teamScores = new Map<number, number>();
      teamConfig.teams.forEach(team => {
        teamScores.set(team.id, team.teamScore || 0);
      });

      const allHands = game.players.map(p => {
        if (!p || !p.hand) {
          return [];
        }
        return [...p.hand];
      });

      // 验证currentPlayerIndex有效性
      if (currentPlayerIndex < 0 || currentPlayerIndex >= allHands.length) {
        throw new Error(`无效的玩家索引: ${currentPlayerIndex}, 玩家数量: ${allHands.length}`);
      }

      return {
        aiHand: allHands[currentPlayerIndex] || [],
        opponentHands: allHands.filter((_, idx) => idx !== currentPlayerIndex),
        allHands,
        lastPlay,
        lastPlayPlayerIndex: lastPlayRecord ? lastPlayRecord.playerId : null,
        currentPlayerIndex,
        playerCount: game.players.length,
        roundScore: currentRound?.roundScore || 0,
        aiScore: game.players[currentPlayerIndex]?.score || 0,
        isTerminal: game.status === 'finished',
        winner: game.state.winner,
        perfectInformation: false,
        teamConfig,
        teamScores,
        playerTeams,
        canPass: lastPlay !== null,
        lastPassPlayerIndex: null,
        teammateHands: [],
        opponentTeamHands: [],
        roundContext: {
          roundNumber: currentRound?.roundNumber || 1,
          roundScore: currentRound?.roundScore || 0,
          expectedTeamBenefit: 0,
          strategicPassOpportunity: lastPlay !== null
        }
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error(`转换游戏状态失败: ${errorMessage}`);
    }
  }

  /**
   * 评估strategic pass的成功率
   */
  private evaluateStrategicPasses(
    events: CooperationEvent[],
    game: Game,
    teamConfig: TeamConfig
  ): number {
    let successCount = 0;

    for (const event of events) {
      const playerTeamId = teamConfig.teams.find(t =>
        t.players.includes(event.playerId)
      )?.id;

      if (playerTeamId === undefined) continue;

      // 检查队友是否在后续回合中获得了优势
      const teammateId = teamConfig.teams
        .find(t => t.id === playerTeamId)
        ?.players.find(p => p !== event.playerId);

      if (teammateId !== undefined) {
        const teammateRank = game.players[teammateId].finishedRank;
        const playerRank = game.players[event.playerId].finishedRank;

        // 如果队友排名更好，说明strategic pass成功
        if (teammateRank !== undefined && playerRank !== undefined && teammateRank !== null && playerRank !== null && teammateRank < playerRank) {
          successCount++;
          event.successful = true;
        }
      }
    }

    return successCount;
  }

  /**
   * 训练多个配置
   */
  async trainConfigs(
    configs: MCTSTeamConfig[],
    gamesPerConfig: number,
    teamConfig: TeamConfig,
    onProgress?: (progress: TrainingProgress) => void
  ): Promise<Map<MCTSTeamConfig, TrainingMetrics>> {
    this.onProgress = onProgress;
    this.shouldStop = false;
    this.errorCount = 0; // 重置错误计数

    const results = new Map<MCTSTeamConfig, TrainingMetrics>();
    const totalConfigs = configs.length;
    let bestConfig: MCTSTeamConfig | undefined;
    let bestScore = -Infinity;

    for (let configIdx = 0; configIdx < configs.length; configIdx++) {
      if (this.shouldStop || this.errorCount >= this.maxErrors) {
        break;
      }

      const config = configs[configIdx];
      const metrics = await this.trainSingleConfig(
        config,
        gamesPerConfig,
        teamConfig,
        configIdx,
        totalConfigs
      );

      results.set(config, metrics);

      // 计算综合得分
      const score = this.evaluateConfig(metrics);
      if (score > bestScore) {
        bestScore = score;
        bestConfig = config;
      }

      // 报告进度（使用 setTimeout 来避免阻塞主线程）
      if (this.onProgress) {
        setTimeout(() => {
          if (this.onProgress) {
            this.onProgress({
              currentGame: (configIdx + 1) * gamesPerConfig,
              totalGames: totalConfigs * gamesPerConfig,
              currentConfig: configIdx + 1,
              totalConfigs,
              metrics,
              bestConfig,
              bestScore
            });
          }
        }, 0);
      }
    }

    return results;
  }

  /**
   * 训练单个配置
   */
  private async trainSingleConfig(
    config: MCTSTeamConfig,
    gamesPerConfig: number,
    teamConfig: TeamConfig,
    configIdx: number,
    totalConfigs: number
  ): Promise<TrainingMetrics> {
    let teamWins = 0;
    let totalTeamScore = 0;
    let totalStrategicPassCount = 0;
    let totalStrategicPassSuccess = 0;
    let totalCooperationScore = 0;
    let totalTurns = 0;
    let totalRounds = 0;

    const aiTeamId = teamConfig.teams.find(t => t.players.includes(0))?.id || 0;

    for (let game = 0; game < gamesPerConfig; game++) {
      if (this.shouldStop || this.errorCount >= this.maxErrors) {
        break;
      }

      // 每完成一局游戏后让出控制权，避免阻塞主线程
      if (game > 0 && game % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      let result: TrainingGameResult;
      try {
        result = await this.runTrainingGame(config, teamConfig);
      } catch (error) {
        this.errorCount++;

        // 如果错误太多，停止训练
        if (this.errorCount >= this.maxErrors) {
          this.shouldStop = true;
          break;
        }

        // 跳过这个游戏，继续下一个
        continue;
      }

      // 统计
      if (result.winningTeam === aiTeamId) {
        teamWins++;
      }

      const aiTeamScore = result.finalTeamScores.get(aiTeamId) || 0;
      totalTeamScore += aiTeamScore;

      totalStrategicPassCount += result.strategicPassCount;
      totalStrategicPassSuccess += result.strategicPassSuccessCount;

      // 计算团队配合得分
      const cooperationScore = this.calculateCooperationScore(result);
      totalCooperationScore += cooperationScore;

      totalTurns += result.turns;
      totalRounds += result.rounds;
    }

    return {
      totalGames: gamesPerConfig,
      teamWinRate: teamWins / gamesPerConfig,
      avgTeamScore: totalTeamScore / gamesPerConfig,
      avgStrategicPassPerGame: totalStrategicPassCount / gamesPerConfig,
      strategicPassSuccessRate: totalStrategicPassCount > 0
        ? totalStrategicPassSuccess / totalStrategicPassCount
        : 0,
      avgCooperationScore: totalCooperationScore / gamesPerConfig,
      avgTurns: totalTurns / gamesPerConfig,
      avgRounds: totalRounds / gamesPerConfig
    };
  }

  /**
   * 计算团队配合得分
   */
  private calculateCooperationScore(result: TrainingGameResult): number {
    let score = 0;

    // Strategic pass成功 +10分
    score += result.strategicPassSuccessCount * 10;

    // 队友配合事件 +5分
    const teammateSupportEvents = result.cooperationEvents.filter(
      e => e.type === 'teammate_support' && e.successful
    );
    score += teammateSupportEvents.length * 5;

    // 阻止对手事件 +8分
    const blockEvents = result.cooperationEvents.filter(
      e => e.type === 'opponent_block' && e.successful
    );
    score += blockEvents.length * 8;

    return score;
  }

  /**
   * 评估配置的综合得分
   */
  private evaluateConfig(metrics: TrainingMetrics): number {
    let score = 0;

    // 1. 团队胜率（最重要，权重40%）
    score += metrics.teamWinRate * 0.4;

    // 2. 团队得分（重要，权重30%）
    const normalizedScore = Math.min(1, metrics.avgTeamScore / 200);
    score += normalizedScore * 0.3;

    // 3. 主动要不起成功率（重要，权重15%）
    score += metrics.strategicPassSuccessRate * 0.15;

    // 4. 团队配合得分（中等，权重10%）
    const normalizedCooperation = Math.min(1, metrics.avgCooperationScore / 100);
    score += normalizedCooperation * 0.1;

    // 5. 效率（回合数，权重5%）
    const efficiency = 1 / (1 + metrics.avgTurns / 100);
    score += efficiency * 0.05;

    return score;
  }

  /**
   * 停止训练
   */
  stop(): void {
    this.shouldStop = true;
    this.errorCount = this.maxErrors; // 强制触发停止检查
  }

  /**
   * 生成参数变体（用于参数搜索）
   */
  static generateConfigVariants(baseConfig: MCTSTeamConfig): MCTSTeamConfig[] {
    const variants: MCTSTeamConfig[] = [];

    // 生成多个参数组合
    const cooperationWeights = [0.5, 1.0, 1.5, 2.0];
    const strategicPassWeights = [0.5, 1.0, 1.5, 2.0];
    const roleWeights = [0.5, 1.0, 1.5, 2.0];

    for (const cw of cooperationWeights) {
      for (const spw of strategicPassWeights) {
        for (const rw of roleWeights) {
          variants.push({
            ...baseConfig,
            cooperationWeight: cw,
            strategicPassWeight: spw,
            roleWeight: rw
          });
        }
      }
    }

    return variants;
  }

  /**
   * 保存最佳配置
   */
  static saveBestConfig(config: MCTSTeamConfig): void {
    AIConfigStore.saveConfig(config, true);
  }
}

