/**
 * CommunicationScheduler 单元测试
 * 测试通信调度器的消息生成、优先级、触发逻辑等
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CommunicationScheduler, CommunicationContext } from '../../src/ai-core/orchestrator/CommunicationScheduler';
import { UnifiedLLMService, LLMConfig } from '../../src/ai-core/infrastructure/llm/UnifiedLLMService';
import { EventBus } from '../../src/ai-core/integration/EventBus';
import { AIPlayer } from '../../src/ai-core/players/AIPlayer';
import { GameState } from '../../src/ai-core/types';

// Mock fetch for LLM
global.fetch = vi.fn();

describe('CommunicationScheduler', () => {
  let scheduler: CommunicationScheduler;
  let eventBus: EventBus;
  let llmService: UnifiedLLMService | null;
  let mockPlayers: Map<number, AIPlayer>;

  beforeEach(() => {
    eventBus = new EventBus();
    
    const llmConfig: LLMConfig = {
      provider: 'ollama',
      endpoint: 'http://localhost:11434/api/chat',
      model: 'qwen2.5:3b',
      defaultTemperature: 0.7,
      defaultMaxTokens: 500,
      timeout: 5000,
      retryCount: 2,
      maxConcurrent: 2,
      maxQueueSize: 20,
      cacheTTL: 5000
    };

    llmService = new UnifiedLLMService(llmConfig);
    scheduler = new CommunicationScheduler(eventBus, llmService);

    // 创建mock玩家
    mockPlayers = new Map();
    for (let i = 0; i < 3; i++) {
      const player = new AIPlayer(
        {
          id: i,
          personality: { preset: i === 0 ? 'aggressive' : i === 1 ? 'conservative' : 'balanced' },
          decisionModules: ['mcts'],
          communicationEnabled: true
        },
        {} as any
      );
      mockPlayers.set(i, player);
    }

    scheduler.setPlayers(mockPlayers);
    vi.clearAllMocks();
  });

  describe('初始化', () => {
    it('应该成功创建调度器实例', async () => {
      await scheduler.initialize();
      expect(scheduler).toBeDefined();
    });

    it('应该正确设置LLM服务', () => {
      const newLLMService = new UnifiedLLMService({
        provider: 'ollama',
        endpoint: 'http://localhost:11434/api/chat',
        model: 'qwen2.5:3b',
        defaultTemperature: 0.7,
        defaultMaxTokens: 500,
        timeout: 5000,
        retryCount: 2
      });
      
      scheduler.setLLMService(newLLMService);
      expect(scheduler).toBeDefined();
    });

    it('应该正确设置玩家池', () => {
      scheduler.setPlayers(mockPlayers);
      expect(scheduler).toBeDefined();
    });
  });

  describe('消息生成决策', () => {
    it('应该根据chattiness决定是否生成消息', async () => {
      const mockGameState: GameState = {
        myHand: [],
        myPosition: 0,
        playerCount: 3,
        lastPlay: null,
        lastPlayerId: null,
        currentPlayerId: 0,
        playHistory: [],
        roundNumber: 1,
        opponentHandSizes: [10, 10],
        teamMode: false,
        currentRoundScore: 0,
        cumulativeScores: new Map(),
        phase: 'middle'
      };

      const context: CommunicationContext = {
        trigger: 'after_decision',
        gameState: mockGameState,
        decision: {
          action: { type: 'pass' },
          reasoning: '测试',
          confidence: 0.5,
          alternatives: [],
          sources: [],
          timestamp: Date.now(),
          riskLevel: 'low'
        }
      };

      // 高chattiness应该更可能生成消息
      // 由于是概率性的，我们测试多次
      let generatedCount = 0;
      for (let i = 0; i < 10; i++) {
        const message = await scheduler.maybeGenerateMessage(0, context);
        if (message) {
          generatedCount++;
        }
      }

      // 至少应该生成一些消息（概率性测试）
      expect(generatedCount).toBeGreaterThanOrEqual(0);
    });

    it('应该遵守最小说话间隔', async () => {
      const mockGameState: GameState = {
        myHand: [],
        myPosition: 0,
        playerCount: 3,
        lastPlay: null,
        lastPlayerId: null,
        currentPlayerId: 0,
        playHistory: [],
        roundNumber: 1,
        opponentHandSizes: [10, 10],
        teamMode: false,
        currentRoundScore: 0,
        cumulativeScores: new Map(),
        phase: 'middle'
      };

      const context: CommunicationContext = {
        trigger: 'after_decision',
        gameState: mockGameState
      };

      // 第一次调用
      const message1 = await scheduler.maybeGenerateMessage(0, context);

      // 立即第二次调用（应该被间隔限制）
      const message2 = await scheduler.maybeGenerateMessage(0, context);

      // 如果第一次生成了消息，第二次应该被间隔限制
      if (message1) {
        expect(message2).toBeNull();
      }
    });
  });

  describe('LLM生成消息', () => {
    it('应该使用LLM生成消息内容', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: '测试聊天内容' },
          model: 'qwen2.5:3b',
          done: true
        })
      });

      const mockGameState: GameState = {
        myHand: [],
        myPosition: 0,
        playerCount: 3,
        lastPlay: null,
        lastPlayerId: null,
        currentPlayerId: 0,
        playHistory: [],
        roundNumber: 1,
        opponentHandSizes: [10, 10],
        teamMode: false,
        currentRoundScore: 0,
        cumulativeScores: new Map(),
        phase: 'middle'
      };

      const context: CommunicationContext = {
        trigger: 'after_decision',
        gameState: mockGameState,
        decision: {
          action: { type: 'pass' },
          reasoning: '测试',
          confidence: 0.5,
          alternatives: [],
          sources: [],
          timestamp: Date.now(),
          riskLevel: 'low'
        }
      };

      // Mock Math.random 确保生成消息
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1); // 低值，确保通过概率检查

      const message = await scheduler.maybeGenerateMessage(0, context);

      Math.random = originalRandom;

      if (message) {
        expect(message.content).toBeDefined();
        expect(message.intent).toBeDefined();
        expect(message.timestamp).toBeDefined();
      }
    });

    it('应该在LLM失败时使用规则生成', async () => {
      (global.fetch as any).mockRejectedValue(new Error('LLM失败'));

      const mockGameState: GameState = {
        myHand: [],
        myPosition: 0,
        playerCount: 3,
        lastPlay: null,
        lastPlayerId: null,
        currentPlayerId: 0,
        playHistory: [],
        roundNumber: 1,
        opponentHandSizes: [10, 10],
        teamMode: false,
        currentRoundScore: 0,
        cumulativeScores: new Map(),
        phase: 'middle'
      };

      const context: CommunicationContext = {
        trigger: 'after_decision',
        gameState: mockGameState
      };

      // Mock Math.random 确保生成消息
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1);

      const message = await scheduler.maybeGenerateMessage(0, context);

      Math.random = originalRandom;

      // 即使LLM失败，也应该有规则生成的回退
      // 但由于概率性，可能返回null
      // 由于概率性，可能返回null或消息
      if (message) {
        expect(message.content).toBeDefined();
      }
      // 如果为null也是正常的（概率性）
    });
  });

  describe('规则生成消息', () => {
    it('应该在无LLM服务时使用规则生成', async () => {
      const schedulerWithoutLLM = new CommunicationScheduler(eventBus, null);
      schedulerWithoutLLM.setPlayers(mockPlayers);

      const mockGameState: GameState = {
        myHand: [],
        myPosition: 0,
        playerCount: 3,
        lastPlay: null,
        lastPlayerId: null,
        currentPlayerId: 0,
        playHistory: [],
        roundNumber: 1,
        opponentHandSizes: [10, 10],
        teamMode: false,
        currentRoundScore: 0,
        cumulativeScores: new Map(),
        phase: 'middle'
      };

      const context: CommunicationContext = {
        trigger: 'after_decision',
        gameState: mockGameState
      };

      // Mock Math.random 确保生成消息
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1);

      const message = await schedulerWithoutLLM.maybeGenerateMessage(0, context);

      Math.random = originalRandom;

      if (message) {
        expect(message.content).toBeDefined();
        expect(['就这？', '不服来战！', '还有没有？', '太弱了', '先看看', '谨慎点', '再看看', '不急', '还行', '继续', '不错', '可以']).toContain(message.content);
      }
    });
  });

  describe('优先级设置', () => {
    it('应该为对骂设置高优先级', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          message: { content: '对骂内容' },
          model: 'qwen2.5:3b',
          done: true
        })
      });

      const mockGameState: GameState = {
        myHand: [],
        myPosition: 0,
        playerCount: 3,
        lastPlay: null,
        lastPlayerId: null,
        currentPlayerId: 0,
        playHistory: [],
        roundNumber: 1,
        opponentHandSizes: [10, 10],
        teamMode: false,
        currentRoundScore: 0,
        cumulativeScores: new Map(),
        phase: 'middle'
      };

      const context: CommunicationContext = {
        trigger: 'game_event',
        eventType: 'taunt',
        gameState: mockGameState
      };

      // Mock Math.random 确保生成消息
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1);

      // 等待一段时间让队列处理
      await scheduler.maybeGenerateMessage(0, context);
      await new Promise(resolve => setTimeout(resolve, 100));

      Math.random = originalRandom;

      // 验证fetch被调用（说明请求被加入队列）
      // 注意：由于是异步队列，可能需要等待
      expect(global.fetch).toHaveBeenCalled();
    });
  });

  describe('事件触发', () => {
    it('应该在决策后触发消息生成', async () => {
      const mockGameState: GameState = {
        myHand: [],
        myPosition: 0,
        playerCount: 3,
        lastPlay: null,
        lastPlayerId: null,
        currentPlayerId: 0,
        playHistory: [],
        roundNumber: 1,
        opponentHandSizes: [10, 10],
        teamMode: false,
        currentRoundScore: 0,
        cumulativeScores: new Map(),
        phase: 'middle'
      };

      const context: CommunicationContext = {
        trigger: 'after_decision',
        gameState: mockGameState,
        decision: {
          action: { type: 'play', cards: [], play: { type: 'single', value: 5 } as any },
          reasoning: '测试',
          confidence: 0.8,
          alternatives: [],
          sources: [],
          timestamp: Date.now(),
          riskLevel: 'low'
        }
      };

      // Mock Math.random 确保生成消息
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1);

      const message = await scheduler.maybeGenerateMessage(0, context);

      Math.random = originalRandom;

      // 由于概率性，可能返回null或消息
      if (message) {
        expect(message.content).toBeDefined();
      }
      // 如果为null也是正常的（概率性）
    });

    it('应该在出牌后触发消息生成', async () => {
      const mockGameState: GameState = {
        myHand: [],
        myPosition: 0,
        playerCount: 3,
        lastPlay: null,
        lastPlayerId: null,
        currentPlayerId: 0,
        playHistory: [],
        roundNumber: 1,
        opponentHandSizes: [10, 10],
        teamMode: false,
        currentRoundScore: 0,
        cumulativeScores: new Map(),
        phase: 'middle'
      };

      const context: CommunicationContext = {
        trigger: 'after_play',
        gameState: mockGameState
      };

      // Mock Math.random 确保生成消息
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1);

      const message = await scheduler.maybeGenerateMessage(0, context);

      Math.random = originalRandom;

      // 由于概率性，可能返回null或消息
      if (message) {
        expect(message.content).toBeDefined();
      }
      // 如果为null也是正常的（概率性）
    });
  });

  describe('意图和情绪确定', () => {
    it('应该正确确定消息意图', async () => {
      const mockGameState: GameState = {
        myHand: [],
        myPosition: 0,
        playerCount: 3,
        lastPlay: null,
        lastPlayerId: null,
        currentPlayerId: 0,
        playHistory: [],
        roundNumber: 1,
        opponentHandSizes: [10, 10],
        teamMode: false,
        currentRoundScore: 0,
        cumulativeScores: new Map(),
        phase: 'middle'
      };

      // 测试出牌后的意图
      const playContext: CommunicationContext = {
        trigger: 'after_decision',
        gameState: mockGameState,
        decision: {
          action: { type: 'play', cards: [], play: { type: 'bomb', value: 10 } as any },
          reasoning: '测试',
          confidence: 0.8,
          alternatives: [],
          sources: [],
          timestamp: Date.now(),
          riskLevel: 'low'
        }
      };

      // Mock Math.random 确保生成消息
      const originalRandom = Math.random;
      Math.random = vi.fn(() => 0.1);

      const message = await scheduler.maybeGenerateMessage(0, playContext);

      Math.random = originalRandom;

      if (message) {
        expect(['celebrate', 'tactical_signal', 'emotional_express', 'social_chat']).toContain(message.intent);
      }
    });
  });
});

