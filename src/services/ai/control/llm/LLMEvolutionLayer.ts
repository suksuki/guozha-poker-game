/**
 * LLM演化层
 * LLM负责理解和生成，算法负责优化和演化
 */

import { LLMService } from './LLMService';
import { LLMAnalyzer } from './LLMAnalyzer';
import { AnalysisResult, OptimizationSuggestion } from '../types';

/**
 * 演化结果
 */
export interface EvolutionResult {
  solution: {
    description: string;
    code?: string;
    parameters?: any;
  };
  optimized?: {
    parameters: any;
    performance: any;
  };
  explanation?: string;
}

/**
 * LLM演化层
 */
export class LLMEvolutionLayer {
  private llmService: LLMService;
  private analyzer: LLMAnalyzer;
  
  constructor(llmService: LLMService) {
    this.llmService = llmService;
    this.analyzer = new LLMAnalyzer(llmService);
  }
  
  /**
   * 分析问题并生成方案
   */
  async analyzeAndGenerateSolution(problem: any): Promise<EvolutionResult> {
    // 1. LLM分析问题
    const analysis = await this.analyzer.analyzeProblem(problem);
    
    // 2. LLM生成方案
    const solution = await this.analyzer.generateOptimization({
      id: '',
      type: 'optimization',
      severity: analysis.priority,
      description: analysis.problem,
      recommendation: analysis.suggestions.join('; '),
      autoFixable: false,
      risk: 'medium',
      timestamp: Date.now()
    });
    
    // 3. 如果方案包含参数，可以进一步优化
    let optimized;
    if (solution.code) {
      // 这里可以调用算法层优化参数
      // 暂时返回原方案
      optimized = undefined;
    }
    
    return {
      solution: {
        description: solution.description,
        code: solution.code,
        parameters: undefined
      },
      optimized,
      explanation: solution.reasoning
    };
  }
  
  /**
   * 生成代码优化
   */
  async generateCodeOptimization(codeIssue: {
    code: string;
    description: string;
    context?: string;
  }): Promise<EvolutionResult> {
    // 1. LLM分析代码
    const codeAnalysis = await this.analyzer.analyzeCode(
      codeIssue.code,
      codeIssue.context
    );
    
    // 2. 如果有优化建议，生成优化代码
    if (codeAnalysis.suggestions.length > 0) {
      const suggestion = codeAnalysis.suggestions[0];
      
      let optimizedCode = suggestion.code;
      if (!optimizedCode) {
        // 如果没有提供代码，让LLM生成
        optimizedCode = await this.analyzer.generateCode(
          `优化以下代码：${suggestion.description}\n\n原代码：\n${codeIssue.code}`
        );
      }
      
      return {
        solution: {
          description: suggestion.description,
          code: optimizedCode,
          parameters: undefined
        },
        explanation: suggestion.impact
      };
    }
    
    return {
      solution: {
        description: '无优化建议',
        code: codeIssue.code
      }
    };
  }
  
  /**
   * 协同优化（LLM生成方案，算法优化参数）
   */
  async collaborativeOptimize(
    problem: any,
    algorithmOptimizer?: (params: any) => Promise<any>
  ): Promise<EvolutionResult> {
    // 1. LLM生成方案
    const solution = await this.analyzeAndGenerateSolution(problem);
    
    // 2. 如果方案包含参数且提供了算法优化器，使用算法优化参数
    if (solution.solution.parameters && algorithmOptimizer) {
      try {
        const optimized = await algorithmOptimizer(solution.solution.parameters);
        return {
          ...solution,
          optimized
        };
      } catch (error) {
      }
    }
    
    return solution;
  }
  
  /**
   * 解释优化结果
   */
  async explainOptimization(result: any): Promise<string> {
    const prompt = `请解释以下优化结果：

优化结果：
${JSON.stringify(result, null, 2)}

请用中文简洁地解释：
1. 优化了什么
2. 为什么这样优化
3. 预期效果

请控制在100字以内。`;
    
    try {
      const response = await this.llmService.call({
        prompt,
        systemPrompt: '你是一个技术专家，擅长解释技术优化。',
        temperature: 0.3
      });
      return response.content;
    } catch (error) {
      return '解释生成失败';
    }
  }
  
  /**
   * 检查LLM是否可用
   */
  async isAvailable(): Promise<boolean> {
    return await this.llmService.checkService();
  }
}

