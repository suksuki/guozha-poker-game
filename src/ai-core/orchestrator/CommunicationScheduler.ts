/**
 * 通信调度器
 * 统一管理所有AI的聊天，避免冲突
 */

import { EventBus } from '../integration/EventBus';
import { CommunicationMessage, CommunicationIntent, GameState, Decision } from '../types';
import { UnifiedLLMService } from '../infrastructure/llm/UnifiedLLMService';
import { AIPlayer } from '../players/AIPlayer';

export interface CommunicationContext {
  trigger: 'after_decision' | 'after_play' | 'after_pass' | 'game_event' | 'idle';
  gameState: GameState;
  decision?: Decision;
  cognitive?: any;
  player?: AIPlayer;
  eventType?: string;
}

export class CommunicationScheduler {
  private lastSpeakTime: Map<number, number> = new Map();
  private minSpeakInterval: number = 5000; // 增加最小说话间隔，从3秒增加到5秒
  private lastBatchChatTime: number = 0; // 批量聊天的最后触发时间
  private minBatchChatInterval: number = 3000; // 批量聊天的最小间隔（3秒） // 最小说话间隔3秒
  private llmService: UnifiedLLMService | null = null;
  private players: Map<number, AIPlayer> = new Map();
  private gameRulesSent: boolean = false; // 是否已发送游戏规则（首次调用时发送）
  private playerNames: Map<number, string> = new Map(); // 玩家名字映射
  
  constructor(
    private eventBus: EventBus,
    llmService?: UnifiedLLMService | null
  ) {
    this.llmService = llmService || null;
  }
  
  /**
   * 设置LLM服务
   */
  setLLMService(llmService: UnifiedLLMService | null): void {
    this.llmService = llmService;
  }
  
  /**
   * 设置AI玩家池（用于获取玩家性格）
   */
  setPlayers(players: Map<number, AIPlayer>): void {
    this.players = players;
  }
  
  async initialize(): Promise<void> {
    console.log('[CommunicationScheduler] 初始化完成');
  }
  
  /**
   * 决定是否生成聊天消息
   */
  async maybeGenerateMessage(
    playerId: number, 
    context: CommunicationContext
  ): Promise<CommunicationMessage | null> {
    // 1. 检查玩家是否启用通信
    const player = this.players.get(playerId);
    if (!player || !player.getPersonality()) {
      return null;
    }
    
    const personality = player.getPersonality();
    const chattiness = personality.chattiness ?? 0.3; // 默认30%聊天概率
    
    // 2. 检查最小说话间隔
    const lastSpeak = this.lastSpeakTime.get(playerId) || 0;
    const now = Date.now();
    if (now - lastSpeak < this.minSpeakInterval) {
      return null;
    }
    
    // 3. 根据触发类型和性格决定是否说话
    const shouldSpeak = this.shouldGenerateMessage(context, chattiness);
    if (!shouldSpeak) {
      return null;
    }
    
    // 4. 生成消息内容
    try {
      const message = await this.generateMessageContent(playerId, context, personality);
      
      if (message) {
        // 更新最后说话时间
        this.lastSpeakTime.set(playerId, now);
        
        // 发送事件
        this.eventBus.emit('communication:generated', {
          playerId,
          message,
          timestamp: now
        });
        
        return message;
      }
    } catch (error) {
      console.error('[CommunicationScheduler] 生成消息失败:', error);
    }
    
    return null;
  }
  
  /**
   * 判断是否应该生成消息
   */
  private shouldGenerateMessage(context: CommunicationContext, chattiness: number): boolean {
    // 基础概率
    let baseProbability = chattiness;
    
    // 根据触发类型调整概率
    switch (context.trigger) {
      case 'after_decision':
        // 决策后：根据决策类型调整
        if (context.decision?.action.type === 'play') {
          const play = (context.decision.action as any).play;
          if (play?.type === 'bomb' || play?.type === 'dun') {
            baseProbability *= 2; // 出炸弹或墩时更可能说话
          }
        }
        break;
      case 'after_play':
        baseProbability *= 1.5; // 出牌后更可能说话
        break;
      case 'game_event':
        baseProbability *= 1.2; // 游戏事件时更可能说话
        break;
      case 'idle':
        baseProbability *= 0.5; // 空闲时降低概率
        break;
    }
    
    // 根据游戏阶段调整
    if (context.gameState.phase === 'critical') {
      baseProbability *= 1.3; // 关键时刻更可能说话
    }
    
    return Math.random() < baseProbability;
  }
  
