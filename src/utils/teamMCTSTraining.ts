/**
 * 团队MCTS训练系统
 * 用于训练和优化团队模式的MCTS参数
 */

import { Card, GameStatus } from '../types/card';
import { TeamConfig } from '../types/team';
import { 
  MCTSTeamConfig, 
  TeamGameResult, 
  SingleTeamGameResult,
  TeamSimulatedGameState 
} from '../ai/types';
import { teamMCTS } from '../ai/mcts/teamMCTS';
import { generateAllCards } from './cardUtils';
import { shuffleArray } from './arrayUtils';

/**
 * 运行单局团队游戏（用于训练）
 */
export function runTeamGame(
  config: MCTSTeamConfig,
  playerCount: 4 | 6,
  teamConfig: TeamConfig
): SingleTeamGameResult {
  // 1. 初始化游戏
  const allCards = generateAllCards();
  shuffleArray(allCards);
  
  // 分配手牌
  const hands: Card[][] = [];
  const cardsPerPlayer = Math.floor(allCards.length / playerCount);
  
  for (let i = 0; i < playerCount; i++) {
    hands.push(allCards.slice(i * cardsPerPlayer, (i + 1) * cardsPerPlayer));
  }
  
  // 2. 初始化团队游戏状态
  const playerTeams = new Map<number, number>();
  teamConfig.teams.forEach(team => {
    team.players.forEach(playerId => {
      playerTeams.set(playerId, team.id);
    });
  });
  
  const teamScores = new Map<number, number>();
  teamConfig.teams.forEach(team => {
    teamScores.set(team.id, 0);
  });
  
  const state: TeamSimulatedGameState = {
    aiHand: hands[0],
    opponentHands: hands.slice(1),
    allHands: hands,
    lastPlay: null,
    lastPlayPlayerIndex: null,
    currentPlayerIndex: 0,
    playerCount,
    roundScore: 0,
    aiScore: 0,
    isTerminal: false,
    winner: null,
    perfectInformation: config.perfectInformation || false,
    teamConfig,
    teamScores,
    playerTeams,
    canPass: false,
    lastPassPlayerIndex: null,
    teammateHands: [],
    opponentTeamHands: [],
    roundContext: {
      roundNumber: 1,
      roundScore: 0,
      expectedTeamBenefit: 0,
      strategicPassOpportunity: false
    }
  };
  
  // 3. 游戏主循环
  let turnCount = 0;
  const maxTurns = 1000;
  const strategicPassEvents: Array<{
    playerId: number;
    round: number;
    successful: boolean;
    benefit: number;
  }> = [];
  const cooperationEvents: Array<{
    type: string;
    playerId: number;
    teammateId: number;
    benefit: number;
  }> = [];
  
  while (!state.isTerminal && turnCount < maxTurns) {
    const currentHand = state.allHands[state.currentPlayerIndex];
    
    if (currentHand.length === 0) {
      // 玩家已经出完牌
      state.currentPlayerIndex = (state.currentPlayerIndex + 1) % playerCount;
      continue;
    }
    
    // AI玩家（玩家0）使用团队MCTS
    if (state.currentPlayerIndex === 0) {
      const action = teamMCTS(currentHand, state, config);
      
      if (!action) {
        // 没有可用动作
        state.lastPlay = null;
        state.lastPlayPlayerIndex = null;
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % playerCount;
        turnCount++;
        continue;
      }
      
      // 记录主动要不起事件
      if (action.type === 'pass' && action.strategic) {
        strategicPassEvents.push({
          playerId: 0,
          round: state.roundContext.roundNumber,
          successful: false, // 稍后评估
          benefit: 0
        });
      }
      
      // 执行动作
      if (action.type === 'play') {
        // 移除出的牌
        state.allHands[0] = currentHand.filter(card => 
          !action.cards.some(c => c.id === card.id)
        );
        state.lastPlayPlayerIndex = 0;
        
        // 累计分数
        const cardScore = action.cards.reduce((sum, card) => {
          if (card.rank === 3) return sum + 5;
          if (card.rank === 8) return sum + 10;
          if (card.rank === 11) return sum + 10;
          return sum;
        }, 0);
        state.roundScore += cardScore;
      }
    } else {
      // 其他玩家使用简单策略
      // 简化版：随机出最小的能打过的牌
      const currentTeamId = playerTeams.get(state.currentPlayerIndex)!;
      
      // 找到最小的能打过的牌
      let played = false;
      if (currentHand.length > 0) {
        // 简化：出第一张牌
        const cardToPlay = currentHand[0];
        state.allHands[state.currentPlayerIndex] = currentHand.slice(1);
        state.lastPlayPlayerIndex = state.currentPlayerIndex;
        played = true;
      }
      
      if (!played) {
        state.lastPlay = null;
      }
    }
    
    // 检查游戏是否结束
    let finishedCount = 0;
    for (let i = 0; i < playerCount; i++) {
      if (state.allHands[i].length === 0) {
        finishedCount++;
      }
    }
    
    if (finishedCount >= playerCount - 1) {
      state.isTerminal = true;
      break;
    }
    
    // 下一个玩家
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % playerCount;
    turnCount++;
  }
  
  // 4. 计算最终结果
  const finalTeamScores = new Map(state.teamScores);
  const playerScores = new Map<number, number>();
  
  // 简化：根据出完牌的顺序分配分数
  for (let i = 0; i < playerCount; i++) {
    playerScores.set(i, state.allHands[i].length === 0 ? 100 : 0);
  }
  
  // 确定获胜团队
  let maxScore = -Infinity;
  let winningTeam = -1;
  for (const [teamId, score] of finalTeamScores.entries()) {
    if (score > maxScore) {
      maxScore = score;
      winningTeam = teamId;
    }
  }
  
  return {
    winningTeam,
    finalTeamScores,
    strategicPassEvents,
    cooperationEvents,
    turns: turnCount,
    rounds: state.roundContext.roundNumber,
    playerScores,
    finishOrder: []
  };
}

