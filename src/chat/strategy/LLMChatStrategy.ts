/**
 * 大模型聊天策略实现
 * 调用大模型API生成智能聊天内容
 */

import { ChatMessage, ChatEventType } from '../../types/chat';
import { Player, Card, Suit, Rank, Play } from '../../types/card';
import { IChatStrategy, ChatContext } from './IChatStrategy';
import { LLMChatConfig } from '../../config/chatConfig';
import { getLLMAvailabilityManager } from '../../services/llm/LLMAvailabilityManager';
import { i18n } from '../../i18n';

export class LLMChatStrategy implements IChatStrategy {
  readonly name = 'llm';
  readonly description = '基于大语言模型的智能聊天策略';
  private availabilityManager = getLLMAvailabilityManager();
  private fallbackStrategy?: IChatStrategy;

  constructor(
    private config: LLMChatConfig,
    fallbackStrategy?: IChatStrategy
  ) {
    this.fallbackStrategy = fallbackStrategy;
  }

  /**
   * 获取当前语言要求（用于Prompt）
   */
  private getLanguageRequirement(): string {
    // 如果未启用多语言，LLM只生成中文
    if (this.config.enableMultilingual === false) {
      return '使用中文回复';
    }
    
    const currentLang = i18n.language || 'zh-CN';
    
    // 如果当前语言是中文，使用中文
    if (currentLang.startsWith('zh')) {
      return '使用中文回复';
    }
    
    // 根据语言代码返回对应的语言要求
    const langMap: Record<string, string> = {
      'en': 'Use English to reply',
      'en-US': 'Use English to reply',
      'en-GB': 'Use English to reply',
      'ja': '日本語で返信してください',
      'ja-JP': '日本語で返信してください',
      'ko': '한국어로 답변하세요',
      'ko-KR': '한국어로 답변하세요',
    };
    
    // 尝试精确匹配
    if (langMap[currentLang]) {
      return langMap[currentLang];
    }
    
    // 尝试语言代码前缀匹配
    const langPrefix = currentLang.split('-')[0];
    if (langMap[langPrefix]) {
      return langMap[langPrefix];
    }
    
    // 默认使用英文
    return `Use ${currentLang} language to reply`;
  }

  async generateRandomChat(
    player: Player,
    context?: ChatContext
  ): Promise<ChatMessage | null> {
    try {
      const prompt = this.buildPrompt(player, ChatEventType.RANDOM, context);
      const content = await this.callLLMAPI(prompt);
      if (!content) {
        return null;
      }
      
      return {
        playerId: player.id,
        playerName: player.name,
        content,
        timestamp: Date.now(),
        type: 'random'
      };
    } catch (error) {
      // 🔥 降级到 fallback 策略
      if (this.fallbackStrategy) {
        return await this.fallbackStrategy.generateRandomChat(player, context);
      }
      return null;
    }
  }

  async generateEventChat(
    player: Player,
    eventType: ChatEventType,
    context?: ChatContext
  ): Promise<ChatMessage | null> {
    try {
      const prompt = this.buildPrompt(player, eventType, context);
      const content = await this.callLLMAPI(prompt);
      if (!content) {
        return null;
      }
      
      return {
        playerId: player.id,
        playerName: player.name,
        content,
        timestamp: Date.now(),
        type: 'event'
      };
    } catch (error) {
      // 🔥 降级到 fallback 策略
      if (this.fallbackStrategy) {
        return await this.fallbackStrategy.generateEventChat(player, eventType, context);
      }
      return null;
    }
  }

  async generateTaunt(
    player: Player,
    targetPlayer?: Player,
    context?: ChatContext
  ): Promise<ChatMessage | null> {
    try {
      const prompt = this.buildTauntPrompt(player, targetPlayer, context);
      const content = await this.callLLMAPI(prompt);
      if (!content) return null;
      
      return {
        playerId: player.id,
        playerName: player.name,
        content,
        timestamp: Date.now(),
        type: 'taunt'
      };
    } catch (error) {
      // 🔥 降级到 fallback 策略
      if (this.fallbackStrategy) {
        return await this.fallbackStrategy.generateTaunt(player, targetPlayer, context);
      }
      return null;
    }
  }

