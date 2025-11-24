/**
 * 大模型聊天策略实现
 * 调用大模型API生成智能聊天内容
 */

import { ChatMessage, ChatEventType } from '../../types/chat';
import { Player, Card, Suit, Rank, Play } from '../../types/card';
import { IChatStrategy, ChatContext } from './IChatStrategy';
import { LLMChatConfig } from '../../config/chatConfig';
import { getCardType, isScoreCard, calculateCardsScore } from '../../utils/cardUtils';
import { processContent } from '../../services/contentProcessor';
import { trainingDataCollector } from '../../services/trainingDataCollector';
import { MultiPlayerGameState } from '../../utils/gameStateUtils';

export class LLMChatStrategy implements IChatStrategy {
  readonly name = 'llm';
  readonly description = '基于大语言模型的智能聊天策略';

  constructor(private config: LLMChatConfig) {}

  async generateRandomChat(
    player: Player,
    context?: ChatContext
  ): Promise<ChatMessage | null> {
    console.log('[LLMChatStrategy] 🎲 生成随机闲聊，玩家:', player.name);
    const prompt = this.buildPrompt(player, ChatEventType.RANDOM, context);
    console.log('[LLMChatStrategy] 📝 生成的Prompt长度:', prompt.length, '字符');
    let content = await this.callLLMAPI(prompt);
    if (!content) {
      console.warn('[LLMChatStrategy] ⚠️ 大模型返回空内容，可能API调用失败');
      return null;
    }
    
    // 处理内容：精简和优化（只选择一句话，最多15个字）
    const originalContent = content;
    content = processContent(content, { maxLength: 15, removeFormal: true });
    
    if (content !== originalContent) {
      console.log('[LLMChatStrategy] 📝 内容已精简:', {
        原文: originalContent,
        精简后: content,
        长度: `${originalContent.length} → ${content.length}`
      });
    }
    
    console.log('[LLMChatStrategy] ✅ 成功生成聊天内容:', content);
    return {
      playerId: player.id,
      playerName: player.name,
      content,
      timestamp: Date.now(),
      type: 'random'
    };
  }

  async generateEventChat(
    player: Player,
    eventType: ChatEventType,
    context?: ChatContext
  ): Promise<ChatMessage | null> {
    console.log('[LLMChatStrategy] 生成事件聊天，玩家:', player.name, '事件:', eventType);
    const prompt = this.buildPrompt(player, eventType, context);
    console.log('[LLMChatStrategy] 生成的Prompt长度:', prompt.length);
    let content = await this.callLLMAPI(prompt);
    if (!content) {
      console.warn('[LLMChatStrategy] 大模型返回空内容，可能API调用失败');
      return null;
    }
    
    // 处理内容：精简和优化
    const originalContent = content;
    const processedContent = processContent(content, { maxLength: 30, removeFormal: true });
    
    // 收集训练数据
    const reduction = originalContent.length - processedContent.length;
    const reductionPercent = originalContent.length > 0 
      ? (reduction / originalContent.length) * 100 
      : 0;
    
    trainingDataCollector.collectSample({
      playerId: player.id,
      playerName: player.name,
      eventType: eventType,
      prompt: this.buildPrompt(player, eventType, context),
      originalContent,
      processedContent,
      processingStats: {
        originalLength: originalContent.length,
        processedLength: processedContent.length,
        reduction,
        reductionPercent
      },
      context: context ? {
        gameState: context.gameState,
        eventData: context.eventData,
        playerState: context.playerState
      } : undefined
    });
    
    if (processedContent !== originalContent) {
      console.log('[LLMChatStrategy] 📝 内容已精简:', {
        原文: originalContent,
        精简后: processedContent,
        长度: `${originalContent.length} → ${processedContent.length} (减少 ${reduction} 字符, ${reductionPercent.toFixed(1)}%)`
      });
    }
    
    console.log('[LLMChatStrategy] ✅ 成功生成聊天内容:', processedContent);
    return {
      playerId: player.id,
      playerName: player.name,
      content: processedContent,
      timestamp: Date.now(),
      type: 'event'
    };
  }

