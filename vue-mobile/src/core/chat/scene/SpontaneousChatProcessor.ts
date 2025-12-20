/**
 * 自发聊天场景处理器
 * 处理玩家主动闲聊，不依赖具体游戏事件
 * 特点：轻量级提示词，宽松的内容处理
 */

import { IChatSceneProcessor } from './IChatSceneProcessor';
import { ChatScene, ChatEventType } from '../../types/chat';
import { Player } from '../../types/card';
import { ChatContext } from '../strategy/IChatStrategy';
import { ChatSceneConfig } from '../../config/chatConfig';
import { processContent } from '../../services/contentProcessor';

export class SpontaneousChatProcessor implements IChatSceneProcessor {
  readonly scene = ChatScene.SPONTANEOUS;
  readonly description = '自发聊天场景：玩家主动闲聊，轻量级处理';

  buildPrompt(
    player: Player,
    eventType: ChatEventType | undefined,
    context: ChatContext | undefined,
    config: ChatSceneConfig
  ): string {
    // 自发聊天使用轻量级提示词
    const playerInfo = this.buildPlayerInfo(player);
    const simpleGameState = this.buildSimpleGameState(context);
    const chatHistory = this.buildChatHistory(context, config.historyLength);
    
    return `${this.getSystemPrompt()}

## 玩家信息
${playerInfo}

## 简单游戏状态
${simpleGameState}

${chatHistory ? `## 最近聊天记录\n${chatHistory}\n` : ''}

## 任务
生成一句自然、轻松的闲聊内容。

⚠️ 重要要求（必须严格遵守）：
1. 只返回一句话（不要多句，不要分段）
2. 必须简洁！直接说重点，不要冗余表达，但保持语义完整
3. 不要使用"好的，"、"我觉得，"、"其实，"等冗余开头
4. 不要使用"对吧"、"是吧"、"怎么样"等冗余结尾
5. 口语化表达，符合玩家的性格和方言特色
6. 可以轻松随意，不需要对应具体游戏事件
7. 只返回要说的话，不要添加任何解释、标记或标点符号（除非必要）

简洁示例（参考这些长度和风格）：
- 大家好
- 这局有意思
- 等等我
- 手气不错
- 继续继续

❌ 错误示例（不要这样）：
- 好的，我觉得这局很有意思，大家觉得呢？（太长，有冗余）
- 其实，我觉得手气不错，对吧？（有冗余开头和结尾）

聊天内容：`;
  }

  processContent(content: string, config: ChatSceneConfig): string {
    // 自发聊天处理：去掉冗余，保持语义完整，不强制截断长度
    return processContent(content, {
      maxLength: undefined, // 不强制截断，只去掉冗余
      removeFormal: config.removeFormal,
      scene: 'spontaneous'
    });
  }

  matchesEventType(eventType: ChatEventType): boolean {
    // 自发聊天主要对应 RANDOM 和 DEALING
    return eventType === ChatEventType.RANDOM || eventType === ChatEventType.DEALING;
  }

  private getSystemPrompt(): string {
    return `你是一个过炸牌游戏的AI玩家，正在和其他玩家进行轻松的闲聊。

⚠️ 重要要求（必须严格遵守）：
1. 只返回一句话（不要多句，不要分段）
2. 必须简洁！直接说重点，不要冗余表达
3. 不要使用"好的，"、"我觉得，"、"其实，"等冗余开头
4. 不要使用"对吧"、"是吧"、"怎么样"等冗余结尾
5. 口语化表达，符合玩家的性格和方言特色
6. 可以轻松随意，不需要对应具体游戏事件`;
  }

  private buildPlayerInfo(player: Player): string {
    const lines: string[] = [];
    lines.push(`玩家名称：${player.name}`);
    lines.push(`玩家类型：${player.type === 'human' ? '真人' : 'AI'}`);
    
    if (player.voiceConfig) {
      lines.push(`方言：${player.voiceConfig.dialect}`);
      lines.push(`性别：${player.voiceConfig.gender === 'male' ? '男' : '女'}`);
    }
    
    lines.push(`手牌数量：${player.hand.length}张`);
    lines.push(`当前得分：${player.score || 0}分`);
    
    return lines.join('\n');
  }

  private buildSimpleGameState(context: ChatContext | undefined): string {
    if (!context?.gameState) {
      return '游戏状态：暂无';
    }
    
    const state = context.gameState;
    const lines: string[] = [];
    lines.push(`当前轮次：第${state.roundNumber || 1}轮`);
    lines.push(`当前轮次累计分数：${state.roundScore || 0}分`);
    lines.push(`游戏总分数：${state.totalScore || 0}分`);
    
    if (state.currentPlayerIndex !== undefined) {
      lines.push(`当前出牌玩家：玩家${state.currentPlayerIndex}`);
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
}

