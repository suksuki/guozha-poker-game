/**
 * 设计文档服务
 * 扫描、解析和管理设计文档（MD 文件）
 */

import { DOC_PATHS } from '../utils/docList';

export interface DesignDoc {
  id: string;
  path: string;
  title: string;
  category: 'architecture' | 'feature' | 'development' | 'testing' | 'fix' | 'setup' | 'other';
  status: 'draft' | 'planning' | 'in_progress' | 'completed' | 'deprecated';
  priority: 'high' | 'medium' | 'low';
  lastModified: number;
  size: number;
  content?: string;  // 文档内容（可选，按需加载）
  tasks?: DesignTask[];  // 从文档中提取的任务
  relatedDocs?: string[];  // 相关文档路径
  tags?: string[];  // 标签
}

export interface DesignTask {
  id: string;
  docId: string;
  text: string;
  status: 'todo' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'high' | 'medium' | 'low';
  assignee?: string;  // 负责人
  dueDate?: string;  // 截止日期
  notes?: string;  // 备注
}

export interface DesignDocStats {
  total: number;
  byCategory: Record<string, number>;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  completedTasks: number;
  totalTasks: number;
}

/**
 * 设计文档服务类
 */
export class DesignDocService {
  private docs: Map<string, DesignDoc> = new Map();
  private tasks: Map<string, DesignTask> = new Map();
  private docMetadata: Map<string, any> = new Map();  // 存储文档元数据（状态、优先级等）