  async generateTaunt(
    player: Player,
    targetPlayer?: Player,
    context?: ChatContext
  ): Promise<ChatMessage | null> {
    console.log('[LLMChatStrategy] 生成对骂，玩家:', player.name, '目标:', targetPlayer?.name);
    const prompt = this.buildTauntPrompt(player, targetPlayer, context);
    const originalContent = await this.callLLMAPI(prompt);
    if (!originalContent) {
      console.warn('[LLMChatStrategy] ⚠️ 大模型返回空内容，可能API调用失败');
      return null;
    }
    
    // 处理内容：精简和优化（对骂也最多15个字）
    const processedContent = processContent(originalContent, { maxLength: 15, removeFormal: true });
    
    // 收集训练数据
    const reduction = originalContent.length - processedContent.length;
    const reductionPercent = originalContent.length > 0 
      ? (reduction / originalContent.length) * 100 
      : 0;
    
    trainingDataCollector.collectSample({
      playerId: player.id,
      playerName: player.name,
      eventType: 'taunt',
      prompt,
      originalContent,
      processedContent,
      processingStats: {
        originalLength: originalContent.length,
        processedLength: processedContent.length,
        reduction,
        reductionPercent
      },
      context: context ? {
        gameState: context.gameState,
        targetPlayer: targetPlayer ? {
          id: targetPlayer.id,
          name: targetPlayer.name
        } : undefined
      } : undefined
    });
    
    if (processedContent !== originalContent) {
      console.log('[LLMChatStrategy] 📝 对骂内容已精简:', {
        原文: originalContent,
        精简后: processedContent,
        长度: `${originalContent.length} → ${processedContent.length} (减少 ${reduction} 字符, ${reductionPercent.toFixed(1)}%)`
      });
    }
    
    console.log('[LLMChatStrategy] ✅ 成功生成对骂内容:', processedContent);
    return {
      playerId: player.id,
      playerName: player.name,
      content: processedContent,
      timestamp: Date.now(),
      type: 'taunt'
    };
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
    
    return `${this.config.systemPrompt || ''}

## 游戏信息
${gameInfo}

## 当前玩家信息
${playerInfo}

## 事件信息
${eventInfo}

## 任务
根据以上信息，生成一句符合当前游戏场景的聊天内容。

重要要求：
1. 只返回一句话（不要多句）
2. 最多15个字（必须严格遵守）
3. 简洁自然，不要"好的，"、"我觉得，"等冗余开头
4. 符合玩家的性格和方言特色
5. 符合当前游戏状态和事件
6. 只返回要说的话，不要添加任何解释或标记

示例：
- 好牌！
- 这手不错
- 要不起
- 等等我

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
    
    return `${this.config.systemPrompt || ''}

## 游戏信息
${gameInfo}

## 当前玩家信息
${playerInfo}

${targetInfo ? `## 目标玩家信息\n${targetInfo}\n` : ''}

## 任务
生成一句对目标玩家的对骂/挑衅内容。

重要要求：
1. 只返回一句话（不要多句）
2. 最多15个字（必须严格遵守）
3. 必须包含脏话或粗口（这是对骂，不是普通聊天）
4. 简洁自然，不要冗余表达
5. 符合玩家的性格和方言特色
6. 只返回要说的话，不要添加任何解释或标记

脏话要求：
- 必须使用脏话，如"你妈逼"、"妈的"、"靠"、"卧槽"、"我去"等
- 这是打牌时的对骂，要激烈一些
- 可以适度使用方言脏话

示例（必须包含脏话）：
- 你妈逼，等着
- 妈的，太狠了
- 靠，你完了
- 卧槽，你等着
- 我去，你妈逼
- 你妈逼，看我的
- 妈的，别得意
- 靠，你死定了

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
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        const models = data.models?.map((m: any) => m.name) || [];
        console.log('[LLMChatStrategy] 可用的Ollama模型:', models);
        return models;
      }
    } catch (e) {
      console.warn('[LLMChatStrategy] 无法获取模型列表:', e);
    }
    return [];
  }

  private async callLLMAPI(prompt: string): Promise<string> {
    const apiUrl = this.config.apiUrl || 'http://localhost:11434/api/chat';
    const timeout = this.config.timeout || 60000; // 默认60秒超时
    
    // 如果模型找不到，先检查可用模型
    const availableModels = await this.checkAvailableModels();
    let modelToUse = this.config.model || 'qwen2:0.5b';
    
    if (availableModels.length > 0 && !availableModels.includes(modelToUse)) {
      console.warn('[LLMChatStrategy] ⚠️ 配置的模型不存在，可用模型:', availableModels);
      // 尝试自动选择聊天模型（优先选择包含chat或qwen的模型）
      const chatModels = availableModels.filter(m => 
        m.includes('chat') || m.includes('qwen') || m.includes('deepseek')
      );
      if (chatModels.length > 0) {
        modelToUse = chatModels[0];
        console.log('[LLMChatStrategy] 自动切换到模型:', modelToUse);
      } else if (availableModels.length > 0) {
        // 如果没有找到聊天模型，使用第一个可用模型
        modelToUse = availableModels[0];
        console.log('[LLMChatStrategy] 使用第一个可用模型:', modelToUse);
      }
    }
    
    // 添加调试日志
    console.log('[LLMChatStrategy] 调用Ollama API:', {
      url: apiUrl,
      model: this.config.model || 'qwen1.5:0.5b',
      promptLength: prompt.length
    });
    
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
      
      // 如果Ollama支持，可以添加这些参数（但根据Python代码，似乎不需要）
      // 先不添加，看看是否能工作
      
      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };
      
      // Ollama通常不需要API Key，但如果配置了也加上
      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }
      
      console.log('[LLMChatStrategy] 发送请求:', {
        url: apiUrl,
        model: requestBody.model,
        messagesCount: requestBody.messages.length,
        requestBody: JSON.stringify(requestBody, null, 2)
      });
      
      const startTime = Date.now();
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      const endTime = Date.now();
      
      clearTimeout(timeoutId);
      
      console.log('[LLMChatStrategy] API响应时间:', endTime - startTime, 'ms');
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[LLMChatStrategy] Ollama API调用失败:', response.status, errorText);
        // 尝试解析错误信息
        try {
          const errorData = JSON.parse(errorText);
          console.error('[LLMChatStrategy] 错误详情:', errorData);
        } catch (e) {
          // 忽略JSON解析错误
        }
        return '';
      }
      
      const data = await response.json();
      console.log('[LLMChatStrategy] API响应数据:', data);
      
      // Ollama原生API格式：data.message.content
      // 也兼容OpenAI兼容格式和其他可能的格式
      const content = data.message?.content ||  // Ollama原生格式
                     data.choices?.[0]?.message?.content ||  // OpenAI兼容格式
                     data.content || 
                     data.text || 
                     data.response ||
                     '';
      
      if (!content) {
        console.warn('[LLMChatStrategy] Ollama返回空内容，完整响应:', JSON.stringify(data, null, 2));
      } else {
        console.log('[LLMChatStrategy] 收到大模型回复:', content);
      }
      
      return this.parseResponse(content);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.error('[LLMChatStrategy] Ollama API调用超时（', timeout, 'ms）');
      } else {
        console.error('[LLMChatStrategy] Ollama API调用出错:', error);
        if (error.message) {
          console.error('[LLMChatStrategy] 错误信息:', error.message);
        }
        if (error.cause) {
          console.error('[LLMChatStrategy] 错误原因:', error.cause);
        }
      }
      return '';
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
    
    return content.trim();
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
