/**
 * 测试大模型聊天功能
 * 用于验证Ollama API是否正常工作
 */

import { chatService } from '../services/chatService';
import { Player, PlayerType } from '../types/card';
import { ChatEventType } from '../types/chat';
import { MultiPlayerGameState } from './gameStateUtils';
import { GameStatus } from '../types/card';

/**
 * 测试大模型聊天
 */
export async function testLLMChat(): Promise<void> {
  
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
    const randomMessage = await chatService.triggerRandomChat(
      testPlayer,
      1.0, // 100%概率触发
      undefined,
      testGameState
    );
    
    if (!randomMessage) {
    }

    const eventMessage = await chatService.triggerEventChat(
      testPlayer,
      ChatEventType.BIG_DUN,
      { eventData: { dunSize: 8 } },
      testGameState
    );

    const scoreMessage = await chatService.triggerEventChat(
      testPlayer,
      ChatEventType.SCORE_STOLEN,
      { eventData: { stolenScore: 15 } },
      testGameState
    );

    const tauntMessage = await chatService.triggerTaunt(
      testPlayer,
      testGameState.players[1],
      undefined,
      testGameState
    );

    const allMessages = chatService.getMessages();
    allMessages.forEach((msg, index) => {
    });

  } catch (error) {
    throw error;
  }
}

/**
 * 检查当前使用的聊天策略
 */
export function checkStrategy(): void {
  const { checkChatStrategy } = require('../services/chatService');
  const strategy = checkChatStrategy();
  
  if (!strategy.isLLM) {
  }
}

/**
 * 在浏览器控制台中调用此函数来测试
 * 例如：window.testLLMChat()
 */
if (typeof window !== 'undefined') {
  (window as any).testLLMChat = testLLMChat;
  (window as any).checkStrategy = checkStrategy;
}

