/**
 * Pinia游戏状态Store
 * 
 * ⚠️ 注意：已迁移至移动端独立Core
 * 
 * 标记：已迁移
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// 移动端独立Game类
import { Game } from '@/core/game-engine/Game';
// 移动端独立类型
import type { Card } from '@/core/types/card';
// 移动端独立AI策略
import { simpleAIStrategy } from '@/core/ai/simpleStrategy';
import { showToast } from 'vant';
import { aiBrainIntegration } from '../services/ai/aiBrainIntegration';
import { useSettingsStore } from './settingsStore';
import { getTTSPlaybackService } from '../services/tts/ttsPlaybackService';
import { playToSpeechText } from '../utils/playToSpeechText';
import { getAIRecommendation as getAIRecommendationUtil } from '../utils/gameLogic';
import type { Play } from '@/core/types/card';
// 移动端独立工具函数
import { canPlayCards } from '@/core/utils/cardUtils';
import { ChannelType } from '../types/channel';

export const useGameStore = defineStore('game', () => {
  // ========== 游戏对象（新架构！）==========
  const game = ref<Game | null>(null);
  const stateVersion = ref(0);

  const triggerUpdate = () => {
    stateVersion.value++;
  };

  // AI决策超时保护Map（存储每个玩家的超时定时器）
  const aiDecisionTimeouts = new Map<number, NodeJS.Timeout>();

  // 初始化
  // 已迁移到移动端独立Game类
  const initialize = (initConfig?: { teamMode?: boolean }) => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: initConfig?.teamMode || false,
      gameMode: (initConfig?.teamMode ? 'team' : 'individual') as 'individual' | 'team'
    };
    // 使用独立的Game类
    game.value = new Game(config);
    triggerUpdate();
  };

  // ========== 计算属性（通过Game访问，响应stateVersion）==========
  const gameState = computed(() => {
    stateVersion.value;
    return game.value?.state || null;
  });
  const status = computed(() => {
    stateVersion.value;
    return game.value?.status || 'waiting';
  });
  const currentPlayerIndex = computed(() => {
    stateVersion.value;
    return game.value?.currentPlayerIndex ?? 0;
  });
  const players = computed(() => {
    stateVersion.value;
    return game.value?.players || [];
  });

  const rounds = computed(() => {
    stateVersion.value;
    return game.value?.state.rounds || [];
  });
  const humanPlayer = computed(() => {
    stateVersion.value;
    return game.value?.humanPlayer || null;
  });
  const currentRound = computed(() => {
    stateVersion.value;
    return game.value?.currentRound || null;
  });
  const roundScore = computed(() => {
    stateVersion.value;
    return game.value?.roundScore || 0;
  });

  // ========== 游戏操作==========

  /**
    * 开始游戏
    */
  const startGame = async (config?: { teamMode?: boolean }) => {
    // 如果没有game实例或者提供了新的配置，重新初始化
    if (!game.value || config) {
      initialize(config);
    } else if (game.value.status === 'finished') {
      // 如果游戏已结束且没有新配置，重置游戏（复用当前配置）
      game.value.reset();
    }

    game.value!.startGame();
    triggerUpdate();

    // 初始化AI Brain（如果还没有初始化）
    if (!aiBrainInitialized.value) {
      await initializeAIBrain();
    }

    // 触发第一回合流程（处理语音播报和AI首家出牌）
    const initialPlayerIndex = game.value!.currentPlayerIndex;

    // 首回合直接触发下一位玩家操作（不需要报牌）
    const firstPlayer = game.value!.players[initialPlayerIndex];
    if (firstPlayer && !firstPlayer.isHuman) {
      // 首家是AI，稍微延迟后触发AI出牌（给UI渲染时间）
      setTimeout(() => {
        if (aiBrainInitialized.value && game.value) {
          aiBrainIntegration.triggerAITurn(initialPlayerIndex, game.value as any).catch(() => { });
        }
      }, 300);
    }
    // 如果首家是人类，等待人类操作
  };

  /**
   * 统一处理出牌/不要后的后续逻辑（报牌、AI反应、触发下一位）
   */
  const advanceGameFlow = (_actingPlayerId: number, actionType: 'play' | 'pass', cards?: Card[]) => {
    if (!game.value) return;

    // 1. 记录下一个玩家索引（在报牌完成前，下一个玩家还不能出牌）
    const nextPlayerIndex = game.value.currentPlayerIndex;
    const nextPlayer = game.value.players[nextPlayerIndex];

    // 定义"步骤完成"后的回调，确保无论是否播报语音，最终都会执行
    const onActionComplete = () => {
      if (!game.value) return;

      // 检查玩家是否已出完牌（不应该触发已完成玩家的操作）
      if (nextPlayer && nextPlayer.hand.length === 0) {
        return;
      }

      // 聊天逻辑已移至 ChatSchedulerService，此处只处理回合切换

      // (2) 触发下一个玩家的操作（事件驱动）
      if (nextPlayer && !nextPlayer.isHuman) {
        if (aiBrainInitialized.value) {
          // 清除之前的超时（如果有）
          const existingTimeout = aiDecisionTimeouts.get(nextPlayerIndex);
          if (existingTimeout) {
            clearTimeout(existingTimeout);
          }

          // 设置超时保护：35秒后如果还没收到决策，自动pass（比LLM超时30秒多5秒缓冲）
          const timeoutId = setTimeout(() => {
            if (game.value && game.value.currentPlayerIndex === nextPlayerIndex) {
              aiDecisionTimeouts.delete(nextPlayerIndex);
              pass(nextPlayerIndex).catch(() => { });
            } else {
              aiDecisionTimeouts.delete(nextPlayerIndex);
            }
          }, 35000);
          aiDecisionTimeouts.set(nextPlayerIndex, timeoutId);

          // 触发AI决策
          aiBrainIntegration.triggerAITurn(nextPlayerIndex, game.value as any).catch(() => {
            // 清除超时
            const timeout = aiDecisionTimeouts.get(nextPlayerIndex);
            if (timeout) {
              clearTimeout(timeout);
              aiDecisionTimeouts.delete(nextPlayerIndex);
            }
            // 如果触发失败，尝试自动pass以继续游戏
            pass(nextPlayerIndex).catch(() => { });
          });
        } else {
          // AI Brain未初始化，自动pass
          pass(nextPlayerIndex).catch(() => { });
        }
      } else if (nextPlayer && nextPlayer.isHuman && isAutoPlay.value) {
        setTimeout(() => {
          autoPlayTurn().catch(() => { });
        }, 600);
      }
    };

    // 2. 处理语音播报
    let speechText = '';
    if (actionType === 'pass') {
      speechText = '不要';
    } else if (cards && cards.length > 0) {
      const play = canPlayCards(cards);
      if (play) {
        speechText = playToSpeechText(play as any);
      }
    }

    const settingsStore = useSettingsStore();
    const voiceSettings = settingsStore.voicePlaybackSettings;

    if (speechText && voiceSettings.enabled) {
      try {
        const ttsService = getTTSPlaybackService();
        // 播报语音，在音频开始播放时推进流程（不等播完）
        ttsService.speak(speechText, {
          timeout: 4000,
          fallbackTimeout: 3000,
          priority: 4,
          channel: ChannelType.SYSTEM,
          onStart: () => {
            onActionComplete();
          },
          onError: () => {
            onActionComplete();
          }
        }).catch(() => {
          onActionComplete();
        });
      } catch (error) {
        onActionComplete();
      }
    } else {
      // 无需播报或未启用，直接推进
      onActionComplete();
    }
  };

  /**
   * 出牌
   * 移动端独立实现报牌功能，完全基于回调机制，不依赖老APP的报牌逻辑
   * @param cards 要出的牌
   * @param playerIndex 可选，指定出牌玩家。如果不传，默认使用currentPlayerIndex
   */
  const playCards = async (cards: Card[], playerIndex?: number) => {
    if (!game.value) return { success: false, message: '游戏未开始' };

    const actingPlayerIndex = playerIndex !== undefined ? playerIndex : currentPlayerIndex.value;

    // 1. 先执行出牌逻辑
    const result = game.value.playCards(actingPlayerIndex, cards);

    if (!result.success) {
      return result;
    }

    // 更新版本以触发响应式
    triggerUpdate();

    // 2. 发射游戏事件（供聊天调度器监听）
    const play = canPlayCards(cards);
    window.dispatchEvent(new CustomEvent('guozha:player-played', {
      detail: { playerId: actingPlayerIndex, cards, playType: play?.type }
    }));

    // 3. 推进游戏流程（异步处理语音和下一位）
    advanceGameFlow(actingPlayerIndex, 'play', cards);
    return { success: true };
  };

  /**
   * 不要
   * @param playerIndex 可选，指定玩家。如果不传，默认使用currentPlayerIndex
   */
  const pass = async (playerIndex?: number) => {
    if (!game.value) return { success: false, message: '游戏未开始' };

    const actingPlayerIndex = playerIndex !== undefined ? playerIndex : currentPlayerIndex.value;
    const result = game.value.pass(actingPlayerIndex);

    if (!result.success) {
      return result;
    }

    // 更新版本以触发响应式
    triggerUpdate();

    // 推进流程（包含"不要"的语音和下一位触发）
    advanceGameFlow(actingPlayerIndex, 'pass');
    // 发射游戏事件（供聊天调度器监听）
    window.dispatchEvent(new CustomEvent('guozha:player-passed', {
      detail: { playerId: actingPlayerIndex }
    }));

    return result;
  };

  // ========== AI功能==========

  /**
   * AI推荐（使用 gameLogic.ts 中的 getAIRecommendation，支持拆牌）
   * 优先尝试使用 AI Brain (MCTS) 获取更优解
   */
  const getAIRecommendation = async () => {
    if (!game.value || !humanPlayer.value) {
      return null;
    }

    // 1. 尝试使用 AI Brain
    if (aiBrainInitialized.value) {
      try {
        const decision = await aiBrainIntegration.generateHint(game.value as any, humanPlayer.value.id);
        if (decision && decision.action) {
          if (decision.action.type === 'play' || decision.action.type === 'play_card') {
            return {
              action: 'play',
              cards: decision.action.play?.cards || decision.action.cards || []
            };
          } else {
            return { action: 'pass', cards: [] };
          }
        }
      } catch (e) {
      }
    }

    // 2. 降级使用本地简单策略
    try {
      const lastPlayCards = currentRound.value?.lastPlay;
      let lastPlay: Play | null = null;

      // 将 lastPlayCards (Card[]) 转换为 Play 对象
      if (lastPlayCards && Array.isArray(lastPlayCards) && lastPlayCards.length > 0) {
        lastPlay = canPlayCards(lastPlayCards);
      }

      return getAIRecommendationUtil(humanPlayer.value.hand, lastPlay);
    } catch (error) {
      return null;
    }
  };

  /**
   * AI自动出牌 (DEPRECATED: 迁移到AI Brain决策监听)
   */
  // const legacyAiPlay = async (playerId: number) => { ... };

  // ========== 托管功能==========
  const isAutoPlay = ref(false);

  const toggleAutoPlay = () => {
    isAutoPlay.value = !isAutoPlay.value;

    // 如果开启托管且当前是人类玩家回合，立即触发托管出牌
    if (isAutoPlay.value && game.value && status.value === 'playing') {
      const currentPlayer = game.value.players[currentPlayerIndex.value];
      if (currentPlayer && currentPlayer.isHuman) {
        setTimeout(() => {
          autoPlayTurn();
        }, 500);
      }
    }
  };

  /**
   * 托管自动出牌
   */
  const autoPlayTurn = async () => {
    if (!game.value || !humanPlayer.value) return;

    const lastPlay = currentRound.value?.lastPlay;
    const isFirstPlay = !lastPlay || lastPlay.length === 0;
    const isTakeover = currentRound.value?.isTakeoverRound || false;

    // 检查是否有牌可出
    const hasPlayable = game.value.hasPlayableCards(0);

    if (isFirstPlay || isTakeover || hasPlayable) {
      // 必须出牌或有牌可出
      const suggestion = await getAIRecommendation();

      if (suggestion && suggestion.cards && suggestion.cards.length > 0) {
        playCards(suggestion.cards).then(result => {
          if (result.success) {
            showToast({
              type: 'success',
              message: `🤖 托管出牌: ${suggestion.cards.length}张`,
              duration: 1500
            });
          } else {
            // AI推荐失败，强制出一张
            if (humanPlayer.value && humanPlayer.value.hand.length > 0) {
              playCards([humanPlayer.value.hand[0]]).then(singleResult => {
                if (singleResult.success) {
                  showToast({ type: 'success', message: '🤖 托管出单张', duration: 1500 });
                }
              });
            }
          }
        }).catch(() => { });
      } else {
        // AI无推荐，强制出一张
        if (humanPlayer.value && humanPlayer.value.hand.length > 0) {
          playCards([humanPlayer.value.hand[0]]).then(result => {
            if (result.success) {
              showToast({ type: 'success', message: '🤖 托管出单张', duration: 1500 });
            }
          }).catch(() => { });
        }
      }
    } else {
      // 无牌可出，不要
      pass().then(result => {
        if (result.success) {
          showToast({ message: '🤖 托管自动不要', duration: 1500 });
        }
      }).catch(() => { });
    }
  };

  // ========== AI Brain集成 ==========
  const aiBrainInitialized = ref(false);

  /**
   * 初始化AI Brain
   */
  const initializeAIBrain = async () => {
    if (aiBrainInitialized.value) return;

    try {
      const settingsStore = useSettingsStore();
      const llmConfig = settingsStore.llmConfig;

      // 根据LLM配置确定provider
      let llmProvider: 'ollama' | 'openai' | 'claude' = 'ollama';
      if (llmConfig.provider === 'openai') {
        llmProvider = 'openai';
      } else if (llmConfig.provider === 'claude') {
        llmProvider = 'claude';
      } else {
        // custom 或 ollama 都使用 ollama
        llmProvider = 'ollama';
      }

      // 处理API地址（如果是Ollama，需要转换为正确的格式）
      // UnifiedLLMService 使用 messages 数组格式，对应 /api/chat 端点
      let llmEndpoint = llmConfig.apiUrl || 'http://localhost:11434/api/chat';
      if (llmProvider === 'ollama' && !llmEndpoint.includes('/api/chat')) {
        // 先移除可能存在的 /api/generate 后缀
        llmEndpoint = llmEndpoint.replace(/\/api\/generate\/?$/, '');
        // 如果地址不包含/api/chat，自动添加
        if (llmEndpoint.endsWith('/')) {
          llmEndpoint = llmEndpoint + 'api/chat';
        } else {
          llmEndpoint = llmEndpoint + '/api/chat';
        }
      }

      await aiBrainIntegration.initialize({
        llmProvider,
        llmEndpoint,
        llmModel: llmConfig.model || 'qwen2.5:3b',
        enableLLM: true, // 默认启用
        timeout: llmConfig.timeout || 30000, // 使用配置的超时时间，默认30秒
        temperature: llmConfig.temperature, // 从settingsStore读取温度参数
        maxTokens: llmConfig.maxTokens // 从settingsStore读取最大token数
      });

      // 订阅AI决策结果，完成闭环
      aiBrainIntegration.onAIDecision((event) => {
        const { playerId, decision } = event;

        // 清除该玩家的超时定时器
        const timeout = aiDecisionTimeouts.get(playerId);
        if (timeout) {
          clearTimeout(timeout);
          aiDecisionTimeouts.delete(playerId);
        }

        // 只有当前是该AI的回合才执行（避免过期的决策）
        if (!game.value) {
          return;
        }

        if (game.value.currentPlayerIndex !== playerId) {
          return;
        }

        // 处理 1: 新架构 Decision 对象 (带有 action 属性)
        if (decision && decision.action) {
          const action = decision.action;
          if (action.type === 'play_card' || action.type === 'play') {
            if (action.cards && Array.isArray(action.cards) && action.cards.length > 0) {
              playCards(action.cards, playerId).catch(() => {
                // 出牌失败时，自动pass以继续游戏
                pass(playerId).catch(() => { });
              });
            } else {
              pass(playerId).catch(() => { });
            }
          } else if (action.type === 'pass_turn' || action.type === 'pass') {
            pass(playerId).catch(() => { });
          } else {
            pass(playerId).catch(() => { });
          }
        }
        // 处理 2: 老架构或简化 Decision 对象
        else if (decision && (decision.type === 'play_card' || decision.type === 'play')) {
          const cards = decision.cards || decision.playerAction?.cards;
          if (cards && Array.isArray(cards) && cards.length > 0) {
            // 清除超时定时器
            const timeout = aiDecisionTimeouts.get(playerId);
            if (timeout) {
              clearTimeout(timeout);
              aiDecisionTimeouts.delete(playerId);
            }
            playCards(cards, playerId).catch(() => {
              pass(playerId).catch(() => { });
            });
          } else {
            const timeout = aiDecisionTimeouts.get(playerId);
            if (timeout) {
              clearTimeout(timeout);
              aiDecisionTimeouts.delete(playerId);
            }
            pass(playerId).catch(() => { });
          }
        } else if (decision && (decision.type === 'pass_turn' || decision.type === 'pass')) {
          const timeout = aiDecisionTimeouts.get(playerId);
          if (timeout) {
            clearTimeout(timeout);
            aiDecisionTimeouts.delete(playerId);
          }
          pass(playerId).catch(() => { });
        } else {
          const timeout = aiDecisionTimeouts.get(playerId);
          if (timeout) {
            clearTimeout(timeout);
            aiDecisionTimeouts.delete(playerId);
          }
          pass(playerId).catch(() => { });
        }
      });


      aiBrainInitialized.value = true;
    } catch (error) {
    }
  };

  /**
   * 触发AI Brain聊天（Deprecated: 已整合到 advanceGameFlow）
   */
  const triggerAIBrainChat = async (_playerId: number, _eventType: 'after_play' | 'after_pass' | 'game_event', _eventData?: any) => {
    // 已集成到 advanceGameFlow 中，此函数仅预留以防前端组件引用
  };

  // ========== 事件驱动：移除所有watch，改用明确的回调机制 ==========

  // 监听LLM配置更新，动态更新AI Brain的LLM配置（无需重启）
  if (typeof window !== 'undefined') {
    window.addEventListener('llm-config-updated', async () => {
      if (aiBrainInitialized.value) {
        const settingsStore = useSettingsStore();
        const llmConfig = settingsStore.llmConfig;

        // 处理API地址（如果是Ollama，需要转换为正确的格式）
        let llmEndpoint = llmConfig.apiUrl || 'http://localhost:11434/api/chat';
        if (!llmEndpoint.includes('/api/chat')) {
          llmEndpoint = llmEndpoint.replace(/\/api\/generate\/?$/, '');
          if (llmEndpoint.endsWith('/')) {
            llmEndpoint = llmEndpoint + 'api/chat';
          } else {
            llmEndpoint = llmEndpoint + '/api/chat';
          }
        }

        // 使用新的动态更新方法（无需重启AI Brain）
        aiBrainIntegration.updateLLMConfig({
          endpoint: llmEndpoint,
          model: llmConfig.model || 'qwen2.5:3b',
          temperature: llmConfig.temperature,
          maxTokens: llmConfig.maxTokens,
          timeout: llmConfig.timeout || 30000
        });
      }
    });
  }

  // 初始化
  initialize();

  return {
    game,
    gameState,
    status,
    currentPlayerIndex,
    players,
    humanPlayer,
    currentRound,
    roundScore,
    isAutoPlay,
    aiBrainInitialized,
    rounds,
    startGame,
    playCards,
    pass,
    toggleAutoPlay,
    getAIRecommendation,
    initializeAIBrain,
    triggerAIBrainChat
  };
});
