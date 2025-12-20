/**
 * 事件触发聊天场景处理器
 * 处理基于具体游戏事件的聊天
 * 特点：详细提示词，精准的内容处理
 */

import { IChatSceneProcessor } from './IChatSceneProcessor';
import { ChatScene, ChatEventType } from '../../types/chat';
import { Player, Card, Suit, Rank, Play } from '../../types/card';
import { ChatContext } from '../strategy/IChatStrategy';
import { ChatSceneConfig } from '../../config/chatConfig';
import { processContent } from '../../services/contentProcessor';

export class EventDrivenChatProcessor implements IChatSceneProcessor {
  readonly scene = ChatScene.EVENT_DRIVEN;
  readonly description = '事件触发聊天场景：基于游戏事件，详细处理';

  buildPrompt(
    player: Player,
    eventType: ChatEventType | undefined,
    context: ChatContext | undefined,
    config: ChatSceneConfig
  ): string {
    // 事件触发使用详细提示词
    const gameInfo = this.buildGameInfo(context, config);
    const playerInfo = this.buildPlayerInfo(player, context);
    const eventInfo = this.buildEventInfo(eventType, context);
    const chatHistory = this.buildChatHistory(context, config.historyLength);
    
    return `${this.getSystemPrompt()}

## 游戏信息
${gameInfo}

## 当前玩家信息
${playerInfo}

## 事件信息
${eventInfo}

${chatHistory ? `## 最近聊天记录\n${chatHistory}\n` : ''}

## 任务
根据以上信息，生成一句符合当前游戏场景和事件的聊天内容。

⚠️ 重要要求（必须严格遵守）：
1. 只返回一句话（不要多句，不要分段）
2. 必须简洁！直接说重点，不要冗余表达，但保持语义完整
3. 不要使用"好的，"、"我觉得，"、"其实，"等冗余开头
4. 不要使用"对吧"、"是吧"、"怎么样"等冗余结尾
5. 必须与当前事件相关，精准有力
6. 符合玩家的性格和方言特色
7. 只返回要说的话，不要添加任何解释、标记或标点符号（除非必要）

简洁示例（参考这些长度和风格）：
- 好牌！
- 这手不错
- 大墩！
- 分牌被吃了
- 出得好

❌ 错误示例（不要这样）：
- 好的，我觉得这手牌出得不错，应该能赢吧？（太长，有冗余）
- 其实，我觉得这是好牌，对吧？（有冗余开头和结尾）

聊天内容：`;
  }

  processContent(content: string, config: ChatSceneConfig): string {
    // 事件触发处理：去掉冗余，保持语义完整，不强制截断长度
    return processContent(content, {
      maxLength: undefined, // 不强制截断，只去掉冗余
      removeFormal: config.removeFormal,
      scene: 'event-driven'
    });
  }

  matchesEventType(eventType: ChatEventType): boolean {
    // 事件触发场景：除了 RANDOM 和 DEALING 之外的所有事件
    return eventType !== ChatEventType.RANDOM && eventType !== ChatEventType.DEALING;
  }

  private getSystemPrompt(): string {
    return `你是一个过炸牌游戏的AI玩家，需要根据游戏情况生成自然、有趣的聊天内容。

⚠️ 重要要求（必须严格遵守）：
1. 只返回一句话（不要多句，不要分段）
2. 必须简洁！直接说重点，不要冗余表达
3. 不要使用"好的，"、"我觉得，"、"其实，"等冗余开头
4. 不要使用"对吧"、"是吧"、"怎么样"等冗余结尾
5. 必须与当前游戏事件相关，精准有力
6. 符合游戏场景，口语化表达`;
  }

  private buildGameInfo(context: ChatContext | undefined, config: ChatSceneConfig): string {
    if (!context?.fullGameState || !config.includeFullGameState) {
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
      const lastPlayer = state.players.find((p: any) => p.id === state.lastPlayPlayerIndex);
      lines.push(`- 上家出牌：${lastPlayer?.name || '未知'} 出了 ${this.formatPlay(state.lastPlay)}`);
    } else {
      lines.push(`- 上家出牌：无（新轮次开始）`);
    }
    
    // 当前轮次出牌记录
      if (state.currentRoundPlays && state.currentRoundPlays.length > 0) {
        lines.push(`\n当前轮次出牌记录：`);
        state.currentRoundPlays.forEach((play: any, index: number) => {
          const playPlayer = state.players.find((p: any) => p.id === play.playerId);
          lines.push(`${index + 1}. ${playPlayer?.name || '未知'}：${this.formatPlayRecord(play)}`);
        });
      }
    
    return lines.join('\n');
  }

  private buildPlayerInfo(player: Player, context: ChatContext | undefined): string {
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

  private buildEventInfo(eventType: ChatEventType | undefined, context: ChatContext | undefined): string {
    if (!eventType) {
      return '事件类型：未知';
    }
    
    const lines: string[] = [];
    const eventData = context?.eventData || {};
    
    switch (eventType) {
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

  private buildChatHistory(context: ChatContext | undefined, historyLength: number): string {
    if (!context?.history || context.history.length === 0) {
      return '';
    }
    
    const recentHistory = context.history.slice(-historyLength);
    return recentHistory.map((msg, index) => {
      return `${index + 1}. ${msg.playerName}：${msg.content}`;
    }).join('\n');
  }

  // 辅助方法：格式化手牌
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

  // 辅助方法：格式化出牌
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

  // 辅助方法：格式化出牌记录
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

  // 辅助方法：格式化卡牌
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

  // 辅助方法：格式化点数
  private formatRank(rank: number): string {
    const rankMap: Record<number, string> = {
      3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9',
      10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
      16: '小王', 17: '大王'
    };
    return rankMap[rank] || rank.toString();
  }
}
