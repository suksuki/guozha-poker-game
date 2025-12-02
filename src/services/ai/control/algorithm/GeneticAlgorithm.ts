/**
 * 遗传算法
 * 用于参数优化和策略演化
 */

/**
 * 个体（候选解）
 */
export interface Individual {
  id: string;
  genes: number[]; // 基因（参数值）
  fitness: number; // 适应度
  generation: number; // 代数
}

/**
 * 遗传算法配置
 */
export interface GeneticAlgorithmConfig {
  populationSize: number; // 种群大小
  maxGenerations: number; // 最大代数
  mutationRate: number; // 变异率
  crossoverRate: number; // 交叉率
  eliteRate: number; // 精英保留率
  geneRanges: Array<{ min: number; max: number }>; // 基因范围
}

/**
 * 适应度函数
 */
export type FitnessFunction = (individual: Individual) => Promise<number>;

/**
 * 遗传算法
 */
export class GeneticAlgorithm {
  private population: Individual[] = [];
  private config: GeneticAlgorithmConfig;
  private fitnessFunction: FitnessFunction;
  private generation: number = 0;
  private bestIndividual: Individual | null = null;
  private fitnessHistory: number[] = [];
  
  constructor(
    config: GeneticAlgorithmConfig,
    fitnessFunction: FitnessFunction
  ) {
    this.config = config;
    this.fitnessFunction = fitnessFunction;
  }
  
  /**
   * 初始化种群
   */
  initialize(): void {
    this.population = [];
    this.generation = 0;
    this.bestIndividual = null;
    this.fitnessHistory = [];
    
    // 生成初始种群
    for (let i = 0; i < this.config.populationSize; i++) {
      const genes = this.generateRandomGenes();
      this.population.push({
        id: this.generateId(),
        genes,
        fitness: 0,
        generation: 0
      });
    }
  }
  
  /**
   * 演化一代
   */
  async evolveGeneration(): Promise<void> {
    // 1. 评估适应度
    await this.evaluateFitness();
    
    // 2. 选择
    const selected = this.select();
    
    // 3. 交叉
    const offspring = this.crossover(selected);
    
    // 4. 变异
    const mutated = this.mutate(offspring);
    
    // 5. 更新种群
    this.population = [...selected, ...mutated];
    this.generation++;
    
    // 6. 记录历史
    this.recordHistory();
  }
  
  /**
   * 运行完整演化
   */
  async run(): Promise<Individual> {
    this.initialize();
    
    for (let gen = 0; gen < this.config.maxGenerations; gen++) {
      await this.evolveGeneration();
      
      // 如果收敛，提前结束
      if (this.isConverged()) {
        break;
      }
    }
    
    return this.bestIndividual || this.population[0];
  }
  
  /**
   * 评估适应度
   */
  private async evaluateFitness(): Promise<void> {
    const evaluations = await Promise.all(
      this.population.map(async (individual) => {
        const fitness = await this.fitnessFunction(individual);
        individual.fitness = fitness;
        return { individual, fitness };
      })
    );
    
    // 更新最佳个体
    evaluations.forEach(({ individual, fitness }) => {
      if (!this.bestIndividual || fitness > this.bestIndividual.fitness) {
        this.bestIndividual = { ...individual };
      }
    });
  }
  
  /**
   * 选择（轮盘赌选择 + 精英保留）
   */
  private select(): Individual[] {
    // 按适应度排序
    const sorted = [...this.population].sort((a, b) => b.fitness - a.fitness);
    
    // 精英保留
    const eliteCount = Math.floor(this.config.populationSize * this.config.eliteRate);
    const elite = sorted.slice(0, eliteCount);
    
    // 轮盘赌选择剩余个体
    const remaining = this.config.populationSize - eliteCount;
    const selected: Individual[] = [...elite];
    
    // 计算总适应度
    const totalFitness = sorted.reduce((sum, ind) => sum + Math.max(0, ind.fitness), 0);
    
    for (let i = 0; i < remaining; i++) {
      const random = Math.random() * totalFitness;
      let sum = 0;
      
      for (const individual of sorted) {
        sum += Math.max(0, individual.fitness);
        if (sum >= random) {
          selected.push({ ...individual });
          break;
        }
      }
    }
    
    return selected;
  }
  
  /**
   * 交叉（单点交叉）
   */
  private crossover(selected: Individual[]): Individual[] {
    const offspring: Individual[] = [];
    
    for (let i = 0; i < selected.length - 1; i += 2) {
      if (Math.random() < this.config.crossoverRate) {
        const parent1 = selected[i];
        const parent2 = selected[i + 1];
        
        // 单点交叉
        const crossoverPoint = Math.floor(Math.random() * parent1.genes.length);
        const child1: Individual = {
          id: this.generateId(),
          genes: [
            ...parent1.genes.slice(0, crossoverPoint),
            ...parent2.genes.slice(crossoverPoint)
          ],
          fitness: 0,
          generation: this.generation + 1
        };
        
        const child2: Individual = {
          id: this.generateId(),
          genes: [
            ...parent2.genes.slice(0, crossoverPoint),
            ...parent1.genes.slice(crossoverPoint)
          ],
          fitness: 0,
          generation: this.generation + 1
        };
        
        offspring.push(child1, child2);
      } else {
        // 不交叉，直接复制
        offspring.push({ ...selected[i] }, { ...selected[i + 1] });
      }
    }
    
    return offspring;
  }
  
  /**
   * 变异
   */
  private mutate(offspring: Individual[]): Individual[] {
    return offspring.map(individual => {
      if (Math.random() < this.config.mutationRate) {
        const mutated = { ...individual };
        const geneIndex = Math.floor(Math.random() * individual.genes.length);
        const range = this.config.geneRanges[geneIndex];
        
        // 高斯变异
        const mutation = (Math.random() - 0.5) * (range.max - range.min) * 0.1;
        mutated.genes[geneIndex] = Math.max(
          range.min,
          Math.min(range.max, individual.genes[geneIndex] + mutation)
        );
        
        return mutated;
      }
      return individual;
    });
  }
  
  /**
   * 生成随机基因
   */
  private generateRandomGenes(): number[] {
    return this.config.geneRanges.map(range => {
      return range.min + Math.random() * (range.max - range.min);
    });
  }
  
  /**
   * 判断是否收敛
   */
  private isConverged(): boolean {
    if (this.fitnessHistory.length < 10) {
      return false;
    }
    
    // 检查最近10代的适应度变化
    const recent = this.fitnessHistory.slice(-10);
    const avg = recent.reduce((sum, f) => sum + f, 0) / recent.length;
    const variance = recent.reduce((sum, f) => sum + Math.pow(f - avg, 2), 0) / recent.length;
    
    // 如果方差很小，认为收敛
    return variance < 0.01;
  }
  
  /**
   * 记录历史
   */
  private recordHistory(): void {
    if (this.bestIndividual) {
      this.fitnessHistory.push(this.bestIndividual.fitness);
    }
  }
  
  /**
   * 生成ID
   */
  private generateId(): string {
    return `ind_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  
  /**
   * 获取当前最佳个体
   */
  getBestIndividual(): Individual | null {
    return this.bestIndividual;
  }
  
  /**
   * 获取适应度历史
   */
  getFitnessHistory(): number[] {
    return [...this.fitnessHistory];
  }
  
  /**
   * 获取当前种群
   */
  getPopulation(): Individual[] {
    return [...this.population];
  }
}

