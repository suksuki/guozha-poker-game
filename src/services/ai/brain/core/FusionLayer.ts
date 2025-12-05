/**
 * 决策融合层
 * 负责整合多个模块的建议，生成最终决策
 */

import { 
  GameState, 
  Decision, 
  SituationAnalysis,
  GameAction,
  DecisionSource,
  FusionConfig,
  BrainConfig,
  RiskLevel
} from './types';

/**
 * 融合层类
 */
export class FusionLayer {
  private config: FusionConfig;
  
  constructor(config: FusionConfig) {
    this.config = config;
  }
  
  /**
   * 融合多个模块的建议
   */
  async fuse(
    gameState: GameState,
    analysis: SituationAnalysis,
    moduleSuggestions: Map<string, any>,
    brainConfig: BrainConfig
  ): Promise<Decision> {
    // 提取所有建议
    const sources = this.extractSources(moduleSuggestions, gameState, brainConfig);
    
    if (sources.length === 0) {
      // 没有任何建议，返回Pass
      return this.createPassDecision('No suggestions from modules');
    }
    
    // 根据配置选择融合策略
    let finalAction: GameAction;
    let confidence: number;
    let reasoning: string;
    
    switch (this.config.strategy) {
      case 'weighted_average':
        ({ finalAction, confidence, reasoning } = this.weightedAverageFusion(sources));
        break;
      
      case 'voting':
        ({ finalAction, confidence, reasoning } = this.votingFusion(sources));
        break;
      
      case 'cascade':
        ({ finalAction, confidence, reasoning } = this.cascadeFusion(sources));
        break;
      
      case 'adaptive':
        ({ finalAction, confidence, reasoning } = this.adaptiveFusion(
          sources,
          analysis
        ));
        break;
      
      default:
        ({ finalAction, confidence, reasoning } = this.weightedAverageFusion(sources));
    }
    
    // 提取备选方案
    const alternatives = this.extractAlternatives(sources, finalAction);
    
    // 评估风险
    const riskLevel = this.evaluateRisk(finalAction, analysis);
    
    // 计算预期价值
    const expectedValue = this.calculateExpectedValue(finalAction, sources);
    
    return {
      action: finalAction,
      confidence,
      reasoning,
      alternatives,
      sources,
      fusionMethod: this.config.strategy,
      timestamp: Date.now(),
      computeTime: 0,  // 由调用者设置
      expectedValue,
      riskLevel
    };
  }
  
  /**
   * 更新配置
   */
  updateConfig(config: FusionConfig): void {
    this.config = config;
  }
  
  // ==================== 融合策略 ====================
  
  /**
   * 加权平均融合
   */
  private weightedAverageFusion(sources: DecisionSource[]): {
    finalAction: GameAction;
    confidence: number;
    reasoning: string;
  } {
    // 按权重排序
    const sortedSources = [...sources].sort((a, b) => 
      (b.weight * b.confidence) - (a.weight * a.confidence)
    );
    
    // 选择加权得分最高的建议
    const best = sortedSources[0];
    
    // 计算综合置信度
    const totalWeight = sources.reduce((sum, s) => sum + s.weight, 0);
    const weightedConfidence = sources.reduce(
      (sum, s) => sum + s.weight * s.confidence,
      0
    ) / totalWeight;
    
    // 生成推理说明
    const reasoning = this.generateWeightedReasoning(sources, best);
    
    return {
      finalAction: best.suggestion,
      confidence: weightedConfidence,
      reasoning
    };
  }
  
