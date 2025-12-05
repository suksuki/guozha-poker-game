/**
 * 游戏模式工厂
 * 根据配置创建相应的游戏模式策略
 */

import { GameSetupConfig } from '../Game';
import { IGameModeStrategy } from './IGameModeStrategy';
import { IndividualModeStrategy } from './IndividualModeStrategy';
import { TeamModeStrategy } from './TeamModeStrategy';

/**
 * 根据游戏配置创建游戏模式策略
 */
export function createGameModeStrategy(config: GameSetupConfig): IGameModeStrategy {
  const isTeamMode = config.teamMode === true && 
                     (config.playerCount === 4 || config.playerCount === 6);
  
  if (isTeamMode) {
    console.log('[GameModeFactory] 创建团队模式策略');
    return new TeamModeStrategy();
  } else {
    console.log('[GameModeFactory] 创建个人模式策略');
    return new IndividualModeStrategy();
  }
}

/**
 * 判断是否为团队模式
 */
export function isTeamModeConfig(config: GameSetupConfig): boolean {
  return config.teamMode === true && 
         (config.playerCount === 4 || config.playerCount === 6);
}

