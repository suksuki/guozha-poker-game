/**
 * 测试大模型聊天功能
 * 用于验证Ollama API是否正常工作
 */

import { chatService } from '../services/chatService';
import { Player, PlayerType, Card, Suit, Rank } from '../types/card';
import { ChatEventType } from '../types/chat';
import { MultiPlayerGameState } from './gameStateUtils';
import { GameStatus } from '../types/card';

/**
 * 测试大模型聊天
 */
export async function testLLMChat(): Promise<void> {
  console.log('🧪 开始测试大模型聊天功能...');
  
  // 创建测试玩家
  const testPlayer: Player = {
    id: 0,
    name: '测试玩家',
    type: PlayerType.AI,
    hand: [
      { id: '1', suit: Suit.SPADES, rank: Rank.ACE },
      { id: '2', suit: Suit.HEARTS, rank: Rank.KING },
      { id: '3', suit: Suit.DIAMONDS, rank: Rank.QUEEN }
    ],
    score: 50,
    voiceConfig: {
      gender: 'male',
      dialect: 'mandarin'
    }
  };

  // 创建测试游戏状态
  const testGameState: MultiPlayerGameState = {
    status: GameStatus.PLAYING,
    players: [
      testPlayer,
      {
        id: 1,
        name: '玩家2',
        type: PlayerType.AI,
        hand: [{ id: '4', suit: Suit.CLUBS, rank: Rank.JACK }],
        score: 30,
        voiceConfig: { gender: 'female', dialect: 'cantonese' }
      }
    ],
    currentPlayerIndex: 0,
    lastPlay: null,
    lastPlayPlayerIndex: null,
    winner: null,
    playerCount: 2,
    totalScore: 100,
    roundScore: 20,
    currentRoundPlays: [],
    roundNumber: 1,
    finishOrder: []
  };

  try {
    console.log('📤 测试1: 随机闲聊');
    const randomMessage = await chatService.triggerRandomChat(
      testPlayer,
      1.0, // 100%概率触发
      undefined,
      testGameState
    );
    console.log('✅ 随机闲聊结果:', randomMessage?.content || '无消息');
    
    if (!randomMessage) {
      console.warn('⚠️ 随机闲聊返回null，可能是概率检查失败或API调用失败');
    }

    console.log('\n📤 测试2: 事件聊天（大墩）');
    const eventMessage = await chatService.triggerEventChat(
      testPlayer,
      ChatEventType.BIG_DUN,
      { eventData: { dunSize: 8 } },
      testGameState
    );
    console.log('✅ 事件聊天结果:', eventMessage?.content || '无消息');

    console.log('\n📤 测试3: 事件聊天（分牌被捡）');
    const scoreMessage = await chatService.triggerEventChat(
      testPlayer,
      ChatEventType.SCORE_STOLEN,
      { eventData: { stolenScore: 15 } },
      testGameState
    );
    console.log('✅ 分牌被捡结果:', scoreMessage?.content || '无消息');

    console.log('\n📤 测试4: 对骂');
    const tauntMessage = await chatService.triggerTaunt(
      testPlayer,
      testGameState.players[1],
      undefined,
      testGameState
    );
    console.log('✅ 对骂结果:', tauntMessage ? '已生成对骂消息' : '无消息');

    console.log('\n✅ 大模型聊天测试完成！');
    console.log('📋 所有聊天消息:');
    const allMessages = chatService.getMessages();
    allMessages.forEach((msg, index) => {
      console.log(`  ${index + 1}. [${msg.playerName}] ${msg.content}`);
    });

  } catch (error) {
    console.error('❌ 测试失败:', error);
    throw error;
  }
}

/**
 * 检查当前使用的聊天策略
 */
export function checkStrategy(): void {
  const { checkChatStrategy } = require('../services/chatService');
  const strategy = checkChatStrategy();
  console.log('📊 当前聊天策略信息:');
  console.log('  策略名称:', strategy.name);
  console.log('  策略描述:', strategy.description);
  console.log('  是否使用LLM:', strategy.isLLM ? '✅ 是' : '❌ 否');
  
  if (!strategy.isLLM) {
    console.warn('⚠️ 警告：当前未使用LLM策略！');
    console.log('💡 提示：chatService默认应该使用llm策略');
  }
}

/**
 * 在浏览器控制台中调用此函数来测试
 * 例如：window.testLLMChat()
 */
if (typeof window !== 'undefined') {
  (window as any).testLLMChat = testLLMChat;
  (window as any).checkStrategy = checkStrategy;
  console.log('💡 提示：');
  console.log('  - 运行 testLLMChat() 来测试大模型聊天功能');
  console.log('  - 运行 checkStrategy() 来检查当前使用的策略');
}