  /**
   * 生成消息内容
   */
  private async generateMessageContent(
    playerId: number,
    context: CommunicationContext,
    personality: any
  ): Promise<CommunicationMessage | null> {
    // 如果没有LLM服务，使用规则生成
    if (!this.llmService) {
      return this.generateRuleBasedMessage(playerId, context, personality);
    }
    
    // 使用LLM生成
    try {
      const prompt = this.buildCommunicationPrompt(playerId, context, personality);
      
      // 根据消息类型确定优先级
      const priority = this.getCommunicationPriority(context);
      
      const response = await this.llmService.call({
        purpose: 'communication',
        prompt,
        priority, // 使用优先级
        options: {
          temperature: 0.8, // 聊天需要更多创造性
          maxTokens: 50 // 短消息，最多50个token
        }
      });
      
      // 解析响应（记录原始响应用于训练数据收集）
      const rawResponse = response.content;
      const content = this.parseLLMResponse(rawResponse);
      
      if (!content || content.length === 0) {
        console.warn('[CommunicationScheduler] 解析后内容为空，使用规则生成', {
          playerId,
          rawResponse
        });
        return this.generateRuleBasedMessage(playerId, context, personality);
      }
      
      // 确定意图和情绪
      const intent = this.determineIntent(context, personality);
      const emotion = this.determineEmotion(context, personality);
      
      // 注意：完整的提示词和原始响应会在数据收集器中记录
      // 这里只返回处理后的内容
      return {
        content,
        intent,
        emotion,
        reasoning: `基于${context.trigger}触发`,
        timestamp: Date.now(),
        // 用于数据收集的元数据（不暴露给外部）
        _metadata: {
          rawResponse,
          fullPrompt: prompt
        }
      };
    } catch (error) {
      console.error('[CommunicationScheduler] LLM生成失败，使用规则生成:', error);
      return this.generateRuleBasedMessage(playerId, context, personality);
    }
  }
  
  /**
   * 构建LLM提示词（包含完整的游戏上下文）
   */
  private buildCommunicationPrompt(
    playerId: number,
    context: CommunicationContext,
    personality: any
  ): string {
    const preset = personality.preset || 'balanced';
    const presetDesc = {
      'aggressive': '激进型，喜欢挑衅和嘲讽',
      'conservative': '保守型，说话谨慎',
      'balanced': '平衡型，说话自然',
      'adaptive': '自适应型，根据情况调整'
    }[preset] || '平衡型';
    
    // 构建完整的提示词
    const parts: string[] = [];
    
    // 1. 系统角色定义（首次调用时包含游戏规则）
    if (!this.gameRulesSent) {
      parts.push(this.buildGameRulesSection());
      this.gameRulesSent = true;
    }
    
    // 2. 玩家信息
    parts.push(this.buildPlayerInfoSection(playerId, context));
    
    // 3. 当前游戏状态
    parts.push(this.buildGameStateSection(context));
    
    // 4. 当前情况描述
    parts.push(this.buildSituationSection(context, personality));
    
    // 5. 输出要求
    parts.push(this.buildOutputRequirementSection(presetDesc));
    
    const fullPrompt = parts.join('\n\n');
    
    // 验证提示词
    const validatedPrompt = this.validateAndPreprocessPrompt(fullPrompt);
    
    return validatedPrompt;
  }
  
  /**
   * 构建游戏规则部分（首次调用时）
   */
  private buildGameRulesSection(): string {
    return `【游戏规则：过炸/争上游】

基本规则：
- 每人一副完整的牌（52张标准牌）
- 支持牌型：单张、对子、三张、顺子、炸弹（4张及以上相同）、墩（7张及以上相同）
- 分牌：5=5分，10=10分，K=10分
- 墩的计分：7张=1墩，8张=2墩，9张=4墩，10张=8墩（翻倍）
- 出墩时，每个墩从每个其他玩家扣除30分，出墩玩家获得相应分数
- 先出完牌的玩家获胜

聊天规则：
- 内容要符合游戏场景，简短有力（不超过10个字）
- 要有个性，不同玩家有不同的说话风格
- 对骂要适度，不能过于激烈
- 根据游戏状态（领先、落后、出好牌等）调整语气`;
  }
  
  /**
   * 构建玩家信息部分
   */
  private buildPlayerInfoSection(playerId: number, context: CommunicationContext): string {
    const player = this.players.get(playerId);
    const playerName = this.playerNames.get(playerId) || `玩家${playerId}`;
    const personality = player?.getPersonality();
    const preset = personality?.preset || 'balanced';
    
    const lines: string[] = [];
    lines.push(`【玩家信息】`);
    lines.push(`- 你的名字：${playerName}`);
    lines.push(`- 你的ID：${playerId}`);
    lines.push(`- 你的性格：${preset}`);
    lines.push(`- 玩家总数：${context.gameState.playerCount}人`);
    
    // 其他玩家信息
    if (context.gameState.playerCount > 1) {
      lines.push(`- 其他玩家：`);
      for (let i = 0; i < context.gameState.playerCount; i++) {
        if (i !== playerId) {
          const otherName = this.playerNames.get(i) || `玩家${i}`;
          const otherPlayer = this.players.get(i);
          const otherPreset = otherPlayer?.getPersonality()?.preset || 'unknown';
          lines.push(`  * ${otherName} (ID:${i}, 性格:${otherPreset})`);
        }
      }
    }
    
    return lines.join('\n');
  }
  