  /**
   * 扫描文档目录
   * 使用 DOC_PATHS 列表加载所有文档
   */
  async scanDocs(basePath: string = '/docs'): Promise<DesignDoc[]> {
    const docs: DesignDoc[] = [];

    // 并行加载所有文档
    const loadPromises = DOC_PATHS.map(path => this.loadDoc(path));
    const results = await Promise.allSettled(loadPromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        docs.push(result.value);
        this.docs.set(result.value.id, result.value);
      } else {
        // 静默失败，只记录警告
        const path = DOC_PATHS[index];
        if (result.status === 'rejected') {
        }
      }
    });

    return docs;
  }

  /**
   * 加载单个文档
   */
  async loadDoc(path: string): Promise<DesignDoc | null> {
    try {
      // 尝试从服务器加载文档
      // Vite 开发服务器会从项目根目录提供文件
      let response: Response;
      
      // 确保路径以 / 开头
      const normalizedPath = path.startsWith('/') ? path : `/${path}`;
      
      // 尝试加载
      response = await fetch(normalizedPath);
      
      if (!response.ok) {
        // 如果失败，尝试不带前导斜杠
        response = await fetch(path);
        if (!response.ok) {
          return null;
        }
      }

      const content = await response.text();
      const metadata = this.docMetadata.get(path) || {};

      // 解析文档
      const parsed = this.parseDoc(path, content, metadata);

      // 提取任务
      const tasks = this.extractTasks(parsed.id, content);

      return {
        ...parsed,
        content,
        tasks,
      };
    } catch (error) {
      // 静默失败，返回 null
      return null;
    }
  }

  /**
   * 解析文档
   */
  private parseDoc(path: string, content: string, metadata: any): DesignDoc {
    // 提取标题（第一个 # 标题）
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : path.split('/').pop() || '未命名文档';

    // 确定分类
    const category = this.determineCategory(path);

    // 从元数据或文档中提取状态
    const status = metadata.status || this.extractStatus(content) || 'draft';

    // 从元数据或文档中提取优先级
    const priority = metadata.priority || this.extractPriority(content) || 'medium';

    // 提取标签
    const tags = this.extractTags(content);

    // 提取相关文档
    const relatedDocs = this.extractRelatedDocs(content);

    return {
      id: this.generateDocId(path),
      path,
      title,
      category,
      status,
      priority,
      lastModified: Date.now(),  // 实际应该从文件系统获取
      size: content.length,
      tags,
      relatedDocs,
    };
  }

  /**
   * 确定文档分类
   */
  private determineCategory(path: string): DesignDoc['category'] {
    if (path.includes('/architecture/')) return 'architecture';
    if (path.includes('/features/')) return 'feature';
    if (path.includes('/development/')) return 'development';
    if (path.includes('/testing/')) return 'testing';
    if (path.includes('/fixes/')) return 'fix';
    if (path.includes('/setup/')) return 'setup';
    return 'other';
  }

  /**
   * 提取状态（从文档内容或注释）
   */
  private extractStatus(content: string): DesignDoc['status'] | null {
    // 查找状态标记：<!-- status: completed --> 或 [status: in_progress]
    const statusMatch = content.match(/(?:<!--\s*status:\s*(\w+)\s*-->|\[status:\s*(\w+)\])/i);
    if (statusMatch) {
      const status = (statusMatch[1] || statusMatch[2]).toLowerCase();
      if (['draft', 'planning', 'in_progress', 'completed', 'deprecated'].includes(status)) {
        return status as DesignDoc['status'];
      }
    }

    // 查找完成标记
    if (content.match(/##?\s*已完成|##?\s*完成|✅|✨/)) {
      return 'completed';
    }

    // 查找进行中标记
    if (content.match(/##?\s*进行中|##?\s*实现中|🚧|⏳/)) {
      return 'in_progress';
    }

    return null;
  }

  /**
   * 提取优先级
   */
  private extractPriority(content: string): DesignDoc['priority'] | null {
    const priorityMatch = content.match(/(?:<!--\s*priority:\s*(\w+)\s*-->|\[priority:\s*(\w+)\])/i);
    if (priorityMatch) {
      const priority = (priorityMatch[1] || priorityMatch[2]).toLowerCase();
      if (['high', 'medium', 'low'].includes(priority)) {
        return priority as DesignDoc['priority'];
      }
    }

    // 查找优先级标记
    if (content.match(/高优先级|high priority|🔥/)) {
      return 'high';
    }
    if (content.match(/低优先级|low priority/)) {
      return 'low';
    }

    return null;
  }

  /**
   * 提取标签
   */
  private extractTags(content: string): string[] {
    const tags: string[] = [];

    // 查找标签标记：<!-- tags: tag1, tag2 -->
    const tagsMatch = content.match(/<!--\s*tags:\s*(.+?)\s*-->/i);
    if (tagsMatch) {
      tags.push(...tagsMatch[1].split(',').map(t => t.trim()));
    }

    // 从标题和内容中提取关键词
    const keywords = ['多声道', 'TTS', 'LLM', '南昌话', '吵架', '音频', '语音', '训练'];
    keywords.forEach(keyword => {
      if (content.includes(keyword)) {
        tags.push(keyword);
      }
    });

    return [...new Set(tags)];  // 去重
  }

  /**
   * 提取相关文档
   */
  private extractRelatedDocs(content: string): string[] {
    const relatedDocs: string[] = [];

    // 查找文档链接
    const linkRegex = /\[([^\]]+)\]\(([^)]+\.md)\)/g;
    let match;
    while ((match = linkRegex.exec(content)) !== null) {
      relatedDocs.push(match[2]);
    }

    return [...new Set(relatedDocs)];  // 去重
  }

  /**
   * 提取任务（从文档中）
   */
  private extractTasks(docId: string, content: string): DesignTask[] {
    const tasks: DesignTask[] = [];

    // 查找任务列表：- [ ] 或 - [x] 或 - [X]
    const taskRegex = /^[-*]\s+\[([ xX])\]\s+(.+)$/gm;
    let match;
    let taskIndex = 0;

    while ((match = taskRegex.exec(content)) !== null) {
      const isCompleted = match[1].toLowerCase() === 'x';
      const taskText = match[2].trim();

      // 提取优先级
      let priority: DesignTask['priority'] = 'medium';
      if (taskText.match(/高优先级|high|🔥/)) {
        priority = 'high';
      } else if (taskText.match(/低优先级|low/)) {
        priority = 'low';
      }

      // 提取负责人
      const assigneeMatch = taskText.match(/@(\w+)/);
      const assignee = assigneeMatch ? assigneeMatch[1] : undefined;

      // 提取截止日期
      const dateMatch = taskText.match(/(\d{4}-\d{2}-\d{2})/);
      const dueDate = dateMatch ? dateMatch[1] : undefined;

      const task: DesignTask = {
        id: `${docId}_task_${taskIndex++}`,
        docId,
        text: taskText,
        status: isCompleted ? 'completed' : 'todo',
        priority,
        assignee,
        dueDate,
      };

      tasks.push(task);
      this.tasks.set(task.id, task);
    }

    return tasks;
  }

  /**
   * 生成文档 ID
   */
  private generateDocId(path: string): string {
    return path.replace(/[^a-zA-Z0-9]/g, '_');
  }

  /**
   * 更新文档元数据
   */
  updateDocMetadata(path: string, metadata: Partial<DesignDoc>): void {
    const doc = this.docs.get(this.generateDocId(path));
    if (doc) {
      Object.assign(doc, metadata);
      this.docMetadata.set(path, metadata);
      this.saveMetadata();
    }
  }

  /**
   * 更新任务状态
   */
  updateTaskStatus(taskId: string, status: DesignTask['status']): void {
    const task = this.tasks.get(taskId);
    if (task) {
      task.status = status;
      this.saveMetadata();
    }
  }

  /**
   * 获取统计信息
   */
  getStats(): DesignDocStats {
    const docs = Array.from(this.docs.values());
    const allTasks = Array.from(this.tasks.values());

    return {
      total: docs.length,
      byCategory: this.groupBy(docs, 'category'),
      byStatus: this.groupBy(docs, 'status'),
      byPriority: this.groupBy(docs, 'priority'),
      completedTasks: allTasks.filter(t => t.status === 'completed').length,
      totalTasks: allTasks.length,
    };
  }

  /**
   * 按字段分组统计
   */
  private groupBy<T>(items: T[], field: keyof T): Record<string, number> {
    const result: Record<string, number> = {};
    items.forEach(item => {
      const key = String(item[field]);
      result[key] = (result[key] || 0) + 1;
    });
    return result;
  }

  /**
   * 保存元数据到本地存储
   */
  private saveMetadata(): void {
    const metadata = Object.fromEntries(this.docMetadata);
    localStorage.setItem('design_doc_metadata', JSON.stringify(metadata));
  }

  /**
   * 加载元数据
   */
  loadMetadata(): void {
    const saved = localStorage.getItem('design_doc_metadata');
    if (saved) {
      try {
        const metadata = JSON.parse(saved);
        this.docMetadata = new Map(Object.entries(metadata));
      } catch (error) {
      }
    }
  }

  /**
   * 合并相关文档
   */
  mergeDocs(docIds: string[]): DesignDoc | null {
    if (docIds.length === 0) {
      return null;
    }

    const docs = docIds.map(id => this.docs.get(id)).filter(Boolean) as DesignDoc[];
    if (docs.length === 0) {
      return null;
    }

    // 合并内容
    const mergedContent = docs.map(doc => `# ${doc.title}\n\n${doc.content || ''}`).join('\n\n---\n\n');

    // 合并任务
    const mergedTasks = docs.flatMap(doc => doc.tasks || []);

    // 创建合并文档
    const merged: DesignDoc = {
      id: `merged_${Date.now()}`,
      path: `merged/${docs.map(d => d.title).join('_')}.md`,
      title: `合并: ${docs.map(d => d.title).join(' + ')}`,
      category: docs[0].category,
      status: 'draft',
      priority: this.getHighestPriority(docs.map(d => d.priority)),
      lastModified: Date.now(),
      size: mergedContent.length,
      content: mergedContent,
      tasks: mergedTasks,
      relatedDocs: docs.flatMap(d => d.relatedDocs || []),
      tags: [...new Set(docs.flatMap(d => d.tags || []))],
    };

    return merged;
  }

  /**
   * 获取最高优先级
   */
  private getHighestPriority(priorities: DesignDoc['priority'][]): DesignDoc['priority'] {
    if (priorities.includes('high')) return 'high';
    if (priorities.includes('medium')) return 'medium';
    return 'low';
  }

  /**
   * 搜索文档
   */
  searchDocs(query: string): DesignDoc[] {
    const docs = Array.from(this.docs.values());
    const lowerQuery = query.toLowerCase();

    return docs.filter(doc => {
      return (
        doc.title.toLowerCase().includes(lowerQuery) ||
        doc.path.toLowerCase().includes(lowerQuery) ||
        doc.tags?.some(tag => tag.toLowerCase().includes(lowerQuery)) ||
        doc.content?.toLowerCase().includes(lowerQuery)
      );
    });
  }

  /**
   * 获取所有文档
   */
  getAllDocs(): DesignDoc[] {
    return Array.from(this.docs.values());
  }

  /**
   * 获取所有任务
   */
  getAllTasks(): DesignTask[] {
    return Array.from(this.tasks.values());
  }
}

// 单例实例
let designDocServiceInstance: DesignDocService | null = null;

/**
 * 获取设计文档服务单例
 */
export function getDesignDocService(): DesignDocService {
  if (!designDocServiceInstance) {
    designDocServiceInstance = new DesignDocService();
    designDocServiceInstance.loadMetadata();
  }
  return designDocServiceInstance;
}