  /**
   * 构建大模型提示词
   */
  private buildPrompt(
    player: Player,
    eventType: ChatEventType,
    context?: ChatContext
  ): string {
    const gameInfo = this.buildGameInfo(player, context);
    const eventInfo = this.buildEventInfo(eventType, context);
    const playerInfo = this.buildPlayerInfo(player, context);
    const langRequirement = this.getLanguageRequirement();
    
    return `${this.config.systemPrompt || ''}

## 语言要求
${langRequirement}

## 游戏信息
${gameInfo}

## 当前玩家信息
${playerInfo}

## 事件信息
${eventInfo}

## 任务
根据以上信息，生成符合当前游戏场景的聊天内容。要求：
1. 简短有力（1-2句话，总长度不超过20字）
2. 每句话不超过15字，使用标点符号断句（句号、问号、感叹号、逗号）
3. 如果内容较长，必须分段，每段之间用标点符号分隔
4. 符合玩家的性格和方言特色
5. 符合当前游戏状态和事件
6. 只返回要说的话，不要添加任何解释或标记
7. 必须严格遵守"语言要求"部分指定的语言

聊天内容：`;
  }

  /**
   * 构建对骂提示词
   */
  private buildTauntPrompt(
    player: Player,
    targetPlayer?: Player,
    context?: ChatContext
  ): string {
    const gameInfo = this.buildGameInfo(player, context);
    const playerInfo = this.buildPlayerInfo(player, context);
    const targetInfo = targetPlayer ? this.buildPlayerInfo(targetPlayer, context) : '';
    const langRequirement = this.getLanguageRequirement();
    
    return `${this.config.systemPrompt || ''}

## 语言要求
${langRequirement}

## 游戏信息
${gameInfo}

## 当前玩家信息
${playerInfo}

${targetInfo ? `## 目标玩家信息\n${targetInfo}\n` : ''}

## 任务
生成对目标玩家的对骂/挑衅内容。要求：
1. 简短有力（1-2句话，总长度不超过15字）
2. 每句话不超过12字，使用标点符号断句（句号、问号、感叹号、逗号）
3. 如果内容较长，必须分段，每段之间用标点符号分隔
4. 适度，不能过于激烈或低俗
5. 符合玩家的性格和方言特色
6. 只返回要说的话，不要添加任何解释或标记
7. 必须严格遵守"语言要求"部分指定的语言

对骂内容：`;
  }

  /**
   * 构建游戏信息
   */
  private buildGameInfo(player: Player, context?: ChatContext): string {
    if (!context?.fullGameState) {
      return '游戏信息：暂无';
    }
    
    const state = context.fullGameState;
    const lines: string[] = [];
    
    // 基本规则
    lines.push('游戏规则：过炸/争上游');
    lines.push(`- 每人一副完整的牌（52张）`);
    lines.push(`- 支持牌型：单张、对子、三张、炸弹（4张及以上相同）、墩（7张及以上相同）`);
    lines.push(`- 分牌：5=5分，10=10分，K=10分`);
    lines.push(`- 墩的计分：7张=1墩，8张=2墩，9张=4墩，10张=8墩（翻倍）`);
    lines.push(`- 出墩时，每个墩从每个其他玩家扣除30分，出墩玩家获得相应分数`);
    lines.push(`- 先出完牌的玩家获胜`);
    
    // 游戏状态
    lines.push(`\n当前游戏状态：`);
    lines.push(`- 玩家数量：${state.playerCount}人`);
    lines.push(`- 当前轮次：第${state.roundNumber}轮`);
    lines.push(`- 当前轮次累计分数：${state.roundScore}分`);
    lines.push(`- 游戏总分数：${state.totalScore}分`);
    lines.push(`- 当前出牌玩家：玩家${state.currentPlayerIndex}`);
    
    // 最近出牌
    if (state.lastPlay) {
      const lastPlayer = state.players.find(p => p.id === state.lastPlayPlayerIndex);
      lines.push(`- 上家出牌：${lastPlayer?.name || '未知'} 出了 ${this.formatPlay(state.lastPlay)}`);
    } else {
      lines.push(`- 上家出牌：无（新轮次开始）`);
    }
    
    // 当前轮次出牌记录
    if (state.currentRoundPlays && state.currentRoundPlays.length > 0) {
      lines.push(`\n当前轮次出牌记录：`);
      state.currentRoundPlays.forEach((play, index) => {
        const playPlayer = state.players.find(p => p.id === play.playerId);
        lines.push(`${index + 1}. ${playPlayer?.name || '未知'}：${this.formatPlayRecord(play)}`);
      });
    }
    
    return lines.join('\n');
  }

  /**
   * 构建玩家信息
   */
  private buildPlayerInfo(player: Player, context?: ChatContext): string {
    const lines: string[] = [];
    
    lines.push(`玩家名称：${player.name}`);
    lines.push(`玩家类型：${player.type === 'human' ? '真人' : 'AI'}`);
    
    if (player.voiceConfig) {
      lines.push(`方言：${player.voiceConfig.dialect}`);
      lines.push(`性别：${player.voiceConfig.gender === 'male' ? '男' : '女'}`);
    }
    
    lines.push(`手牌数量：${player.hand.length}张`);
    
    // 手牌详情（只显示给当前玩家）
    if (context?.currentPlayer?.id === player.id) {
      const handInfo = this.formatHand(player.hand);
      lines.push(`手牌详情：${handInfo}`);
    } else {
      // 其他玩家只显示手牌数量
      lines.push(`手牌详情：未知（只能看到手牌数量）`);
    }
    
    lines.push(`当前得分：${player.score || 0}分`);
    
    if (player.finishedRank !== null && player.finishedRank !== undefined) {
      lines.push(`出完牌名次：第${player.finishedRank + 1}名`);
    } else {
      lines.push(`出完牌名次：未出完`);
    }
    
    // 所有玩家情况
    if (context?.allPlayers && context.allPlayers.length > 0) {
      lines.push(`\n所有玩家情况：`);
      context.allPlayers.forEach(p => {
        const isCurrent = p.id === player.id ? '（当前玩家）' : '';
        const finished = p.finishedRank !== null && p.finishedRank !== undefined 
          ? `，已出完（第${p.finishedRank + 1}名）` 
          : '';
        lines.push(`- ${p.name}${isCurrent}：手牌${p.hand.length}张，得分${p.score || 0}分${finished}`);
      });
    }
    
    return lines.join('\n');
  }

  /**
   * 构建事件信息
   */
  private buildEventInfo(eventType: ChatEventType, context?: ChatContext): string {
    const lines: string[] = [];
    const eventData = context?.eventData || {};
    
    switch (eventType) {
      case ChatEventType.RANDOM:
        lines.push('事件类型：随机闲聊');
        break;
      case ChatEventType.BIG_DUN:
        lines.push(`事件类型：大墩出现（${eventData.dunSize || 0}张）`);
        break;
      case ChatEventType.SCORE_STOLEN:
        lines.push(`事件类型：分牌被捡走（${eventData.stolenScore || 0}分）`);
        break;
      case ChatEventType.SCORE_EATEN_CURSE:
        lines.push(`事件类型：分牌被吃（${eventData.stolenScore || 0}分，更激烈）`);
        break;
      case ChatEventType.GOOD_PLAY:
        lines.push('事件类型：出好牌');
        if (eventData.cardType) {
          lines.push(`牌型：${eventData.cardType}`);
        }
        break;
      case ChatEventType.BAD_LUCK:
        lines.push('事件类型：运气不好');
        break;
      case ChatEventType.WINNING:
        lines.push('事件类型：领先中');
        break;
      case ChatEventType.LOSING:
        lines.push('事件类型：落后中');
        break;
      case ChatEventType.FINISH_FIRST:
        lines.push('事件类型：第一个出完牌（头名）');
        break;
      case ChatEventType.FINISH_MIDDLE:
        lines.push('事件类型：中间名次出完牌');
        break;
      case ChatEventType.FINISH_LAST:
        lines.push('事件类型：最后一个出完牌（最后一名）');
        break;
      case ChatEventType.URGE_PLAY:
        lines.push('事件类型：催促其他玩家出牌');
        break;
      case ChatEventType.DUN_PLAYED:
        lines.push('事件类型：出墩');
        if (eventData.dunSize) {
          lines.push(`墩的大小：${eventData.dunSize}张`);
        }
        break;
      case ChatEventType.DEALING_GOOD_CARD:
        lines.push('事件类型：发到好牌');
        if (eventData.card) {
          lines.push(`好牌：${this.formatCard(eventData.card)}`);
        }
        break;
      case ChatEventType.DEALING_BAD_CARD:
        lines.push('事件类型：发到差牌');
        break;
      case ChatEventType.DEALING_BOMB_FORMED:
        lines.push('事件类型：理牌时形成炸弹');
        if (eventData.rank && eventData.count) {
          lines.push(`炸弹：${eventData.count}张${this.formatRank(eventData.rank)}`);
        }
        break;
      case ChatEventType.DEALING_DUN_FORMED:
        lines.push('事件类型：理牌时形成墩');
        if (eventData.rank && eventData.count) {
          lines.push(`墩：${eventData.count}张${this.formatRank(eventData.rank)}`);
        }
        break;
      case ChatEventType.DEALING_HUGE_CARD:
        lines.push('事件类型：理牌时抓到超大牌');
        if (eventData.card) {
          lines.push(`超大牌：${this.formatCard(eventData.card)}`);
        }
        break;
      case ChatEventType.DEALING_POOR_HAND:
        lines.push('事件类型：理牌时手牌质量差');
        if (eventData.handValue !== undefined) {
          lines.push(`手牌价值：${eventData.handValue}`);
        }
        break;
      default:
        lines.push(`事件类型：${eventType}`);
    }
    
    return lines.join('\n');
  }

  /**
   * 调用大模型API
   */
  /**
   * 检查Ollama中可用的模型列表
   */
  private async checkAvailableModels(): Promise<string[]> {
    try {
      // 🔥 使用配置的 API URL，而不是硬编码 localhost
      const apiUrl = this.config.apiUrl || 'http://localhost:11434/api/chat';
      const tagsUrl = apiUrl.replace('/api/chat', '/api/tags');
      
      console.log('🔍 检查可用模型:', tagsUrl);
      const response = await fetch(tagsUrl, {
        signal: AbortSignal.timeout(10000)  // 10秒超时（获取模型列表）
      });
      
      if (response.ok) {
        const data = await response.json();
        const models = data.models?.map((m: any) => m.name) || [];
        console.log('✅ 获取到模型列表:', models);
        return models;
      }
    } catch (e) {
      console.warn('⚠️  获取模型列表失败:', e);
    }
    return [];
  }

  private isFirstRequest: boolean = true;  // 标记首次请求
  
  private async callLLMAPI(prompt: string): Promise<string> {
    const apiUrl = this.config.apiUrl || 'http://localhost:11434/api/chat';
    // 🔥 首次请求使用更长的超时（模型加载需要时间）
    const baseTimeout = this.config.timeout || 20000;
    const timeout = this.isFirstRequest ? baseTimeout * 2 : baseTimeout; // 首次 40 秒，后续 20 秒
    
    // 🔥 新增：检查 LLM 可用性
    const serverUrl = apiUrl.replace('/api/chat', '');
    if (!this.availabilityManager.shouldUseLLM(serverUrl)) {
      // LLM 不可用，抛出错误以触发降级
      throw new Error('LLM service is unavailable');
    }
    
    // 如果模型找不到，先检查可用模型
    const availableModels = await this.checkAvailableModels();
    // 🔥 优先使用配置的模型，不要硬编码后备值
    let modelToUse = this.config.model || 'qwen2.5:3b';
    
    console.log('🔍 配置的模型:', this.config.model);
    console.log('🔍 可用模型列表:', availableModels);
    console.log('🔍 初始 modelToUse:', modelToUse);
    
    if (availableModels.length > 0 && !availableModels.includes(modelToUse)) {
      console.log('⚠️  配置的模型不在可用列表中，尝试自动选择');
      // 尝试自动选择聊天模型（优先选择包含chat或qwen的模型）
      const chatModels = availableModels.filter(m => 
        m.includes('chat') || m.includes('qwen') || m.includes('deepseek')
      );
      console.log('🔍 聊天模型:', chatModels);
      
      if (chatModels.length > 0) {
        modelToUse = chatModels[0];
        console.log('✅ 自动选择聊天模型:', modelToUse);
      } else if (availableModels.length > 0) {
        // 如果没有找到聊天模型，使用第一个可用模型
        modelToUse = availableModels[0];
        console.log('⚠️  使用第一个可用模型:', modelToUse);
      }
    } else {
      console.log('✅ 使用配置的模型');
    }
    
    // 添加调试日志
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      // 构建请求体 - 使用Ollama原生API格式（与Python代码一致）
      const messages: any[] = [];
      // 如果有system prompt，添加到messages中
      if (this.config.systemPrompt) {
        messages.push({ role: 'system', content: this.config.systemPrompt });
      }
      messages.push({ role: 'user', content: prompt });
      
      // 根据Python代码，Ollama API格式：{ model, messages, stream }
      // 参数直接在顶层，不使用options对象
      const requestBody: any = {
        model: modelToUse, // 使用检查后的模型名称
        messages: messages,
        stream: false // Ollama支持流式输出，但我们这里不需要
      };
      
      // 🔥 调试日志：显示实际请求的模型
      console.log(`🤖 LLM 请求: ${apiUrl}`);
      console.log(`📦 使用模型: ${modelToUse}`);
      console.log(`💬 消息数: ${messages.length}`);
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Ollama通常不需要API Key，但如果配置了也加上
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
      
      const startTime = Date.now();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      const endTime = Date.now();
      
      clearTimeout(timeoutId);
      
      
      if (!response.ok) {
        const errorText = await response.text();
        // 尝试解析错误信息
        try {
          const errorData = JSON.parse(errorText);
        } catch (e) {
          // 忽略JSON解析错误
        }
        return '';
      }
      
      const data = await response.json();
      
      // Ollama原生API格式：data.message.content
      // 也兼容OpenAI兼容格式和其他可能的格式
      const content = data.message?.content ||  // Ollama原生格式
                     data.choices?.[0]?.message?.content ||  // OpenAI兼容格式
                     data.content || 
                     data.text || 
                     data.response ||
                     '';
      
      if (!content) {
        console.warn('⚠️  模型返回空内容');
      } else {
        console.log('✅ LLM 响应成功');
      }
      
      // 🔥 标记首次请求成功
      this.isFirstRequest = false;
      
      return this.parseResponse(content);
    } catch (error: any) {
      // 🔥 新增：标记 LLM 不可用
      const serverUrl = apiUrl.replace('/api/chat', '');
      this.availabilityManager.markUnavailable(serverUrl);
      
      if (error.name === 'AbortError') {
        console.warn(`❌ LLM 请求超时 (${timeout}ms)`);
        console.warn(`   - API: ${apiUrl}`);
        console.warn(`   - 模型: ${this.config.model}`);
        console.warn(`   - 是否首次: ${this.isFirstRequest}`);
      } else {
        if (error.message) {
          console.warn('LLM error:', error.message);
        }
        if (error.cause) {
          console.warn('LLM error cause:', error.cause);
        }
      }
      
      // 抛出错误，让上层决定如何处理（降级）
      throw error;
    }
  }

  /**
   * 解析大模型返回结果
   */
  private parseResponse(response: string): string {
    // 移除可能的标记和多余内容
    let content = response.trim();
    
    // 移除可能的引号
    if ((content.startsWith('"') && content.endsWith('"')) ||
        (content.startsWith("'") && content.endsWith("'"))) {
      content = content.slice(1, -1);
    }
    
    // 移除可能的标记
    content = content.replace(/^(聊天内容|对骂内容|内容)[：:]\s*/i, '');
    content = content.replace(/^["'「」『』【】]\s*/, '');
    content = content.replace(/\s*["'「」『』【】]$/, '');
    
    content = content.trim();
    
    // 强制长度限制：最多20字（严格遵守）
    if (content.length > 20) {
      // 尝试在标点符号处截断
      let bestBreak = 20;
      for (let i = 20; i >= 15; i--) {
        if (/[。！？，；、]/.test(content[i])) {
          bestBreak = i + 1;
          break;
        }
      }
      content = content.substring(0, bestBreak);
      // 如果截断后最后是逗号、分号，替换为句号
      if (/[，；、]$/.test(content)) {
        content = content.slice(0, -1) + '。';
      }
    }
    
    // 确保文本有合适的标点符号（如果超过一定长度）
    if (content.length > 10 && !/[。！？]$/.test(content)) {
      // 如果最后是逗号、分号，替换为句号
      if (/[，；、]$/.test(content)) {
        content = content.slice(0, -1) + '。';
      } else {
        // 如果没有标点符号，添加句号
        content = content + '。';
      }
    }
    
    return content;
  }

  /**
   * 格式化手牌
   */
  private formatHand(cards: Card[]): string {
    if (cards.length === 0) return '无';
    
    // 按点数分组
    const groups = new Map<number, Card[]>();
    cards.forEach(card => {
      const rank = card.rank;
      if (!groups.has(rank)) {
        groups.set(rank, []);
      }
      groups.get(rank)!.push(card);
    });
    
    const parts: string[] = [];
    Array.from(groups.entries())
      .sort((a, b) => a[0] - b[0])
      .forEach(([rank, cards]) => {
        const count = cards.length;
        const rankName = this.formatRank(rank);
        parts.push(`${rankName}×${count}`);
      });
    
    return parts.join('，');
  }

  /**
   * 格式化牌的点数
   */
  private formatRank(rank: number): string {
    const rankMap: Record<number, string> = {
      3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
      10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
      16: '小王', 17: '大王'
    };
    return rankMap[rank] || rank.toString();
  }

  /**
   * 格式化单张牌
   */
  private formatCard(card: Card): string {
    if (card.suit === Suit.JOKER) {
      return card.rank === Rank.JOKER_SMALL ? '小王' : '大王';
    }
    const suitMap: Record<Suit, string> = {
      [Suit.SPADES]: '♠',
      [Suit.HEARTS]: '♥',
      [Suit.DIAMONDS]: '♦',
      [Suit.CLUBS]: '♣',
      [Suit.JOKER]: ''
    };
    return `${suitMap[card.suit]}${this.formatRank(card.rank)}`;
  }

  /**
   * 格式化出牌
   */
  private formatPlay(play: Play): string {
    const typeMap: Record<string, string> = {
      'single': '单张',
      'pair': '对子',
      'triple': '三张',
      'bomb': '炸弹',
      'dun': '墩'
    };
    return `${typeMap[play.type] || play.type}（${play.cards.length}张）`;
  }

  /**
   * 格式化出牌记录
   */
  private formatPlayRecord(play: any): string {
    const typeMap: Record<string, string> = {
      'single': '单张',
      'pair': '对子',
      'triple': '三张',
      'bomb': '炸弹',
      'dun': '墩'
    };
    const score = play.score || 0;
    const scoreText = score > 0 ? `，得分${score}分` : '';
    return `${typeMap[play.type] || play.type}（${play.cards?.length || 0}张）${scoreText}`;
  }
}
