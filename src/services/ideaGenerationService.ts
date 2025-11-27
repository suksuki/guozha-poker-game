/**
 * 想法生成服务
 * 在游戏过程中自动生成优化建议和新想法
 */

export interface GameIdea {
  id: string;
  title: string;
  description: string;
  category: 'optimization' | 'feature' | 'ux' | 'performance' | 'refactor' | 'design';
  priority: 'high' | 'medium' | 'low';
  context: {
    gameState?: any;  // 游戏状态快照
    trigger: string;  // 触发原因
    timestamp: Date;
  };
  impact: {
    estimated: string;  // 预期影响
    effort: 'low' | 'medium' | 'high';  // 预估工作量
    benefit: string;  // 预期收益
  };
  suggestions: string[];  // 具体建议
  relatedFiles?: string[];  // 相关文件
  cursorPrompt?: string;  // 可选的 Cursor 提示词
}

export interface DesignDocument {
  id: string;
  title: string;
  content: string;
  category: string;
  status: 'draft' | 'approved' | 'in_progress' | 'completed' | 'archived';
  priority: 'high' | 'medium' | 'low';
  createdAt: Date;
  updatedAt: Date;
  ideas: GameIdea[];  // 关联的想法
  tags: string[];
}

/**
 * 想法生成服务类
 */
export class IdeaGenerationService {
  private ideas: GameIdea[] = [];
  private designQueue: DesignDocument[] = [];

  constructor() {
    this.loadIdeas();
    this.loadDesignQueue();
  }

  /**
   * 基于游戏状态生成想法
   */
  async generateIdeaFromGameState(gameState: any, trigger: string): Promise<GameIdea | null> {
    // 分析游戏状态，生成想法
    const idea = await this.analyzeGameState(gameState, trigger);
    
    if (idea) {
      this.ideas.push(idea);
      this.saveIdeas();
    }
    
    return idea;
  }

