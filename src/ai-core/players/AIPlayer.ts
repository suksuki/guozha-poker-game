import { GameState, Decision, AIPlayerConfig, PersonalityConfig, GameAction } from '../types';
import { UnifiedLLMService, ToolDefinition } from '../infrastructure/llm/UnifiedLLMService';
import { PlayCardTool, PassTurnTool } from '../mcp-schema';
import { Card, Rank, Suit, CardType } from '../../types/card';

// Define the shape of sharedResources based on MasterAIBrain usage
interface SharedResources {
  sharedCognitive: any;
  knowledgeBase: any;
  llmService?: UnifiedLLMService;
}

/**
 * AI玩家
 */
export class AIPlayer {
  private config: AIPlayerConfig;
  private sharedResources: SharedResources;
  private initialized: boolean = false;
  private hybridStrategy: any = null; // Dynamically loaded strategy
  private cardUtils: any = null;

  constructor(config: AIPlayerConfig, sharedResources: any) {
    this.config = config;
    this.sharedResources = sharedResources as SharedResources;
  }

  /**
   * 初始化
   */
  async initialize(): Promise<void> {
    // 可以在这里预热 LLM 或加载特定策略
    this.initialized = true;
  }

  /**
   * 做决策 (Use Tool Calling)
   */
  /**
   * 做决策 (Use Tool Calling)
   */
  async makeDecision(gameState: GameState, cognitive: any): Promise<Decision> {

    // 0. 检查决策模块配置
    // 如果配置了 hybrid 或 mcts，优先使用策略引擎
    if (this.config.decisionModules.includes('hybrid') || this.config.decisionModules.includes('mcts')) {
      return this.makeStrategicDecision(gameState, cognitive);
    }

    // Legacy LLM-only path (Minimal fallback)
    return this.createPassDecision("Fallback: Module disabled");
  }
  /**
   * 使用策略引擎（MCTS/Hybrid）做决策
   */
  private async makeStrategicDecision(gameState: GameState, cognitive: any): Promise<Decision> {
    // 实例化策略和工具
    if (!this.hybridStrategy && this.sharedResources.llmService) {
      const { HybridStrategy } = await import('../../ai/strategy/HybridStrategy');
      this.hybridStrategy = new HybridStrategy(this.sharedResources.llmService);
    }

    if (!this.cardUtils) {
      this.cardUtils = await import('../../utils/cardUtils');
    }

    if (!this.hybridStrategy) {
      return this.createPassDecision("Strategy Engine not ready");
    }

    try {
      // 1. 状态重构 (Determinization)
      const simulatedState = this.reconstructSimulatedState(gameState);

      // 2. 加载配置（根据游戏模式）
      const { AIConfigStore } = await import('../../ai/config/AIConfigStore');
      const isTeamMode = gameState.teamMode ?? true;
      const storedConfig = AIConfigStore.loadConfig(isTeamMode);

      // 3. 调用策略引擎
      const cards = await this.hybridStrategy.choosePlay(
        gameState.myHand,
        gameState.lastPlay,
        { strategy: this.config.personality.preset as any },
        {
          state: simulatedState,
          teamConfig: { ...storedConfig, teamMode: gameState.teamMode },
          personality: this.config.personality,
          activeIntents: cognitive.activeIntents
        }
      );

      // 4. 转换结果
      if (cards && cards.length > 0) {
        const play = this.cardUtils.canPlayCards(cards);
        if (play) {
          return {
            action: { type: 'play', cards, play },
            reasoning: "Strategic decision via Hybrid MCTS",
            confidence: 0.9,
            alternatives: [],
            sources: [],
            timestamp: Date.now(),
            riskLevel: "medium"
          };
        }
      }

      return this.createPassDecision("Strategic pass");

    } catch (error) {
      console.error(`[AIPlayer-${this.config.id}] Strategy error:`, error);
      return this.createPassDecision("Strategy execution error");
    }
  }

  /**
   * 重构模拟状态 (极简 Determinization)
   */
  private reconstructSimulatedState(gameState: GameState): any {
    const { playerCount, myPosition, myHand, lastPlay, lastPlayerId, currentPlayerId, teamMode, currentRoundScore, opponentHandSizes, cumulativeScores } = gameState;

    // 1. 构建所有玩家的手牌 (模拟)
    const allHands: Card[][] = Array.from({ length: playerCount }, () => []);
    allHands[myPosition] = [...myHand];

    // 2. 估计对手手牌 (Determinization)
    let opponentIdx = 0;
    for (let i = 0; i < playerCount; i++) {
      if (i === myPosition) continue;

      const handSize = opponentHandSizes[opponentIdx++] || 0;
      for (let j = 0; j < handSize; j++) {
        allHands[i].push({
          suit: Suit.SPADES,
          rank: Rank.THREE,
          id: `simulated-${i}-${j}`
        });
      }
    }

    // 3. 构建 TeamSimulatedGameState
    return {
      aiHand: [...myHand],
      allHands,
      opponentHands: allHands.filter((_, idx) => idx !== myPosition),
      lastPlay,
      lastPlayPlayerIndex: lastPlayerId,
      currentPlayerIndex: currentPlayerId,
      playerCount,
      roundScore: currentRoundScore,
      aiScore: cumulativeScores.get(myPosition) || 0,
      isTerminal: false,
      winner: null,
      perfectInformation: false,
      teamMode,
      teamScores: new Map(),
      playerTeams: new Map(Array.from({ length: playerCount }, (_, i) => [i, i % 2])),
      canPass: true,
      roundContext: {
        roundNumber: gameState.roundNumber,
        roundScore: currentRoundScore,
        expectedTeamBenefit: 0,
        strategicPassOpportunity: true
      }
    };
  }

