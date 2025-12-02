/**
 * 自我迭代服务
 * 整合代码审查、测试管理，实现自我分析、优化、重构和设计
 */

import { getCodeReviewService, CodeReviewResult, CodeIssue } from './codeReviewService';
import { getTestManagementService, TestAnalysis } from './testManagementService';
import { getCursorPromptService, CursorPrompt } from './cursorPromptService';

const ISSUE_TYPE_LABELS: Record<CodeIssue['type'], string> = {
  duplicate: '重复代码',
  unused: '未使用',
  dead: '死代码',
  complex: '高复杂度',
  long: '过长',
  import: '导入问题',
  naming: '命名问题',
  other: '其他',
};

export interface ImprovementPlan {
  id: string;
  type: 'refactor' | 'optimize' | 'test' | 'design' | 'cleanup';
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  targetFiles: string[];
  estimatedImpact: string;  // 预期影响
  estimatedEffort: string;  // 预估工作量
  cursorPrompt: string;  // Cursor 提示词（原始文本）
  cursorPromptObj?: CursorPrompt;  // Cursor 提示词对象（增强版）
  canAutoApply: boolean;  // 是否可以自动应用
  autoApplyAction?: () => Promise<void>;  // 自动应用函数
}

export interface IterationHistory {
  id: string;
  timestamp: Date;
  plan: ImprovementPlan;
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped';
  result?: {
    success: boolean;
    changes: string[];  // 修改的文件列表
    metrics: {
      before: any;
      after: any;
    };
    notes?: string;
  };
}

export interface SelfIterationReport {
  codeReview: CodeReviewResult;
  testAnalysis: TestAnalysis;
  improvementPlans: ImprovementPlan[];
  history: IterationHistory[];
  cursorPrompts: CursorPrompt[];  // 所有生成的提示词
  summary: {
    totalIssues: number;
    totalTests: number;
    testCoverage: number;
    improvementOpportunities: number;
    completedImprovements: number;
  };
}

/**
 * 自我迭代服务类
 */
export class SelfIterationService {
  private history: IterationHistory[] = [];
  private codeReviewService = getCodeReviewService();
  private testManagementService = getTestManagementService();
  private cursorPromptService = getCursorPromptService();

  /**
   * 执行完整的自我分析
   */
  async analyzeSelf(): Promise<SelfIterationReport> {

    // 1. 代码审查
    const codeReview = await this.codeReviewService.scanCodebase('src');

    // 2. 测试分析
    const testAnalysis = await this.testManagementService.scanTests('tests,src');

    // 3. 生成改进计划
    const improvementPlans = this.generateImprovementPlans(codeReview, testAnalysis);

    // 4. 生成 Cursor 提示词对象
    const cursorPrompts = improvementPlans
      .map(plan => plan.cursorPromptObj)
      .filter((p): p is CursorPrompt => p !== undefined);

    // 5. 加载历史记录
    this.loadHistory();

    // 6. 生成报告
    const summary = this.generateSummary(codeReview, testAnalysis, improvementPlans);

    return {
      codeReview,
      testAnalysis,
      improvementPlans,
      history: this.history,
      cursorPrompts,
      summary,
    };
  }

