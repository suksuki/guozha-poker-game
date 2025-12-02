/**
 * LLM分析器
 * 使用LLM分析问题、生成方案等
 */

import { LLMService, LLMRequest } from './LLMService';
import { AnalysisResult, Issue } from '../types';

export interface ProblemAnalysis {
  problem: string;
  rootCause: string;
  impact: string;
  suggestions: string[];
  priority: 'critical' | 'high' | 'medium' | 'low';
}

export interface CodeAnalysis {
  code: string;
  issues: Array<{
    type: string;
    description: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    line?: number;
  }>;
  suggestions: Array<{
    description: string;
    code?: string;
    impact: string;
  }>;
}

export interface OptimizationSuggestion {
  type: string;
  description: string;
  reasoning: string;
  code?: string;
  estimatedImpact: string;
  risk: 'low' | 'medium' | 'high';
}

export class LLMAnalyzer {
  private llmService: LLMService;
  
  constructor(llmService: LLMService) {
    this.llmService = llmService;
  }
  
  /**
   * 分析问题
   */
  async analyzeProblem(problem: Issue): Promise<ProblemAnalysis> {
    const prompt = this.buildProblemAnalysisPrompt(problem);
    
    const request: LLMRequest = {
      prompt,
      systemPrompt: `你是一个代码分析专家，擅长分析代码问题、性能瓶颈和优化机会。
请用中文回答，提供清晰、准确的分析。`,
      temperature: 0.3 // 降低温度，提高准确性
    };
    
    try {
      const response = await this.llmService.call(request);
      return this.parseProblemAnalysis(response.content);
    } catch (error) {
      // 返回默认分析
      return {
        problem: problem.description,
        rootCause: '分析失败',
        impact: '未知',
        suggestions: [],
        priority: problem.severity
      };
    }
  }
  
  /**
   * 分析代码
   */
  async analyzeCode(code: string, context?: string): Promise<CodeAnalysis> {
    const prompt = this.buildCodeAnalysisPrompt(code, context);
    
    const request: LLMRequest = {
      prompt,
      systemPrompt: `你是一个代码审查专家，擅长发现代码问题、性能瓶颈和优化机会。
请用中文回答，提供清晰、准确的分析。`,
      temperature: 0.3
    };
    
    try {
      const response = await this.llmService.call(request);
      return this.parseCodeAnalysis(response.content, code);
    } catch (error) {
      return {
        code,
        issues: [],
        suggestions: []
      };
    }
  }
  
  /**
   * 生成优化方案
   */
  async generateOptimization(
    analysis: AnalysisResult,
    context?: any
  ): Promise<OptimizationSuggestion> {
    const prompt = this.buildOptimizationPrompt(analysis, context);
    
    const request: LLMRequest = {
      prompt,
      systemPrompt: `你是一个代码优化专家，擅长生成优化方案。
请用中文回答，提供清晰、可行的优化建议。`,
      temperature: 0.5
    };
    
    try {
      const response = await this.llmService.call(request);
      return this.parseOptimizationSuggestion(response.content, analysis);
    } catch (error) {
      return {
        type: analysis.type,
        description: analysis.description,
        reasoning: '生成失败',
        estimatedImpact: '未知',
        risk: analysis.risk
      };
    }
  }
  
  /**
   * 生成代码
   */
  async generateCode(
    description: string,
    context?: any
  ): Promise<string> {
    const prompt = this.buildCodeGenerationPrompt(description, context);
    
    const request: LLMRequest = {
      prompt,
      systemPrompt: `你是一个代码生成专家，擅长根据需求生成高质量的代码。
请只返回代码，不要包含解释。使用TypeScript/JavaScript。`,
      temperature: 0.3
    };
    
    try {
      const response = await this.llmService.call(request);
      return this.extractCode(response.content);
    } catch (error) {
      return '';
    }
  }
  
  /**
   * 构建问题分析提示词
   */
  private buildProblemAnalysisPrompt(problem: Issue): string {
    return `请分析以下问题：

问题描述：${problem.description}
问题类型：${problem.type}
严重性：${problem.severity}
问题数据：${JSON.stringify(problem.data, null, 2)}

请提供：
1. 根本原因分析
2. 影响评估
3. 解决方案建议（至少3个）
4. 优先级评估

请以JSON格式返回：
{
  "rootCause": "根本原因",
  "impact": "影响描述",
  "suggestions": ["建议1", "建议2", "建议3"],
  "priority": "critical|high|medium|low"
}`;
  }
  