  /**
   * 投票融合
   */
  private votingFusion(sources: DecisionSource[]): {
    finalAction: GameAction;
    confidence: number;
    reasoning: string;
  } {
    // 统计每个动作的票数（加权）
    const votes = new Map<string, { action: GameAction; votes: number; sources: DecisionSource[] }>();
    
    for (const source of sources) {
      const key = this.actionToKey(source.suggestion);
      
      if (!votes.has(key)) {
        votes.set(key, {
          action: source.suggestion,
          votes: 0,
          sources: []
        });
      }
      
      const entry = votes.get(key)!;
      entry.votes += source.weight * source.confidence;
      entry.sources.push(source);
    }
    
    // 找出得票最多的
    let maxVotes = 0;
    let winner: { action: GameAction; votes: number; sources: DecisionSource[] } | null = null;
    
    for (const entry of votes.values()) {
      if (entry.votes > maxVotes) {
        maxVotes = entry.votes;
        winner = entry;
      }
    }
    
    if (!winner) {
      return {
        finalAction: { type: 'pass' },
        confidence: 0.1,
        reasoning: 'Voting failed, defaulting to pass'
      };
    }
    
    // 计算置信度
    const totalVotes = Array.from(votes.values()).reduce((sum, v) => sum + v.votes, 0);
    const confidence = maxVotes / totalVotes;
    
    // 生成推理
    const reasoning = this.generateVotingReasoning(winner.sources, votes.size);
    
    return {
      finalAction: winner.action,
      confidence,
      reasoning
    };
  }
  
  /**
   * 级联融合（优先级）
   */
  private cascadeFusion(sources: DecisionSource[]): {
    finalAction: GameAction;
    confidence: number;
    reasoning: string;
  } {
    // 按模块优先级和置信度排序
    const sortedSources = [...sources].sort((a, b) => {
      // 优先考虑置信度高的
      if (Math.abs(a.confidence - b.confidence) > 0.2) {
        return b.confidence - a.confidence;
      }
      // 置信度相近时考虑权重
      return b.weight - a.weight;
    });
    
    // 选择第一个高置信度的建议
    const best = sortedSources[0];
    
    const reasoning = `Cascade: 选择${best.moduleName}的建议（置信度${best.confidence.toFixed(2)}）`;
    
    return {
      finalAction: best.suggestion,
      confidence: best.confidence,
      reasoning
    };
  }
  
  /**
   * 自适应融合
   */
  private adaptiveFusion(
    sources: DecisionSource[],
    analysis: SituationAnalysis
  ): {
    finalAction: GameAction;
    confidence: number;
    reasoning: string;
  } {
    // 根据局面动态调整策略
    const complexity = this.estimateComplexity(analysis);
    
    if (complexity > 0.7) {
      // 复杂局面：使用加权平均
      return this.weightedAverageFusion(sources);
    } else if (sources.length > 3) {
      // 建议多：使用投票
      return this.votingFusion(sources);
    } else {
      // 简单局面或建议少：使用级联
      return this.cascadeFusion(sources);
    }
  }
  
  // ==================== 辅助方法 ====================
  
  /**
   * 提取决策来源
   */
  private extractSources(
    moduleSuggestions: Map<string, any>,
    gameState: GameState,
    brainConfig: BrainConfig
  ): DecisionSource[] {
    const sources: DecisionSource[] = [];
    
    for (const [moduleName, analysis] of moduleSuggestions) {
      if (!analysis || !analysis.suggestions || analysis.suggestions.length === 0) {
        continue;
      }
      
      const moduleConfig = brainConfig.modules[moduleName];
      if (!moduleConfig) continue;
      
      // 获取模块权重
      const weight = this.calculateModuleWeight(
        moduleName,
        moduleConfig,
        gameState
      );
      
      // 取最佳建议
      const bestSuggestion = analysis.suggestions[0];
      
      sources.push({
        moduleName,
        suggestion: bestSuggestion.action,
        confidence: bestSuggestion.confidence,
        weight,
        reasoning: bestSuggestion.reasoning
      });
    }
    
    return sources;
  }
  
  /**
   * 计算模块权重
   */
  private calculateModuleWeight(
    moduleName: string,
    config: any,
    gameState: GameState
  ): number {
    let weight = config.baseWeight;
    
    // 应用权重规则
    if (config.weightRules) {
      for (const rule of config.weightRules) {
        if (this.evaluateWeightRule(rule.condition, gameState)) {
          weight = rule.weight;
          break;  // 使用第一个匹配的规则
        }
      }
    }
    
    return weight;
  }
  