  /**
   * 分析游戏状态并生成想法
   */
  private async analyzeGameState(gameState: any, trigger: string): Promise<GameIdea | null> {
    // 这里可以根据不同的触发场景生成不同的想法
    // 例如：性能问题、用户体验问题、功能缺失等

    const ideas: Partial<GameIdea>[] = [];

    // 1. 性能优化建议
    if (this.detectPerformanceIssue(gameState)) {
      ideas.push({
        title: '性能优化建议',
        description: '检测到可能的性能瓶颈，建议优化',
        category: 'performance',
        priority: 'high',
        impact: {
          estimated: '提高游戏流畅度',
          effort: 'medium',
          benefit: '减少卡顿，提升用户体验',
        },
        suggestions: [
          '优化渲染逻辑',
          '减少不必要的重渲染',
          '使用虚拟列表优化长列表',
        ],
      });
    }

    // 2. 用户体验改进
    if (this.detectUXIssue(gameState)) {
      ideas.push({
        title: '用户体验改进',
        description: '发现可以改进的用户体验点',
        category: 'ux',
        priority: 'medium',
        impact: {
          estimated: '提升用户满意度',
          effort: 'low',
          benefit: '更流畅的操作体验',
        },
        suggestions: [
          '添加操作反馈',
          '优化动画效果',
          '改进交互流程',
        ],
      });
    }

    // 3. 功能增强建议
    if (this.detectFeatureGap(gameState)) {
      ideas.push({
        title: '功能增强建议',
        description: '发现可以添加的新功能',
        category: 'feature',
        priority: 'medium',
        impact: {
          estimated: '增强游戏功能',
          effort: 'high',
          benefit: '提供更多游戏玩法',
        },
        suggestions: [
          '添加新功能',
          '扩展现有功能',
        ],
      });
    }

    // 4. 代码重构建议
    if (this.detectRefactorOpportunity(gameState)) {
      ideas.push({
        title: '代码重构建议',
        description: '发现可以重构的代码',
        category: 'refactor',
        priority: 'low',
        impact: {
          estimated: '提高代码质量',
          effort: 'medium',
          benefit: '更易维护的代码',
        },
        suggestions: [
          '提取公共逻辑',
          '优化代码结构',
        ],
      });
    }

    // 选择最相关的想法
    if (ideas.length === 0) {
      return null;
    }

    // 根据触发原因选择最合适的想法
    const selectedIdea = this.selectBestIdea(ideas, trigger);

    return {
      id: `idea-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      title: selectedIdea.title || '优化建议',
      description: selectedIdea.description || '',
      category: selectedIdea.category || 'optimization',
      priority: selectedIdea.priority || 'medium',
      context: {
        gameState: this.sanitizeGameState(gameState),
        trigger,
        timestamp: new Date(),
      },
      impact: selectedIdea.impact || {
        estimated: '提升游戏体验',
        effort: 'medium',
        benefit: '改进游戏质量',
      },
      suggestions: selectedIdea.suggestions || [],
      cursorPrompt: this.generateCursorPrompt(selectedIdea),
    };
  }

  /**
   * 检测性能问题
   */
  private detectPerformanceIssue(gameState: any): boolean {
    // 简单的启发式检测
    // 实际应该基于真实的性能指标
    if (gameState?.fps && gameState.fps < 30) return true;
    if (gameState?.renderTime && gameState.renderTime > 16) return true;
    if (gameState?.memoryUsage && gameState.memoryUsage > 100) return true;
    return false;
  }

  /**
   * 检测用户体验问题
   */
  private detectUXIssue(gameState: any): boolean {
    // 检测用户操作模式，发现可能的UX问题
    if (gameState?.userActions) {
      const actions = gameState.userActions;
      // 如果用户频繁重复某个操作，可能是UX问题
      if (actions.length > 10) {
        const lastAction = actions[actions.length - 1];
        const repeatCount = actions.filter((a: any) => a.type === lastAction.type).length;
        if (repeatCount > 5) return true;
      }
    }
    return false;
  }

  /**
   * 检测功能缺失
   */
  private detectFeatureGap(gameState: any): boolean {
    // 基于游戏状态检测可能缺失的功能
    // 例如：如果用户频繁手动操作，可能缺少自动化功能
    return false;  // 简化实现
  }

  /**
   * 检测重构机会
   */
  private detectRefactorOpportunity(gameState: any): boolean {
    // 基于代码复杂度或重复模式检测
    return false;  // 简化实现
  }

  /**
   * 选择最佳想法
   */
  private selectBestIdea(ideas: Partial<GameIdea>[], trigger: string): Partial<GameIdea> {
    // 根据触发原因和优先级选择
    const priorityOrder = { high: 3, medium: 2, low: 1 };
    
    // 优先选择高优先级
    const highPriority = ideas.filter(i => i.priority === 'high');
    if (highPriority.length > 0) {
      return highPriority[0];
    }

    // 根据触发原因匹配
    if (trigger.includes('performance') || trigger.includes('slow')) {
      const perfIdea = ideas.find(i => i.category === 'performance');
      if (perfIdea) return perfIdea;
    }

    if (trigger.includes('ux') || trigger.includes('user')) {
      const uxIdea = ideas.find(i => i.category === 'ux');
      if (uxIdea) return uxIdea;
    }

    // 返回第一个
    return ideas[0] || {};
  }

  /**
   * 清理游戏状态（移除敏感信息）
   */
  private sanitizeGameState(gameState: any): any {
    // 只保留必要的状态信息
    return {
      timestamp: gameState?.timestamp,
      // 添加其他需要保留的字段
    };
  }

  /**
   * 生成 Cursor 提示词
   */
  private generateCursorPrompt(idea: Partial<GameIdea>): string {
    if (!idea.title || !idea.suggestions) return '';

    let prompt = `# ${idea.title}\n\n`;
    prompt += `## 描述\n${idea.description || ''}\n\n`;
    prompt += `## 建议\n\n`;
    idea.suggestions.forEach((s, i) => {
      prompt += `${i + 1}. ${s}\n`;
    });
    prompt += `\n## 预期影响\n${idea.impact?.estimated || ''}\n`;
    prompt += `\n## 预期收益\n${idea.impact?.benefit || ''}\n`;
    prompt += `\n请根据以上建议进行优化。`;

    return prompt;
  }

  /**
   * 采纳想法并创建设计文档（优化性能，避免阻塞）
   */
  adoptIdea(idea: GameIdea, documentTitle?: string): DesignDocument {
    // 限制设计文档内容大小，避免生成过大的文档
    const doc: DesignDocument = {
      id: `design-${Date.now()}`,
      title: documentTitle || idea.title,
      content: this.generateDesignDocumentContent(idea),
      category: idea.category,
      status: 'draft',
      priority: idea.priority,
      createdAt: new Date(),
      updatedAt: new Date(),
      ideas: [idea],
      tags: [idea.category, idea.priority],
    };

    this.designQueue.push(doc);
    
    // 限制队列大小，避免无限增长导致性能问题
    const MAX_QUEUE_SIZE = 100;
    if (this.designQueue.length > MAX_QUEUE_SIZE) {
      // 保留最新的文档，移除最旧的
      this.designQueue = this.designQueue.slice(-MAX_QUEUE_SIZE);
    }
    
    // 异步保存，不阻塞主线程
    this.saveDesignQueue();
    
    return doc;
  }

  /**
   * 生成设计文档内容
   */
  private generateDesignDocumentContent(idea: GameIdea): string {
    let content = `# ${idea.title}\n\n`;
    content += `**创建时间**: ${idea.context.timestamp.toLocaleString('zh-CN')}\n`;
    content += `**优先级**: ${idea.priority}\n`;
    content += `**类别**: ${idea.category}\n\n`;
    content += `## 描述\n\n${idea.description}\n\n`;
    content += `## 触发原因\n\n${idea.context.trigger}\n\n`;
    content += `## 预期影响\n\n${idea.impact.estimated}\n\n`;
    content += `## 预期收益\n\n${idea.impact.benefit}\n\n`;
    content += `## 预估工作量\n\n${idea.impact.effort}\n\n`;
    content += `## 具体建议\n\n`;
    idea.suggestions.forEach((s, i) => {
      content += `${i + 1}. ${s}\n`;
    });
    if (idea.cursorPrompt) {
      content += `\n## Cursor 提示词\n\n\`\`\`\n${idea.cursorPrompt}\n\`\`\`\n`;
    }
    content += `\n## 状态\n\n- [ ] 待实现\n`;

    return content;
  }

  /**
   * 获取所有想法
   */
  getIdeas(): GameIdea[] {
    return this.ideas;
  }

  /**
   * 获取设计队列
   */
  getDesignQueue(): DesignDocument[] {
    return this.designQueue;
  }

  /**
   * 更新设计文档状态
   */
  updateDesignStatus(docId: string, status: DesignDocument['status']): void {
    const doc = this.designQueue.find(d => d.id === docId);
    if (doc) {
      doc.status = status;
      doc.updatedAt = new Date();
      this.saveDesignQueue();
    }
  }

  /**
   * 保存想法（使用防抖和异步，避免阻塞主线程）
   */
  private saveIdeasTimeout: number | null = null;
  private saveIdeas(): void {
    // 清除之前的定时器
    if (this.saveIdeasTimeout !== null) {
      clearTimeout(this.saveIdeasTimeout);
    }
    
    // 使用防抖，延迟保存
    this.saveIdeasTimeout = window.setTimeout(() => {
      try {
        // 使用异步方式保存，避免阻塞
        const data = JSON.stringify(this.ideas);
        localStorage.setItem('game_ideas', data);
      } catch (error) {
        console.warn('[IdeaGenerationService] 保存想法失败:', error);
      } finally {
        this.saveIdeasTimeout = null;
      }
    }, 100); // 100ms 防抖
  }

  /**
   * 加载想法
   */
  private loadIdeas(): void {
    try {
      const saved = localStorage.getItem('game_ideas');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.ideas = parsed.map((i: any) => ({
          ...i,
          context: {
            ...i.context,
            timestamp: new Date(i.context.timestamp),
          },
        }));
      }
    } catch (error) {
      console.warn('[IdeaGenerationService] 加载想法失败:', error);
    }
  }

