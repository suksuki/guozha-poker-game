/**
 * 简化游戏模拟器
 * 专门用于训练，使用老系统的极简实现，最大化速度
 * 参考：src/utils/mctsTuning.ts 的 runSingleGame
 */

import { Card, Play } from '../../types/card';
import { canPlayCards, canBeat, findPlayableCards, hasPlayableCards, dealCards, isScoreCard, calculateCardsScore } from '../../utils/cardUtils';
import { mctsChoosePlay } from '../../utils/mctsAI';
import { DecisionTrainingSample } from '../../types/training';
import { MCTSConfig } from '../../utils/mctsTuning';

export interface SimplifiedGameState {
  players: {
    hand: Card[];
    score: number;
  }[];
  currentPlayerIndex: number;
  lastPlay: Play | null;
  lastPlayPlayerIndex: number | null;
  roundScore: number;
  status: 'playing' | 'finished';
  winner: number | null;
  allHands: Card[][]; // 完全信息：所有玩家的手牌
}

export interface SimulatorResult {
  winner: number;
  duration: number;
  decisions: DecisionTrainingSample[];
  totalRounds: number;
}

export class SimplifiedGameSimulator {
  private state: SimplifiedGameState;
  private decisions: DecisionTrainingSample[] = [];
  private startTime: number = 0;
  