  /**
   * 构建代码分析提示词
   */
  private buildCodeAnalysisPrompt(code: string, context?: string): string {
    return `请分析以下代码：

代码：
\`\`\`typescript
${code}
\`\`\`

${context ? `上下文：${context}` : ''}

请提供：
1. 代码问题（性能、可读性、可维护性等）
2. 优化建议

请以JSON格式返回：
{
  "issues": [
    {
      "type": "问题类型",
      "description": "问题描述",
      "severity": "critical|high|medium|low",
      "line": 行号（可选）
    }
  ],
  "suggestions": [
    {
      "description": "建议描述",
      "code": "优化后的代码（可选）",
      "impact": "影响说明"
    }
  ]
}`;
  }
  
  /**
   * 构建优化提示词
   */
  private buildOptimizationPrompt(analysis: AnalysisResult, context?: any): string {
    return `请为以下分析结果生成优化方案：

分析结果：
- 类型：${analysis.type}
- 描述：${analysis.description}
- 严重性：${analysis.severity}
- 建议：${analysis.recommendation}

${context ? `上下文：${JSON.stringify(context, null, 2)}` : ''}

请提供：
1. 优化方案描述
2. 优化理由
3. 优化后的代码（如果适用）
4. 预期影响
5. 风险评估

请以JSON格式返回：
{
  "description": "优化方案描述",
  "reasoning": "优化理由",
  "code": "优化后的代码（可选）",
  "estimatedImpact": "预期影响",
  "risk": "low|medium|high"
}`;
  }
  
  /**
   * 构建代码生成提示词
   */
  private buildCodeGenerationPrompt(description: string, context?: any): string {
    return `请根据以下需求生成代码：

需求：${description}

${context ? `上下文：${JSON.stringify(context, null, 2)}` : ''}

要求：
1. 使用TypeScript
2. 代码清晰、可读
3. 包含必要的注释
4. 遵循最佳实践

请只返回代码，不要包含解释。`;
  }
  
  /**
   * 解析问题分析
   */
  private parseProblemAnalysis(content: string): ProblemAnalysis {
    try {
      // 尝试提取JSON
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          problem: '',
          rootCause: parsed.rootCause || '',
          impact: parsed.impact || '',
          suggestions: parsed.suggestions || [],
          priority: parsed.priority || 'medium'
        };
      }
    } catch (e) {
    }
    
    // 降级处理
    return {
      problem: '',
      rootCause: content,
      impact: '未知',
      suggestions: [],
      priority: 'medium'
    };
  }
  
  /**
   * 解析代码分析
   */
  private parseCodeAnalysis(content: string, originalCode: string): CodeAnalysis {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          code: originalCode,
          issues: parsed.issues || [],
          suggestions: parsed.suggestions || []
        };
      }
    } catch (e) {
    }
    
    return {
      code: originalCode,
      issues: [],
      suggestions: []
    };
  }
  
  /**
   * 解析优化建议
   */
  private parseOptimizationSuggestion(
    content: string,
    analysis: AnalysisResult
  ): OptimizationSuggestion {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          type: analysis.type,
          description: parsed.description || analysis.description,
          reasoning: parsed.reasoning || '',
          code: parsed.code,
          estimatedImpact: parsed.estimatedImpact || '未知',
          risk: parsed.risk || analysis.risk
        };
      }
    } catch (e) {
    }
    
    return {
      type: analysis.type,
      description: analysis.description,
      reasoning: '',
      estimatedImpact: '未知',
      risk: analysis.risk
    };
  }
  
  /**
   * 提取代码
   */
  private extractCode(content: string): string {
    // 尝试提取代码块
    const codeBlockMatch = content.match(/```(?:typescript|javascript|ts|js)?\n([\s\S]*?)```/);
    if (codeBlockMatch) {
      return codeBlockMatch[1].trim();
    }
    
    // 如果没有代码块，返回原内容
    return content.trim();
  }
}

