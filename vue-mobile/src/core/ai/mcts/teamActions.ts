/**
 * 团队MCTS动作生成
 * 生成包含主动要不起的团队动作
 */

import { Card, Play } from '@/core/types/card';
import { TeamAction, TeamSimulatedGameState } from '../types';
import { findPlayableCards, canPlayCards } from '@/core/utils/cardUtils';

/**
 * 生成团队动作（包括主动要不起）
 * 
 * 规则：
 * - 单人模式：能打过就必须出，不能主动pass；只有真的打不过才能pass
 * - 团队模式：可以主动pass（strategicPassEnabled为true时）
 */
export function generateTeamActions(
  hand: Card[],
  state: TeamSimulatedGameState,
  strategicPassEnabled: boolean,
  isTeamMode: boolean = true
): TeamAction[] {
  const actions: TeamAction[] = [];

  // 1. 生成所有可出牌动作
  const playableCards = findPlayableCards(hand, state.lastPlay);
  //
  /* if (playableCards.length > 0 && state.lastPlay) {
    playableCards.forEach((cards, idx) => {
      const play = canPlayCards(cards);
      if (play) {
      }
    });
  } */
  actions.push(...playableCards.map(cards => ({
    type: 'play' as const,
    cards
  })));

  // 2. 判断是否有能打过的牌
  const canBeatLastPlay = playableCards.some(cards => {
    const play = canPlayCards(cards);
    return play && state.lastPlay && canBeat(play, state.lastPlay);
  });

  // 3. Pass逻辑
  if (state.lastPlay) {
    // 有上家出牌的情况
    if (isTeamMode) {
      // 团队模式：可以主动pass（如果启用）
      if (strategicPassEnabled && state.canPass && canBeatLastPlay) {
        actions.push({
          type: 'pass' as const,
          strategic: true  // 主动要不起
        });
      }
      // 即使团队模式，如果打不过，也要添加被动pass
      if (!canBeatLastPlay) {
        actions.push({
          type: 'pass' as const,
          strategic: false  // 被动要不起（真的打不过）
        });
      }
    } else {
      // 单人模式：能打过就必须出，不能主动pass；只有真的打不过才能pass
      if (!canBeatLastPlay) {
        actions.push({
          type: 'pass' as const,
          strategic: false  // 被动要不起（真的打不过）
        });
      }
      // 单人模式：如果能打过，不添加pass选项（必须出牌）
    }
  } else {
    // 首家/接风的情况：不能pass，必须出牌
    // 所以这里不添加pass选项
  }

  return actions;
}

/**
 * 判断一个play是否能beat另一个play
 */
function canBeat(play: Play, lastPlay: Play): boolean {
  const playType = play.type as any;
  // 类型必须相同（除非是炸弹或王炸）
  if (playType === 'bomb' || playType === 'joker_bomb') {
    return true; // 炸弹可以压所有牌
  }

  if (play.type !== lastPlay.type) {
    return false;
  }

  // 同类型比大小
  return play.value > lastPlay.value;
}

/**
 * 判断是否可以主动要不起
 */
export function canStrategicPass(state: TeamSimulatedGameState): boolean {
  // 如果上家没有出牌，不能要不起
  if (!state.lastPlay) {
    return false;
  }

  // 如果上家是队友，可以考虑主动要不起
  const currentTeamId = state.playerTeams.get(state.currentPlayerIndex);
  const lastPlayTeamId = state.playerTeams.get(state.lastPlayPlayerIndex!);

  // 无论上家是队友还是对手，都可以主动要不起（策略判断）
  return true;
}

/**
 * 评估主动要不起的价值
 */
export function evaluateStrategicPass(
  state: TeamSimulatedGameState,
  hand: Card[]
): number {
  let score = 0;

  // 1. 队友能否压过？
  const teammateCanBeat = estimateTeammateCanBeat(state);
  if (teammateCanBeat) {
    score += 50;  // 队友能压过，主动要不起有价值
  }

  // 2. 是否保留了大牌？
  const hasBigCards = hand.some(card => card.rank >= 12); // A或以上
  if (hasBigCards) {
    score += 30;  // 保留大牌有价值
  }

  // 3. 当前轮次分数是否值得？
  if (state.roundContext.roundScore > 15) {
    score += 20;  // 高分数轮次，让队友拿分有价值
  } else {
    score -= 10;  // 低分数轮次，不值得让分
  }

  // 4. 队友手牌情况
  const teammateHandCount = getTeammateHandCount(state);
  if (teammateHandCount > 0 && teammateHandCount < hand.length) {
    score += 25;  // 队友手牌更少，让队友出更合理
  }

  // 5. 是否会导致对手得分？
  if (willOpponentScore(state)) {
    score -= 40;  // 如果对手会得分，主动要不起有风险
  }

  return score;
}

/**
 * 估计队友是否能压过
 */
function estimateTeammateCanBeat(state: TeamSimulatedGameState): boolean {
  // 简化版：如果队友手牌数量合理，假设可能能压过
  const currentTeamId = state.playerTeams.get(state.currentPlayerIndex);

  // 找到队友
  for (const [playerId, teamId] of state.playerTeams.entries()) {
    if (teamId === currentTeamId && playerId !== state.currentPlayerIndex) {
      // 队友的手牌数量
      const teammateHandCount = state.allHands[playerId]?.length || 0;
      // 如果队友有牌，有可能能压过
      return teammateHandCount > 0;
    }
  }

  return false;
}

/**
 * 获取队友手牌数量
 */
function getTeammateHandCount(state: TeamSimulatedGameState): number {
  const currentTeamId = state.playerTeams.get(state.currentPlayerIndex);

  for (const [playerId, teamId] of state.playerTeams.entries()) {
    if (teamId === currentTeamId && playerId !== state.currentPlayerIndex) {
      return state.allHands[playerId]?.length || 0;
    }
  }

  return 0;
}

/**
 * 判断是否会导致对手得分
 */
function willOpponentScore(state: TeamSimulatedGameState): boolean {
  // 简化版：如果上家是对手且上家出牌有分数，可能会导致对手得分
  const currentTeamId = state.playerTeams.get(state.currentPlayerIndex);
  const lastPlayTeamId = state.playerTeams.get(state.lastPlayPlayerIndex!);

  return lastPlayTeamId !== currentTeamId && state.roundContext.roundScore > 5;
}
