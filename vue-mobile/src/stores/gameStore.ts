/**
 * Pinia游戏状态Store
 * 
 * ⚠️ 注意：已迁移至移动端独立Core
 * 
 * 标记：已迁移
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// 移动端独立Game类（使用 game-engine/Game，它有 startGame 方法）
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
    // 设置更新回调，确保 finishedRank 等状态变化能触发 Vue 响应式更新
    if (game.value && typeof game.value.setOnUpdate === 'function') {
      game.value.setOnUpdate(() => {
        triggerUpdate();
      });
    }
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
    // Game 类有 rounds getter，直接使用
    return game.value?.rounds || [];
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
  
  // 游戏模式（个人赛/团队赛）
  const isTeamMode = computed(() => {
    stateVersion.value;
    return game.value?.state?.config?.teamMode || false;
  });
  
  // 团队配置
  const teamConfig = computed(() => {
    stateVersion.value;
    return game.value?.state?.teamConfig || null;
  });
  
  // 团队排名
  const teamRankings = computed(() => {
    stateVersion.value;
    return game.value?.state?.teamRankings || null;
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
      if (typeof game.value.reset === 'function') {
        game.value.reset();
      }
    }

    // 确保 game.value 存在
    if (!game.value) {
      initialize(config);
    }

    // 再次检查，确保 game.value 存在
    if (!game.value) {
      console.error('Failed to initialize game instance');
      return;
    }

    // 检查 startGame 方法是否存在
    if (typeof game.value.startGame !== 'function') {
      console.error('startGame method is missing on Game instance', game.value);
      console.error('Game instance type:', game.value.constructor?.name);
      console.error('Available methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(game.value)));
      return;
    }

    try {
      game.value.startGame();
      triggerUpdate();
    } catch (error) {
      console.error('Error calling startGame:', error);
      throw error;
    }

    // 初始化AI Brain（如果还没有初始化）
    if (!aiBrainInitialized.value) {
      await initializeAIBrain();
    }

    // 触发第一回合流程（处理语音播报和AI首家出牌）
    const initialPlayerIndex = game.value!.currentPlayerIndex;

    // 首回合直接触发下一位玩家操作（不需要报牌）
    const firstPlayer = game.value!.players[initialPlayerIndex];
    if (firstPlayer && !firstPlayer.isHuman) {
      if (aiBrainInitialized.value && game.value) {
        aiBrainIntegration.triggerAITurn(initialPlayerIndex, game.value as any).catch(() => { });
      }
    }
    // 如果首家是人类，等待人类操作
  };

  const isProcessingFlow = ref(false);

  /**
   * 统一处理出牌/不要后的后续逻辑（报牌、AI反应、触发下一位）
   */
  const advanceGameFlow = (_actingPlayerId: number, actionType: 'play' | 'pass', cards?: Card[]) => {
    if (!game.value) return;
    const currentPlayerBefore = game.value.currentPlayerIndex;
    console.log(`[TEAM_DEBUG] advanceGameFlow: 开始, ActingPlayer=${_actingPlayerId}, Action=${actionType}, CurrentPlayerBefore=${currentPlayerBefore}, TeamMode=${game.value.state.config.teamMode}`);

    // 定义"步骤完成"后的回调
    const onActionComplete = () => {
      if (!game.value) return;

      // 首先检查游戏是否结束（优先级最高）
      if (game.value.status === 'finished') {
        console.log(`[TEAM_DEBUG] advanceGameFlow.onActionComplete: 游戏已结束，停止流程`);
        return;
      }

      // 获取当前最新的活跃玩家
      const nextPlayerIndex = game.value.currentPlayerIndex;
      
      // 如果 currentPlayerIndex 为 -1，说明游戏已结束
      if (nextPlayerIndex === -1) {
        console.log(`[TEAM_DEBUG] advanceGameFlow.onActionComplete: currentPlayerIndex=-1，游戏已结束，停止流程`);
        return;
      }
      
      const nextPlayer = game.value.players[nextPlayerIndex];
      console.log(`[TEAM_DEBUG] advanceGameFlow.onActionComplete: ActingPlayer=${_actingPlayerId}, NextPlayer=${nextPlayerIndex}(${nextPlayer?.name || 'N/A'}), Status=${game.value.status}, TeamMode=${game.value.state.config.teamMode}`);
      
      // 检查是否陷入循环（仅在游戏未结束时检查）
      if (nextPlayerIndex === _actingPlayerId && actionType === 'play' && game.value.status !== 'finished') {
        console.error(`[TEAM_DEBUG] advanceGameFlow: ⚠️ 检测到循环！NextPlayer=${nextPlayerIndex} 等于 ActingPlayer=${_actingPlayerId}，游戏可能卡住`);
        // 如果检测到循环且游戏未结束，尝试强制pass以避免卡死
        console.log(`[TEAM_DEBUG] advanceGameFlow: 尝试强制pass以避免卡死, player=${nextPlayerIndex}`);
        pass(nextPlayerIndex).catch((err) => {
          console.error(`[TEAM_DEBUG] advanceGameFlow: 强制pass失败, error=`, err);
        });
        return;
      }

      // 触发下一个玩家的操作
      if (nextPlayer && !nextPlayer.isHuman) {
        console.log(`[TEAM_DEBUG] advanceGameFlow.onActionComplete: 触发AI玩家${nextPlayerIndex}的决策`);
        if (aiBrainInitialized.value) {
          // 清除之前的超时（如果有）
          const existingTimeout = aiDecisionTimeouts.get(nextPlayerIndex);
          if (existingTimeout) clearTimeout(existingTimeout);

          // 设置超时保护
          const timeoutId = setTimeout(() => {
            if (game.value && game.value.currentPlayerIndex === nextPlayerIndex) {
              console.log(`[TEAM_DEBUG] advanceGameFlow: AI玩家${nextPlayerIndex}决策超时，自动pass`);
              aiDecisionTimeouts.delete(nextPlayerIndex);
              pass(nextPlayerIndex).catch(() => { });
            }
          }, 35000);
          aiDecisionTimeouts.set(nextPlayerIndex, timeoutId);

          // 触发AI决策
          console.log(`[TEAM_DEBUG] advanceGameFlow: 调用triggerAITurn for Player ${nextPlayerIndex}`);
          aiBrainIntegration.triggerAITurn(nextPlayerIndex, game.value as any).catch((err) => {
            console.error(`[TEAM_DEBUG] advanceGameFlow: AI决策失败 for Player ${nextPlayerIndex}:`, err);
            clearTimeout(aiDecisionTimeouts.get(nextPlayerIndex));
            aiDecisionTimeouts.delete(nextPlayerIndex);
            pass(nextPlayerIndex).catch(() => { });
          });
        } else {
          // 降级策略：本地简单AI，增加微小延迟防止栈溢出，但尽量快
          setTimeout(() => {
            if (!game.value || game.value.currentPlayerIndex !== nextPlayerIndex) {
              return;
            }

            // 尝试使用本地策略获取出牌建议
            try {
              const currentRound = game.value.currentRound;
              const lastPlayCards = currentRound?.lastPlay;
              let lastPlay: any = null;
              if (lastPlayCards && Array.isArray(lastPlayCards) && lastPlayCards.length > 0) {
                lastPlay = canPlayCards(lastPlayCards);
              }

              const suggestion = getAIRecommendationUtil(nextPlayer.hand, lastPlay);

              if (suggestion && suggestion.cards.length > 0) {
                playCards(suggestion.cards, nextPlayerIndex).then(res => {
                  if (!res.success) {
                    const failMsg = (res as any).message;
                    if (failMsg?.includes('必须出牌') || failMsg?.includes('Cannot pass')) {
                      playCards([nextPlayer.hand[0]], nextPlayerIndex).catch(() => { });
                    } else {
                      pass(nextPlayerIndex).catch(() => { });
                    }
                  }
                });
              } else {
                pass(nextPlayerIndex).catch(() => { });
              }
            } catch (e) {
              pass(nextPlayerIndex).catch(() => { });
            }
          }, 10);
        }
      } else if (nextPlayer && nextPlayer.isHuman && isAutoPlay.value) {
        // 托管下的人类玩家，微小延迟
        setTimeout(() => {
          if (game.value && game.value.currentPlayerIndex === nextPlayerIndex && isAutoPlay.value) {
            autoPlayTurn().catch(() => { });
          }
        }, 10);
      }
    };

    // 移除所有 TTS 逻辑，直接立刻推进游戏流程
    onActionComplete();
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

    // 1. 先执行出牌逻辑（等待异步完成，确保 finishedRank 等状态已更新）
    const currentPlayerBeforePlay = game.value.currentPlayerIndex;
    const playResult = await game.value.playCards(actingPlayerIndex, cards);
    const currentPlayerAfterPlay = game.value.currentPlayerIndex;
    console.log(`[TEAM_DEBUG] playCards: 出牌完成, actingPlayer=${actingPlayerIndex}, currentPlayerBefore=${currentPlayerBeforePlay}, currentPlayerAfter=${currentPlayerAfterPlay}, success=${playResult?.success}`);

    if (!playResult || !playResult.success) {
      console.error(`[TEAM_DEBUG] playCards: 出牌失败, result=`, playResult);
      // 出牌失败时，自动pass以继续游戏流程
      console.log(`[TEAM_DEBUG] playCards: 出牌失败，自动pass以继续游戏, actingPlayer=${actingPlayerIndex}`);
      // 不调用 advanceGameFlow，因为 pass 会自己调用
      pass(actingPlayerIndex).catch((err) => {
        console.error(`[TEAM_DEBUG] playCards: 自动pass也失败, error=`, err);
      });
      return { success: false, message: playResult?.message || '出牌失败' };
    }

    // 出牌成功，继续后续流程
    // 检查玩家是否出完牌，如果出完牌，finishedRank 应该已经通过 addToFinishOrder 设置了
    // 但为了确保 UI 更新，我们需要再次触发更新
    // 注意：addToFinishOrder 内部会调用 controller.recordPlayerFinished，它会设置 finishedRank 并触发 onUpdateCallback
    // 但为了确保 Vue 的响应式系统能检测到变化，我们在这里也触发一次更新
    
    // 更新版本以触发响应式（此时 finishedRank 应该已经设置好了）
    triggerUpdate();
    
    // 再次检查当前玩家索引（确保状态已更新）
    const currentPlayerAfterUpdate = game.value.currentPlayerIndex;
    console.log(`[TEAM_DEBUG] playCards: 状态更新后, currentPlayerAfterUpdate=${currentPlayerAfterUpdate}`);

    // 2. 发射游戏事件（供聊天调度器监听）
    const play = canPlayCards(cards);
    window.dispatchEvent(new CustomEvent('guozha:player-played', {
      detail: { playerId: actingPlayerIndex, cards, playType: play?.type }
    }));

    // 恢复语音报牌（使用Promise链式调用，确保报牌结束后才推进）
    // 使用 try-catch 包裹整个逻辑，防止 playToSpeechText 报错导致游戏卡死
    // 注意：只有出牌成功时才调用 advanceGameFlow
    try {
      if (play) {
        const text = playToSpeechText(play);
        // speak 方法返回的 Promise 会在音频播放结束(onEnd)时 resolve
        getTTSPlaybackService().speak(text, {
          priority: 2,
          timeout: 3000
        }).then(() => {
          // 播放结束，推进流程（只有出牌成功时才推进）
          advanceGameFlow(actingPlayerIndex, 'play', cards);
        }).catch((e) => {
          console.warn('[TTS] Play announcement failed', e);
          // 出错也要推进，避免卡死（只有出牌成功时才推进）
          advanceGameFlow(actingPlayerIndex, 'play', cards);
        });
      } else {
        // 没得报牌，直接推进（只有出牌成功时才推进）
        advanceGameFlow(actingPlayerIndex, 'play', cards);
      }
    } catch (error) {
      console.error('[GameStore] Error in TTS dispatch:', error);
      // 发生任何未知错误，必须保证游戏继续（只有出牌成功时才推进）
      advanceGameFlow(actingPlayerIndex, 'play', cards);
    }
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

    // 恢复语音报牌（使用Promise链式调用，确保报牌结束后才推进）
    getTTSPlaybackService().speak("不要", {
      priority: 2,
      timeout: 3000
    }).then(() => {
      // 播放结束，推进流程
      advanceGameFlow(actingPlayerIndex, 'pass');
      // 发射游戏事件
      window.dispatchEvent(new CustomEvent('guozha:player-passed', {
        detail: { playerId: actingPlayerIndex }
      }));
    }).catch((e) => {
      console.warn('[TTS] Pass announcement failed', e);
      // 出错也要推进
      advanceGameFlow(actingPlayerIndex, 'pass');
      window.dispatchEvent(new CustomEvent('guozha:player-passed', {
        detail: { playerId: actingPlayerIndex }
      }));
    });

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

      // ...

      if (lastPlayCards && Array.isArray(lastPlayCards) && lastPlayCards.length > 0) {
        lastPlay = canPlayCards(lastPlayCards);
      }

      const result = getAIRecommendationUtil(humanPlayer.value.hand, lastPlay);
      return result;
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
        autoPlayTurn();
      }
    }
  };

  /**
   * 托管自动出牌
   */
  const autoPlayTurn = async () => {
    if (!game.value || !humanPlayer.value) return;

    // 记录开始决策时的状态
    const decisionStartIndex = game.value.currentPlayerIndex;
    if (decisionStartIndex !== 0) {
      return;
    }

    const lastPlay = currentRound.value?.lastPlay;
    const isFirstPlay = !lastPlay || lastPlay.length === 0;

    // 检查是否有牌可出
    const hasPlayable = game.value.hasPlayableCards(0);

    // 必须出牌或有牌可出
    if (isFirstPlay || hasPlayable) {
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
            // AI推荐失败，尝试出单张，如果还是失败则自动pass
            if (humanPlayer.value && humanPlayer.value.hand.length > 0) {
              playCards([humanPlayer.value.hand[0]]).then(singleResult => {
                if (singleResult.success) {
                  showToast({ type: 'success', message: '🤖 托管出单张', duration: 1500 });
                } else {
                  // 出单张也失败，自动pass
                  console.log(`[TEAM_DEBUG] autoPlayTurn: 出单张失败，自动pass`);
                  pass().catch(() => { });
                }
              }).catch(() => {
                // 出单张异常，自动pass
                pass().catch(() => { });
              });
            } else {
              // 没有手牌，直接pass
              pass().catch(() => { });
            }
          }
        }).catch(() => {
          // 出牌异常，自动pass
          pass().catch(() => { });
        });
      } else {
        // AI无推荐，强制出一张，如果失败则自动pass
        if (humanPlayer.value && humanPlayer.value.hand.length > 0) {
          playCards([humanPlayer.value.hand[0]]).then(result => {
            if (result.success) {
              showToast({ type: 'success', message: '🤖 托管出单张', duration: 1500 });
            } else {
              // 出单张失败，自动pass
              console.log(`[TEAM_DEBUG] autoPlayTurn: 出单张失败，自动pass`);
              pass().catch(() => { });
            }
          }).catch(() => {
            // 出单张异常，自动pass
            pass().catch(() => { });
          });
        } else {
          // 没有手牌，直接pass
          pass().catch(() => { });
        }
      }
    } else {
      // 无牌可出，不要
      pass().then(result => {
        if (result.success) {
          showToast({ message: '🤖 托管自动不要', duration: 1500 });
        }
      });
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
        console.log(`[TEAM_DEBUG] onAIDecision: 收到AI决策, Player=${playerId}, CurrentPlayer=${game.value?.currentPlayerIndex}, DecisionType=${decision?.action?.type || decision?.type || 'unknown'}`);

        // 清除该玩家的超时定时器
        const timeout = aiDecisionTimeouts.get(playerId);
        if (timeout) {
          clearTimeout(timeout);
          aiDecisionTimeouts.delete(playerId);
          console.log(`[TEAM_DEBUG] onAIDecision: 清除超时定时器 for Player ${playerId}`);
        }

        // 只有当前是该AI的回合才执行（避免过期的决策）
        if (!game.value) {
          console.log(`[TEAM_DEBUG] onAIDecision: Game为null，忽略决策`);
          return;
        }

        if (game.value.currentPlayerIndex !== playerId) {
          console.log(`[TEAM_DEBUG] onAIDecision: 玩家不匹配 (Expected ${playerId}, Got ${game.value.currentPlayerIndex})，忽略决策`);
          return;
        }

        console.log(`[TEAM_DEBUG] onAIDecision: 开始处理决策 for Player ${playerId}`);

        // 处理 1: 新架构 Decision 对象 (带有 action 属性)
        if (decision && decision.action) {
          const action = decision.action;
          console.log(`[TEAM_DEBUG] onAIDecision: 处理新架构决策, action.type=${action.type}`);
          if (action.type === 'play_card' || action.type === 'play') {
            if (action.cards && Array.isArray(action.cards) && action.cards.length > 0) {
              console.log(`[TEAM_DEBUG] onAIDecision: 执行出牌, Player=${playerId}, Cards=${action.cards.length}`);
              playCards(action.cards, playerId).catch((err) => {
                console.error(`[TEAM_DEBUG] onAIDecision: 出牌失败, Player=${playerId}, Error:`, err);
                // 出牌失败时，自动pass以继续游戏
                pass(playerId).catch(() => { });
              });
            } else {
              console.log(`[TEAM_DEBUG] onAIDecision: 无牌可出，执行pass, Player=${playerId}`);
              pass(playerId).catch(() => { });
            }
          } else if (action.type === 'pass_turn' || action.type === 'pass') {
            console.log(`[TEAM_DEBUG] onAIDecision: AI决定pass, Player=${playerId}`);
            pass(playerId).catch(() => { });
          } else {
            console.log(`[TEAM_DEBUG] onAIDecision: 未知action类型 ${action.type}，执行pass, Player=${playerId}`);
            pass(playerId).catch(() => { });
          }
        }
        // 处理 2: 老架构或简化 Decision 对象
        else if (decision && (decision.type === 'play_card' || decision.type === 'play')) {
          console.log(`[TEAM_DEBUG] onAIDecision: 处理旧架构决策, type=${decision.type}`);
          const cards = decision.cards || decision.playerAction?.cards;
          if (cards && Array.isArray(cards) && cards.length > 0) {
            console.log(`[TEAM_DEBUG] onAIDecision: 旧架构出牌, Player=${playerId}, Cards=${cards.length}`);
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
            console.log(`[TEAM_DEBUG] onAIDecision: 旧架构无牌可出，执行pass, Player=${playerId}`);
            const timeout = aiDecisionTimeouts.get(playerId);
            if (timeout) {
              clearTimeout(timeout);
              aiDecisionTimeouts.delete(playerId);
            }
            pass(playerId).catch(() => { });
          }
        } else if (decision && (decision.type === 'pass_turn' || decision.type === 'pass')) {
          console.log(`[TEAM_DEBUG] onAIDecision: 旧架构pass决策, Player=${playerId}`);
          const timeout = aiDecisionTimeouts.get(playerId);
          if (timeout) {
            clearTimeout(timeout);
            aiDecisionTimeouts.delete(playerId);
          }
          pass(playerId).catch(() => { });
        } else {
          console.log(`[TEAM_DEBUG] onAIDecision: 未知决策格式，执行pass, Player=${playerId}`, decision);
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
    isTeamMode,
    teamConfig,
    teamRankings,
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
