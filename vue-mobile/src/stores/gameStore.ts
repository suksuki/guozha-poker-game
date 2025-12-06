/**
 * Pinia游戏状态Store
 * 
 * ⚠️ 注意：当前使用老APP的Game类
 * 未来计划：迁移到移动端独立的Game实现
 * 标记：TODO - 迁移到移动端独立Game类
 */

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
// TODO: 迁移到移动端独立Game类
import { Game } from '../../../src/game-engine/Game';
// TODO: 迁移到移动端独立类型
import type { Card } from '../../../src/types/card';
// TODO: 迁移到移动端独立AI策略
import { simpleAIStrategy } from '../../../src/ai/simpleStrategy';
import { showToast } from 'vant';
import { aiBrainIntegration } from '../services/ai/aiBrainIntegration';
import { useSettingsStore } from './settingsStore';
import { getTTSPlaybackService } from '../services/tts/ttsPlaybackService';
import { playToSpeechText } from '../utils/playToSpeechText';
// TODO: 迁移到移动端独立工具函数（已创建，但gameStore仍使用老APP版本）
import { canPlayCards } from '../../../src/utils/cardUtils';
import { ChannelType } from '../types/channel';

export const useGameStore = defineStore('game', () => {
  // ========== 游戏对象（新架构！）==========
  const game = ref<Game | null>(null);
  
  // 初始化
  // TODO: 迁移到移动端独立Game类
  const initialize = () => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false,
      gameMode: 'individual' as 'individual' | 'team'
    };
    // 当前使用老APP的Game类，未来将迁移到移动端独立实现
    game.value = new Game(config);
  };
  
  // ========== 计算属性（通过Game访问）==========
  const gameState = computed(() => game.value?.state || null);
  const status = computed(() => game.value?.status || 'waiting');
  const currentPlayerIndex = computed(() => game.value?.currentPlayerIndex || 0);
  const players = computed(() => game.value?.players || []);
  const humanPlayer = computed(() => game.value?.humanPlayer);
  const currentRound = computed(() => game.value?.currentRound);
  const roundScore = computed(() => game.value?.roundScore || 0);
  
  // ========== 游戏操作==========
  
  /**
   * 开始游戏
   */
  const startGame = async () => {
    if (!game.value) {
      initialize();
    }
    
    game.value!.startGame();
    console.log('✅ 游戏已开始！');
    
    // 初始化AI Brain（如果还没有初始化）
    if (!aiBrainInitialized.value) {
      await initializeAIBrain();
    }
  };
  
  /**
   * 出牌
   * 移动端独立实现报牌功能，完全基于回调机制，不依赖老APP的报牌逻辑
   */
  const playCards = async (cards: Card[]) => {
    if (!game.value) return { success: false, message: '游戏未开始' };
    
    // 1. 先执行出牌逻辑（调用老APP的Game类，但不修改老APP代码）
    const result = game.value.playCards(currentPlayerIndex.value, cards);
    
    if (!result.success) {
      return result;
    }
    
    // 2. 出牌成功后，记录下一个玩家索引（在报牌完成前，下一个玩家还不能出牌）
    const nextPlayerIndex = game.value.currentPlayerIndex;
    const nextPlayer = game.value.players[nextPlayerIndex];
    
    // 3. 在移动端框架内独立处理报牌
    // 报牌逻辑完全在移动端实现，与老APP隔离
    const currentRound = game.value.currentRound;
    const lastPlay = currentRound?.lastPlay;
    
    // 报牌完成回调：在音频完全播放完成后触发下一个玩家的操作（事件驱动+回调）
    const onAnnouncementComplete = () => {
      
      // 1. 触发AI反应聊天（异步，不阻塞）
      if (aiBrainInitialized.value && game.value) {
        const playerId = currentPlayerIndex.value;
        aiBrainIntegration.notifyStateChange(game.value as any, playerId, 'play').catch(err => {
          console.error('[GameStore] 触发聊天失败:', err);
        });
      }
      
      // 2. 触发AI Brain聊天（通过回调，不依赖watch）
      if (lastPlay && aiBrainInitialized.value) {
        const lastPlayerId = currentRound?.lastPlayPlayerIndex;
        if (lastPlayerId !== undefined && lastPlayerId !== null && lastPlayerId >= 0) {
          triggerAIBrainChat(lastPlayerId, 'after_play', { play: lastPlay });
        }
      }
      
      // 3. 通过回调触发下一个玩家的操作（事件驱动）
      if (nextPlayer && !nextPlayer.isHuman) {
        // 触发AI Brain决策
        if (aiBrainInitialized.value && game.value) {
          aiBrainIntegration.triggerAITurn(nextPlayerIndex, game.value as any).catch(err => {
            console.error('[GameStore] 触发AI Brain决策失败:', err);
          });
        }
        // 立即触发AI出牌
        aiPlay(nextPlayerIndex).catch(err => {
          console.error('[GameStore] AI出牌失败:', err);
        });
      } else if (nextPlayer && nextPlayer.isHuman && isAutoPlay.value) {
        // 人类玩家托管模式
        setTimeout(() => {
          autoPlayTurn().catch(err => {
            console.error('[GameStore] 托管出牌失败:', err);
          });
        }, 800);
      }
    };
    
    if (lastPlay) {
      // 将Card[]转换为Play对象
      const play = canPlayCards(lastPlay);
      if (play) {
        // 转换为语音文本
        const text = playToSpeechText(play as any);
        if (text && text.trim() !== '') {
          // 检查设置和服务
          const settingsStore = useSettingsStore();
          const voiceSettings = settingsStore.voicePlaybackSettings;
          
          // 异步检查并播报（完全基于回调，不阻塞）
          (async () => {
            try {
              // 检查语音播报是否启用
              if (!voiceSettings.enabled) {
                onAnnouncementComplete();
                return;
              }

              // 检查多声道音频服务
              const { getMultiChannelAudioService } = await import('../services/audio/multiChannelAudioService');
              const audioService = getMultiChannelAudioService();
              const audioStats = audioService.getStatistics();
              
              if (!audioStats.enabled) {
                onAnnouncementComplete();
                return;
              }

              // 获取TTS播报服务
              const ttsService = getTTSPlaybackService();
              
              // 启动TTS播报（完全基于回调，不阻塞）
              ttsService.speak(text, {
                timeout: 5000,
                fallbackTimeout: 5000,
                priority: 4,
                channel: ChannelType.ANNOUNCEMENT,
                enableCache: true,
                onAudioGenerated: () => {
                  // 音频完全播放完成，触发下一个玩家
                  onAnnouncementComplete();
                },
                onStart: () => {
                  // 音频开始播放
                },
                onEnd: () => {
                  // 音频播放完成
                },
                onError: (error) => {
                  console.error('[GameStore] 报牌错误:', error);
                  onAnnouncementComplete();
                }
              }).catch((error) => {
                console.error('[GameStore] 报牌异常:', error);
                onAnnouncementComplete();
              });
            } catch (error) {
              console.error('[GameStore] 报牌初始化失败:', error);
              onAnnouncementComplete();
            }
          })();
        } else {
          // 没有报牌文本，直接触发下一个玩家
          onAnnouncementComplete();
        }
      } else {
        // 无法识别牌型，直接触发下一个玩家
        onAnnouncementComplete();
      }
    } else {
      // 没有出牌记录，直接触发下一个玩家
      onAnnouncementComplete();
    }
    
    return { success: true };
  };
  
  /**
   * 不要
   */
  const pass = async () => {
    if (!game.value) return { success: false, message: '游戏未开始' };
    
    const result = game.value.pass(currentPlayerIndex.value);
    
    if (!result.success) {
      return result;
    }
    
      // 触发AI反应聊天（异步，不阻塞）
      if (aiBrainInitialized.value && game.value) {
        const playerId = currentPlayerIndex.value;
        aiBrainIntegration.notifyStateChange(game.value as any, playerId, 'pass').catch(err => {
          console.error('[GameStore] 触发聊天失败:', err);
        });
      }
    
    // 事件驱动：不要后，触发下一个玩家（通过回调，不依赖watch）
    const nextPlayerIndex = game.value.currentPlayerIndex;
    const nextPlayer = game.value.players[nextPlayerIndex];
    
    if (nextPlayer && !nextPlayer.isHuman) {
      // 触发AI Brain决策
      if (aiBrainInitialized.value && game.value) {
        aiBrainIntegration.triggerAITurn(nextPlayerIndex, game.value as any).catch(err => {
          console.error('[GameStore] 触发AI Brain决策失败:', err);
        });
      }
      aiPlay(nextPlayerIndex).catch(err => {
        console.error('[GameStore] AI出牌失败:', err);
      });
    } else if (nextPlayer && nextPlayer.isHuman && isAutoPlay.value) {
      // 人类玩家托管模式
      setTimeout(() => {
        autoPlayTurn().catch(err => {
          console.error('[GameStore] 托管出牌失败:', err);
        });
      }, 800);
    }
    
    return result;
  };
  
  // ========== AI功能==========
  
  /**
   * AI推荐
   */
  const getAIRecommendation = () => {
    if (!game.value || !humanPlayer.value) {
      return null;
    }
    
    try {
      const lastPlay = currentRound.value?.lastPlay;
      const lastPlayCards = Array.isArray(lastPlay) ? lastPlay : null;
      const cards = simpleAIStrategy(
        humanPlayer.value.hand,
        lastPlayCards as any, // 类型断言，因为simpleAIStrategy接受Card[]或null
        'balanced'
      );
      return cards ? { cards } : null;
    } catch (error) {
      console.error('AI推荐失败:', error);
      return null;
    }
  };
  
  /**
   * AI自动出牌
   */
  const aiPlay = async (playerId: number) => {
    if (!game.value) return;
    
    const player = game.value.players[playerId];
    if (!player || player.isHuman) return;
    
    // 检查回合是否已结束
    if (currentRound.value?.isFinished) {
      console.log(`⏭️ 回合已结束，跳过AI ${player.name}的操作`);
      return;
    }
    
    // 模拟思考时间
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
    
    // 再次检查回合状态
    if (currentRound.value?.isFinished) {
      console.log(`⏭️ 等待期间回合已结束，跳过AI ${player.name}的操作`);
      return;
    }
    
    try {
      // 重新获取最新的currentRound（因为新轮可能刚刚创建）
      const latestRound = game.value?.currentRound;
      const lastPlay = latestRound?.lastPlay || null;
      
      // 1. 检查是否有牌可出（强制出牌规则）
      const hasPlayable = game.value.hasPlayableCards(playerId);
      // 首家判断：lastPlay为null或空数组
      const isFirstPlay = !lastPlay || (Array.isArray(lastPlay) && lastPlay.length === 0);
      
      console.log(`🤖 ${player.name}: 有牌可出=${hasPlayable}, 是首家=${isFirstPlay}, lastPlay=${lastPlay ? `${Array.isArray(lastPlay) ? lastPlay.length : 'object'}张` : 'null'}`);
      
      // 首家必须出牌！
      if (isFirstPlay) {
        console.log(`🏁 ${player.name} 是首家，必须出牌！`);
        // 直接出牌，不检查hasPlayable
      } else if (!hasPlayable) {
        // 不是首家且没有牌可出，自动不要
        pass().then(result => {
          if (result.success) {
            console.log(`🤖 ${player.name} 不要`);
          }
        });
        return;
      }
      
      // 2. 有牌可出或首家，获取AI建议
      // 将lastPlay转换为Card[]格式（simpleAIStrategy需要Card[]或null）
      const lastPlayCards = Array.isArray(lastPlay) ? lastPlay : null;
      const cards = simpleAIStrategy(
        player.hand,
        lastPlayCards as any, // 类型断言，因为simpleAIStrategy接受Card[]或null
        'balanced'
      );
      
      if (cards && cards.length > 0) {
        // AI出牌
        playCards(cards).then(result => {
          if (result.success) {
            console.log(`🤖 ${player.name} 出牌:`, cards.length, '张');
          } else {
            // AI推荐失败，强制出一张（特别是首家）
            if (isFirstPlay && player.hand.length > 0) {
              console.log(`🤖 ${player.name} 首家AI推荐失败，强制出单张`);
              playCards([player.hand[0]]);
            }
          }
        });
      } else {
        // AI无推荐，强制出一张（特别是首家）
        if (isFirstPlay && player.hand.length > 0) {
          console.log(`🤖 ${player.name} 首家无推荐，强制出单张`);
          playCards([player.hand[0]]);
        } else if (hasPlayable && player.hand.length > 0) {
          console.log(`🤖 ${player.name} 有牌可出但AI无推荐，强制出单张`);
          playCards([player.hand[0]]);
        }
      }
    } catch (error) {
      console.error(`AI ${player.name} 出牌失败:`, error);
    }
  };
  
  // ========== 托管功能==========
  const isAutoPlay = ref(false);
  
  const toggleAutoPlay = () => {
    isAutoPlay.value = !isAutoPlay.value;
    
    // 如果开启托管且当前是人类玩家回合，立即触发托管出牌
    if (isAutoPlay.value && game.value && status.value === 'playing') {
      const currentPlayer = game.value.players[currentPlayerIndex.value];
      if (currentPlayer && currentPlayer.isHuman) {
        console.log('🤖 托管开启，立即触发自动出牌');
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
    
    console.log('🤖 托管自动出牌中...');
    
    const lastPlay = currentRound.value?.lastPlay;
    const isFirstPlay = !lastPlay || lastPlay.length === 0;
    const isTakeover = currentRound.value?.isTakeoverRound || false;
    
    // 检查是否有牌可出
    const hasPlayable = game.value.hasPlayableCards(0);
    
    console.log(`托管: 首家=${isFirstPlay}, 接风=${isTakeover}, 有牌可出=${hasPlayable}`);
    
    if (isFirstPlay || isTakeover || hasPlayable) {
      // 必须出牌或有牌可出
      const suggestion = getAIRecommendation();
      
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
            console.log('🤖 AI推荐失败，强制出单张');
            if (humanPlayer.value && humanPlayer.value.hand.length > 0) {
              playCards([humanPlayer.value.hand[0]]).then(singleResult => {
                if (singleResult.success) {
                  showToast({ type: 'success', message: '🤖 托管出单张', duration: 1500 });
                }
              });
            }
          }
        });
      } else {
        // AI无推荐，强制出一张
        playCards([humanPlayer.value.hand[0]]).then(result => {
          if (result.success) {
            showToast({ type: 'success', message: '🤖 托管出单张', duration: 1500 });
          }
        });
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
      let llmEndpoint = llmConfig.apiUrl || 'http://localhost:11434/api/chat';
      if (llmProvider === 'ollama' && !llmEndpoint.includes('/api/chat')) {
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

      aiBrainInitialized.value = true;
      console.log('[GameStore] AI Brain初始化完成');
    } catch (error) {
      console.error('[GameStore] AI Brain初始化失败:', error);
    }
  };

  /**
   * 触发AI Brain聊天（游戏事件）
   */
  const triggerAIBrainChat = async (playerId: number, _eventType: 'after_play' | 'after_pass' | 'game_event', _eventData?: any) => {
    if (!aiBrainInitialized.value || !game.value) return;

    try {
      // 通知AI Brain游戏状态变化，触发聊天
      aiBrainIntegration.notifyStateChange(game.value as any, playerId);
    } catch (error) {
      console.error('[GameStore] 触发AI Brain聊天失败:', error);
    }
  };

  // ========== 事件驱动：移除所有watch，改用明确的回调机制 ==========
  
  // 监听LLM配置更新，重新初始化AI Brain（这个是配置更新事件，保留）
  if (typeof window !== 'undefined') {
    window.addEventListener('llm-config-updated', async () => {
      if (aiBrainInitialized.value && status.value === 'playing') {
        console.log('[GameStore] LLM配置已更新，重新初始化AI Brain');
        // 先关闭旧的
        await aiBrainIntegration.shutdown();
        aiBrainInitialized.value = false;
        // 重新初始化
        await initializeAIBrain();
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
    startGame,
    playCards,
    pass,
    toggleAutoPlay,
    getAIRecommendation,
    aiPlay,
    initializeAIBrain,
    triggerAIBrainChat
  };
});