  private buildDecisionPrompt(gameState: GameState, cognitive: any): string {
    const myHandCodes = gameState.myHand.map(c => this.cardToCode(c)).join(', ');

    let lastPlayDesc = "None (You are first)";
    if (gameState.lastPlay) {
      const type = gameState.lastPlay.type;
      const value = gameState.lastPlay.value;
      const cardsCodes = gameState.lastPlay.cards.map(c => this.cardToCode(c)).join(',');
      lastPlayDesc = `${type} [${cardsCodes}] (Value: ${value})`;
    }

    return `Current Game State:
- Your Hand: [${myHandCodes}]
- Hand Count: ${gameState.myHand.length} cards
- Last Play to Beat: ${lastPlayDesc}
- Phase: ${gameState.phase}
- Your Personality: ${this.config.personality.preset}

Task: Decide whether to play cards or pass.
- Analyze your hand and the last play.
- If you play, use 'play_card' tool.
  - 'cards': Array of EXACT codes from your hand (e.g. ["3H", "4D"]).
  - 'combinationType': 'single', 'pair', 'triple', 'straight', 'bomb', 'dun', etc.
- If you pass, use 'pass_turn' tool.

Cognitive Hints: ${JSON.stringify(cognitive).substring(0, 200)}
`;
  }

  // --- Card Code Helpers ---

  private cardToCode(card: Card): string {
    if (card.suit === Suit.JOKER) {
      return card.rank === Rank.JOKER_SMALL ? 'Sj' : 'Bj';
    }

    let rankStr = '';
    switch (card.rank) {
      case Rank.JACK: rankStr = 'J'; break;
      case Rank.QUEEN: rankStr = 'Q'; break;
      case Rank.KING: rankStr = 'K'; break;
      case Rank.ACE: rankStr = 'A'; break;
      case Rank.TWO: rankStr = '2'; break;
      default: rankStr = card.rank.toString();
    }

    let suitStr = '';
    switch (card.suit) {
      case Suit.SPADES: suitStr = 'S'; break;
      case Suit.HEARTS: suitStr = 'H'; break;
      case Suit.DIAMONDS: suitStr = 'D'; break;
      case Suit.CLUBS: suitStr = 'C'; break;
    }

    return `${rankStr}${suitStr}`;
  }

  private findCardByCode(code: string, hand: Card[]): Card | null {
    const exact = hand.find(c => this.cardToCode(c) === code);
    if (exact) return exact;

    const lowerCode = code.toLowerCase();
    return hand.find(c => this.cardToCode(c).toLowerCase() === lowerCode) || null;
  }

  private mapPlayCardToDecision(args: any, gameState: GameState): Decision {
    const cardCodes = (args.cards || []) as string[];
    const selectedCards: Card[] = [];
    const hand = [...gameState.myHand];

    for (const code of cardCodes) {
      const card = this.findCardByCode(code, hand);
      if (card) {
        selectedCards.push(card);
        const idx = hand.findIndex(c => c.id === card.id);
        if (idx !== -1) hand.splice(idx, 1);
      }
    }

    if (selectedCards.length === 0) {
      return this.createPassDecision("Selected cards invalid or not found");
    }

    let type = CardType.SINGLE;
    if (args.combinationType) {
      type = args.combinationType as CardType;
    }

    const value = selectedCards[0]?.rank || 0;

    const action: GameAction = {
      type: 'play',
      cards: selectedCards,
      play: {
        type: type,
        cards: selectedCards,
        value: value
      }
    };

    return {
      action,
      reasoning: `AI Play: ${args.combinationType} [${cardCodes.join(',')}]`,
      confidence: 0.95,
      alternatives: [],
      sources: [],
      timestamp: Date.now(),
      riskLevel: "medium"
    };
  }

  private createPassDecision(reason: string): Decision {
    return {
      action: { type: 'pass' },
      reasoning: reason,
      confidence: 0.5,
      alternatives: [],
      sources: [],
      timestamp: Date.now(),
      riskLevel: 'low'
    };
  }

  getPersonality(): PersonalityConfig {
    return this.config.personality;
  }

  getStatistics(): any {
    return {
      id: this.config.id,
      personality: this.config.personality.preset,
      decisions: 0,
      communications: 0
    };
  }

  async shutdown(): Promise<void> {
    this.initialized = false;
  }
}

