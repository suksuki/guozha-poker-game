/**
 * 吵架王语音服务辅助工具
 * 提供便捷函数来集成到游戏流程中
 */

import { getQuarrelVoiceService, updateMainFightRoles, Utter, Priority, Language } from '../services/quarrelVoiceService';
import { Player } from '../types/card';
import { ChatMessage, ChatEventType } from '../types/chat';
import { detectLanguage } from './languageDetection';
import { convertToNanchang } from '../ai/dialect/nanchang_rules';

/**
 * 从Player获取roleId
 */
export function getRoleIdFromPlayer(player: Player): string {
  return player.id.toString();
}

/**
 * 从多个Player获取roleId数组
 */
export function getRoleIdsFromPlayers(players: Player[]): string[] {
  return players.map(p => p.id.toString());
}

/**
 * 检测文本语言并转换为Language类型
 */
export function detectLanguageForQuarrel(text: string, player?: Player): Language {
  // 如果玩家设置了南昌话，优先使用
  if (player?.voiceConfig?.dialect === 'nanchang') {
    return 'nanchang';
  }

  // 检测文本语言
  const detected = detectLanguage(text);
  if (detected.startsWith('ja')) {
    return 'ja';
  } else if (detected.startsWith('ko')) {
    return 'ko';
  } else {
    return 'zh';
  }
}

/**
 * 根据ChatEventType确定优先级
 */
export function getPriorityFromEventType(eventType?: ChatEventType): Priority {
  switch (eventType) {
    case ChatEventType.TAUNT:
      return 'MAIN_FIGHT';
    case ChatEventType.REPLY:
      return 'MAIN_FIGHT';
    case ChatEventType.URGE_PLAY:
      return 'QUICK_JAB';
    case ChatEventType.GOOD_PLAY:
      return 'NORMAL_CHAT';
    case ChatEventType.SCORE_STOLEN:
      return 'NORMAL_CHAT';
    default:
      return 'NORMAL_CHAT';
  }
}

/**
 * 从ChatMessage创建Utter
 */
export function createUtterFromChatMessage(
  message: ChatMessage,
  player: Player,
  options?: {
    priority?: Priority;
    civility?: number;
    lang?: Language;
    volume?: number;
  }
): Utter {
  // 确定语言
  let lang = options?.lang;
  if (!lang) {
    lang = detectLanguageForQuarrel(message.content, player);
  }

  // 如果是南昌话，转换文本
  let text = message.content;
  if (lang === 'nanchang') {
    text = convertToNanchang(text);
  }

  // 确定优先级
  const priority = options?.priority || getPriorityFromEventType(message.eventType);

  return {
    roleId: getRoleIdFromPlayer(player),
    text,
    priority,
    civility: options?.civility ?? 2,
    lang,
    volume: options?.volume ?? 1.0,
  };
}

/**
 * 提交ChatMessage到QuarrelVoiceService
 */
export async function submitChatMessageToQuarrel(
  message: ChatMessage,
  player: Player,
  options?: {
    priority?: Priority;
    civility?: number;
    lang?: Language;
    volume?: number;
    onStart?: () => void;
    onEnd?: () => void;
    onError?: (error: Error) => void;
  }
): Promise<void> {
  const service = getQuarrelVoiceService();
  const utter = createUtterFromChatMessage(message, player, options);
  
  // 添加事件回调
  if (options?.onStart) {
    utter.onStart = options.onStart;
  }
  if (options?.onEnd) {
    utter.onEnd = options.onEnd;
  }
  if (options?.onError) {
    utter.onError = options.onError;
  }

  await service.submitUtter(utter);
}

/**
 * 处理对骂场景
 */
export async function handleQuarrelScene(
  player1: Player,
  player2: Player,
  player1Text: string,
  player2Text?: string,
  options?: {
    civility?: number;
    lang?: Language;
    volume?: number;
  }
): Promise<void> {
  const service = getQuarrelVoiceService();
  
  // 设置主吵架双方
  updateMainFightRoles([
    getRoleIdFromPlayer(player1),
    getRoleIdFromPlayer(player2),
  ]);

  // 提交player1的话语
  await service.submitUtter({
    roleId: getRoleIdFromPlayer(player1),
    text: player1Text,
    priority: 'MAIN_FIGHT',
    civility: options?.civility ?? 3,
    lang: options?.lang ?? detectLanguageForQuarrel(player1Text, player1),
    volume: options?.volume ?? 1.0,
  });

  // 如果player2有回复，也提交
  if (player2Text) {
    await service.submitUtter({
      roleId: getRoleIdFromPlayer(player2),
      text: player2Text,
      priority: 'MAIN_FIGHT',
      civility: options?.civility ?? 3,
      lang: options?.lang ?? detectLanguageForQuarrel(player2Text, player2),
      volume: options?.volume ?? 1.0,
    });
  }
}

/**
 * 处理其他玩家短插一句
 */
export async function handleQuickJab(
  player: Player,
  text: string,
  options?: {
    civility?: number;
    lang?: Language;
    volume?: number;
  }
): Promise<void> {
  const service = getQuarrelVoiceService();
  
  await service.submitUtter({
    roleId: getRoleIdFromPlayer(player),
    text,
    priority: 'QUICK_JAB',
    civility: options?.civility ?? 1,
    lang: options?.lang ?? detectLanguageForQuarrel(text, player),
    volume: options?.volume ?? 0.8,
  });
}

