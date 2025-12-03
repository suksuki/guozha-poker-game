/**
 * 团队MCTS集成测试
 */

import { describe, it, expect } from 'vitest';
import { teamMCTS, teamMCTSChooseMultiplePlays } from '../src/ai/mcts/teamMCTS';
import { generateTeamActions, evaluateStrategicPass } from '../src/ai/mcts/teamActions';
import { evaluateTeamAction } from '../src/ai/mcts/teamEvaluation';
import { teamUCTValue } from '../src/ai/mcts/teamUCT';
import { runTeamGame, quickTestTeamConfig } from '../src/utils/teamMCTSTraining';
import { generateAllCards } from '../src/utils/cardUtils';
import { Card } from '../src/types/card';
import { TeamConfig } from '../src/types/team';
import { TeamSimulatedGameState, MCTSTeamConfig, TeamMCTSNode } from '../src/ai/types';

describe('团队MCTS - 动作生成', () => {
  it('应该生成包含主动要不起的动作', () => {
    const cards = generateAllCards().slice(0, 10);
    const teamConfig: TeamConfig = {
      enabled: true,
      mode: 'fixed_2v2',
      teams: [
        { id: 0, name: '团队A', players: [0, 2], score: 0 },
        { id: 1, name: '团队B', players: [1, 3], score: 0 }
      ]
    };
    
    const state: TeamSimulatedGameState = {
      aiHand: cards,
      opponentHands: [],
      allHands: [cards, [], [], []],
      lastPlay: { type: 'single', value: 5, cards: [cards[0]] },
      lastPlayPlayerIndex: 1,
      currentPlayerIndex: 0,
      playerCount: 4,
      roundScore: 10,
      aiScore: 0,
      isTerminal: false,
      winner: null,
      perfectInformation: false,
      teamConfig,
      teamScores: new Map([[0, 0], [1, 0]]),
      playerTeams: new Map([[0, 0], [1, 1], [2, 0], [3, 1]]),
      canPass: true,
      lastPassPlayerIndex: null,
      teammateHands: [],
      opponentTeamHands: [],
      roundContext: {
        roundNumber: 1,
        roundScore: 10,
        expectedTeamBenefit: 0,
        strategicPassOpportunity: true
      }
    };
    
    const actions = generateTeamActions(cards, state, true);
    
    // 应该包含出牌动作和主动要不起动作
    expect(actions.length).toBeGreaterThan(0);
    
    const passActions = actions.filter(a => a.type === 'pass');
    expect(passActions.length).toBeGreaterThan(0);
    
    const playActions = actions.filter(a => a.type === 'play');
    expect(playActions.length).toBeGreaterThan(0);
  });
  
  it('应该正确评估主动要不起的价值', () => {
    const cards = generateAllCards().slice(0, 10);
    const teamConfig: TeamConfig = {
      enabled: true,
      mode: 'fixed_2v2',
      teams: [
        { id: 0, name: '团队A', players: [0, 2], score: 0 },
        { id: 1, name: '团队B', players: [1, 3], score: 0 }
      ]
    };
    
    const state: TeamSimulatedGameState = {
      aiHand: cards,
      opponentHands: [],
      allHands: [cards, [], [], []],
      lastPlay: { type: 'single', value: 5, cards: [cards[0]] },
      lastPlayPlayerIndex: 1,
      currentPlayerIndex: 0,
      playerCount: 4,
      roundScore: 20, // 高分轮次
      aiScore: 0,
      isTerminal: false,
      winner: null,
      perfectInformation: false,
      teamConfig,
      teamScores: new Map([[0, 0], [1, 0]]),
      playerTeams: new Map([[0, 0], [1, 1], [2, 0], [3, 1]]),
      canPass: true,
      lastPassPlayerIndex: null,
      teammateHands: [],
      opponentTeamHands: [],
      roundContext: {
        roundNumber: 1,
        roundScore: 20,
        expectedTeamBenefit: 0,
        strategicPassOpportunity: true
      }
    };
    
    const score = evaluateStrategicPass(state, cards);
    
    // 高分轮次应该有正面评价
    expect(score).toBeGreaterThan(0);
  });
});

