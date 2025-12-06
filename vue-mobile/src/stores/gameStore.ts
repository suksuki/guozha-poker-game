/**
 * Pinia游戏状态Store
 * 使用新的Game + GameEngine架构
 */

import { defineStore } from 'pinia';
import { ref, computed, watch } from 'vue';
import { Game } from '../../../src/game-engine/Game';
import type { Card } from '../../../src/types/card';
import { simpleAIStrategy } from '../../../src/ai/simpleStrategy';
import { showToast } from 'vant';
import { aiBrainIntegration } from '../services/aiBrainIntegration';
import { useSettingsStore } from './settingsStore';

export const useGameStore = defineStore('game', () => {
  // ========== 游戏对象（新架构！）==========
  const game = ref<Game | null>(null);
  
  // 初始化
  const initialize = () => {
    const config = {
      playerCount: 4,
      humanPlayerIndex: 0,
      teamMode: false,
      gameMode: 'individual' as 'individual' | 'team'
    };
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
  const rounds = computed(() => game.value?.rounds || []);
  
  // ========== 游戏操作==========
  
  /**
   * 开始游戏
   */
  const startGame = () => {
    if (!game.value) {
      initialize();
    }
    
    game.value!.startGame();
    console.log('✅ 游戏已开始！');
  };
  
  /**
   * 出牌
   */
  const playCards = async (cards: Card[]) => {
    if (!game.value) return { success: false, message: '游戏未开始' };
    
    const result = game.value.playCards(currentPlayerIndex.value, cards);
    
    // 触发AI反应聊天（异步，不阻塞）
    if (result.success && aiBrainInitialized.value) {
      const playerId = currentPlayerIndex.value;
      aiBrainIntegration.notifyStateChange(game.value, playerId, 'play').catch(err => {
        console.error('[GameStore] 触发聊天失败:', err);
      });
    }
    
    return result;
  };
  
  /**
   * 不要
   */
  const pass = async () => {
    if (!game.value) return { success: false, message: '游戏未开始' };
    
    const result = game.value.pass(currentPlayerIndex.value);
    
    // 触发AI反应聊天（异步，不阻塞）
    if (result.success && aiBrainInitialized.value) {
      const playerId = currentPlayerIndex.value;
      aiBrainIntegration.notifyStateChange(game.value, playerId, 'pass').catch(err => {
        console.error('[GameStore] 触发聊天失败:', err);
      });
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
      const cards = simpleAIStrategy(
        humanPlayer.value.hand,
        currentRound.value?.lastPlay || null,
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
      
      console.log(`🤖 ${player.name}: 有牌可出=${hasPlayable}, 是首家=${isFirstPlay}, lastPlay=${lastPlay ? `${lastPlay.length}张` : 'null'}`);
      
      // 首家必须出牌！
      if (isFirstPlay) {
        console.log(`🏁 ${player.name} 是首家，必须出牌！`);
        // 直接出牌，不检查hasPlayable
      } else if (!hasPlayable) {
        // 不是首家且没有牌可出，自动不要
        const result = pass();
        if (result.success) {
          console.log(`🤖 ${player.name} 不要`);
        }
        return;
      }
      
      // 2. 有牌可出或首家，获取AI建议
      const cards = simpleAIStrategy(
        player.hand,
        lastPlay,
        'balanced'
      );
      
      if (cards && cards.length > 0) {
        // AI出牌
        const result = playCards(cards);
        if (result.success) {
          console.log(`🤖 ${player.name} 出牌:`, cards.length, '张');
        } else {
          // AI推荐失败，强制出一张（特别是首家）
          if (isFirstPlay && player.hand.length > 0) {
            console.log(`🤖 ${player.name} 首家AI推荐失败，强制出单张`);
            playCards([player.hand[0]]);
          }
        }
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
        const result = playCards(suggestion.cards);
        if (result.success) {
          showToast({ 
            type: 'success', 
            message: `🤖 托管出牌: ${suggestion.cards.length}张`,
            duration: 1500
          });
        } else {
          // AI推荐失败，强制出一张
          console.log('🤖 AI推荐失败，强制出单张');
          const singleCard = playCards([humanPlayer.value.hand[0]]);
          if (singleCard.success) {
            showToast({ type: 'success', message: '🤖 托管出单张', duration: 1500 });
          }
        }
      } else {
        // AI无推荐，强制出一张
        const result = playCards([humanPlayer.value.hand[0]]);
        if (result.success) {
          showToast({ type: 'success', message: '🤖 托管出单张', duration: 1500 });
        }
      }
    } else {
      // 无牌可出，不要
      const result = pass();
      if (result.success) {
        showToast({ type: 'warning', message: '🤖 托管自动不要', duration: 1500 });
      }
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
        enableLLM: llmConfig.enabled !== false, // 默认启用
        timeout: llmConfig.timeout || 30000, // 使用配置的超时时间，默认30秒
        temperature: llmConfig.temperature, // 从settingsStore读取温度参数
        maxTokens: llmConfig.maxTokens // 从settingsStore读取最大token数
      });

      aiBrainInitialized.value = true;
      console.log('[GameStore] AI Brain初始化完成', {
        provider: llmProvider,
        endpoint: llmEndpoint,
        model: llmConfig.model
      });
    } catch (error) {
      console.error('[GameStore] AI Brain初始化失败:', error);
    }
  };

  /**
   * 触发AI Brain聊天（游戏事件）
   */
  const triggerAIBrainChat = async (playerId: number, eventType: 'after_play' | 'after_pass' | 'game_event', eventData?: any) => {
    if (!aiBrainInitialized.value || !game.value) return;

    try {
      // 通知AI Brain游戏状态变化，触发聊天
      aiBrainIntegration.notifyStateChange(game.value, playerId);
    } catch (error) {
      console.error('[GameStore] 触发AI Brain聊天失败:', error);
    }
  };

  // ========== 监听玩家切换，触发AI出牌==========
  watch(currentPlayerIndex, async (newIndex) => {
    if (!game.value || status.value !== 'playing') return;
    
    const currentPlayer = game.value.players[newIndex];
    if (!currentPlayer) return;
    
    // 如果是AI玩家，自动出牌
    if (!currentPlayer.isHuman) {
      // 触发AI Brain决策
      if (aiBrainInitialized.value) {
        await aiBrainIntegration.triggerAITurn(newIndex, game.value);
      }
      await aiPlay(newIndex);
    } 
    // 如果是人类玩家且托管，也自动出牌
    else if (isAutoPlay.value) {
      console.log('🤖 托管模式激活，轮次变化触发自动出牌');
      await new Promise(resolve => setTimeout(resolve, 800));
      await autoPlayTurn();
    }
  });

  // 监听游戏状态变化，触发AI Brain
  watch(status, (newStatus) => {
    if (newStatus === 'playing' && !aiBrainInitialized.value) {
      initializeAIBrain();
    }
  });

  // 监听LLM配置更新，重新初始化AI Brain
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

  // 监听出牌，触发AI Brain聊天
  watch(() => currentRound.value?.lastPlay, (lastPlay, oldLastPlay) => {
    if (!game.value || !lastPlay || lastPlay === oldLastPlay) return;
    
    const lastPlayerId = currentRound.value?.lastPlayerIndex;
    if (lastPlayerId !== undefined && lastPlayerId >= 0) {
      triggerAIBrainChat(lastPlayerId, 'after_play', { play: lastPlay });
    }
  });

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
