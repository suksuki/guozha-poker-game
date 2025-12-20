/**
 * 知识库相关类型
 */

export interface KnowledgeEntry {
  id: string;
  category: 'strategy' | 'pattern' | 'tactic' | 'communication';
  title: string;
  content: string;
  tags: string[];
  examples?: any[];
  effectiveness?: number;
  timestamp: number;
}

export interface StrategyPattern {
  id: string;
  name: string;
  description: string;
  condition: string;
  action: string;
  successRate: number;
  usageCount: number;
}

