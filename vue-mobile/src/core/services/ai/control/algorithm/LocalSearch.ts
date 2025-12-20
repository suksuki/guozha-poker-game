/**
 * 局部搜索
 * 用于快速参数调整和局部优化
 */

/**
 * 解
 */
export interface Solution {
  parameters: number[];
  score: number;
}

/**
 * 局部搜索配置
 */
export interface LocalSearchConfig {
  maxIterations: number; // 最大迭代次数
  stepSize: number; // 步长
  tolerance: number; // 收敛容差
}

/**
 * 局部搜索
 */
export class LocalSearch {
  private config: LocalSearchConfig;
  private scoreFunction: (params: number[]) => Promise<number>;
  
  constructor(
    config: LocalSearchConfig,
    scoreFunction: (params: number[]) => Promise<number>
  ) {
    this.config = config;
    this.scoreFunction = scoreFunction;
  }
  
  /**
   * 搜索最优解
   */
  async search(initialSolution: Solution): Promise<Solution> {
    let current = { ...initialSolution };
    let best = { ...current };
    let noImprovementCount = 0;
    
    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      // 生成邻居解
      const neighbors = this.generateNeighbors(current);
      
      // 评估邻居
      const evaluated = await Promise.all(
        neighbors.map(async (neighbor) => {
          const score = await this.scoreFunction(neighbor.parameters);
          return { ...neighbor, score };
        })
      );
      
      // 选择最佳邻居
      const bestNeighbor = evaluated.reduce((best, current) => 
        current.score > best.score ? current : best
      );
      
      // 如果找到更好的解，更新
      if (bestNeighbor.score > current.score) {
        current = bestNeighbor;
        noImprovementCount = 0;
        
        // 更新全局最佳
        if (bestNeighbor.score > best.score) {
          best = { ...bestNeighbor };
        }
      } else {
        noImprovementCount++;
        
        // 如果连续多次无改进，可能已到达局部最优
        if (noImprovementCount >= 10) {
          break;
        }
      }
      
      // 检查收敛
      if (Math.abs(bestNeighbor.score - current.score) < this.config.tolerance) {
        break;
      }
    }
    
    return best;
  }
  
  /**
   * 生成邻居解
   */
  private generateNeighbors(solution: Solution): Solution[] {
    const neighbors: Solution[] = [];
    
    // 对每个参数生成邻居
    for (let i = 0; i < solution.parameters.length; i++) {
      // 增加
      const increased = [...solution.parameters];
      increased[i] += this.config.stepSize;
      neighbors.push({
        parameters: increased,
        score: 0
      });
      
      // 减少
      const decreased = [...solution.parameters];
      decreased[i] -= this.config.stepSize;
      neighbors.push({
        parameters: decreased,
        score: 0
      });
    }
    
    return neighbors;
  }
  
  /**
   * 梯度下降（如果可微）
   */
  async gradientDescent(
    initialSolution: Solution,
    gradientFunction?: (params: number[]) => Promise<number[]>
  ): Promise<Solution> {
    let current = { ...initialSolution };
    const learningRate = this.config.stepSize;
    
    for (let iteration = 0; iteration < this.config.maxIterations; iteration++) {
      if (gradientFunction) {
        // 使用提供的梯度函数
        const gradient = await gradientFunction(current.parameters);
        
        // 更新参数
        const newParams = current.parameters.map((param, i) => 
          param - learningRate * gradient[i]
        );
        
        const newScore = await this.scoreFunction(newParams);
        current = { parameters: newParams, score: newScore };
      } else {
        // 数值梯度
        const gradient = await this.numericalGradient(current.parameters);
        
        // 更新参数
        const newParams = current.parameters.map((param, i) => 
          param - learningRate * gradient[i]
        );
        
        const newScore = await this.scoreFunction(newParams);
        current = { parameters: newParams, score: newScore };
      }
      
      // 检查收敛
      if (Math.abs(current.score - initialSolution.score) < this.config.tolerance) {
        break;
      }
    }
    
    return current;
  }
  
  /**
   * 数值梯度
   */
  private async numericalGradient(params: number[]): Promise<number[]> {
    const gradient: number[] = [];
    const h = 0.0001; // 小步长
    
    for (let i = 0; i < params.length; i++) {
      const paramsPlus = [...params];
      paramsPlus[i] += h;
      
      const paramsMinus = [...params];
      paramsMinus[i] -= h;
      
      const scorePlus = await this.scoreFunction(paramsPlus);
      const scoreMinus = await this.scoreFunction(paramsMinus);
      
      gradient[i] = (scorePlus - scoreMinus) / (2 * h);
    }
    
    return gradient;
  }
}

