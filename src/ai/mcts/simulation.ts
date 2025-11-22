/**
 * MCTS游戏模拟
 */

import { Card, Play, Rank } from '../../types/card';
import { SimulatedGameState } from '../types';
import { findPlayableCards, canPlayCards, canBeat, isScoreCard, calculateCardsScore } from '../../utils/cardUtils';

/**
 * 估计对手的手牌（基于已出牌和已知信息）
 */
export function estimateOpponentHand(
  aiHand: Card[],
  allCards: Card[],
  opponentHandSize: number
): Card[] {
  // 从所有牌中移除AI的手牌
  const usedCards = new Set(aiHand.map(c => `${c.suit}-${c.rank}`));
  const availableCards = allCards.filter(
    card => !usedCards.has(`${card.suit}-${card.rank}`)
  );
  
  // 随机选择对手的手牌（蒙特卡洛模拟的核心）
  const shuffled = [...availableCards];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  
  return shuffled.slice(0, opponentHandSize);
}

/**
 * 快速模拟游戏（从当前状态到游戏结束）- 支持完全信息和分牌策略
 */
export function simulateGame(
  state: SimulatedGameState,
  maxDepth: number,
  perfectInformation: boolean = false
): number { // 返回获胜者索引（0=AI，1+是对手）
  let currentState: SimulatedGameState = { ...state };
  let depth = 0;
  
  // 获取所有牌（用于估计对手手牌）
  const allCards: Card[] = [];
  const suits = ['spades', 'hearts', 'diamonds', 'clubs', 'joker'];
  const ranks = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      if ((suit === 'joker' && (rank === 16 || rank === 17)) ||
          (suit !== 'joker' && rank !== 16 && rank !== 17)) {
        allCards.push({ suit: suit as any, rank: rank as Rank, id: `${suit}-${rank}-sim` });
      }
    });
  });
  
  // 初始化手牌（完全信息模式 vs 估计模式）
  if (!currentState.allHands || currentState.allHands.length === 0) {
    if (perfectInformation && currentState.allHands && currentState.allHands.length > 0) {
      // 完全信息模式：使用已知的手牌
      currentState.allHands = [...currentState.allHands];
    } else {
      // 估计模式：为所有对手估计手牌
      const playerCount = currentState.playerCount || 2;
      currentState.allHands = [currentState.aiHand];
      
      let usedCards = new Set(currentState.aiHand.map(c => `${c.suit}-${c.rank}`));
      
      for (let i = 1; i < playerCount; i++) {
        const opponentHand = estimateOpponentHand(
          [...currentState.aiHand, ...currentState.allHands.slice(1).flat()],
          allCards,
          currentState.aiHand.length // 假设对手手牌数量与AI相同
        );
        currentState.allHands.push(opponentHand);
        opponentHand.forEach(card => usedCards.add(`${card.suit}-${card.rank}`));
      }
    }
  }
  
  // 如果只有一个对手，兼容旧代码
  if (!currentState.opponentHands || currentState.opponentHands.length === 0) {
    currentState.opponentHands = currentState.allHands.slice(1); // 排除AI（索引0）
  }
  
  while (!currentState.isTerminal && depth < maxDepth) {
    // 获取当前玩家的手牌
    const currentPlayerIdx = currentState.currentPlayerIndex;
    const currentHand = currentPlayerIdx === 0 
      ? currentState.aiHand 
      : currentState.allHands[currentPlayerIdx] || [];
    
    // 获取可出牌选项
    const playableOptions = findPlayableCards(currentHand, currentState.lastPlay);
    
    if (playableOptions.length === 0) {
      // 要不起，轮到下一个玩家
      if (currentState.lastPlay) {
        // 清空上家出牌，下一个玩家可以出任意牌
        currentState.lastPlay = null;
        currentState.lastPlayPlayerIndex = null;
        currentState.currentPlayerIndex = (currentState.currentPlayerIndex + 1) % currentState.playerCount;
      } else {
        // 所有人都要不起，这轮结束，分数给最后出牌的人
        // 下一轮从最后出牌的人的下一个开始
        if (currentState.lastPlayPlayerIndex !== null) {
          currentState.roundScore = 0; // 重置轮次分数（已分配）
        }
        currentState.lastPlay = null;
        currentState.lastPlayPlayerIndex = null;
        currentState.currentPlayerIndex = (currentState.lastPlayPlayerIndex !== null 
          ? (currentState.lastPlayPlayerIndex + 1) 
          : (currentState.currentPlayerIndex + 1)) % currentState.playerCount;
      }
      depth++;
      continue;
    }
    
    // 智能选择动作（考虑分牌策略）
    // 使用启发式策略：优先选择能减少手牌数量或组合度高的牌型，考虑分牌价值
    let selectedAction = playableOptions[0];
    
    if (playableOptions.length > 1) {
      // 计算每个选项的启发式分数
      const scoredOptions = playableOptions.map(cards => {
        const play = canPlayCards(cards);
        if (!play) return { cards, score: -1000 };
        
        let score = 0;
        
        // 1. 优先出牌数多的（减少手牌数量）
        score += cards.length * 10;
        
        // 2. 优先出组合牌型（对子、三张）
        if (play.type === 'pair' || play.type === 'triple') {
          score += 20;
        }
        
        // 3. 炸弹和墩谨慎使用，但在关键时刻可以使用
        if (play.type === 'bomb' || play.type === 'dun') {
          const remainingCount = currentHand.length - cards.length;
          if (remainingCount <= 5) {
            score += 30; // 快出完了，可以用炸弹
          } else {
            score -= 10; // 手牌还多，谨慎使用炸弹
          }
        }
        
        // 4. 避免出单张（除非必要）
        if (play.type === 'single' && currentHand.length > 8) {
          score -= 5;
        }
        
        // 5. 如果需要压牌，选择最小的能压过的牌（节省大牌）
        if (currentState.lastPlay && play.value <= currentState.lastPlay.value + 3) {
          score += 15; // 优先使用小牌压过
        }
        
        // 6. 检查是否会拆散组合牌型（炸弹、三张、对子）
        const handRankGroups = new Map<number, number>();
        currentHand.forEach(card => {
          const rank = card.rank;
          handRankGroups.set(rank, (handRankGroups.get(rank) || 0) + 1);
        });
        
        const playRank = cards[0].rank;
        const originalCount = handRankGroups.get(playRank) || 0;
        const remainingCount = originalCount - cards.length;
        
        // 检查是否拆散了有价值的组合牌型
        if (originalCount >= 3 && remainingCount > 0) {
          // 如果有3个或以上相同牌，不应该拆散成更小的牌型
          if (originalCount === 3 && play.type === 'single') {
            // 3个拆成1个，剩下2个（虽然可以出对子，但失去了三张）
            score -= 80; // 避免拆散三张
          } else if (originalCount === 3 && play.type === 'pair') {
            // 3个拆成2个，剩下1个（产生死牌）
            score -= 100; // 避免拆散三张产生死牌
          } else if (originalCount >= 4 && originalCount < 7 && remainingCount > 0 && remainingCount < 3) {
            // 炸弹（4-6张）拆散后剩余<3张，产生死牌或降低价值
            score -= 150; // 避免拆散炸弹
          } else if (originalCount >= 7 && play.type !== 'dun') {
            // 墩（7张及以上）拆散成更小的牌型
            score -= 200; // 严重惩罚拆散墩
          }
        }
        
        // 7. 分牌策略：保护自己的分牌，引诱对手出分牌
        const actionScoreCards = cards.filter(card => isScoreCard(card));
        const actionScore = calculateCardsScore(actionScoreCards);
        const remainingHand = currentHand.filter(card => !cards.some(c => c.id === card.id));
        const remainingScoreCards = remainingHand.filter(card => isScoreCard(card));
        const remainingScore = calculateCardsScore(remainingScoreCards);
        
        if (currentPlayerIdx === 0) {
          // AI的策略：保护自己的分牌
          if (actionScoreCards.length > 0) {
            // AI出分牌：只有当这轮能拿到分或者有大牌保护时才出
            if (currentState.roundScore > 0 && currentState.lastPlay && canBeat(play, currentState.lastPlay)) {
              score += 50; // 能拿到分，出分牌值得
            } else if (!currentState.lastPlay && remainingHand.some(c => {
              const testPlay = canPlayCards([c]);
              return testPlay && testPlay.value >= 12; // 有大牌保护
            })) {
              score += 30; // 有大牌保护，可以出分牌引诱
            } else {
              score -= 60; // 不能确保拿到分，不要出分牌
            }
          } else if (remainingScore > 0) {
            // 保护了自己的分牌
            score += 20;
          }
        } else {
          // 对手的策略（模拟）：如果这轮有分且能拿，会出分牌
          if (currentState.roundScore > 10 && currentState.lastPlay && canBeat(play, currentState.lastPlay)) {
            score += 40; // 对手会尽量拿分
          }
        }
        
        return { cards, score };
      });
      
      // 选择得分最高的选项（但添加一些随机性，避免过于确定）
      scoredOptions.sort((a, b) => b.score - a.score);
      const topScore = scoredOptions[0].score;
      const goodOptions = scoredOptions.filter(opt => opt.score >= topScore - 5);
      
      // 从得分相近的选项中随机选择（平衡探索和利用）
      selectedAction = goodOptions[Math.floor(Math.random() * goodOptions.length)].cards;
    }
    
    const play = canPlayCards(selectedAction);
    
    if (!play) {
      depth++;
      continue;
    }
    
    // 更新游戏状态：移除已出的牌
    const playerIdx = currentState.currentPlayerIndex;
    if (playerIdx === 0) {
      // AI出牌
      currentState.aiHand = currentState.aiHand.filter(
        card => !selectedAction.some(c => c.id === card.id)
      );
      currentState.allHands[0] = currentState.aiHand;
    } else {
      // 对手出牌
      currentState.allHands[playerIdx] = currentState.allHands[playerIdx].filter(
        card => !selectedAction.some(c => c.id === card.id)
      );
      if (currentState.allHands[playerIdx].length === 0) {
        currentState.isTerminal = true;
        currentState.winner = playerIdx; // 对手获胜
        break;
      }
    }
    
    // 检查AI是否获胜
    if (currentState.aiHand.length === 0) {
      currentState.isTerminal = true;
      currentState.winner = 0; // AI获胜
      break;
    }
    
    // 更新轮次分数（如果有分牌）
    const actionScore = calculateCardsScore(selectedAction.filter(card => isScoreCard(card)));
    currentState.roundScore += actionScore;
    
    // 更新最后出牌信息
    currentState.lastPlay = play;
    currentState.lastPlayPlayerIndex = playerIdx;
    
    // 转到下一个玩家
    currentState.currentPlayerIndex = (playerIdx + 1) % currentState.playerCount;
    
    depth++;
  }
  
  // 如果游戏未结束，根据剩余手牌判断胜负
  if (!currentState.isTerminal) {
    const minHandLength = Math.min(...currentState.allHands.map(h => h.length));
    const winnerIdx = currentState.allHands.findIndex(h => h.length === minHandLength);
    return winnerIdx >= 0 ? winnerIdx : 0;
  }
  
  return currentState.winner !== null ? currentState.winner : 0;
}

