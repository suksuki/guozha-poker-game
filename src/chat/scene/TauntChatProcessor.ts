/**
 * 对骂聊天场景处理器
 * 处理玩家之间的对骂/挑衅
 * 特点：特殊提示词，必须包含脏话
 */

import { IChatSceneProcessor } from './IChatSceneProcessor';
import { ChatScene, ChatEventType } from '../../types/chat';
import { Player } from '../../types/card';
import { ChatContext } from '../strategy/IChatStrategy';
import { ChatSceneConfig } from '../../config/chatConfig';
import { processContent } from '../../services/contentProcessor';

export class TauntChatProcessor implements IChatSceneProcessor {
  readonly scene = ChatScene.TAUNT;
  readonly description = '对骂聊天场景：玩家对骂/挑衅，保留原始性和完整性（APP主打对骂）';

  buildPrompt(
    player: Player,
    eventType: ChatEventType | undefined,
    context: ChatContext | undefined,
    config: ChatSceneConfig
  ): string {
    const gameInfo = this.buildGameInfo(context);
    const playerInfo = this.buildPlayerInfo(player, context);
    const targetInfo = context?.targetPlayer ? this.buildPlayerInfo(context.targetPlayer, context) : '';
    
    return `${this.getSystemPrompt()}

## 游戏信息
${gameInfo}

## 当前玩家信息
${playerInfo}

${targetInfo ? `## 目标玩家信息\n${targetInfo}\n` : ''}

## 任务
生成一句对目标玩家的对骂/挑衅内容。

⚠️ 重要要求（必须严格遵守）：
1. 只返回一句话（不要多句，不要分段）
2. 必须简洁！直接说重点，不要冗余表达，但保持语义完整
3. 必须包含脏话或粗口（这是对骂，不是普通聊天）
4. 不要使用"好的，"、"我觉得，"、"其实，"等冗余开头
5. 不要使用"对吧"、"是吧"、"怎么样"等冗余结尾
6. 符合玩家的性格和方言特色
7. 只返回要说的话，不要添加任何解释、标记或标点符号（除非必要）

脏话要求：
- 必须使用脏话，如"你妈逼"、"妈的"、"靠"、"卧槽"、"我去"等
- 这是打牌时的对骂，要激烈一些
- 可以适度使用方言脏话

简洁示例（必须包含脏话，参考这些长度和风格）：
- 你妈逼，等着
- 妈的，太狠了
- 靠，你完了
- 卧槽，你等着
- 我去，你妈逼
- 你妈逼，看我的
- 妈的，别得意
- 靠，你死定了

❌ 错误示例（不要这样）：
- 好的，我觉得你这次出牌太狠了，你妈逼，等着瞧吧！（太长，有冗余）
- 其实，我觉得你完了，对吧？（有冗余开头和结尾，缺少脏话）

对骂内容：`;
  }

  processContent(content: string, config: ChatSceneConfig): string {
    // 对骂处理：去掉明显冗余，保持语义完整，不强制截断长度（APP主打对骂）
    return processContent(content, {
      maxLength: undefined, // 不强制截断，只去掉明显冗余
      removeFormal: config.removeFormal,
      scene: 'taunt'
    });
  }

  private getSystemPrompt(): string {
    return `你是一个过炸牌游戏的AI玩家，需要生成对骂/挑衅内容。

重要要求：
1. 只返回一句话（不要多句）
2. 必须包含脏话和粗口，要激烈一些
3. 符合打牌时的对骂场景
4. 符合玩家的性格和方言特色`;
  }

  private buildGameInfo(context: ChatContext | undefined): string {
    if (!context?.gameState) {
      return '游戏信息：暂无';
    }
    
    const state = context.gameState;
    const lines: string[] = [];
    lines.push(`当前轮次：第${state.roundNumber || 1}轮`);
    lines.push(`当前轮次累计分数：${state.roundScore || 0}分`);
    
    return lines.join('\n');
  }

  private buildPlayerInfo(player: Player, context: ChatContext | undefined): string {
    const lines: string[] = [];
    lines.push(`玩家名称：${player.name}`);
    
    if (player.voiceConfig) {
      lines.push(`方言：${player.voiceConfig.dialect}`);
      lines.push(`性别：${player.voiceConfig.gender === 'male' ? '男' : '女'}`);
    }
    
    lines.push(`当前得分：${player.score || 0}分`);
    
    return lines.join('\n');
  }
}

