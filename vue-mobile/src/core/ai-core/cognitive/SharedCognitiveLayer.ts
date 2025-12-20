/**
 * 共享认知层
 * 所有AI共享的局面理解和分析
 */

import { GameKnowledgeBase } from '../infrastructure/knowledge/GameKnowledgeBase';

import { IntentAnalyzer, AnalyzedIntent } from './IntentAnalyzer';

export class SharedCognitiveLayer {
  private activeIntents: Map<number, AnalyzedIntent[]> = new Map();

  constructor(private knowledgeBase: GameKnowledgeBase) { }

  /**
   * 添加战术意图（来自交流）
   */
  addIntent(playerId: number, text: string): void {
    const intent = IntentAnalyzer.analyzeSimple(text);
    if (!this.activeIntents.has(playerId)) {
      this.activeIntents.set(playerId, []);
    }
    this.activeIntents.get(playerId)!.push(intent);

    // 限制每个玩家的意图缓存数量
    if (this.activeIntents.get(playerId)!.length > 3) {
      this.activeIntents.get(playerId)!.shift();
    }
  }

  /**
   * 获取所有活跃意图
   */
  getActiveIntents(): Map<number, AnalyzedIntent[]> {
    return this.activeIntents;
  }

  /**
   * 清除特定轮次的意图
   */
  clearIntents(): void {
    this.activeIntents.clear();
  }

  async analyze(gameState: any): Promise<any> {
    // TODO: 实现共享认知分析
    return {
      handStrength: 0.5,
      strategicIntent: 'balanced',
      atmosphere: 'neutral',
      activeIntents: Array.from(this.activeIntents.entries())
    };
  }
}

