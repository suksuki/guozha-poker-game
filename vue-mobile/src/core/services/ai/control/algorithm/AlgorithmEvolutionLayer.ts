/**
 * 算法演化层
 * 使用各种算法进行优化和演化
 */

import { GeneticAlgorithm, GeneticAlgorithmConfig, FitnessFunction } from './GeneticAlgorithm';
import { ReinforcementLearning, ReinforcementLearningConfig, State, Action } from './ReinforcementLearning';
import { LocalSearch, LocalSearchConfig, Solution } from './LocalSearch';

/**
 * 参数优化结果
 */
export interface ParameterOptimizationResult {
  parameters: Record<string, number>;
  performance: {
    score: number;
    metrics: any;
  };
  iterations: number;
  method: 'genetic' | 'localSearch' | 'gradientDescent';
}

/**
 * 算法演化层
 */
export class AlgorithmEvolutionLayer {
  /**
   * 使用遗传算法优化参数
   */
  async optimizeWithGeneticAlgorithm(
    config: GeneticAlgorithmConfig,
    fitnessFunction: FitnessFunction
  ): Promise<ParameterOptimizationResult> {
    const ga = new GeneticAlgorithm(config, fitnessFunction);
    const best = await ga.run();
    
    // 将基因转换为参数对象
    const parameters: Record<string, number> = {};
    config.geneRanges.forEach((range, index) => {
      parameters[`param_${index}`] = best.genes[index];
    });
    
    return {
      parameters,
      performance: {
        score: best.fitness,
        metrics: {}
      },
      iterations: ga.getFitnessHistory().length,
      method: 'genetic'
    };
  }
  
  /**
   * 使用局部搜索优化参数
   */
  async optimizeWithLocalSearch(
    config: LocalSearchConfig,
    initialSolution: Solution,
    scoreFunction: (params: number[]) => Promise<number>
  ): Promise<ParameterOptimizationResult> {
    const ls = new LocalSearch(config, scoreFunction);
    const best = await ls.search(initialSolution);
    
    // 将参数数组转换为对象
    const parameters: Record<string, number> = {};
    best.parameters.forEach((param, index) => {
      parameters[`param_${index}`] = param;
    });
    
    return {
      parameters,
      performance: {
        score: best.score,
        metrics: {}
      },
      iterations: config.maxIterations,
      method: 'localSearch'
    };
  }
  
  /**
   * 使用梯度下降优化参数
   */
  async optimizeWithGradientDescent(
    config: LocalSearchConfig,
    initialSolution: Solution,
    scoreFunction: (params: number[]) => Promise<number>,
    gradientFunction?: (params: number[]) => Promise<number[]>
  ): Promise<ParameterOptimizationResult> {
    const ls = new LocalSearch(config, scoreFunction);
    const best = await ls.gradientDescent(initialSolution, gradientFunction);
    
    // 将参数数组转换为对象
    const parameters: Record<string, number> = {};
    best.parameters.forEach((param, index) => {
      parameters[`param_${index}`] = param;
    });
    
    return {
      parameters,
      performance: {
        score: best.score,
        metrics: {}
      },
      iterations: config.maxIterations,
      method: 'gradientDescent'
    };
  }
  
  /**
   * 使用强化学习演化策略
   */
  async evolveStrategyWithRL(
    config: ReinforcementLearningConfig,
    initialState: State,
    stepFunction: (state: State, action: Action) => Promise<{
      nextState: State;
      reward: number;
      done: boolean;
    }>,
    episodes: number = 100
  ): Promise<{
    policy: any;
    episodes: number;
    averageReward: number;
  }> {
    const rl = new ReinforcementLearning(config);
    
    let totalReward = 0;
    for (let episode = 0; episode < episodes; episode++) {
      const experiences = await rl.learn(initialState, stepFunction);
      const episodeReward = experiences.reduce((sum, exp) => sum + exp.reward, 0);
      totalReward += episodeReward;
    }
    
    return {
      policy: rl.getPolicy().getParameters(),
      episodes: rl.getEpisode(),
      averageReward: totalReward / episodes
    };
  }
  
  /**
   * 快速参数调整（使用局部搜索）
   */
  async quickParameterAdjustment(
    currentParams: Record<string, number>,
    scoreFunction: (params: Record<string, number>) => Promise<number>
  ): Promise<ParameterOptimizationResult> {
    // 转换为数组
    const paramArray = Object.values(currentParams);
    
    // 转换为评分函数
    const arrayScoreFunction = async (params: number[]): Promise<number> => {
      const paramObj: Record<string, number> = {};
      Object.keys(currentParams).forEach((key, index) => {
        paramObj[key] = params[index];
      });
      return await scoreFunction(paramObj);
    };
    
    // 获取当前分数
    const currentScore = await arrayScoreFunction(paramArray);
    
    // 使用局部搜索
    const result = await this.optimizeWithLocalSearch(
      {
        maxIterations: 50,
        stepSize: 0.1,
        tolerance: 0.01
      },
      {
        parameters: paramArray,
        score: currentScore
      },
      arrayScoreFunction
    );
    
    return result;
  }
}