  /**
   * 构建游戏状态部分
   */
  private buildGameStateSection(context: CommunicationContext): string {
    const state = context.gameState;
    const lines: string[] = [];
    
    lines.push(`【当前游戏状态】`);
    lines.push(`- 轮次：第${state.roundNumber}轮`);
    lines.push(`- 阶段：${this.getPhaseDescription(state.phase)}`);
    lines.push(`- 当前轮次得分：${state.currentRoundScore}分`);
    
    // 累计得分
    if (state.cumulativeScores && state.cumulativeScores.size > 0) {
      lines.push(`- 累计得分：`);
      state.cumulativeScores.forEach((score, pid) => {
        const name = this.playerNames.get(pid) || `玩家${pid}`;
        lines.push(`  * ${name}: ${score}分`);
      });
    }
    
    // 手牌信息
    lines.push(`- 你的手牌数量：${state.myHand?.length || 0}张`);
    if (state.opponentHandSizes && state.opponentHandSizes.length > 0) {
      lines.push(`- 对手手牌数量：${state.opponentHandSizes.join(', ')}张`);
    }
    
    // 最近出牌
    if (state.lastPlay) {
      const lastPlayerName = state.lastPlayerId !== null 
        ? (this.playerNames.get(state.lastPlayerId) || `玩家${state.lastPlayerId}`)
        : '未知';
      lines.push(`- 上家出牌：${lastPlayerName} 出了 ${this.formatPlay(state.lastPlay)}`);
    } else {
      lines.push(`- 上家出牌：无（新轮次开始）`);
    }
    
    // 出牌历史
    if (state.playHistory && state.playHistory.length > 0) {
      lines.push(`- 当前轮次出牌记录：`);
      state.playHistory.slice(-5).forEach((play: any, index: number) => {
        const playPlayerName = play.playerId !== undefined
          ? (this.playerNames.get(play.playerId) || `玩家${play.playerId}`)
          : '未知';
        lines.push(`  ${index + 1}. ${playPlayerName}：${this.formatPlayRecord(play)}`);
      });
    }
    
    return lines.join('\n');
  }
  
  /**
   * 构建当前情况描述
   */
  private buildSituationSection(context: CommunicationContext, personality: any): string {
    const lines: string[] = [];
    lines.push(`【当前情况】`);
    
    if (context.decision) {
      if (context.decision.action.type === 'play') {
        const play = (context.decision.action as any).play;
        lines.push(`- 你刚出了一手${play.type}，${play.value ? `牌值是${play.value}` : ''}`);
        if (play.type === 'bomb' || play.type === 'dun') {
          lines.push(`- 这是一个重要出牌，可以表达得意或挑衅`);
        }
      } else {
        lines.push(`- 你选择了要不起`);
        lines.push(`- 可以表达无奈、谨慎或等待`);
      }
    }
    
    if (context.trigger === 'game_event') {
      lines.push(`- 游戏事件：${context.eventType || '未知事件'}`);
    }
    
    if (context.cognitive) {
      const cognitiveStr = JSON.stringify(context.cognitive).substring(0, 100);
      lines.push(`- 局面分析：${cognitiveStr}`);
    }
    
    return lines.join('\n');
  }
  
  /**
   * 构建输出要求部分
   */
  private buildOutputRequirementSection(presetDesc: string): string {
    return `【输出要求】

你是一个${presetDesc}的扑克游戏AI玩家。

请生成一句简短的聊天内容（不超过10个字），要符合你的性格特点。

重要：只输出聊天内容本身，不要任何格式、标记、列表符号或解释文字。

正确示例：
就这？
不服来战！
先看看
继续

错误示例（不要这样输出）：
- 激进型："就这？"
"就这？"
聊天内容：就这？

聊天内容：`;
  }
  
  /**
   * 格式化出牌信息
   */
  private formatPlay(play: any): string {
    if (!play) return '无';
    if (typeof play === 'string') return play;
    if (play.type) {
      return `${play.type}${play.value ? `(${play.value})` : ''}`;
    }
    return JSON.stringify(play).substring(0, 20);
  }
  
  /**
   * 格式化出牌记录
   */
  private formatPlayRecord(play: any): string {
    return this.formatPlay(play);
  }
  
