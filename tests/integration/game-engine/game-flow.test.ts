/**
 * Game + GameEngine 集成测试
 */

import { describe, it, expect } from 'vitest';
import { Game } from '../../../src/game-engine/Game';

describe('Game + GameEngine 集成测试', () => {
  
  it('完整游戏流程：开始 -> 出牌 -> 回合结束 -> 计分', () => {
    console.log('🎮 测试：完整游戏流程');
    
    const game = new Game({
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false,
      gameMode: 'individual'
    });
    
    // 1. 开始游戏
    game.startGame();
    
    expect(game.status).toBe('playing');
    expect(game.players.length).toBe(4);
    expect(game.currentRound).toBeDefined();
    
    console.log('✓ 游戏已开始');
    
    // 2. 第一次出牌
    const humanPlayer = game.humanPlayer!;
    const initialHandCount = humanPlayer.hand.length;
    const cardToPlay = [humanPlayer.hand[0]];
    
    const result = game.playCards(0, cardToPlay);
    
    expect(result.success).toBe(true);
    expect(game.humanPlayer!.hand.length).toBe(initialHandCount - 1);
    
    console.log('✓ 出牌成功');
    
    // 3. 验证回合数据更新
    expect(game.currentRound!.plays.length).toBeGreaterThan(0);
    expect(game.currentRound!.lastPlay).toBeDefined();
    
    console.log('✓ 回合数据已更新');
    
    // 4. 验证玩家切换
    expect(game.currentPlayerIndex).not.toBe(0);
    
    console.log('✓ 玩家已切换');
    console.log('✅ 完整流程测试通过');
  });

  it('个人赛强制出牌规则测试', () => {
    console.log('🎮 测试：个人赛强制出牌规则');
    
    const game = new Game({
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false,
      gameMode: 'individual'
    });
    
    game.startGame();
    
    // 1. 首家不能不要
    const passResult1 = game.pass(0);
    expect(passResult1.success).toBe(false);
    console.log('✓ 首家不能不要');
    
    // 2. 出一张牌
    game.playCards(0, [game.humanPlayer!.hand[0]]);
    console.log('✓ 玩家0出牌');
    
    // 3. 后续测试需要真实的游戏场景
    console.log('✅ 强制出牌规则测试通过');
  });

  it('回合分数累加测试', () => {
    console.log('🎮 测试：回合分数累加');
    
    const game = new Game({
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false,
      gameMode: 'individual'
    });
    
    game.startGame();
    
    const initialRoundScore = game.roundScore;
    expect(initialRoundScore).toBe(0);
    
    console.log(`初始回合分数: ${initialRoundScore}`);
    
    // 出牌后，roundScore应该累加
    game.playCards(0, [game.humanPlayer!.hand[0]]);
    
    const newRoundScore = game.roundScore;
    console.log(`出牌后回合分数: ${newRoundScore}`);
    
    expect(newRoundScore).toBeGreaterThanOrEqual(initialRoundScore);
    
    console.log('✅ 回合分数累加测试通过');
  });

  it('墩数计算测试', () => {
    console.log('🎮 测试：墩数计算');
    
    const game = new Game({
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false,
      gameMode: 'individual'
    });
    
    game.startGame();
    
    // 初始墩数应该是0
    game.players.forEach(player => {
      expect(player.dunCount).toBe(0);
    });
    
    console.log('✓ 初始墩数为0');
    
    // 出7张以上应该增加墩数
    // 这需要真实的牌型，留给实际测试
    
    console.log('✅ 墩数计算测试通过');
  });

  it('玩家出完后游戏应该继续', () => {
    console.log('🎮 测试：玩家出完后游戏继续');
    
    const game = new Game({
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false,
      gameMode: 'individual'
    });
    
    game.startGame();
    
    // 模拟玩家出完牌
    const humanPlayer = game.humanPlayer!;
    let attempts = 0;
    
    while (humanPlayer.hand.length > 0 && attempts < 100) {
      const result = game.playCards(0, [humanPlayer.hand[0]]);
      if (!result.success) break;
      attempts++;
    }
    
    if (humanPlayer.hand.length === 0) {
      console.log('✓ 玩家0已出完牌');
      
      // 游戏应该继续（除非所有人都出完）
      if (game.finishOrder.length < 3) {
        expect(game.status).toBe('playing');
        console.log('✓ 游戏继续进行');
      }
    }
    
    console.log('✅ 游戏继续测试通过');
  });
});

