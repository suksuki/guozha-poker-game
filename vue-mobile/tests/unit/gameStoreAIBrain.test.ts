
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGameStore } from '../../src/stores/gameStore';
import { setActivePinia, createPinia } from 'pinia';
import { aiBrainIntegration } from '../../src/services/ai/aiBrainIntegration';
import { getAIRecommendation as getAIRecommendationUtil } from '../../src/utils/gameLogic';

// Mock dependencies
vi.mock('../../src/services/ai/aiBrainIntegration', () => ({
  aiBrainIntegration: {
    initialize: vi.fn(),
    onAIDecision: vi.fn(),
    generateHint: vi.fn(),
    onCommunicationMessage: vi.fn(),
    updateLLMConfig: vi.fn()
  }
}));

vi.mock('../../src/utils/gameLogic', () => ({
  getAIRecommendation: vi.fn()
}));

// Mock settings store (required by gameStore)
vi.mock('../../src/stores/settingsStore', () => ({
  useSettingsStore: vi.fn(() => ({
    llmConfig: {
      provider: 'ollama',
      apiUrl: 'http://localhost:11434',
      model: 'qwen2.5',
      temperature: 0.7,
      maxTokens: 100
    },
    voicePlaybackSettings: {
      enabled: false
    }
  }))
}));

// Mock audio service (to avoid errors in gameStore initialization)
vi.mock('../../src/services/tts/ttsPlaybackService', () => ({
  getTTSPlaybackService: vi.fn(() => ({
    speak: vi.fn().mockResolvedValue(undefined)
  }))
}));

describe('GameStore AI Brain Integration', () => {
  let gameStore: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    gameStore = useGameStore();

    // Reset mocks
    vi.clearAllMocks();

    // Mock game state
    gameStore.game = {
      status: 'playing',
      currentPlayerIndex: 0,
      humanPlayer: { id: 0, isHuman: true, hand: [], name: 'Human' },
      players: [
        { id: 0, isHuman: true, hand: [], name: 'Human' },
        { id: 1, isHuman: false, hand: [], name: 'AI 1' }
      ],
      currentRound: {
        lastPlay: null
      },
      state: {
        rounds: []
      },
      playCards: vi.fn(() => ({ success: true })),
      pass: vi.fn(() => ({ success: true })),
      hasPlayableCards: vi.fn(() => true)
    };
    gameStore.aiBrainInitialized = true;
  });

  describe('getAIRecommendation', () => {
    it('should use aiBrainIntegration.generateHint when initialized', async () => {
      // Mock AI Brain response
      const mockDecision = {
        action: {
          type: 'play',
          cards: [{ suit: 'hearts', rank: 3, id: 'h3' }]
        }
      };
      (aiBrainIntegration.generateHint as any).mockResolvedValue(mockDecision);

      const result = await gameStore.getAIRecommendation();

      expect(aiBrainIntegration.generateHint).toHaveBeenCalledWith(gameStore.game, 0);
      expect(result).toEqual({
        action: 'play',
        cards: mockDecision.action.cards
      });
    });

    it('should fallback to utility if AI Brain returns null', async () => {
      // Mock AI Brain response as null
      (aiBrainIntegration.generateHint as any).mockResolvedValue(null);

      // Mock utility response
      const mockUtilSuggestion = {
        cards: [{ suit: 'spades', rank: 4, id: 's4' }]
      };
      (getAIRecommendationUtil as any).mockReturnValue(mockUtilSuggestion);

      const result = await gameStore.getAIRecommendation();

      expect(aiBrainIntegration.generateHint).toHaveBeenCalled();
      expect(getAIRecommendationUtil).toHaveBeenCalled();
      expect(result).toEqual(mockUtilSuggestion);
    });

    it('should fallback to utility if AI Brain throws error', async () => {
      // Mock AI Brain error
      (aiBrainIntegration.generateHint as any).mockRejectedValue(new Error('AI Failed'));

      // Mock utility response
      const mockUtilSuggestion = {
        cards: [{ suit: 'diamonds', rank: 5, id: 'd5' }]
      };
      (getAIRecommendationUtil as any).mockReturnValue(mockUtilSuggestion);

      const result = await gameStore.getAIRecommendation();

      expect(aiBrainIntegration.generateHint).toHaveBeenCalled();
      expect(getAIRecommendationUtil).toHaveBeenCalled();
      expect(result).toEqual(mockUtilSuggestion);
    });
  });
});