  /**
   * 获取阶段描述
   */
  private getPhaseDescription(phase: string): string {
    const desc: Record<string, string> = {
      'early': '游戏早期（手牌较多）',
      'middle': '游戏中期（手牌适中）',
      'late': '游戏后期（手牌较少）',
      'critical': '关键时刻（手牌很少）'
    };
    return desc[phase] || phase;
  }
  
  /**
   * 验证和预处理提示词
   */
  private validateAndPreprocessPrompt(prompt: string): string {
    // 1. 检查长度（避免过长）
    const MAX_PROMPT_LENGTH = 2000; // 最大2000字符
    if (prompt.length > MAX_PROMPT_LENGTH) {
      console.warn('[CommunicationScheduler] 提示词过长，进行截断');
      prompt = prompt.substring(0, MAX_PROMPT_LENGTH) + '...';
    }
    
    // 2. 移除危险字符（避免注入）
    prompt = prompt.replace(/[\x00-\x1F\x7F]/g, ''); // 移除控制字符
    
    // 3. 确保必要的换行和格式
    prompt = prompt.replace(/\n{3,}/g, '\n\n'); // 最多两个连续换行
    
    return prompt.trim();
  }
  
  /**
   * 解析和处理LLM响应
   * 处理各种可能的格式，提取纯文本内容
   */
  private parseLLMResponse(response: string): string {
    if (!response || typeof response !== 'string') {
      return '';
    }
    
    // 1. 基础清理
    let content = response.trim();
    
    // 2. 移除引号
    if ((content.startsWith('"') && content.endsWith('"')) ||
        (content.startsWith("'") && content.endsWith("'"))) {
      content = content.slice(1, -1).trim();
    }
    
    // 3. 移除玩家名字前缀（如：AI玩家1:、玩家1:、AI玩家1说：等）
    content = content.replace(/^(AI玩家\d+|玩家\d+)[:：说]?\s*/i, '');
    
    // 4. 移除可能的标记（如：聊天内容：、回复：、点评等）
    content = content.replace(/^(聊天内容|回复|内容|说|说：|聊天内容：|点评)[:：]?\s*/i, '');
    
    // 5. 移除引号包裹的对话（如："我输了，输的真惨。"AI玩家1点评。）
    // 提取引号内的内容
    const quotedMatch = content.match(/[""]([^""]+)[""]/);
    if (quotedMatch && quotedMatch[1]) {
      content = quotedMatch[1];
    }
    
    // 6. 移除引号外的额外文字（如：xxx点评、xxx说等）
    content = content.replace(/\s*(AI玩家\d+|玩家\d+)?\s*(点评|说|说道|表示)[。.]?\s*$/i, '');
    
    // 7. 移除换行和多余空格
    content = content.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    
    // 8. 过滤不当内容
    content = this.filterInappropriateContent(content);
    
    // 9. 长度控制（最多15个字符）
    if (content.length > 15) {
      content = content.substring(0, 15);
      // 尝试在词边界截断
      const lastSpace = content.lastIndexOf(' ');
      if (lastSpace > 10) {
        content = content.substring(0, lastSpace);
      }
    }
    
    // 10. 最终验证
    if (!this.isValidChatContent(content)) {
      return ''; // 返回空字符串，触发规则生成
    }
    
    return content;
  }
  