/**
 * 训练团队MCTS参数
 */
export async function trainTeamMCTS(
  configs: MCTSTeamConfig[],
  gamesPerConfig: number,
  playerCount: 4 | 6,
  teamConfig: TeamConfig,
  onProgress?: (progress: number, current: number, total: number) => void
): Promise<TeamGameResult[]> {
  const results: TeamGameResult[] = [];
  const totalGames = configs.length * gamesPerConfig;
  let completedGames = 0;
  
  for (const config of configs) {
    let teamWins = 0;
    let totalTeamScore = 0;
    let totalStrategicPassCount = 0;
    let totalStrategicPassSuccess = 0;
    let totalTurns = 0;
    let totalRounds = 0;
    
    const aiTeamId = teamConfig.teams.find(t => t.players.includes(0))?.id || 0;
    
    for (let game = 0; game < gamesPerConfig; game++) {
      const result = runTeamGame(config, playerCount, teamConfig);
      
      // 统计
      if (result.winningTeam === aiTeamId) {
        teamWins++;
      }
      
      const aiTeamScore = result.finalTeamScores.get(aiTeamId) || 0;
      totalTeamScore += aiTeamScore;
      
      // 主动要不起统计
      const aiStrategicPasses = result.strategicPassEvents.filter(
        e => e.playerId === 0
      );
      totalStrategicPassCount += aiStrategicPasses.length;
      
      const successfulPasses = aiStrategicPasses.filter(e => e.successful);
      totalStrategicPassSuccess += successfulPasses.length;
      
      totalTurns += result.turns;
      totalRounds += result.rounds;
      
      completedGames++;
      if (onProgress) {
        onProgress(completedGames / totalGames, completedGames, totalGames);
      }
    }
    
    // 计算平均指标
    const teamWinRate = teamWins / gamesPerConfig;
    const avgTeamScore = totalTeamScore / gamesPerConfig;
    const avgStrategicPassPerGame = totalStrategicPassCount / gamesPerConfig;
    const strategicPassSuccessRate = totalStrategicPassCount > 0 
      ? totalStrategicPassSuccess / totalStrategicPassCount 
      : 0;
    const avgTurns = totalTurns / gamesPerConfig;
    const avgRounds = totalRounds / gamesPerConfig;
    
    results.push({
      config,
      teamWins,
      totalGames: gamesPerConfig,
      teamWinRate,
      avgTeamScore,
      strategicPassCount: totalStrategicPassCount,
      avgStrategicPassPerGame,
      strategicPassSuccessRate,
      avgCooperationScore: 0, // TODO: 实现团队配合评分
      avgTurns,
      avgRounds
    });
  }
  
  // 按综合得分排序
  results.sort((a, b) => evaluateTeamConfig(b) - evaluateTeamConfig(a));
  
  return results;
}

/**
 * 评估团队配置的综合得分
 */
function evaluateTeamConfig(result: TeamGameResult): number {
  let score = 0;
  
  // 1. 团队胜率（最重要，权重40%）
  score += result.teamWinRate * 0.4;
  
  // 2. 团队得分（重要，权重30%）
  const normalizedScore = Math.min(1, result.avgTeamScore / 200);
  score += normalizedScore * 0.3;
  
  // 3. 主动要不起成功率（重要，权重15%）
  score += result.strategicPassSuccessRate * 0.15;
  
  // 4. 团队配合得分（中等，权重10%）
  const normalizedCooperation = Math.min(1, result.avgCooperationScore / 100);
  score += normalizedCooperation * 0.1;
  
  // 5. 效率（回合数，权重5%）
  const efficiency = 1 / (1 + result.avgTurns / 100);
  score += efficiency * 0.05;
  
  return score;
}

/**
 * 快速测试团队配置
 */
export function quickTestTeamConfig(
  config: MCTSTeamConfig,
  games: number = 10,
  playerCount: 4 | 6 = 4
): TeamGameResult {
  // 创建默认团队配置
  const teamConfig: TeamConfig = {
    enabled: true,
    mode: playerCount === 4 ? 'fixed_2v2' : 'fixed_3v3',
    teams: playerCount === 4 
      ? [
          { id: 0, name: '团队A', players: [0, 2], score: 0 },
          { id: 1, name: '团队B', players: [1, 3], score: 0 }
        ]
      : [
          { id: 0, name: '团队A', players: [0, 2, 4], score: 0 },
          { id: 1, name: '团队B', players: [1, 3, 5], score: 0 }
        ]
  };
  
  let teamWins = 0;
  let totalTeamScore = 0;
  let totalStrategicPassCount = 0;
  let totalTurns = 0;
  
  const aiTeamId = 0;
  
  for (let i = 0; i < games; i++) {
    const result = runTeamGame(config, playerCount, teamConfig);
    
    if (result.winningTeam === aiTeamId) {
      teamWins++;
    }
    
    totalTeamScore += result.finalTeamScores.get(aiTeamId) || 0;
    totalStrategicPassCount += result.strategicPassEvents.length;
    totalTurns += result.turns;
  }
  
  return {
    config,
    teamWins,
    totalGames: games,
    teamWinRate: teamWins / games,
    avgTeamScore: totalTeamScore / games,
    strategicPassCount: totalStrategicPassCount,
    avgStrategicPassPerGame: totalStrategicPassCount / games,
    strategicPassSuccessRate: 0,
    avgCooperationScore: 0,
    avgTurns: totalTurns / games,
    avgRounds: 1
  };
}

