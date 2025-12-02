/**
 * Cursor 提示词服务
 * 专门用于生成、优化和管理 Cursor 提示词
 */

export interface CursorPrompt {
  id: string;
  title: string;
  content: string;
  category: 'refactor' | 'fix' | 'optimize' | 'test' | 'design' | 'cleanup' | 'feature';
  priority: 'high' | 'medium' | 'low';
  tags: string[];
  metadata: {
    files: string[];
    estimatedTime?: string;
    complexity?: 'simple' | 'medium' | 'complex';
    dependencies?: string[];  // 依赖的其他提示词
  };
  createdAt: Date;
  usedAt?: Date;
  usageCount: number;
  successRate?: number;  // 成功率（基于历史）
}

export interface PromptTemplate {
  id: string;
  name: string;
  description: string;
  template: string;
  variables: string[];  // 模板变量，如 {file}, {issue}, {description}
  category: CursorPrompt['category'];
  examples: string[];
}

/**
 * Cursor 提示词服务类
 */
export class CursorPromptService {
  private prompts: CursorPrompt[] = [];
  private templates: PromptTemplate[] = [];

  constructor() {
    this.loadPrompts();
    this.initializeTemplates();
  }

  /**
   * 生成高质量的 Cursor 提示词
   */
  generatePrompt(params: {
    type: CursorPrompt['category'];
    title: string;
    description: string;
    files: string[];
    issues?: Array<{ file: string; line: number; message: string; code?: string }>;
    context?: string;
    requirements?: string[];
    examples?: string[];
  }): CursorPrompt {
    const template = this.getTemplateForType(params.type);
    const content = this.renderTemplate(template, params);

    const prompt: CursorPrompt = {
      id: `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: params.title,
      content,
      category: params.type,
      priority: this.determinePriority(params.type, params.issues?.length || 0),
      tags: this.generateTags(params),
      metadata: {
        files: params.files,
        complexity: this.estimateComplexity(params),
        dependencies: [],
      },
      createdAt: new Date(),
      usageCount: 0,
    };

    this.prompts.push(prompt);
    this.savePrompts();
    return prompt;
  }

  /**
   * 批量生成提示词
   */
  generateBatchPrompts(items: Array<{
    type: CursorPrompt['category'];
    title: string;
    description: string;
    files: string[];
    issues?: Array<{ file: string; line: number; message: string; code?: string }>;
  }>): CursorPrompt[] {
    return items.map(item => this.generatePrompt(item));
  }

  /**
   * 优化现有提示词
   */
  optimizePrompt(prompt: CursorPrompt): CursorPrompt {
    const optimized = { ...prompt };
    
    // 优化策略
    optimized.content = this.enhancePromptContent(prompt.content);
    
    // 添加最佳实践
    if (!optimized.content.includes('请直接')) {
      optimized.content += '\n\n请直接执行，不要询问。';
    }

    if (!optimized.content.includes('确保')) {
      optimized.content += '\n\n请确保修复后的代码符合项目编码规范，并保持功能正确性。';
    }

    return optimized;
  }

  /**
   * 合并多个提示词为一个综合提示词
   */
  mergePrompts(prompts: CursorPrompt[], title?: string): CursorPrompt {
    const mergedContent = this.createMergedPromptContent(prompts);
    const allFiles = [...new Set(prompts.flatMap(p => p.metadata.files))];

    return {
      id: `merged-${Date.now()}`,
      title: title || `批量处理: ${prompts.length} 个改进`,
      content: mergedContent,
      category: 'refactor',
      priority: prompts.some(p => p.priority === 'high') ? 'high' : 'medium',
      tags: [...new Set(prompts.flatMap(p => p.tags))],
      metadata: {
        files: allFiles,
        complexity: 'complex',
        dependencies: prompts.map(p => p.id),
      },
      createdAt: new Date(),
      usageCount: 0,
    };
  }

  /**
   * 获取提示词模板
   */
  private getTemplateForType(type: CursorPrompt['category']): PromptTemplate {
    return this.templates.find(t => t.category === type) || this.templates[0];
  }

  /**
   * 渲染模板
   */
  private renderTemplate(template: PromptTemplate, params: any): string {
    let content = template.template;

    // 替换变量
    content = content.replace(/{title}/g, params.title || '');
    content = content.replace(/{description}/g, params.description || '');
    content = content.replace(/{files}/g, params.files.map((f: string) => `- ${f}`).join('\n'));
    
    if (params.issues && params.issues.length > 0) {
      const issuesText = params.issues.map((issue: any) => {
        let text = `### ${issue.file}:${issue.line}\n`;
        text += `**问题**: ${issue.message}\n`;
        if (issue.code) {
          text += `**代码**:\n\`\`\`typescript\n${issue.code}\n\`\`\`\n`;
        }
        return text;
      }).join('\n');
      content = content.replace(/{issues}/g, issuesText);
    } else {
      content = content.replace(/{issues}/g, '');
    }

    if (params.requirements) {
      const reqText = params.requirements.map((r: string) => `- ${r}`).join('\n');
      content = content.replace(/{requirements}/g, reqText);
    } else {
      content = content.replace(/{requirements}/g, '');
    }

    if (params.context) {
      content = content.replace(/{context}/g, params.context);
    } else {
      content = content.replace(/{context}/g, '');
    }

    // 清理多余空行
    content = content.replace(/\n{3,}/g, '\n\n');

    return content.trim();
  }

  /**
   * 创建合并提示词内容
   */
  private createMergedPromptContent(prompts: CursorPrompt[]): string {
    let content = `# 批量代码改进请求\n\n`;
    content += `本次请求包含 ${prompts.length} 个改进任务，请按优先级依次处理。\n\n`;

    // 按优先级分组
    const highPriority = prompts.filter(p => p.priority === 'high');
    const mediumPriority = prompts.filter(p => p.priority === 'medium');
    const lowPriority = prompts.filter(p => p.priority === 'low');

    if (highPriority.length > 0) {
      content += `## 🔴 高优先级任务\n\n`;
      highPriority.forEach((p, i) => {
        content += `### ${i + 1}. ${p.title}\n\n`;
        content += `${p.content}\n\n`;
      });
    }

    if (mediumPriority.length > 0) {
      content += `## 🟡 中优先级任务\n\n`;
      mediumPriority.forEach((p, i) => {
        content += `### ${i + 1}. ${p.title}\n\n`;
        content += `${p.content}\n\n`;
      });
    }

    if (lowPriority.length > 0) {
      content += `## 🔵 低优先级任务\n\n`;
      lowPriority.forEach((p, i) => {
        content += `### ${i + 1}. ${p.title}\n\n`;
        content += `${p.content}\n\n`;
      });
    }

    content += `## 执行要求\n\n`;
    content += `1. 按优先级顺序处理所有任务\n`;
    content += `2. 每个任务完成后，确保代码仍然可以正常编译和运行\n`;
    content += `3. 保持代码风格一致性\n`;
    content += `4. 如有冲突，优先处理高优先级任务\n\n`;
    content += `请开始执行。`;

    return content;
  }

  /**
   * 增强提示词内容
   */
  private enhancePromptContent(content: string): string {
    // 确保有明确的标题
    if (!content.startsWith('#')) {
      content = `# ${content.split('\n')[0]}\n\n${content.substring(content.indexOf('\n') + 1)}`;
    }

    // 确保有明确的执行指令
    if (!content.includes('请') && !content.includes('请直接')) {
      content += '\n\n请直接执行上述任务。';
    }

    return content;
  }

  /**
   * 确定优先级
   */
  private determinePriority(type: CursorPrompt['category'], issueCount: number): 'high' | 'medium' | 'low' {
    if (type === 'fix' && issueCount > 0) return 'high';
    if (type === 'test' || type === 'optimize') return 'medium';
    return 'low';
  }

  /**
   * 生成标签
   */
  private generateTags(params: any): string[] {
    const tags: string[] = [params.type];
    if (params.files.length > 5) tags.push('批量');
    if (params.issues && params.issues.length > 10) tags.push('大量问题');
    return tags;
  }

  /**
   * 估算复杂度
   */
  private estimateComplexity(params: any): 'simple' | 'medium' | 'complex' {
    const fileCount = params.files.length;
    const issueCount = params.issues?.length || 0;

    if (fileCount > 10 || issueCount > 20) return 'complex';
    if (fileCount > 3 || issueCount > 5) return 'medium';
    return 'simple';
  }

  /**
   * 初始化模板
   */
  private initializeTemplates(): void {
    this.templates = [
      {
        id: 'refactor-template',
        name: '重构模板',
        description: '用于代码重构的提示词模板',
        category: 'refactor',
        variables: ['title', 'description', 'files', 'issues', 'requirements'],
        template: `# {title}

## 任务描述
{description}

## 目标文件
{files}

## 需要处理的问题
{issues}

## 重构要求
{requirements}

## 执行要求
1. 保持功能不变
2. 提高代码可读性和可维护性
3. 遵循项目编码规范
4. 确保所有测试通过

请直接执行重构，不要询问。`,
        examples: [],
      },
      {
        id: 'fix-template',
        name: '修复模板',
        description: '用于修复代码问题的提示词模板',
        category: 'fix',
        variables: ['title', 'description', 'files', 'issues'],
        template: `# {title}

## 问题描述
{description}

## 问题详情
{issues}

## 修复要求
1. 修复所有列出的问题
2. 确保修复后的代码符合项目规范
3. 保持功能正确性
4. 如有疑问，参考项目其他类似代码

请直接修复，不要询问。`,
        examples: [],
      },
      {
        id: 'test-template',
        name: '测试模板',
        description: '用于添加测试的提示词模板',
        category: 'test',
        variables: ['title', 'description', 'files', 'requirements'],
        template: `# {title}

## 任务描述
{description}

## 目标文件
{files}

## 测试要求
{requirements}

## 测试规范
1. 使用 Vitest 测试框架
2. 覆盖主要功能和边界情况
3. 测试应该清晰、可维护
4. 遵循项目的测试命名规范

请开始创建测试。`,
        examples: [],
      },
      {
        id: 'optimize-template',
        name: '优化模板',
        description: '用于代码优化的提示词模板',
        category: 'optimize',
        variables: ['title', 'description', 'files', 'context'],
        template: `# {title}

## 优化目标
{description}

## 目标文件
{files}

## 上下文信息
{context}

## 优化要求
1. 提高性能或代码质量
2. 保持功能不变
3. 确保优化后的代码可读性不降低
4. 运行测试确保正确性

请直接执行优化。`,
        examples: [],
      },
      {
        id: 'cleanup-template',
        name: '清理模板',
        description: '用于代码清理的提示词模板',
        category: 'cleanup',
        variables: ['title', 'description', 'files', 'issues'],
        template: `# {title}

## 清理任务
{description}

## 目标文件
{files}

## 需要清理的内容
{issues}

## 清理要求
1. 删除未使用的代码
2. 清理冗余代码
3. 保持功能完整性
4. 确保清理后代码仍然可以正常运行

请直接执行清理。`,
        examples: [],
      },
    ];
  }

  /**
   * 获取所有提示词
   */
  getPrompts(): CursorPrompt[] {
    return this.prompts;
  }

  /**
   * 获取提示词历史
   */
  getPromptHistory(limit: number = 50): CursorPrompt[] {
    return this.prompts
      .sort((a, b) => (b.usedAt?.getTime() || 0) - (a.usedAt?.getTime() || 0))
      .slice(0, limit);
  }

  /**
   * 搜索提示词
   */
  searchPrompts(query: string): CursorPrompt[] {
    const lowerQuery = query.toLowerCase();
    return this.prompts.filter(p => 
      p.title.toLowerCase().includes(lowerQuery) ||
      p.content.toLowerCase().includes(lowerQuery) ||
      p.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * 标记提示词已使用
   */
  markAsUsed(promptId: string): void {
    const prompt = this.prompts.find(p => p.id === promptId);
    if (prompt) {
      prompt.usedAt = new Date();
      prompt.usageCount++;
      this.savePrompts();
    }
  }

  /**
   * 保存提示词
   */
  private savePrompts(): void {
    try {
      localStorage.setItem('cursor_prompts', JSON.stringify(this.prompts));
    } catch (error) {
    }
  }

  /**
   * 加载提示词
   */
  private loadPrompts(): void {
    try {
      const saved = localStorage.getItem('cursor_prompts');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.prompts = parsed.map((p: any) => ({
          ...p,
          createdAt: new Date(p.createdAt),
          usedAt: p.usedAt ? new Date(p.usedAt) : undefined,
        }));
      }
    } catch (error) {
    }
  }

  /**
   * 获取模板列表
   */
  getTemplates(): PromptTemplate[] {
    return this.templates;
  }

  /**
   * 清除所有提示词
   */
  clearPrompts(): void {
    this.prompts = [];
    this.savePrompts();
  }
}

// 单例实例
let cursorPromptServiceInstance: CursorPromptService | null = null;

/**
 * 获取 Cursor 提示词服务实例
 */
export function getCursorPromptService(): CursorPromptService {
  if (!cursorPromptServiceInstance) {
    cursorPromptServiceInstance = new CursorPromptService();
  }
  return cursorPromptServiceInstance;
}