  /**
   * 过滤不当内容
   */
  private filterInappropriateContent(content: string): string {
    // 敏感词列表（可以根据需要扩展）
    const sensitiveWords = [
      // 可以添加需要过滤的敏感词
    ];
    
    // 检查敏感词
    for (const word of sensitiveWords) {
      if (content.includes(word)) {
        console.warn('[CommunicationScheduler] 检测到敏感词，过滤内容');
        return ''; // 返回空，触发规则生成
      }
    }
    
    // 移除可能的HTML标签
    content = content.replace(/<[^>]*>/g, '');
    
    // 移除可能的代码标记
    content = content.replace(/```[\s\S]*?```/g, '');
    content = content.replace(/`[^`]*`/g, '');
    
    return content;
  }
  
  /**
   * 验证聊天内容是否有效
   */
  private isValidChatContent(content: string): boolean {
    if (!content || content.length === 0) {
      return false;
    }
    
    // 检查是否只包含空白字符
    if (/^\s*$/.test(content)) {
      return false;
    }
    
    // 检查是否包含太多特殊字符（可能是格式错误）
    const specialCharCount = (content.match(/[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？、]/g) || []).length;
    if (specialCharCount > content.length * 0.5) {
      return false;
    }
    
    return true;
  }
  
  /**
   * 设置玩家名字（用于提示词构建）
   */
  setPlayerName(playerId: number, name: string): void {
    this.playerNames.set(playerId, name);
  }
  
  /**
   * 重置游戏规则发送状态（新游戏开始时）
   */
  resetGameRules(): void {
    this.gameRulesSent = false;
  }
  
  /**
   * 批量生成多个玩家的聊天消息（逐个生成，每次只生成纯文本）
   * 采用分步生成策略：为每个玩家单独调用LLM，降低格式要求
   * 这样LLM只需要生成纯文本，更容易遵循，也为未来微调做准备
   */
  async generateBatchMessages(
    playerIds: number[],
    context: CommunicationContext
  ): Promise<Map<number, CommunicationMessage>> {
    const results = new Map<number, CommunicationMessage>();
    
    // 如果没有LLM服务，逐个使用规则生成
    if (!this.llmService) {
      for (const playerId of playerIds) {
        const player = this.players.get(playerId);
        if (!player) continue;
        
        const personality = player.getPersonality();
        const message = this.generateRuleBasedMessage(playerId, context, personality);
        if (message) {
          results.set(playerId, message);
        }
      }
      return results;
    }
    
    // 检查批量聊天的最小间隔
    const now = Date.now();
    if (now - this.lastBatchChatTime < this.minBatchChatInterval) {
      console.log('[CommunicationScheduler] 批量聊天间隔太短，跳过', {
        timeSinceLastBatch: now - this.lastBatchChatTime,
        minInterval: this.minBatchChatInterval
      });
      return results;
    }
    
    // 筛选出应该说话的玩家（限制最多3个玩家同时说话）
    const shouldSpeakPlayers: Array<{ id: number; personality: any }> = [];
    
    for (const playerId of playerIds) {
      const player = this.players.get(playerId);
      if (!player) continue;
      
      const personality = player.getPersonality();
      const chattiness = personality.chattiness ?? 0.3;
      
      // 检查最小说话间隔
      const lastSpeak = this.lastSpeakTime.get(playerId) || 0;
      if (now - lastSpeak < this.minSpeakInterval) {
        continue;
      }
      
      // 检查是否应该说话
      if (this.shouldGenerateMessage(context, chattiness)) {
        shouldSpeakPlayers.push({ id: playerId, personality });
      }
      
      // 限制最多3个玩家同时说话，避免请求过多
      if (shouldSpeakPlayers.length >= 3) {
        break;
      }
    }
    
    if (shouldSpeakPlayers.length === 0) {
      return results;
    }
    
    // 更新批量聊天时间
    this.lastBatchChatTime = now;
    
    // 采用分步生成策略：逐个玩家生成，每次只要求纯文本输出
    // 这样可以降低LLM的格式要求，同时收集训练数据用于未来微调
    const priority = this.getCommunicationPriority(context);
    
    // 并发生成（但受maxConcurrent限制）
    const generationPromises = shouldSpeakPlayers.map(async ({ id: playerId, personality }) => {
      try {
        // 为每个玩家单独生成消息
        const message = await this.generateMessageContent(playerId, context, personality);
        
        if (message) {
          this.lastSpeakTime.set(playerId, now);
          results.set(playerId, message);
          
          // 发送事件
          this.eventBus.emit('communication:generated', {
            playerId,
            message,
            timestamp: now
          });
          
          return { playerId, success: true, message };
        } else {
          // LLM生成失败，使用规则生成
          const fallbackMessage = this.generateRuleBasedMessage(playerId, context, personality);
          if (fallbackMessage) {
            this.lastSpeakTime.set(playerId, now);
            results.set(playerId, fallbackMessage);
            
            this.eventBus.emit('communication:generated', {
              playerId,
              message: fallbackMessage,
              timestamp: now
            });
            
            return { playerId, success: false, message: fallbackMessage, fallback: true };
          }
          return { playerId, success: false };
        }
      } catch (error) {
        console.error(`[CommunicationScheduler] 玩家${playerId}生成失败，使用规则生成`, {
          error: error instanceof Error ? error.message : String(error),
          playerId,
          playerName: this.playerNames.get(playerId)
        });
        
        // 回退到规则生成
        const fallbackMessage = this.generateRuleBasedMessage(playerId, context, personality);
        if (fallbackMessage) {
          this.lastSpeakTime.set(playerId, now);
          results.set(playerId, fallbackMessage);
          
          this.eventBus.emit('communication:generated', {
            playerId,
            message: fallbackMessage,
            timestamp: now
          });
          
          return { playerId, success: false, message: fallbackMessage, fallback: true };
        }
        return { playerId, success: false };
      }
    });
    
    // 等待所有生成完成
    const generationResults = await Promise.allSettled(generationPromises);
    
    
    return results;
  }
  
  /**
   * 构建批量提示词
   */
  private buildBatchPrompt(
    players: Array<{ id: number; personality: any }>,
    context: CommunicationContext
  ): string {
    const parts: string[] = [];
    
    // 1. 系统提示（首次调用时包含游戏规则）
    if (!this.gameRulesSent) {
      parts.push(this.buildGameRulesSection());
      this.gameRulesSent = true;
    }
    
    // 2. 游戏状态（共享）
    parts.push(this.buildGameStateSection(context));
    
    // 3. 当前情况（共享）
    parts.push(this.buildSituationSection(context, {}));
    
    // 4. 批量输出要求
    parts.push(`【批量输出要求】

现在有${players.length}个玩家可能想要说话。请为每个玩家生成一句简短的聊天内容（不超过10个字）。

玩家列表：
${players.map((p, idx) => {
  const preset = p.personality.preset || 'balanced';
  const presetDesc = {
    'aggressive': '激进型，喜欢挑衅和嘲讽',
    'conservative': '保守型，说话谨慎',
    'balanced': '平衡型，说话自然',
    'adaptive': '自适应型，根据情况调整'
  }[preset] || '平衡型';
  const playerName = this.playerNames.get(p.id) || `玩家${p.id}`;
  return `${idx + 1}. ${playerName} (ID:${p.id}, 性格:${presetDesc})`;
}).join('\n')}

请按照以下JSON格式输出，每个玩家一行（必须是纯JSON，不要添加任何代码块标记、注释或其他文字）：

{"playerId": 1, "content": "就这？"}
{"playerId": 2, "content": "先看看"}
{"playerId": 3, "content": "继续"}

重要要求：
1. 每行必须是一个完整的JSON对象，必须换行（每个JSON对象单独一行）
2. 不要使用代码块标记（如三个反引号加json或三个反引号）
3. 不要添加任何解释文字
4. 每个玩家的content字段必须有内容（不能为空字符串）
5. 每个玩家的内容不超过10个字
6. 直接输出JSON，不要其他内容
7. 每个JSON对象之间必须换行，不要连在一起
8. 不要在一个JSON对象中重复使用playerId键（这是无效的JSON格式）

输出：`);
    
    const fullPrompt = parts.join('\n\n');
    return this.validateAndPreprocessPrompt(fullPrompt);
  }
  
  /**
   * 解析批量响应
   */
  private parseBatchResponse(
    response: string,
    players: Array<{ id: number; personality: any }>,
    context: CommunicationContext
  ): Map<number, CommunicationMessage> {
    const results = new Map<number, CommunicationMessage>();
    
    
    // 预处理：移除代码块标记和额外文字
    let cleanedResponse = response.trim();
    
    // 移除开头的代码块标记（```json, ```python, ```等）
    cleanedResponse = cleanedResponse.replace(/^```(?:json|python|javascript)?\s*/i, '');
    // 移除结尾的代码块标记
    cleanedResponse = cleanedResponse.replace(/\s*```\s*$/i, '');
    
    // 尝试提取JSON数组格式 [{"playerId": 1, ...}, ...]
    const jsonArrayMatch = cleanedResponse.match(/\[[\s\S]*?\]/);
    if (jsonArrayMatch) {
      try {
        const jsonArray = JSON.parse(jsonArrayMatch[0]);
        if (Array.isArray(jsonArray)) {
          
          for (const item of jsonArray) {
            if (item && typeof item === 'object' && typeof item.playerId === 'number' && typeof item.content === 'string') {
              const playerId = item.playerId;
              const content = item.content;
              
              // 验证玩家ID是否在列表中
              const player = players.find(p => p.id === playerId);
              if (!player) {
                console.warn('[CommunicationScheduler] 玩家ID不在列表中', {
                  playerId,
                  expectedIds: players.map(p => p.id)
                });
                continue;
              }
              
              // 处理内容
              const processedContent = this.parseLLMResponse(content);
              if (!processedContent || processedContent.length === 0) {
                console.warn('[CommunicationScheduler] 处理后的内容为空', {
                  playerId,
                  originalContent: content
                });
                continue;
              }
              
              // 确定意图和情绪
              const intent = this.determineIntent(context, player.personality);
              const emotion = this.determineEmotion(context, player.personality);
              
              results.set(playerId, {
                content: processedContent,
                intent,
                emotion,
                reasoning: `批量生成，基于${context.trigger}触发`,
                timestamp: Date.now()
              });
            }
          }
          
          if (results.size > 0) {
            return results;
          }
        }
      } catch (error) {
        console.warn('[CommunicationScheduler] JSON数组解析失败，尝试其他格式', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // 尝试提取用逗号分隔的JSON对象格式 {"playerId": 1, ...}, {"playerId": 2, ...}
    // 这种格式看起来像数组但没有方括号
    const commaSeparatedMatch = cleanedResponse.match(/\{[^}]*"playerId"[^}]*\}(?:\s*,\s*\{[^}]*"playerId"[^}]*\})+/);
    if (commaSeparatedMatch) {
      try {
        // 尝试包装成数组格式
        const wrappedArray = '[' + commaSeparatedMatch[0] + ']';
        const jsonArray = JSON.parse(wrappedArray);
        if (Array.isArray(jsonArray)) {
          
          for (const item of jsonArray) {
            if (item && typeof item === 'object' && typeof item.playerId === 'number' && typeof item.content === 'string' && item.content.trim().length > 0) {
              const playerId = item.playerId;
              const content = item.content;
              
              // 验证玩家ID是否在列表中
              const player = players.find(p => p.id === playerId);
              if (!player) {
                console.warn('[CommunicationScheduler] 玩家ID不在列表中', {
                  playerId,
                  expectedIds: players.map(p => p.id)
                });
                continue;
              }
              
              // 处理内容
              const processedContent = this.parseLLMResponse(content);
              if (!processedContent || processedContent.length === 0) {
                console.warn('[CommunicationScheduler] 处理后的内容为空', {
                  playerId,
                  originalContent: content
                });
                continue;
              }
              
              // 确定意图和情绪
              const intent = this.determineIntent(context, player.personality);
              const emotion = this.determineEmotion(context, player.personality);
              
              results.set(playerId, {
                content: processedContent,
                intent,
                emotion,
                reasoning: `批量生成，基于${context.trigger}触发`,
                timestamp: Date.now()
              });
            }
          }
          
          if (results.size > 0) {
            return results;
          }
        }
      } catch (error) {
        console.warn('[CommunicationScheduler] 逗号分隔JSON对象解析失败，尝试其他格式', {
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }
    
    // 尝试解析JSON格式
    // 先尝试按行分割
    let lines = cleanedResponse.split('\n').filter(line => line.trim());
    
    // 如果没有换行或只有一行，尝试分割连在一起的JSON对象
    if ((lines.length === 1 || lines.length === 0) && cleanedResponse.includes('}{')) {
      // 使用正则表达式分割连在一起的JSON对象
      // 匹配 } 后面跟着 { 的位置
      const jsonObjects = cleanedResponse.split(/(?<=})\s*(?={)/);
      lines = jsonObjects.filter(obj => obj.trim());
    }
    
    // 如果按行分割后，某些行包含多个JSON对象（如：{...}{...}），进一步分割
    const finalLines: string[] = [];
    for (const line of lines) {
      if (line.includes('}{')) {
        // 分割这一行中的多个JSON对象
        const splitObjects = line.split(/(?<=})\s*(?={)/);
        finalLines.push(...splitObjects.filter(obj => obj.trim()));
      } else {
        finalLines.push(line);
      }
    }
    lines = finalLines;
    
    
    for (const line of lines) {
      try {
        // 移除可能的标记和空白
        let cleanLine = line.trim();
        
        // 跳过空行
        if (!cleanLine) continue;
        
        // 移除可能的代码块标记（如果还有残留）
        if (cleanLine.startsWith('```')) {
          cleanLine = cleanLine.replace(/```(?:json|python|javascript)?\s*/i, '').replace(/\s*```\s*$/i, '');
        }
        
        // 跳过空行
        if (!cleanLine) continue;
        
        // 尝试解析JSON
        const parsed = JSON.parse(cleanLine);
        const playerId = parsed.playerId;
        const content = parsed.content;
        
        if (typeof playerId === 'number' && typeof content === 'string' && content.length > 0) {
          // 验证玩家ID是否在列表中
          const player = players.find(p => p.id === playerId);
          if (!player) {
            console.warn('[CommunicationScheduler] 玩家ID不在列表中', {
              playerId,
              expectedIds: players.map(p => p.id)
            });
            continue;
          }
          
          // 处理内容
          const processedContent = this.parseLLMResponse(content);
          if (!processedContent || processedContent.length === 0) {
            console.warn('[CommunicationScheduler] 处理后的内容为空', {
              playerId,
              originalContent: content
            });
            continue;
          }
          
          // 确定意图和情绪
          const intent = this.determineIntent(context, player.personality);
          const emotion = this.determineEmotion(context, player.personality);
          
          results.set(playerId, {
            content: processedContent,
            intent,
            emotion,
            reasoning: `批量生成，基于${context.trigger}触发`,
            timestamp: Date.now()
          });
        } else {
          console.warn('[CommunicationScheduler] 解析的数据格式不正确', {
            playerId,
            playerIdType: typeof playerId,
            content,
            contentType: typeof content,
            contentLength: typeof content === 'string' ? content.length : 0
          });
        }
      } catch (parseError) {
        // 忽略解析错误，继续处理下一行
        console.warn('[CommunicationScheduler] 解析行失败', {
          line,
          error: parseError instanceof Error ? parseError.message : String(parseError)
        });
        continue;
      }
    }
    
    
    return results;
  }
  
  /**
   * 规则生成消息（LLM不可用时的回退）
   */
  private generateRuleBasedMessage(
    playerId: number,
    context: CommunicationContext,
    personality: any
  ): CommunicationMessage | null {
    const preset = personality.preset || 'balanced';
    
    // 根据触发类型和性格选择消息
    let messages: string[] = [];
    
    // 基础消息库（按性格分类）
    const baseMessages: Record<string, string[]> = {
      'aggressive': [
        '就这？', '不服来战！', '还有没有？', '太弱了', 
        '看我的！', '你不行', '再来啊', '就这点本事？',
        '我还没发力呢', '你输定了', '别挣扎了', '认输吧'
      ],
      'conservative': [
        '先看看', '谨慎点', '再看看', '不急',
        '让我想想', '需要观察', '保持冷静', '稳一点',
        '不能冲动', '要小心', '慢慢来', '再看看情况'
      ],
      'balanced': [
        '还行', '继续', '不错', '可以',
        '有意思', '继续出', '看情况', '保持节奏',
        '还可以', '继续吧', '不错不错', '继续游戏'
      ],
      'adaptive': [
        '看情况', '随机应变', '灵活应对', '看局势',
        '根据情况来', '看对手出牌', '灵活调整', '随机应变'
      ]
    };
    
    // 根据触发类型调整消息
    if (context.trigger === 'after_play') {
      // 出牌后的反应
      const playMessages: Record<string, string[]> = {
        'aggressive': ['出得好！', '看我的！', '这手不错', '继续出！'],
        'conservative': ['出得谨慎', '观察一下', '继续看', '保持节奏'],
        'balanced': ['出得不错', '继续', '还可以', '继续出'],
        'adaptive': ['看情况', '灵活应对', '随机应变']
      };
      messages = playMessages[preset] || baseMessages[preset] || baseMessages['balanced'];
    } else if (context.trigger === 'after_pass') {
      // 不要后的反应
      const passMessages: Record<string, string[]> = {
        'aggressive': ['不敢出了？', '认怂了？', '就这？', '继续啊'],
        'conservative': ['明智的选择', '谨慎点好', '观察一下', '不急'],
        'balanced': ['不要了', '继续', '看情况', '等等'],
        'adaptive': ['看情况', '灵活应对']
      };
      messages = passMessages[preset] || baseMessages[preset] || baseMessages['balanced'];
    } else {
      // 默认使用基础消息
      messages = baseMessages[preset] || baseMessages['balanced'];
    }
    
    const content = messages[Math.floor(Math.random() * messages.length)];
    
    return {
      content,
      intent: this.determineIntent(context, personality),
      emotion: this.determineEmotion(context, personality),
      timestamp: Date.now()
    };
  }
  
  /**
   * 确定消息意图
   */
  private determineIntent(context: CommunicationContext, personality: any): CommunicationIntent {
    if (context.decision?.action.type === 'play') {
      const play = (context.decision.action as any).play;
      if (play?.type === 'bomb' || play?.type === 'dun') {
        return 'celebrate';
      }
      return 'tactical_signal';
    }
    
    if (context.trigger === 'after_pass') {
      return 'emotional_express';
    }
    
    return 'social_chat';
  }
  
  /**
   * 确定情绪
   */
  private determineEmotion(context: CommunicationContext, personality: any): any {
    const preset = personality.preset || 'balanced';
    
    if (preset === 'aggressive') {
      return 'confident';
    } else if (preset === 'conservative') {
      return 'cautious';
    }
    
    if (context.gameState.phase === 'critical') {
      return 'tense';
    }
    
    return 'relaxed';
  }
  
  /**
   * 获取聊天消息的优先级
   */
  private getCommunicationPriority(context: CommunicationContext): number {
    // 根据触发类型和决策类型确定优先级
    if (context.trigger === 'game_event' && context.eventType === 'taunt') {
      return 3; // 对骂优先级最高
    }
    
    if (context.trigger === 'after_play' || context.trigger === 'game_event') {
      return 2; // 事件聊天
    }
    
    if (context.trigger === 'after_decision') {
      // 根据决策类型调整
      if (context.decision?.action.type === 'play') {
        const play = (context.decision.action as any).play;
        if (play?.type === 'bomb' || play?.type === 'dun') {
          return 2; // 出炸弹或墩，提高优先级
        }
      }
      return 1; // 普通决策后聊天
    }
    
    if (context.trigger === 'idle') {
      return 1; // 空闲聊天优先级最低
    }
    
    return 1; // 默认优先级
  }
}