describe('团队MCTS - 评估函数', () => {
  it('应该正确评估团队动作', () => {
    const cards = generateAllCards().slice(0, 10);
    const teamConfig: TeamConfig = {
      enabled: true,
      mode: 'fixed_2v2',
      teams: [
        { id: 0, name: '团队A', players: [0, 2], score: 0 },
        { id: 1, name: '团队B', players: [1, 3], score: 0 }
      ]
    };
    
    const state: TeamSimulatedGameState = {
      aiHand: cards,
      opponentHands: [],
      allHands: [cards, [], [], []],
      lastPlay: null,
      lastPlayPlayerIndex: null,
      currentPlayerIndex: 0,
      playerCount: 4,
      roundScore: 0,
      aiScore: 0,
      isTerminal: false,
      winner: null,
      perfectInformation: false,
      teamConfig,
      teamScores: new Map([[0, 0], [1, 0]]),
      playerTeams: new Map([[0, 0], [1, 1], [2, 0], [3, 1]]),
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
    
    const config: MCTSTeamConfig = {
      teamMode: true,
      teamConfig,
      strategicPassEnabled: true,
      teamScoreWeight: 2.0,
      cooperationWeight: 1.0,
      strategicPassWeight: 1.0,
      bigCardPreservationBonus: 30,
      teammateSupportBonus: 50,
      longTermStrategyWeight: 0.5,
      iterations: 50
    };
    
    const playAction = { type: 'play' as const, cards: [cards[0]] };
    const score = evaluateTeamAction(playAction, state, cards, config);
    
    // 应该有一个合理的评分
    expect(typeof score).toBe('number');
  });
});

describe('团队MCTS - UCT公式', () => {
  it('应该正确计算团队UCT值', () => {
    const teamConfig: TeamConfig = {
      enabled: true,
      mode: 'fixed_2v2',
      teams: [
        { id: 0, name: '团队A', players: [0, 2], score: 0 },
        { id: 1, name: '团队B', players: [1, 3], score: 0 }
      ]
    };
    
    const cards = generateAllCards().slice(0, 10);
    
    const state: TeamSimulatedGameState = {
      aiHand: cards,
      opponentHands: [],
      allHands: [cards, [], [], []],
      lastPlay: null,
      lastPlayPlayerIndex: null,
      currentPlayerIndex: 0,
      playerCount: 4,
      roundScore: 0,
      aiScore: 0,
      isTerminal: false,
      winner: null,
      perfectInformation: false,
      teamConfig,
      teamScores: new Map([[0, 0], [1, 0]]),
      playerTeams: new Map([[0, 0], [1, 1], [2, 0], [3, 1]]),
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
    
    const node: TeamMCTSNode = {
      state,
      playerToMove: 0,
      visits: 10,
      teamWins: 5,
      teamScoreSum: 100,
      children: [],
      parent: null,
      action: null,
      untriedActions: [],
      evaluation: {
        expectedTeamScore: 10,
        strategicPassValue: 0,
        teamCooperationScore: 5,
        confidence: 0.8
      }
    };
    
    const uctValue = teamUCTValue(node, 1.414);
    
    // UCT值应该是有限的正数
    expect(uctValue).toBeGreaterThan(0);
    expect(uctValue).toBeLessThan(Infinity);
  });
  
  it('未访问的节点应该返回Infinity', () => {
    const teamConfig: TeamConfig = {
      enabled: true,
      mode: 'fixed_2v2',
      teams: [
        { id: 0, name: '团队A', players: [0, 2], score: 0 },
        { id: 1, name: '团队B', players: [1, 3], score: 0 }
      ]
    };
    
    const cards = generateAllCards().slice(0, 10);
    
    const state: TeamSimulatedGameState = {
      aiHand: cards,
      opponentHands: [],
      allHands: [cards, [], [], []],
      lastPlay: null,
      lastPlayPlayerIndex: null,
      currentPlayerIndex: 0,
      playerCount: 4,
      roundScore: 0,
      aiScore: 0,
      isTerminal: false,
      winner: null,
      perfectInformation: false,
      teamConfig,
      teamScores: new Map([[0, 0], [1, 0]]),
      playerTeams: new Map([[0, 0], [1, 1], [2, 0], [3, 1]]),
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
    
    const node: TeamMCTSNode = {
      state,
      playerToMove: 0,
      visits: 0, // 未访问
      teamWins: 0,
      teamScoreSum: 0,
      children: [],
      parent: null,
      action: null,
      untriedActions: [],
      evaluation: {
        expectedTeamScore: 0,
        strategicPassValue: 0,
        teamCooperationScore: 0,
        confidence: 0
      }
    };
    
    const uctValue = teamUCTValue(node, 1.414);
    expect(uctValue).toBe(Infinity);
  });
});

describe('团队MCTS - 训练系统', () => {
  it('应该能运行单局团队游戏', () => {
    const teamConfig: TeamConfig = {
      enabled: true,
      mode: 'fixed_2v2',
      teams: [
        { id: 0, name: '团队A', players: [0, 2], score: 0 },
        { id: 1, name: '团队B', players: [1, 3], score: 0 }
      ]
    };
    
    const config: MCTSTeamConfig = {
      teamMode: true,
      teamConfig,
      strategicPassEnabled: true,
      teamScoreWeight: 2.0,
      cooperationWeight: 1.0,
      strategicPassWeight: 1.0,
      bigCardPreservationBonus: 30,
      teammateSupportBonus: 50,
      longTermStrategyWeight: 0.5,
      iterations: 10 // 少量迭代以加快测试
    };
    
    const result = runTeamGame(config, 4, teamConfig);
    
    // 应该有获胜团队
    expect(result.winningTeam).toBeGreaterThanOrEqual(0);
    
    // 应该有团队得分
    expect(result.finalTeamScores.size).toBeGreaterThan(0);
    
    // 回合数应该合理
    expect(result.turns).toBeGreaterThan(0);
    expect(result.turns).toBeLessThan(1000);
  });
  
  it('应该能快速测试团队配置', () => {
    const config: MCTSTeamConfig = {
      teamMode: true,
      strategicPassEnabled: true,
      teamScoreWeight: 2.0,
      cooperationWeight: 1.0,
      strategicPassWeight: 1.0,
      bigCardPreservationBonus: 30,
      teammateSupportBonus: 50,
      longTermStrategyWeight: 0.5,
      iterations: 10 // 少量迭代以加快测试
    };
    
    const result = quickTestTeamConfig(config, 3, 4); // 只运行3局
    
    // 应该有统计结果
    expect(result.totalGames).toBe(3);
    expect(result.teamWinRate).toBeGreaterThanOrEqual(0);
    expect(result.teamWinRate).toBeLessThanOrEqual(1);
    expect(result.avgTeamScore).toBeGreaterThanOrEqual(0);
    expect(result.avgTurns).toBeGreaterThan(0);
  });
});

describe('团队MCTS - 完整决策流程', () => {
  it('应该能做出团队决策（启用主动要不起）', () => {
    const cards = generateAllCards().slice(0, 13);
    const teamConfig: TeamConfig = {
      enabled: true,
      mode: 'fixed_2v2',
      teams: [
        { id: 0, name: '团队A', players: [0, 2], score: 0 },
        { id: 1, name: '团队B', players: [1, 3], score: 0 }
      ]
    };
    
    const state: TeamSimulatedGameState = {
      aiHand: cards,
      opponentHands: [cards.slice(0, 10), cards.slice(0, 10), cards.slice(0, 10)],
      allHands: [cards, cards.slice(0, 10), cards.slice(0, 10), cards.slice(0, 10)],
      lastPlay: { type: 'single', value: 5, cards: [cards[0]] },
      lastPlayPlayerIndex: 1,
      currentPlayerIndex: 0,
      playerCount: 4,
      roundScore: 15,
      aiScore: 0,
      isTerminal: false,
      winner: null,
      perfectInformation: false,
      teamConfig,
      teamScores: new Map([[0, 0], [1, 0]]),
      playerTeams: new Map([[0, 0], [1, 1], [2, 0], [3, 1]]),
      canPass: true,
      lastPassPlayerIndex: null,
      teammateHands: [],
      opponentTeamHands: [],
      roundContext: {
        roundNumber: 1,
        roundScore: 15,
        expectedTeamBenefit: 0,
        strategicPassOpportunity: true
      }
    };
    
    const config: MCTSTeamConfig = {
      teamMode: true,
      teamConfig,
      strategicPassEnabled: true,
      teamScoreWeight: 2.0,
      cooperationWeight: 1.0,
      strategicPassWeight: 1.0,
      bigCardPreservationBonus: 30,
      teammateSupportBonus: 50,
      longTermStrategyWeight: 0.5,
      iterations: 20 // 少量迭代以加快测试
    };
    
    const action = teamMCTS(cards, state, config);
    
    // 应该返回一个有效的动作
    expect(action).toBeTruthy();
    
    if (action) {
      expect(['play', 'pass']).toContain(action.type);
    }
  });
  
  it('应该能生成多个候选动作', () => {
    const cards = generateAllCards().slice(0, 13);
    const teamConfig: TeamConfig = {
      enabled: true,
      mode: 'fixed_2v2',
      teams: [
        { id: 0, name: '团队A', players: [0, 2], score: 0 },
        { id: 1, name: '团队B', players: [1, 3], score: 0 }
      ]
    };
    
    const state: TeamSimulatedGameState = {
      aiHand: cards,
      opponentHands: [cards.slice(0, 10), cards.slice(0, 10), cards.slice(0, 10)],
      allHands: [cards, cards.slice(0, 10), cards.slice(0, 10), cards.slice(0, 10)],
      lastPlay: null,
      lastPlayPlayerIndex: null,
      currentPlayerIndex: 0,
      playerCount: 4,
      roundScore: 0,
      aiScore: 0,
      isTerminal: false,
      winner: null,
      perfectInformation: false,
      teamConfig,
      teamScores: new Map([[0, 0], [1, 0]]),
      playerTeams: new Map([[0, 0], [1, 1], [2, 0], [3, 1]]),
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
    
    const config: MCTSTeamConfig = {
      teamMode: true,
      teamConfig,
      strategicPassEnabled: true,
      teamScoreWeight: 2.0,
      cooperationWeight: 1.0,
      strategicPassWeight: 1.0,
      bigCardPreservationBonus: 30,
      teammateSupportBonus: 50,
      longTermStrategyWeight: 0.5,
      iterations: 20
    };
    
    const suggestions = teamMCTSChooseMultiplePlays(cards, state, config, 3);
    
    // 应该返回多个建议
    expect(suggestions.length).toBeGreaterThan(0);
    expect(suggestions.length).toBeLessThanOrEqual(3);
    
    // 每个建议应该有动作、得分和解释
    suggestions.forEach(suggestion => {
      expect(suggestion.action).toBeTruthy();
      expect(typeof suggestion.score).toBe('number');
      expect(typeof suggestion.explanation).toBe('string');
      expect(suggestion.explanation.length).toBeGreaterThan(0);
    });
  });
});

