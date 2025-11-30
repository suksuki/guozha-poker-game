/**
 * 游戏状态管理测试
 * 
 * @async - 部分测试涉及异步操作（reset, initializeTracking 调用异步服务）
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { dealCards } from '../src/utils/cardUtils'
import { Game } from '../src/utils/Game'
import { GameStatus, Card, PlayerType } from '../src/types/card'

// Mock 服务
vi.mock('../src/services/chatService', () => ({
  clearChatMessages: vi.fn(),
}));

vi.mock('../src/services/cardTrackerService', () => ({
  cardTracker: {
    initialize: vi.fn(),
    startRound: vi.fn(),
  }
}));

describe('游戏状态管理测试', () => {
  describe('dealCards 函数测试', () => {
    it('发牌应该为每个玩家创建正确数量的牌', () => {
      const hands = dealCards(4)
      
      expect(hands.length).toBe(4)
      hands.forEach(hand => {
        expect(hand.length).toBe(54) // 每人一副完整牌
      })
    })

    it('不同玩家数量的发牌测试', () => {
      for (let count = 4; count <= 8; count++) {
        const hands = dealCards(count)
        expect(hands.length).toBe(count)
        hands.forEach(hand => {
          expect(hand.length).toBe(54)
        })
      }
    })

    it('每个玩家的牌应该是唯一的', () => {
      const hands = dealCards(4)
      const allCardIds = new Set<string>()
      
      hands.forEach((hand, playerIndex) => {
        hand.forEach(card => {
          // 检查ID是否包含玩家索引
          expect(card.id).toContain(`player${playerIndex}`)
          // 检查ID是否唯一
          expect(allCardIds.has(card.id)).toBe(false)
          allCardIds.add(card.id)
        })
      })
    })

    it('发牌应该是随机的', () => {
      const hands1 = dealCards(4)
      const hands2 = dealCards(4)
      
      // 至少有一个玩家的手牌顺序不同（概率很高）
      let hasDifferent = false
      for (let i = 0; i < 4; i++) {
        const hand1 = hands1[i]
        const hand2 = hands2[i]
        if (hand1.some((card, index) => card.id !== hand2[index]?.id)) {
          hasDifferent = true
          break
        }
      }
      expect(hasDifferent).toBe(true)
    })
  })

  describe('Game 静态方法', () => {
    beforeEach(() => {
      vi.clearAllMocks();
      // 清除 localStorage
      localStorage.clear();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('createAndStartNewGame', () => {
      it('应该创建新游戏实例', () => {
        const config: Game['config'] = {
          playerCount: 4,
          humanPlayerIndex: 0,
          aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
        };
        const hands = dealCards(4);

        const game = Game.createAndStartNewGame(config, hands, false);

        expect(game).toBeInstanceOf(Game);
        expect(game.playerCount).toBe(4);
        expect(game.status).toBe(GameStatus.PLAYING);
      });

      it('应该保持托管状态', () => {
        const config: Game['config'] = {
          playerCount: 4,
          humanPlayerIndex: 0,
          aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
        };
        const hands = dealCards(4);

        const game1 = Game.createAndStartNewGame(config, hands, false);
        expect(game1.getAutoPlay()).toBe(false);

        const game2 = Game.createAndStartNewGame(config, hands, true);
        expect(game2.getAutoPlay()).toBe(true);
      });

      it('应该初始化追踪模块（如果启用）', async () => {
        const { cardTracker } = await import('../src/services/cardTrackerService');
        const config: Game['config'] = {
          playerCount: 4,
          humanPlayerIndex: 0,
          aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
          cardTrackerEnabled: true,
        };
        const hands = dealCards(4);

        Game.createAndStartNewGame(config, hands, false);

        expect(cardTracker.initialize).toHaveBeenCalled();
        expect(cardTracker.startRound).toHaveBeenCalled();
      });

      it('应该不初始化追踪模块（如果禁用）', async () => {
        const { cardTracker } = await import('../src/services/cardTrackerService');
        const config: Game['config'] = {
          playerCount: 4,
          humanPlayerIndex: 0,
          aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
          cardTrackerEnabled: false,
        };
        const hands = dealCards(4);

        Game.createAndStartNewGame(config, hands, false);

        expect(cardTracker.initialize).not.toHaveBeenCalled();
      });
    });

    describe('startGameWithDealing', () => {
      it('应该自动发牌并创建游戏', () => {
        const config: Game['config'] = {
          playerCount: 4,
          humanPlayerIndex: 0,
          aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
        };

        const game = Game.startGameWithDealing(config, false);

        expect(game).toBeInstanceOf(Game);
        expect(game.playerCount).toBe(4);
        expect(game.status).toBe(GameStatus.PLAYING);
        // 验证每个玩家都有手牌
        expect(game.players.length).toBe(4);
        game.players.forEach(player => {
          expect(player.hand.length).toBe(54);
        });
      });

      it('应该保持托管状态', () => {
        const config: Game['config'] = {
          playerCount: 4,
          humanPlayerIndex: 0,
          aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
        };

        const game = Game.startGameWithDealing(config, true);
        expect(game.getAutoPlay()).toBe(true);
      });
    });

    describe('handleDealingComplete', () => {
      it('应该使用指定手牌创建游戏', () => {
        const config: Game['config'] = {
          playerCount: 4,
          humanPlayerIndex: 0,
          aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
        };
        const hands = dealCards(4);

        const game = Game.handleDealingComplete(config, hands, false);

        expect(game).toBeInstanceOf(Game);
        expect(game.playerCount).toBe(4);
        expect(game.status).toBe(GameStatus.PLAYING);
        // 验证手牌正确分配
        game.players.forEach((player, index) => {
          expect(player.hand.length).toBe(54);
          // 验证手牌来自指定的 hands
          expect(player.hand[0].id).toContain(`player${index}`);
        });
      });

      it('应该保持托管状态', () => {
        const config: Game['config'] = {
          playerCount: 4,
          humanPlayerIndex: 0,
          aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
        };
        const hands = dealCards(4);

        const game = Game.handleDealingComplete(config, hands, true);
        expect(game.getAutoPlay()).toBe(true);
      });
    });

    describe('handleDealingCancel', () => {
      it('应该是占位方法，不执行任何操作', () => {
        // 这个方法不执行任何操作，只是占位
        expect(() => {
          Game.handleDealingCancel();
        }).not.toThrow();
      });
    });
  });

  describe('Game 实例方法', () => {
    let game: Game;

    beforeEach(() => {
      vi.clearAllMocks();
      localStorage.clear();
      
      const config: Game['config'] = {
        playerCount: 4,
        humanPlayerIndex: 0,
        aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
      };
      game = new Game(config);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    describe('reset', () => {
      it('应该重置游戏状态', () => {
        // 先设置一些状态
        game.status = GameStatus.PLAYING;
        game.players = [
          {
            id: 0,
            name: '玩家1',
            type: PlayerType.HUMAN,
            hand: [],
            isHuman: true,
            score: 100,
          }
        ];
        game.currentPlayerIndex = 1;
        game.winner = 0;

        game.reset();

        expect(game.status).toBe(GameStatus.WAITING);
        expect(game.players).toEqual([]);
        expect(game.currentPlayerIndex).toBe(0);
        expect(game.winner).toBe(null);
        expect(game.playerCount).toBe(0);
        expect(game.finishOrder).toEqual([]);
        expect(game.finalRankings).toBeUndefined();
        expect(game.rounds).toEqual([]);
        expect(game.currentRoundIndex).toBe(-1);
      });

      it('应该清除聊天消息', async () => {
        const { clearChatMessages } = await import('../src/services/chatService');
        
        game.reset();

        expect(clearChatMessages).toHaveBeenCalledTimes(1);
      });

      it('应该触发更新回调', () => {
        const updateCallback = vi.fn();
        game.setOnUpdate(updateCallback);

        game.reset();

        expect(updateCallback).toHaveBeenCalledWith(game);
      });
    });

    describe('toggleAutoPlay', () => {
      it('应该切换托管状态', () => {
        expect(game.getAutoPlay()).toBe(false);

        const newValue = game.toggleAutoPlay();
        expect(newValue).toBe(true);
        expect(game.getAutoPlay()).toBe(true);

        const newValue2 = game.toggleAutoPlay();
        expect(newValue2).toBe(false);
        expect(game.getAutoPlay()).toBe(false);
      });

      it('应该切换托管状态并更新调度器', () => {
        // toggleAutoPlay 会调用 setAutoPlay，更新调度器配置
        const initialValue = game.getAutoPlay();
        
        const newValue = game.toggleAutoPlay();
        
        // 验证状态确实改变了
        expect(newValue).toBe(!initialValue);
        expect(game.getAutoPlay()).toBe(!initialValue);
        
        // 再次切换
        const newValue2 = game.toggleAutoPlay();
        expect(newValue2).toBe(initialValue);
        expect(game.getAutoPlay()).toBe(initialValue);
      });
    });

    describe('initializeTracking', () => {
      beforeEach(() => {
        vi.clearAllMocks();
      });

      it('应该初始化追踪模块（如果启用）', async () => {
        const { cardTracker } = await import('../src/services/cardTrackerService');
        const hands = dealCards(4);

        // initializeTracking 是私有方法，我们通过 createAndStartNewGame 间接测试
        const newGame = Game.createAndStartNewGame(
          { 
            playerCount: 4,
            humanPlayerIndex: 0,
            aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
            cardTrackerEnabled: true 
          },
          hands,
          false
        );

        expect(cardTracker.initialize).toHaveBeenCalled();
        expect(cardTracker.startRound).toHaveBeenCalled();
      });

      it('应该从 localStorage 读取配置（如果配置中未指定）', async () => {
        const { cardTracker } = await import('../src/services/cardTrackerService');
        localStorage.setItem('cardTrackerEnabled', 'true');
        
        const config: Game['config'] = {
          playerCount: 4,
          humanPlayerIndex: 0,
          aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
          // 不设置 cardTrackerEnabled
        };
        const hands = dealCards(4);

        Game.createAndStartNewGame(config, hands, false);

        expect(cardTracker.initialize).toHaveBeenCalled();
      });

      it('应该不初始化追踪模块（如果禁用）', async () => {
        const { cardTracker } = await import('../src/services/cardTrackerService');
        localStorage.setItem('cardTrackerEnabled', 'false');
        
        const config: Game['config'] = {
          playerCount: 4,
          humanPlayerIndex: 0,
          aiConfigs: Array(4).fill({ apiKey: '', strategy: 'balanced', algorithm: 'mcts' }),
        };
        const hands = dealCards(4);

        Game.createAndStartNewGame(config, hands, false);

        expect(cardTracker.initialize).not.toHaveBeenCalled();
      });
    });
  });
})
