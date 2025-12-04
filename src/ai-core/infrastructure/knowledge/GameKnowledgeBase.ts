/**
 * 游戏知识库
 * 存储游戏相关的知识、策略、经验
 * 从AIControlCenter的KnowledgeBase提取并专注于游戏AI
 */

export interface KnowledgeEntry {
  id: string;
  category: 'strategy' | 'pattern' | 'tactic' | 'communication';
  title: string;
  content: string;
  tags: string[];
  examples?: any[];
  effectiveness?: number;  // 有效性评分
  timestamp: number;
}

export interface StrategyPattern {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  successRate: number;
  usageCount: number;
}

/**
 * 游戏知识库类
 */
export class GameKnowledgeBase {
  private knowledge: Map<string, KnowledgeEntry> = new Map();
  private patterns: Map<string, StrategyPattern> = new Map();
  private initialized: boolean = false;
  
  /**
   * 初始化知识库
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // 加载默认知识
    await this.loadDefaultKnowledge();
    
    this.initialized = true;
    console.log('[GameKnowledgeBase] 初始化完成');
  }
  
  /**
   * 添加知识条目
   */
  addKnowledge(entry: Omit<KnowledgeEntry, 'id' | 'timestamp'>): string {
    const id = this.generateId();
    const knowledge: KnowledgeEntry = {
      ...entry,
      id,
      timestamp: Date.now()
    };
    
    this.knowledge.set(id, knowledge);
    return id;
  }
  
  /**
   * 添加策略模式
   */
  addPattern(pattern: Omit<StrategyPattern, 'id' | 'usageCount'>): string {
    const id = this.generateId();
    const strategyPattern: StrategyPattern = {
      ...pattern,
      id,
      usageCount: 0
    };
    
    this.patterns.set(id, strategyPattern);
    return id;
  }
  
  /**
   * 查询知识
   */
  query(category?: string, tags?: string[]): KnowledgeEntry[] {
    let results = Array.from(this.knowledge.values());
    
    if (category) {
      results = results.filter(k => k.category === category);
    }
    
    if (tags && tags.length > 0) {
      results = results.filter(k => 
        tags.some(tag => k.tags.includes(tag))
      );
    }
    
    return results;
  }
  
  /**
   * 查询策略模式
   */
  findPatterns(condition?: string): StrategyPattern[] {
    let results = Array.from(this.patterns.values());
    
    if (condition) {
      results = results.filter(p => 
        p.condition.includes(condition) || p.name.includes(condition)
      );
    }
    
    // 按成功率排序
    return results.sort((a, b) => b.successRate - a.successRate);
  }
  
  /**
   * 更新模式使用统计
   */
  recordPatternUsage(patternId: string, success: boolean): void {
    const pattern = this.patterns.get(patternId);
    if (pattern) {
      pattern.usageCount++;
      
      // 更新成功率（指数移动平均）
      const alpha = 0.1;
      pattern.successRate = 
        alpha * (success ? 1 : 0) + (1 - alpha) * pattern.successRate;
    }
  }
  
  /**
   * 导出知识库
   */
  exportKnowledge(): string {
    return JSON.stringify({
      knowledge: Array.from(this.knowledge.entries()),
      patterns: Array.from(this.patterns.entries())
    });
  }
  
  /**
   * 导入知识库
   */
  importKnowledge(data: string): void {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.knowledge) {
        this.knowledge = new Map(parsed.knowledge);
      }
      
      if (parsed.patterns) {
        this.patterns = new Map(parsed.patterns);
      }
      
      console.log('[GameKnowledgeBase] 知识库导入成功');
    } catch (error) {
      console.error('[GameKnowledgeBase] 导入失败:', error);
    }
  }
  
  /**
   * 加载默认知识
   */
  private async loadDefaultKnowledge(): Promise<void> {
    // 基础策略知识
    this.addKnowledge({
      category: 'strategy',
      title: '残局激进策略',
      content: '手牌少于5张时，应该采取激进出牌策略',
      tags: ['endgame', 'aggressive'],
      effectiveness: 0.8
    });
    
    this.addKnowledge({
      category: 'strategy',
      title: '保留大牌',
      content: '中局应该保留大牌（A、2、王），用于关键时刻',
      tags: ['midgame', 'conservative'],
      effectiveness: 0.7
    });
    
    this.addKnowledge({
      category: 'tactic',
      title: '队友协作',
      content: '队友手牌少时，应该主动Pass让队友出牌',
      tags: ['teamwork', 'cooperation'],
      effectiveness: 0.9
    });
    
    // 通信知识
    this.addKnowledge({
      category: 'communication',
      title: '暗号：我有炸弹',
      content: '说"我保你"通常暗示有炸弹或大牌',
      tags: ['signal', 'tactical'],
      effectiveness: 0.85
    });
    
    // 添加常见模式
    this.addPattern({
      name: '残局冲刺',
      description: '手牌少于3张时全力冲刺',
      condition: 'handSize < 3',
      action: 'play_aggressively',
      successRate: 0.8
    });
    
    this.addPattern({
      name: '队友支援',
      description: '队友困难时主动帮助',
      condition: 'teammate_struggling',
      action: 'support_teammate',
      successRate: 0.75
    });
  }
  
  /**
   * 生成ID
   */
  private generateId(): string {
    return `kb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