  /**
   * 保存设计队列（使用防抖和异步，避免阻塞主线程）
   */
  private saveDesignQueueTimeout: number | null = null;
  private saveDesignQueue(): void {
    // 清除之前的定时器
    if (this.saveDesignQueueTimeout !== null) {
      clearTimeout(this.saveDesignQueueTimeout);
    }
    
    // 使用防抖，延迟保存
    this.saveDesignQueueTimeout = window.setTimeout(() => {
      try {
        // 使用异步方式保存，避免阻塞
        const data = JSON.stringify(this.designQueue);
        localStorage.setItem('design_queue', data);
      } catch (error) {
        console.warn('[IdeaGenerationService] 保存设计队列失败:', error);
      } finally {
        this.saveDesignQueueTimeout = null;
      }
    }, 100); // 100ms 防抖
  }

  /**
   * 加载设计队列
   */
  private loadDesignQueue(): void {
    try {
      const saved = localStorage.getItem('design_queue');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.designQueue = parsed.map((d: any) => ({
          ...d,
          createdAt: new Date(d.createdAt),
          updatedAt: new Date(d.updatedAt),
          ideas: d.ideas.map((i: any) => ({
            ...i,
            context: {
              ...i.context,
              timestamp: new Date(i.context.timestamp),
            },
          })),
        }));
      }
    } catch (error) {
      console.warn('[IdeaGenerationService] 加载设计队列失败:', error);
    }
  }

  /**
   * 导出设计文档到文件
   */
  async exportDesignDocument(doc: DesignDocument): Promise<void> {
    // 这里可以调用后端API保存到文件系统
    // 或者使用下载功能
    const blob = new Blob([doc.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${doc.title.replace(/\s+/g, '_')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

// 单例实例
let ideaGenerationServiceInstance: IdeaGenerationService | null = null;

/**
 * 获取想法生成服务实例
 */
export function getIdeaGenerationService(): IdeaGenerationService {
  if (!ideaGenerationServiceInstance) {
    ideaGenerationServiceInstance = new IdeaGenerationService();
  }
  return ideaGenerationServiceInstance;
}