  /**
   * 评估权重规则
   */
  private evaluateWeightRule(
    condition: string | ((state: GameState) => boolean),
    gameState: GameState
  ): boolean {
    if (typeof condition === 'function') {
      return condition(gameState);
    }
    
    // 字符串条件
    switch (condition) {
      case 'early_game':
        return gameState.phase === 'early';
      case 'mid_game':
        return gameState.phase === 'middle';
      case 'late_game':
        return gameState.phase === 'late';
      case 'critical':
        return gameState.phase === 'critical';
      case 'team_mode':
        return gameState.teamMode;
      case 'solo_mode':
        return !gameState.teamMode;
      case 'simple_situation':
        return gameState.myHand.length < 5 && !gameState.lastPlay;
      case 'complex_situation':
        return gameState.myHand.length > 5 || gameState.teamMode;
      default:
        return false;
    }
  }
  
  /**
   * 提取备选方案
   */
  private extractAlternatives(
    sources: DecisionSource[],
    selectedAction: GameAction
  ): GameAction[] {
    const alternatives: GameAction[] = [];
    const seen = new Set<string>();
    
    // 添加选中动作的key
    seen.add(this.actionToKey(selectedAction));
    
    // 收集其他建议
    for (const source of sources) {
      const key = this.actionToKey(source.suggestion);
      if (!seen.has(key)) {
        alternatives.push(source.suggestion);
        seen.add(key);
      }
    }
    
    return alternatives.slice(0, 3);  // 最多3个备选
  }
  
  /**
   * 动作转键值（用于比较）
   */
  private actionToKey(action: GameAction): string {
    if (action.type === 'pass') {
      return 'pass';
    }
    
    // 简单地用牌的字符串表示作为key
    return action.cards
      .map(c => `${c.rank}-${c.suit}`)
      .sort()
      .join(',');
  }
  
  /**
   * 评估风险
   */
  private evaluateRisk(action: GameAction, analysis: SituationAnalysis): RiskLevel {
    if (action.type === 'pass') {
      return 'low';
    }
    
    // 根据手牌强度和威胁评估风险
    if (analysis.threats.some(t => t.severity > 0.8)) {
      return 'high';
    }
    
    if (analysis.handStrength < 0.3) {
      return 'medium';
    }
    
    return 'low';
  }
  
  /**
   * 计算预期价值
   */
  private calculateExpectedValue(
    action: GameAction,
    sources: DecisionSource[]
  ): number {
    // 简单地用加权置信度作为预期价值
    const totalWeight = sources.reduce((sum, s) => sum + s.weight, 0);
    return sources.reduce(
      (sum, s) => sum + s.weight * s.confidence,
      0
    ) / totalWeight;
  }
  
  /**
   * 估计复杂度
   */
  private estimateComplexity(analysis: SituationAnalysis): number {
    let complexity = 0;
    
    // 威胁多 -> 复杂
    complexity += analysis.threats.length * 0.2;
    
    // 机会多 -> 复杂
    complexity += analysis.opportunities.length * 0.1;
    
    // 团队模式 -> 复杂
    if (analysis.teamContext) {
      complexity += 0.3;
    }
    
    return Math.min(1.0, complexity);
  }
  
  /**
   * 生成加权融合的推理说明
   */
  private generateWeightedReasoning(
    sources: DecisionSource[],
    best: DecisionSource
  ): string {
    const parts = [
      `综合${sources.length}个模块的建议，`,
      `采纳${best.moduleName}的方案：`,
      best.reasoning
    ];
    
    return parts.join('');
  }
  
  /**
   * 生成投票融合的推理说明
   */
  private generateVotingReasoning(
    supporters: DecisionSource[],
    totalOptions: number
  ): string {
    const moduleNames = supporters.map(s => s.moduleName).join('、');
    return `投票结果：${moduleNames}等${supporters.length}个模块支持此方案（共${totalOptions}个选项）`;
  }
  
  /**
   * 创建Pass决策
   */
  private createPassDecision(reason: string): Decision {
    return {
      action: { type: 'pass' },
      confidence: 0.5,
      reasoning: reason,
      alternatives: [],
      sources: [],
      fusionMethod: 'default',
      timestamp: Date.now(),
      computeTime: 0,
      expectedValue: 0,
      riskLevel: 'low'
    };
  }
}