  /**
   * 运行一局游戏（使用老系统的极简实现，最大化速度）
   * 异步版本，定期让出控制权，避免阻塞UI
   * @param hands 可选，如果不提供则自动发牌
   * @param collectDecisions 是否收集决策数据
   * @param playerCount 玩家数量（如果hands未提供）
   * @param mctsConfig MCTS配置（可选）
   */
  async runGame(
    hands?: Card[][],
    collectDecisions: boolean = true,
    playerCount: number = 4,
    mctsConfig?: MCTSConfig
  ): Promise<SimulatorResult> {
    this.startTime = Date.now();
    this.decisions = [];
    
    // 如果没有提供手牌，自动发牌
    const players: Card[][] = hands || dealCards(playerCount);
    
    // 使用老系统的极简实现（完全同步，无异步操作）
    let currentPlayer = 0;
    let lastPlay: Play | null = null;
    let lastPlayPlayer: number | null = null;
    let roundScore = 0;
    let turnCount = 0;
    
    // MCTS配置（完全信息模式）
    const config: MCTSConfig = mctsConfig || {
      iterations: 10,
      explorationConstant: 1.414,
      simulationDepth: 20,
      perfectInformation: true,
      playerCount: playerCount,
      allPlayerHands: players.map(p => [...p]) // 完全信息：所有手牌
    };
    
    // 游戏主循环（完全同步，参考 runSingleGame）
    while (true) {
      turnCount++;
      const currentHand = players[currentPlayer];
      
      // 检查是否有人出完牌
      if (currentHand.length === 0) {
        // 游戏结束，分配分数
        if (lastPlayPlayer !== null && lastPlayPlayer === 0) {
          // AI获胜，获得当前轮次分数
        }
        break;
      }
      
      // AI玩家（索引0）使用MCTS（同步调用）
      if (currentPlayer === 0) {
        const mctsConfigWithState: MCTSConfig = {
          ...config,
          perfectInformation: true,
          allPlayerHands: players.map(p => [...p]), // 完全信息：实时更新所有手牌
          currentRoundScore: roundScore,
          playerCount: playerCount
        };
        
        // 直接调用 mctsChoosePlay（同步，无异步）
        const aiPlay = mctsChoosePlay(currentHand, lastPlay, mctsConfigWithState);
        
        if (!aiPlay || aiPlay.length === 0) {
          // 要不起
          if (lastPlay) {
            lastPlay = null;
            lastPlayPlayer = null;
            currentPlayer = (currentPlayer + 1) % playerCount;
          } else {
            // 所有人都要不起，分配分数
            if (lastPlayPlayer !== null && lastPlayPlayer === 0) {
              // AI获得分数（在结果中记录）
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
        
        // 收集决策数据
        if (collectDecisions) {
          const sample = this.createDecisionSampleSync(players, currentPlayer, aiPlay, play, lastPlay, roundScore, turnCount);
          this.decisions.push(sample);
        }
        
        // 移除已出的牌
        players[0] = currentHand.filter(card => !aiPlay.some(c => c.id === card.id));
        
        // 更新分数
        const scoreCards = aiPlay.filter(card => isScoreCard(card));
        roundScore += calculateCardsScore(scoreCards);
        
        lastPlay = play;
        lastPlayPlayer = 0;
        
        if (players[0].length === 0) {
          // AI获胜
          break;
        }
      } else {
        // 其他玩家使用简单策略（同步，参考 runSingleGame）
        const playableOptions = findPlayableCards(currentHand, lastPlay);
        
        if (playableOptions.length === 0) {
          // 要不起
          if (lastPlay) {
            lastPlay = null;
            lastPlayPlayer = null;
            currentPlayer = (currentPlayer + 1) % playerCount;
          } else {
            // 所有人都要不起，分配分数
            roundScore = 0;
            currentPlayer = (lastPlayPlayer !== null 
              ? (lastPlayPlayer + 1) 
              : (currentPlayer + 1)) % playerCount;
          }
          continue;
        }
        
        // 简单策略：选择最小的能压过的牌
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
          // 该玩家获胜
          break;
        }
      }
      
      currentPlayer = (currentPlayer + 1) % playerCount;
      
      // 定期让出控制权，避免阻塞UI（每10轮让出一次）
      if (turnCount % 10 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      
      // 防止无限循环
      if (turnCount > 1000) {
        // 按剩余手牌数判断胜负
        const minHandLength = Math.min(...players.map(p => p.length));
        const winner = players.findIndex(p => p.length === minHandLength);
        break;
      }
    }
    
    // 确定获胜者
    const minHandLength = Math.min(...players.map(p => p.length));
    const winner = players.findIndex(p => p.length === minHandLength);
    
    const duration = Date.now() - this.startTime;
    
    return {
      winner: winner >= 0 ? winner : 0,
      duration,
      decisions: this.decisions,
      totalRounds: turnCount
    };
  }
  
  /**
   * 执行出牌
   */
  private executePlay(cards: Card[], play: Play): void {
    const playerIndex = this.state.currentPlayerIndex;
    const player = this.state.players[playerIndex];
    
    // 移除已出的牌（从玩家手牌和完全信息中）
    player.hand = player.hand.filter(card => 
      !cards.some(c => c.id === card.id)
    );
    this.state.allHands[playerIndex] = this.state.allHands[playerIndex].filter(card =>
      !cards.some(c => c.id === card.id)
    );
    
    // 更新分数（遵循游戏规则：5、10、K是分牌）
    const scoreCards = cards.filter(c => 
      c.rank === 5 || c.rank === 10 || c.rank === 13 // 5、10、K
    );
    this.state.roundScore += scoreCards.length * 5; // 简化计分：每张分牌5分
    
    // 更新lastPlay
    this.state.lastPlay = play;
    this.state.lastPlayPlayerIndex = playerIndex;
    
    // 检查是否获胜（遵循规则：手牌出完即获胜）
    if (player.hand.length === 0) {
      this.state.status = 'finished';
      this.state.winner = playerIndex;
      // 当前轮次的分数归获胜者
      player.score += this.state.roundScore;
      return;
    }
    
    // 切换到下一个玩家（顺时针）
    this.state.currentPlayerIndex = (this.state.currentPlayerIndex + 1) % this.state.players.length;
  }
  
  /**
   * 执行要不起（遵循游戏规则）
   */
  private executePass(): void {
    const nextPlayer = (this.state.currentPlayerIndex + 1) % this.state.players.length;
    
    // 如果回到出牌玩家，说明所有人都要不起，新轮次开始
    if (this.state.lastPlayPlayerIndex !== null && nextPlayer === this.state.lastPlayPlayerIndex) {
      // 当前轮次的分数归出牌玩家（遵循规则）
      this.state.players[this.state.lastPlayPlayerIndex].score += this.state.roundScore;
      // 重置lastPlay，新轮次开始
      this.state.lastPlay = null;
      this.state.lastPlayPlayerIndex = null;
      this.state.roundScore = 0;
    }
    
    // 切换到下一个玩家（顺时针）
    this.state.currentPlayerIndex = nextPlayer;
  }
  
  /**
   * 创建决策样本（同步版本，用于极简实现）
   */
  private createDecisionSampleSync(
    players: Card[][],
    currentPlayer: number,
    decision: Card[],
    play: Play,
    lastPlay: Play | null,
    roundScore: number,
    turnCount: number
  ): DecisionTrainingSample {
    const currentHand = players[currentPlayer];
    const totalCards = players.reduce((sum, p) => sum + p.length, 0);
    const avgCards = totalCards / players.length;
    
    let phase: 'early' | 'mid' | 'late' | 'critical';
    if (avgCards > 20) phase = 'early';
    else if (avgCards > 10) phase = 'mid';
    else if (avgCards > 5) phase = 'late';
    else phase = 'critical';
    
    return {
      gameState: {
        hand: [...currentHand],
        lastPlay: lastPlay,
        playerCount: players.length,
        scores: Array(players.length).fill(0), // 简化版不跟踪分数
        round: 0,
        phase: phase,
        // 完全信息：包含所有玩家手牌（用于训练）
        allHands: players.map(h => [...h])
      },
      decision: {
        action: decision,
        mctsScore: 0.5,
        confidence: 0.5,
        alternatives: [],
        reasoning: '极简训练决策（完全信息模式）'
      },
      mctsParams: {
        iterations: 10,
        explorationConstant: 1.414,
        simulationDepth: 20,
        perfectInformation: true // 完全信息模式
      },
      outcome: {
        gameWon: false, // 游戏结束后更新
        roundScore: roundScore,
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
}

