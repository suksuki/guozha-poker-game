/**
 * Round 类集成辅助函数
 * 帮助将 Round 类集成到现有的游戏状态中
 */

import { Round, PlayTimingConfig } from './Round';
import { MultiPlayerGameState } from './gameStateUtils';

/**
 * 从游戏状态同步创建 Round 对象
 */
export function createRoundFromState(
  state: MultiPlayerGameState,
  timingConfig?: Partial<PlayTimingConfig>
): Round {
  const round = Round.createNew(state.roundNumber, undefined, timingConfig);
  
  // 如果有旧的轮次数据，恢复它们
  if (state.currentRoundPlays && state.currentRoundPlays.length > 0) {
    // 注意：这里无法完全恢复 Play 对象，只能恢复基本信息
    // 实际使用时，应该在每次出牌时都使用 Round 来记录
  }
  
  return round;
}

/**
 * 同步 Round 对象到游戏状态（保持向后兼容）
 */
export function syncRoundToState(
  round: Round,
  prevState: MultiPlayerGameState
): Partial<MultiPlayerGameState> {
  // 将只读数组转换为可变数组，确保状态更新时不会被覆盖
  const plays = round.getPlays();
  const currentRoundPlays = Array.isArray(plays) ? [...plays] : [];
  
  return {
    roundNumber: round.roundNumber,
    roundScore: round.getTotalScore(),
    currentRoundPlays: currentRoundPlays,
    lastPlay: round.getLastPlay(),
    lastPlayPlayerIndex: round.getLastPlayPlayerIndex(),
    currentRound: round
  };
}

/**
 * 创建默认的时间配置
 */
export function getDefaultTimingConfig(): PlayTimingConfig {
  return {
    minIntervalBetweenPlays: 100,  // 100ms最短间隔
    playTimeout: 30000,              // 30秒超时
    enabled: true
  };
}

/**
 * 检查游戏状态是否有 Round 对象
 */
export function hasRound(state: MultiPlayerGameState & { currentRound?: Round }): state is MultiPlayerGameState & { currentRound: Round } {
  return 'currentRound' in state && state.currentRound !== undefined;
}

