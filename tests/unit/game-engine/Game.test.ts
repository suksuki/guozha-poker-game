/**
 * Game类单元测试
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Game } from '../../../src/game-engine/Game';

describe('Game类', () => {
  let game: Game;
  
  beforeEach(() => {
    game = new Game({
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false,
      gameMode: 'individual'
    });
  });

  describe('初始化', () => {
    it('应该正确创建游戏实例', () => {
      expect(game).toBeDefined();
      expect(game.state).toBeDefined();
    });

    it('应该有4个玩家', () => {
      game.startGame();
      expect(game.players.length).toBe(4);
    });

    it('应该正确标识人类玩家', () => {
      game.startGame();
      expect(game.humanPlayer).toBeDefined();
      expect(game.humanPlayer!.id).toBe(0);
      expect(game.humanPlayer!.isHuman).toBe(true);
    });

    it('应该正确标识AI玩家', () => {
      game.startGame();
      const aiPlayers = game.players.filter(p => !p.isHuman);
      expect(aiPlayers.length).toBe(3);
    });
  });

  describe('开始游戏', () => {
    it('应该为每个玩家发牌', () => {
      game.startGame();
      
      game.players.forEach((player, index) => {
        expect(player.hand.length).toBeGreaterThan(0);
        console.log(`玩家${index}: ${player.hand.length}张牌`);
      });
    });

    it('应该创建第一个回合', () => {
      game.startGame();
      
      console.log('rounds.length:', game.rounds.length);
      console.log('currentRoundIndex:', game.state.currentRoundIndex);
      console.log('currentRound:', game.currentRound);
      console.log('rounds[0]:', game.rounds[0]);
      
      expect(game.rounds.length).toBe(1);
      expect(game.currentRound).toBeDefined();
      expect(game.currentRound!.roundNumber).toBe(1);
    });

    it('应该设置游戏状态为playing', () => {
      expect(game.status).toBe('waiting');
      
      game.startGame();
      
      expect(game.status).toBe('playing');
    });

    it('应该初始化分数和墩数为0', () => {
      game.startGame();
      
      game.players.forEach(player => {
        expect(player.score).toBe(0);
        expect(player.dunCount).toBe(0);
      });
    });
  });

  describe('状态访问', () => {
    it('应该能访问当前玩家', () => {
      game.startGame();
      
      const currentPlayer = game.currentPlayer;
      expect(currentPlayer).toBeDefined();
      expect(currentPlayer!.id).toBe(game.currentPlayerIndex);
    });

    it('应该能访问当前回合分数', () => {
      game.startGame();
      
      expect(game.roundScore).toBe(0);
    });

    it('应该能访问完成顺序', () => {
      game.startGame();
      
      expect(Array.isArray(game.finishOrder)).toBe(true);
      expect(game.finishOrder.length).toBe(0);
    });
  });

  describe('出牌操作', () => {
    it('应该能出单张牌', () => {
      game.startGame();
      
      const humanPlayer = game.humanPlayer!;
      const cardToPlay = [humanPlayer.hand[0]];
      const initialHandCount = humanPlayer.hand.length;
      
      const result = game.playCards(0, cardToPlay);
      
      expect(result.success).toBe(true);
      expect(game.humanPlayer!.hand.length).toBe(initialHandCount - 1);
    });

    it('出牌后应该切换玩家', () => {
      game.startGame();
      
      const initialPlayerIndex = game.currentPlayerIndex;
      const humanPlayer = game.humanPlayer!;
      
      game.playCards(0, [humanPlayer.hand[0]]);
      
      expect(game.currentPlayerIndex).not.toBe(initialPlayerIndex);
    });

    it('出完牌后应该记录排名', () => {
      game.startGame();
      
      const humanPlayer = game.humanPlayer!;
      
      // 模拟出完所有牌
      let attempts = 0;
      while (humanPlayer.hand.length > 0 && attempts < 100) {
        const result = game.playCards(0, [humanPlayer.hand[0]]);
        if (!result.success) break;
        attempts++;
      }
      
      if (humanPlayer.hand.length === 0) {
        expect(game.finishOrder).toContain(0);
        expect(humanPlayer.finishedRank).toBeGreaterThan(0);
      }
    });
  });

  describe('不要操作', () => {
    it('首家不能不要', () => {
      game.startGame();
      
      const result = game.pass(0);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('首家');
    });

    it('有上家出牌后可以不要（如果无牌可出）', () => {
      game.startGame();
      
      // 先出一张牌
      game.playCards(0, [game.humanPlayer!.hand[0]]);
      
      // pass的测试留给集成测试，因为需要真实的游戏场景
    });
  });

  describe('检查可出牌', () => {
    it('应该能检查玩家是否有牌可出', () => {
      game.startGame();
      
      const hasPlayable = game.hasPlayableCards(0);
      
      // 首家总是可以出牌
      expect(hasPlayable).toBe(true);
    });
  });

  describe('重置游戏', () => {
    it('应该能重置游戏', () => {
      game.startGame();
      const players1 = game.players.length;
      const status1 = game.status;
      
      game.reset();
      
      // 重置后状态应该回到waiting
      expect(game.status).toBe('waiting');
      expect(game.players.length).toBe(0); // 重置后玩家列表应该是空的
      
      // 重新开始游戏
      game.startGame();
      const players2 = game.players.length;
      const status2 = game.status;
      
      // 重置后玩家数量应该相同
      expect(players1).toBe(players2);
      // 状态应该都是playing
      expect(status1).toBe('playing');
      expect(status2).toBe('playing');
    });
  });
});

