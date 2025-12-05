/**
 * 游戏模式工厂测试
 */

import { describe, it, expect } from 'vitest';
import { createGameModeStrategy, isTeamModeConfig } from '../../src/utils/gameMode/GameModeFactory';
import { IndividualModeStrategy } from '../../src/utils/gameMode/IndividualModeStrategy';
import { TeamModeStrategy } from '../../src/utils/gameMode/TeamModeStrategy';
import { GameSetupConfig } from '../../src/utils/Game';

describe('GameModeFactory', () => {
  describe('isTeamModeConfig', () => {
    it('应该在teamMode=true且playerCount=4时返回true', () => {
      const config: GameSetupConfig = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: [],
        teamMode: true
      };
      
      expect(isTeamModeConfig(config)).toBe(true);
    });

    it('应该在teamMode=true且playerCount=6时返回true', () => {
      const config: GameSetupConfig = {
        playerCount: 6,
        humanPlayerIndex: 0,
        aiConfigs: [],
        teamMode: true
      };
      
      expect(isTeamModeConfig(config)).toBe(true);
    });

    it('应该在teamMode=false时返回false', () => {
      const config: GameSetupConfig = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: [],
        teamMode: false
      };
      
      expect(isTeamModeConfig(config)).toBe(false);
    });

    it('应该在playerCount不是4或6时返回false', () => {
      const config: GameSetupConfig = {
        playerCount: 5,
        humanPlayerIndex: 0,
        aiConfigs: [],
        teamMode: true
      };
      
      expect(isTeamModeConfig(config)).toBe(false);
    });
  });

  describe('createGameModeStrategy', () => {
    it('应该为团队模式创建TeamModeStrategy', () => {
      const config: GameSetupConfig = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: [],
        teamMode: true
      };
      
      const strategy = createGameModeStrategy(config);
      expect(strategy).toBeInstanceOf(TeamModeStrategy);
      expect(strategy.getModeName()).toBe('团队模式');
    });

    it('应该为个人模式创建IndividualModeStrategy', () => {
      const config: GameSetupConfig = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: [],
        teamMode: false
      };
      
      const strategy = createGameModeStrategy(config);
      expect(strategy).toBeInstanceOf(IndividualModeStrategy);
      expect(strategy.getModeName()).toBe('个人模式');
    });

    it('应该在teamMode未设置时创建IndividualModeStrategy', () => {
      const config: GameSetupConfig = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: []
      };
      
      const strategy = createGameModeStrategy(config);
      expect(strategy).toBeInstanceOf(IndividualModeStrategy);
    });
  });
});