  /**
   * 合并多个改进计划为一个综合计划
   */
  mergeImprovementPlans(plans: ImprovementPlan[], title?: string): ImprovementPlan {
    if (plans.length === 0) {
      throw new Error('无法合并空计划列表');
    }

    if (plans.length === 1) {
      return plans[0];
    }

    // 合并所有文件
    const allFiles = [...new Set(plans.flatMap(p => p.targetFiles))];
    
    // 合并所有描述
    const mergedDescription = plans
      .map(p => `- ${p.title}: ${p.description}`)
      .join('\n');
    
    // 确定最高优先级
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const highestPriority = plans.reduce((max, p) => 
      priorityOrder[p.priority] > priorityOrder[max.priority] ? p : max
    );

    // 确定类型（如果所有计划类型相同则使用该类型，否则使用 refactor）
    const types = [...new Set(plans.map(p => p.type))];
    const mergedType = types.length === 1 ? types[0] : 'refactor';

    // 合并提示词
    const promptObjects = plans
      .map(p => p.cursorPromptObj)
      .filter((p): p is CursorPrompt => p !== undefined);
    
    let mergedPromptObj: CursorPrompt | undefined;
    if (promptObjects.length > 0) {
      mergedPromptObj = this.cursorPromptService.mergePrompts(
        promptObjects,
        title || `批量处理: ${plans.length} 个改进`
      );
    }

    // 生成合并后的提示词文本
    const mergedPromptText = mergedPromptObj?.content || plans
      .map(p => `## ${p.title}\n\n${p.cursorPrompt}`)
      .join('\n\n---\n\n');

    return {
      id: `merged-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: mergedType,
      priority: highestPriority.priority,
      title: title || `批量处理: ${plans.length} 个改进`,
      description: `合并了 ${plans.length} 个相关改进计划：\n\n${mergedDescription}`,
      targetFiles: allFiles,
      estimatedImpact: `综合影响：${plans.map(p => p.estimatedImpact).join('; ')}`,
      estimatedEffort: plans.some(p => p.estimatedEffort === '高') ? '高' : 
                      plans.some(p => p.estimatedEffort === '中') ? '中' : '低',
      cursorPrompt: mergedPromptText,
      cursorPromptObj: mergedPromptObj,
      canAutoApply: false, // 合并后的计划通常不能自动应用
      autoApplyAction: undefined,
    };
  }

  /**
   * 生成改进计划
   */
private generateImprovementPlans(
    codeReview: CodeReviewResult,
    testAnalysis: TestAnalysis
  ): ImprovementPlan[] {
    const plans: ImprovementPlan[] = [];

    // 1. 基于代码审查问题生成改进计划
    codeReview.issues.forEach(issue => {
      const plan = this.createPlanFromIssue(issue);
      if (plan) {
        plans.push(plan);
      }
    });

    // 2. 基于测试分析生成改进计划
    if (testAnalysis.summary.coverage < 80) {
      const lowCoverageFiles = testAnalysis.files.filter(f => !f.coverage || f.coverage < 80);
      const cursorPromptObj = this.cursorPromptService.generatePrompt({
        type: 'test',
        title: '提高测试覆盖率',
        description: `当前测试覆盖率为 ${testAnalysis.summary.coverage.toFixed(0)}%，目标达到 80% 以上`,
        files: lowCoverageFiles.map(f => f.path),
        requirements: [
          '为每个文件添加单元测试',
          '确保测试覆盖主要功能和边界情况',
          '使用 Vitest 测试框架',
          '测试应该清晰、可维护',
        ],
      });

      plans.push({
        id: `improve-coverage-${Date.now()}`,
        type: 'test',
        priority: 'high',
        title: '提高测试覆盖率',
        description: `当前测试覆盖率为 ${testAnalysis.summary.coverage.toFixed(0)}%，目标达到 80% 以上`,
        targetFiles: lowCoverageFiles.map(f => f.path),
        estimatedImpact: '提高代码质量和可维护性',
        estimatedEffort: '中等',
        cursorPrompt: cursorPromptObj.content,
        cursorPromptObj,
        canAutoApply: false,
      });
    }

    // 3. 基于重复代码生成重构计划
    const duplicateIssues = codeReview.issues.filter(i => i.type === 'duplicate');
    if (duplicateIssues.length > 0) {
      const targetFiles = [...new Set(duplicateIssues.map(i => i.file))];
      const cursorPromptObj = this.cursorPromptService.generatePrompt({
        type: 'refactor',
        title: '消除重复代码',
        description: `发现 ${duplicateIssues.length} 处重复代码，建议提取公共模块`,
        files: targetFiles,
        issues: duplicateIssues.map(i => ({
          file: i.file,
          line: i.line,
          message: i.message,
          code: i.code,
        })),
        requirements: [
          '识别重复的代码模式',
          '提取公共代码到共享模块',
          '重构相关文件使用新的共享模块',
          '确保功能不受影响',
        ],
      });

      plans.push({
        id: `refactor-duplicates-${Date.now()}`,
        type: 'refactor',
        priority: 'medium',
        title: '消除重复代码',
        description: `发现 ${duplicateIssues.length} 处重复代码，建议提取公共模块`,
        targetFiles,
        estimatedImpact: '减少代码冗余，提高可维护性',
        estimatedEffort: '中等',
        cursorPrompt: cursorPromptObj.content,
        cursorPromptObj,
        canAutoApply: false,
      });
    }

    // 4. 基于高复杂度生成优化计划
    const complexIssues = codeReview.issues.filter(i => i.type === 'complex');
    if (complexIssues.length > 0) {
      const targetFiles = [...new Set(complexIssues.map(i => i.file))];
      const cursorPromptObj = this.cursorPromptService.generatePrompt({
        type: 'optimize',
        title: '降低代码复杂度',
        description: `发现 ${complexIssues.length} 个高复杂度文件，建议重构`,
        files: targetFiles,
        issues: complexIssues.map(i => ({
          file: i.file,
          line: i.line,
          message: i.message,
          code: i.code,
        })),
        requirements: [
          '分析每个文件的复杂度来源',
          '将复杂函数拆分为多个小函数',
          '提取公共逻辑到工具函数',
          '减少嵌套层级',
          '确保功能不受影响',
        ],
      });

      plans.push({
        id: `optimize-complexity-${Date.now()}`,
        type: 'optimize',
        priority: 'high',
        title: '降低代码复杂度',
        description: `发现 ${complexIssues.length} 个高复杂度文件，建议重构`,
        targetFiles,
        estimatedImpact: '提高代码可读性和可维护性',
        estimatedEffort: '高',
        cursorPrompt: cursorPromptObj.content,
        cursorPromptObj,
        canAutoApply: false,
      });
    }

    // 5. 基于缺失测试生成测试计划
    const missingTestFiles = this.identifyMissingTests(codeReview, testAnalysis);
    if (missingTestFiles.length > 0) {
      const cursorPromptObj = this.cursorPromptService.generatePrompt({
        type: 'test',
        title: '添加缺失的测试',
        description: `为 ${missingTestFiles.length} 个文件添加测试覆盖`,
        files: missingTestFiles,
        requirements: [
          '为每个文件创建对应的测试文件（.test.ts）',
          '测试应该覆盖主要功能和边界情况',
          '使用 Vitest 测试框架',
          '遵循项目的测试规范',
        ],
      });

      plans.push({
        id: `add-missing-tests-${Date.now()}`,
        type: 'test',
        priority: 'medium',
        title: '添加缺失的测试',
        description: `为 ${missingTestFiles.length} 个文件添加测试覆盖`,
        targetFiles: missingTestFiles,
        estimatedImpact: '提高代码质量和可靠性',
        estimatedEffort: '中等',
        cursorPrompt: cursorPromptObj.content,
        cursorPromptObj,
        canAutoApply: false,
      });
    }

    // 按优先级排序
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    plans.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    return plans;
  }

  /**
   * 从代码问题创建改进计划
   */
  private createPlanFromIssue(issue: CodeIssue): ImprovementPlan | null {
    // 只处理高优先级问题
    if (issue.severity !== 'error' && issue.severity !== 'warning') {
      return null;
    }

    const typeMap: Record<CodeIssue['type'], ImprovementPlan['type']> = {
      duplicate: 'refactor',
      unused: 'cleanup',
      dead: 'cleanup',
      complex: 'optimize',
      long: 'refactor',
      import: 'cleanup',
      naming: 'refactor',
      other: 'refactor',
    };

    const planType = typeMap[issue.type] || 'refactor';
    const categoryMap: Record<ImprovementPlan['type'], CursorPrompt['category']> = {
      refactor: 'refactor',
      optimize: 'optimize',
      test: 'test',
      design: 'design',
      cleanup: 'cleanup',
    };

    // 使用 Cursor 提示词服务生成高质量的提示词
    const cursorPromptObj = this.cursorPromptService.generatePrompt({
      type: categoryMap[planType] || 'fix',
      title: `修复: ${ISSUE_TYPE_LABELS[issue.type]}`,
      description: issue.message,
      files: [issue.file],
      issues: [{
        file: issue.file,
        line: issue.line,
        message: issue.message,
        code: issue.code,
      }],
      requirements: issue.suggestion ? [issue.suggestion] : undefined,
    });

    return {
      id: `issue-${issue.id}`,
      type: planType,
      priority: issue.severity === 'error' ? 'high' : 'medium',
      title: `修复: ${ISSUE_TYPE_LABELS[issue.type]}`,
      description: issue.message,
      targetFiles: [issue.file],
      estimatedImpact: issue.suggestion || '提高代码质量',
      estimatedEffort: '低',
      cursorPrompt: cursorPromptObj.content,  // 保留原始文本格式
      cursorPromptObj,  // 添加增强版对象
      canAutoApply: issue.type === 'import',  // 只有导入问题可以自动修复
      autoApplyAction: issue.type === 'import' ? () => this.autoFixImport(issue) : undefined,
    };
  }

  /**
   * 生成 Cursor 提示词
   */
  private generateIssueFixPrompt(issue: CodeIssue): string {
    return `请修复以下代码问题：

文件：${issue.file}
行号：${issue.line}
问题类型：${ISSUE_TYPE_LABELS[issue.type]}
严重程度：${issue.severity === 'error' ? '错误' : '警告'}
问题描述：${issue.message}
${issue.suggestion ? `修复建议：${issue.suggestion}` : ''}
${issue.code ? `相关代码：\n\`\`\`\n${issue.code}\n\`\`\`` : ''}

请直接修复这个问题，不要询问。`;
  }

  private generateCoverageImprovementPrompt(testAnalysis: TestAnalysis): string {
    const lowCoverageFiles = testAnalysis.files.filter(f => !f.coverage || f.coverage < 80);
    
    return `# 提高测试覆盖率

当前测试覆盖率：${testAnalysis.summary.coverage.toFixed(0)}%
目标覆盖率：80% 以上

## 需要添加测试的文件

${lowCoverageFiles.map(f => `- ${f.path} (当前覆盖率: ${f.coverage || 0}%)`).join('\n')}

## 任务要求

1. 为每个文件添加单元测试
2. 确保测试覆盖主要功能和边界情况
3. 使用 Vitest 测试框架
4. 测试应该清晰、可维护

请开始为这些文件添加测试。`;
  }

  private generateRefactorPrompt(issues: CodeIssue[]): string {
    const filesByIssue = issues.reduce((acc, issue) => {
      if (!acc[issue.file]) {
        acc[issue.file] = [];
      }
      acc[issue.file].push(issue);
      return acc;
    }, {} as Record<string, CodeIssue[]>);

    return `# 消除重复代码重构

发现 ${issues.length} 处重复代码模式。

## 重复代码位置

${Object.entries(filesByIssue).map(([file, fileIssues]) => 
  `### ${file}\n${fileIssues.map(i => `- 行 ${i.line}: ${i.message}`).join('\n')}`
).join('\n\n')}

## 任务要求

1. 识别重复的代码模式
2. 提取公共代码到共享模块
3. 重构相关文件使用新的共享模块
4. 确保功能不受影响

请开始重构。`;
  }

  private generateComplexityReductionPrompt(issues: CodeIssue[]): string {
    return `# 降低代码复杂度

发现 ${issues.length} 个高复杂度文件需要重构。

## 高复杂度文件

${issues.map(i => `- ${i.file} (行 ${i.line}): ${i.message}`).join('\n')}

## 任务要求

1. 分析每个文件的复杂度来源
2. 将复杂函数拆分为多个小函数
3. 提取公共逻辑到工具函数
4. 减少嵌套层级
5. 确保功能不受影响

请开始重构。`;
  }

  private generateTestCreationPrompt(files: string[]): string {
    return `# 添加缺失的测试

需要为以下 ${files.length} 个文件添加测试：

${files.map(f => `- ${f}`).join('\n')}

## 任务要求

1. 为每个文件创建对应的测试文件（.test.ts）
2. 测试应该覆盖主要功能和边界情况
3. 使用 Vitest 测试框架
4. 遵循项目的测试规范

请开始创建测试。`;
  }

  /**
   * 识别缺失的测试
   */
  private identifyMissingTests(
    codeReview: CodeReviewResult,
    testAnalysis: TestAnalysis
  ): string[] {
    // 获取所有源代码文件
    const sourceFiles = codeReview.files.map(f => f.file);
    const testFiles = testAnalysis.files.map(f => f.path);

    // 找出没有对应测试的源代码文件
    const missingTests: string[] = [];

    sourceFiles.forEach(sourceFile => {
      // 检查是否有对应的测试文件
      const hasTest = testFiles.some(testFile => {
        const sourceBase = sourceFile.replace(/\.(ts|tsx)$/, '');
        const testBase = testFile.replace(/\.(test|spec)\.(ts|tsx)$/, '');
        return testBase.includes(sourceBase) || testBase.endsWith(sourceBase.split('/').pop() || '');
      });

      if (!hasTest && !sourceFile.includes('.test.') && !sourceFile.includes('.spec.')) {
        missingTests.push(sourceFile);
      }
    });

    return missingTests.slice(0, 10);  // 限制数量
  }

  /**
   * 自动修复导入问题
   */
  private async autoFixImport(issue: CodeIssue): Promise<void> {
    // 这个功能已经在 CodeReviewManager 中实现了
    // 这里只是占位
  }

  /**
   * 生成总结
   */
  private generateSummary(
    codeReview: CodeReviewResult,
    testAnalysis: TestAnalysis,
    plans: ImprovementPlan[]
  ): SelfIterationReport['summary'] {
    return {
      totalIssues: codeReview.summary.totalIssues,
      totalTests: testAnalysis.summary.totalTests,
      testCoverage: testAnalysis.summary.coverage,
      improvementOpportunities: plans.length,
      completedImprovements: this.history.filter(h => h.status === 'completed').length,
    };
  }

  /**
   * 执行改进计划
   */
  async executeImprovement(plan: ImprovementPlan): Promise<IterationHistory> {
    const history: IterationHistory = {
      id: `iter-${Date.now()}`,
      timestamp: new Date(),
      plan,
      status: 'in_progress',
    };

    try {
      if (plan.canAutoApply && plan.autoApplyAction) {
        await plan.autoApplyAction();
        history.status = 'completed';
        history.result = {
          success: true,
          changes: plan.targetFiles,
          metrics: {},
        };
      } else {
        // 不能自动应用，标记为待处理
        history.status = 'pending';
      }

      this.history.push(history);
      this.saveHistory();
    } catch (error) {
      history.status = 'failed';
      history.result = {
        success: false,
        changes: [],
        metrics: {},
        notes: error instanceof Error ? error.message : String(error),
      };
      this.history.push(history);
      this.saveHistory();
    }

    return history;
  }

  /**
   * 加载历史记录
   */
  private loadHistory(): void {
    try {
      const saved = localStorage.getItem('self_iteration_history');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.history = parsed.map((h: any) => ({
          ...h,
          timestamp: new Date(h.timestamp),
        }));
      }
    } catch (error) {
    }
  }

  /**
   * 保存历史记录
   */
  private saveHistory(): void {
    try {
      localStorage.setItem('self_iteration_history', JSON.stringify(this.history));
    } catch (error) {
    }
  }

  /**
   * 获取改进历史
   */
  getHistory(): IterationHistory[] {
    return this.history;
  }

  /**
   * 清除历史记录
   */
  clearHistory(): void {
    this.history = [];
    this.saveHistory();
  }
}

// 单例实例
let selfIterationServiceInstance: SelfIterationService | null = null;

/**
 * 获取自我迭代服务实例
 */
export function getSelfIterationService(): SelfIterationService {
  if (!selfIterationServiceInstance) {
    selfIterationServiceInstance = new SelfIterationService();
  }
  return selfIterationServiceInstance;
}

