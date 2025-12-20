/**
 * 强化学习
 * 用于策略学习和自适应优化
 */

/**
 * 状态
 */
export interface State {
  id: string;
  features: number[]; // 状态特征
  timestamp: number;
}

/**
 * 动作
 */
export interface Action {
  id: string;
  type: string;
  parameters: any;
}

/**
 * 经验
 */
export interface Experience {
  state: State;
  action: Action;
  reward: number;
  nextState: State;
  done: boolean;
}

/**
 * 策略
 */
export interface Policy {
  selectAction(state: State): Action;
  update(experiences: Experience[]): void;
  getParameters(): any;
}

/**
 * 强化学习配置
 */
export interface ReinforcementLearningConfig {
  learningRate: number; // 学习率
  discountFactor: number; // 折扣因子
  epsilon: number; // 探索率
  epsilonDecay: number; // 探索率衰减
  minEpsilon: number; // 最小探索率
  batchSize: number; // 批次大小
  memorySize: number; // 经验回放缓冲区大小
}

/**
 * 简单策略（ε-贪婪）
 */
class SimplePolicy implements Policy {
  private qTable: Map<string, Map<string, number>> = new Map();
  private config: ReinforcementLearningConfig;
  
  constructor(config: ReinforcementLearningConfig) {
    this.config = config;
  }
  
  selectAction(state: State): Action {
    // ε-贪婪策略
    if (Math.random() < this.config.epsilon) {
      // 探索：随机选择动作
      return this.explore(state);
    } else {
      // 利用：选择最优动作
      return this.exploit(state);
    }
  }
  
  update(experiences: Experience[]): void {
    // Q-learning更新
    experiences.forEach(exp => {
      const stateKey = this.stateToKey(exp.state);
      const actionKey = this.actionToKey(exp.action);
      
      // 获取当前Q值
      if (!this.qTable.has(stateKey)) {
        this.qTable.set(stateKey, new Map());
      }
      const qValues = this.qTable.get(stateKey)!;
      const currentQ = qValues.get(actionKey) || 0;
      
      // 计算目标Q值
      const nextStateKey = this.stateToKey(exp.nextState);
      let maxNextQ = 0;
      if (this.qTable.has(nextStateKey)) {
        const nextQValues = this.qTable.get(nextStateKey)!;
        maxNextQ = Math.max(...Array.from(nextQValues.values()), 0);
      }
      
      const targetQ = exp.reward + this.config.discountFactor * maxNextQ;
      
      // 更新Q值
      const newQ = currentQ + this.config.learningRate * (targetQ - currentQ);
      qValues.set(actionKey, newQ);
    });
    
    // 衰减探索率
    this.config.epsilon = Math.max(
      this.config.minEpsilon,
      this.config.epsilon * this.config.epsilonDecay
    );
  }
  
  getParameters(): any {
    return {
      qTable: Array.from(this.qTable.entries()).map(([state, actions]) => ({
        state,
        actions: Array.from(actions.entries()).map(([action, q]) => ({ action, q }))
      })),
      epsilon: this.config.epsilon
    };
  }
  
  private explore(state: State): Action {
    // 随机选择动作（简化处理）
    return {
      id: this.generateId(),
      type: 'random',
      parameters: {}
    };
  }
  
  private exploit(state: State): Action {
    const stateKey = this.stateToKey(state);
    const qValues = this.qTable.get(stateKey);
    
    if (!qValues || qValues.size === 0) {
      return this.explore(state);
    }
    
    // 选择Q值最高的动作
    let bestAction = '';
    let bestQ = -Infinity;
    
    qValues.forEach((q, action) => {
      if (q > bestQ) {
        bestQ = q;
        bestAction = action;
      }
    });
    
    return this.keyToAction(bestAction);
  }
  
  private stateToKey(state: State): string {
    return state.features.map(f => f.toFixed(2)).join(',');
  }
  
  private actionToKey(action: Action): string {
    return `${action.type}_${JSON.stringify(action.parameters)}`;
  }
  
  private keyToAction(key: string): Action {
    const [type, paramsStr] = key.split('_');
    return {
      id: this.generateId(),
      type,
      parameters: JSON.parse(paramsStr || '{}')
    };
  }
  
  private generateId(): string {
    return `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 强化学习
 */
export class ReinforcementLearning {
  private policy: Policy;
  private config: ReinforcementLearningConfig;
  private experienceBuffer: Experience[] = [];
  private episode: number = 0;
  
  constructor(
    config: ReinforcementLearningConfig,
    policy?: Policy
  ) {
    this.config = config;
    this.policy = policy || new SimplePolicy(config);
  }
  
  /**
   * 学习（运行一个episode）
   */
  async learn(
    initialState: State,
    stepFunction: (state: State, action: Action) => Promise<{
      nextState: State;
      reward: number;
      done: boolean;
    }>
  ): Promise<Experience[]> {
    const experiences: Experience[] = [];
    let state = initialState;
    let done = false;
    
    while (!done) {
      // 选择动作
      const action = this.policy.selectAction(state);
      
      // 执行动作
      const { nextState, reward, done: isDone } = await stepFunction(state, action);
      
      // 存储经验
      const experience: Experience = {
        state,
        action,
        reward,
        nextState,
        done: isDone
      };
      
      experiences.push(experience);
      this.addExperience(experience);
      
      // 更新状态
      state = nextState;
      done = isDone;
    }
    
    // 更新策略
    if (this.experienceBuffer.length >= this.config.batchSize) {
      const batch = this.sampleExperience(this.config.batchSize);
      this.policy.update(batch);
    }
    
    this.episode++;
    return experiences;
  }
  
  /**
   * 添加经验
   */
  private addExperience(experience: Experience): void {
    this.experienceBuffer.push(experience);
    
    // 限制缓冲区大小
    if (this.experienceBuffer.length > this.config.memorySize) {
      this.experienceBuffer.shift();
    }
  }
  
  /**
   * 采样经验
   */
  private sampleExperience(batchSize: number): Experience[] {
    const batch: Experience[] = [];
    const indices = new Set<number>();
    
    while (batch.length < batchSize && indices.size < this.experienceBuffer.length) {
      const index = Math.floor(Math.random() * this.experienceBuffer.length);
      if (!indices.has(index)) {
        indices.add(index);
        batch.push(this.experienceBuffer[index]);
      }
    }
    
    return batch;
  }
  
  /**
   * 获取策略
   */
  getPolicy(): Policy {
    return this.policy;
  }
  
  /**
   * 获取当前episode
   */
  getEpisode(): number {
    return this.episode;
  }
  
  /**
   * 重置
   */
  reset(): void {
    this.experienceBuffer = [];
    this.episode = 0;
  }
}

