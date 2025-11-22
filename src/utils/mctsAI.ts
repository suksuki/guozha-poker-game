import { Card, Play, Rank } from '../types/card';
import { canPlayCards, canBeat, findPlayableCards, createDeck, shuffleDeck, dealCards, isScoreCard, calculateCardsScore, getCardScore } from './cardUtils';

// MCTS节点
interface MCTSNode {
  hand: Card[];              // AI的手牌
  lastPlay: Play | null;     // 上家出牌
  playerToMove: 'ai' | 'opponent'; // 当前该谁出牌
  visits: number;            // 访问次数
  wins: number;              // 获胜次数
  children: MCTSNode[];      // 子节点
  parent: MCTSNode | null;   // 父节点
  action: Card[] | null;     // 导致此节点的动作
  untriedActions: Card[][];  // 未尝试的动作
}

// MCTS配置
interface MCTSConfig {
  iterations?: number;       // 迭代次数
  explorationConstant?: number; // 探索常数（UCT公式中的C）
  simulationDepth?: number;  // 模拟深度限制
  perfectInformation?: boolean; // 完全信息模式（知道所有玩家手牌）- "作弊"模式
  allPlayerHands?: Card[][]; // 所有玩家的手牌（完全信息模式使用）
  currentRoundScore?: number; // 当前轮次累计的分数
  playerCount?: number; // 玩家总数
}

// 游戏状态（用于模拟）
interface SimulatedGameState {
  aiHand: Card[];
  opponentHands: Card[][];   // 所有对手的手牌（支持多人）
  allHands: Card[][];        // 所有玩家的手牌（完全信息模式）
  lastPlay: Play | null;
  lastPlayPlayerIndex: number | null; // 最后出牌的玩家索引
  currentPlayerIndex: number; // 当前玩家索引（0=AI，1+是对手）
  playerCount: number;        // 玩家总数
  roundScore: number;         // 当前轮次累计的分数
  aiScore: number;            // AI累计的分数
  isTerminal: boolean;
  winner: number | null;      // 获胜者索引
  perfectInformation: boolean; // 是否使用完全信息
}

// UCT值计算（Upper Confidence Bound for Trees）
function uctValue(node: MCTSNode, explorationConstant: number): number {
  if (node.visits === 0) {
    return Infinity; // 未访问的节点优先探索
  }
  
  const exploitation = node.wins / node.visits; // 利用：胜率
  const exploration = explorationConstant * Math.sqrt(
    Math.log((node.parent?.visits || 1)) / node.visits
  );
  
  return exploitation + exploration;
}

// 选择最佳子节点（UCT算法）
function selectBestChild(node: MCTSNode, explorationConstant: number): MCTSNode {
  if (node.children.length === 0) {
    return node;
  }
  
  // 如果当前是AI的回合，选择UCT值最高的（AI想赢）
  // 如果是对手的回合，选择UCT值最低的（对手想赢）
  let bestChild = node.children[0];
  let bestValue = uctValue(node.children[0], explorationConstant);
  
  for (const child of node.children) {
    const value = uctValue(child, explorationConstant);
    if (node.playerToMove === 'ai') {
      // AI回合：选择UCT值最高的
      if (value > bestValue) {
        bestValue = value;
        bestChild = child;
      }
    } else {
      // 对手回合：选择UCT值最低的（从AI角度看，对手会选择对AI最不利的）
      if (value < bestValue) {
        bestValue = value;
        bestChild = child;
      }
    }
  }
  
  return bestChild;
}

// 扩展节点：添加新的子节点
function expandNode(node: MCTSNode, allCards: Card[]): MCTSNode | null {
  if (node.untriedActions.length === 0) {
    return null; // 没有未尝试的动作
  }
  
  // 随机选择一个未尝试的动作
  const randomIndex = Math.floor(Math.random() * node.untriedActions.length);
  const action = node.untriedActions.splice(randomIndex, 1)[0];
  
  // 创建新的游戏状态
  const newHand = node.hand.filter(
    card => !action.some(c => c.id === card.id)
  );
  
  const play = canPlayCards(action);
  if (!play) {
    return null;
  }
  
  // 检查是否可以出牌
  if (node.lastPlay && !canBeat(play, node.lastPlay)) {
    return null; // 不能压过
  }
  
  // 检查是否获胜
  const isWinner = newHand.length === 0;
  
  // 创建新节点
  const newNode: MCTSNode = {
    hand: newHand,
    lastPlay: play,
    playerToMove: node.playerToMove === 'ai' ? 'opponent' : 'ai',
    visits: 0,
    wins: 0,
    children: [],
    parent: node,
    action: action,
    untriedActions: [] // 将在需要时生成
  };
  
  node.children.push(newNode);
  return newNode;
}

// 生成所有可能的出牌动作
function generateActions(hand: Card[], lastPlay: Play | null): Card[][] {
  return findPlayableCards(hand, lastPlay);
}

// 评估动作质量（考虑分牌策略和组合牌型）
function evaluateActionQuality(
  action: Card[], 
  hand: Card[], 
  lastPlay: Play | null,
  opponentHands: Card[][] = [], // 对手手牌（完全信息模式）
  currentRoundScore: number = 0, // 当前轮次累计分数
  perfectInformation: boolean = false // 是否使用完全信息
): number {
  if (!action || action.length === 0) return -1000;
  
  const play = canPlayCards(action);
  if (!play) return -1000;
  
  let score = 0;
  
  // 统计手牌中每种点数的数量
  const handRankGroups = new Map<number, number>();
  hand.forEach(card => {
    const rank = card.rank;
    handRankGroups.set(rank, (handRankGroups.get(rank) || 0) + 1);
  });
  
  const actionRank = action[0].rank;
  const originalCount = handRankGroups.get(actionRank) || 0;
  const remainingCount = originalCount - action.length;
  
  // 如果没有上家出牌（首发），优先保持组合牌型
  if (!lastPlay) {
    // 优先出完整的组合牌型（三张、对子），而不是拆散
    if (originalCount === 3 && play.type === 'triple') {
      score += 50; // 出完整三张，加分
    } else if (originalCount === 3 && play.type === 'single') {
      score -= 80; // 拆散三张成单张，扣分
    } else if (originalCount === 3 && play.type === 'pair') {
      score -= 100; // 拆散三张成对子，产生死牌，扣更多分
    } else if (originalCount >= 4 && play.type !== 'bomb' && play.type !== 'dun') {
      // 炸弹拆散成更小的牌型
      if (remainingCount > 0 && remainingCount < 3) {
        score -= 150; // 拆散炸弹产生死牌，严重扣分
      } else {
        score -= 50; // 拆散炸弹但不产生死牌，适度扣分
      }
    } else if (originalCount >= 7 && play.type !== 'dun') {
      score -= 200; // 拆散墩，严重扣分
    }
  } else {
    // 有上家出牌时，拆散可能更合理（为了压牌），但也要适度惩罚
    if (originalCount >= 3 && play.type === 'single' && remainingCount === 2) {
      score -= 40; // 拆散三张压牌，适度扣分
    } else if (originalCount >= 4 && play.type !== 'bomb' && play.type !== 'dun') {
      if (remainingCount > 0 && remainingCount < 3) {
        score -= 60; // 拆散炸弹压牌，适度扣分
      }
    }
  }
  
  // 加分项：优先出牌数多的动作
  score += play.type === 'triple' ? 20 : play.type === 'pair' ? 10 : 0;
  
  // 分牌策略评估（核心策略：保护自己的分牌，引诱对方出分牌）
  const actionScoreCards = action.filter(card => isScoreCard(card));
  const actionScore = calculateCardsScore(actionScoreCards);
  const remainingHand = hand.filter(card => !action.some(c => c.id === card.id));
  const remainingScoreCards = remainingHand.filter(card => isScoreCard(card));
  const remainingScore = calculateCardsScore(remainingScoreCards);
  
  // 1. 评估是否保护自己的分牌
  if (actionScoreCards.length > 0) {
    // 如果出牌中包含分牌，需要评估是否能拿到分
    if (!lastPlay) {
      // 首发出牌时，如果出分牌，需要确保后面能拿回来
      // 如果自己还有足够大的牌，可能能拿回来，加分
      const hasBigCards = remainingHand.some(card => {
        const testPlay = canPlayCards([card]);
        return testPlay && testPlay.value >= 10; // 有大牌能压
      });
      if (hasBigCards) {
        score += 30; // 有大牌保护，可以出分牌引诱对手
      } else {
        score -= 50; // 没有大牌保护，不要出分牌
      }
    } else {
      // 有上家出牌时，出分牌需要确保自己能拿回来
      // 如果这轮已经有分，自己能拿到，加分
      if (currentRoundScore > 0 && play.value > lastPlay.value) {
        score += 40; // 能拿到分，出分牌是值得的
      } else {
        score -= 30; // 不能确保拿到分，不要出分牌
      }
    }
  } else {
    // 出牌中没有分牌，这是好的（保护分牌）
    if (remainingScore > 0) {
      score += 20; // 保护了自己的分牌，加分
    }
  }
  
  // 2. 在完全信息模式下，引诱对方出分牌
  if (perfectInformation && opponentHands.length > 0) {
    // 计算对手手牌中的分牌
    let opponentTotalScore = 0;
    opponentHands.forEach(oppHand => {
      const oppScoreCards = oppHand.filter(card => isScoreCard(card));
      opponentTotalScore += calculateCardsScore(oppScoreCards);
    });
    
    // 如果对手有很多分牌，引诱他们出分牌是好的
    if (opponentTotalScore > 20 && !lastPlay) {
      // 没有上家出牌，可以考虑用小牌引诱对手出分牌
      if (play.value <= 8 && actionScoreCards.length === 0) {
        score += 25; // 用小牌引诱对手出分牌
      }
    }
    
    // 如果对手手上有分牌，自己能压过，优先出能压过的牌
    if (lastPlay && currentRoundScore > 0) {
      // 这轮有分，如果能压过，加分
      if (canBeat(play, lastPlay)) {
        score += 35; // 能拿到分，优先出
      }
    }
  }
  
  // 3. 确保自己有大牌能拿分
  const hasBombOrDun = remainingHand.some(card => {
    const rank = card.rank;
    const count = remainingHand.filter(c => c.rank === rank).length;
    return count >= 4; // 有炸弹或墩
  });
  
  if (hasBombOrDun && currentRoundScore > 0) {
    // 有大牌且这轮有分，可以考虑不出，等分数更多时再拿
    score += 15; // 保留大牌拿分
  }
  
  return score;
}

// 使用启发式选择最佳动作（当MCTS没有生成子节点时）
function selectBestActionByHeuristic(actions: Card[][], hand: Card[], lastPlay: Play | null): Card[] | null {
  if (actions.length === 0) return null;
  if (actions.length === 1) return actions[0];
  
  // 评估每个动作的质量
  const scoredActions = actions.map(action => ({
    action,
    score: evaluateActionQuality(action, hand, lastPlay, [], 0, false) // 基础版本
  }));
  
  // 选择得分最高的动作
  scoredActions.sort((a, b) => b.score - a.score);
  
  return scoredActions[0].action;
}

// 估计对手的手牌（基于已出牌和已知信息）
function estimateOpponentHand(
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

// 快速模拟游戏（从当前状态到游戏结束）- 支持完全信息和分牌策略
function simulateGame(
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

// 反向传播：更新节点统计
function backpropagate(node: MCTSNode | null, winner: number) {
  let currentNode: MCTSNode | null = node;
  
  while (currentNode) {
    currentNode.visits++;
    
    // 判断这个节点是否导致AI获胜
    // winner是获胜者的索引，0表示AI，1+表示对手
    if (winner === 0) {
      // AI获胜，加分
      currentNode.wins += 1;
    } else {
      // 对手获胜，不加分
      currentNode.wins += 0;
    }
    
    currentNode = currentNode.parent;
  }
}

// MCTS主算法
function mcts(
  rootHand: Card[],
  lastPlay: Play | null,
  config: MCTSConfig
): Card[] | null {
  // 快速模式：大幅降低默认迭代次数以提高速度
  const iterations = config.iterations || 50; // 从100降到50，速度提升约2倍
  const explorationConstant = config.explorationConstant || 1.414; // √2
  // 根据手牌数量动态调整模拟深度，但设置更严格的上限
  const baseDepth = config.simulationDepth || 20; // 从30降到20
  // 手牌越多，需要更深的模拟，但设置更严格的上限避免过慢
  const maxDepth = Math.min(50, rootHand.length * 2); // 从*3降到*2，上限50
  const simulationDepth = Math.max(baseDepth, maxDepth);
  
  // 添加超时保护：如果手牌太多，进一步降低迭代次数
  const adjustedIterations = rootHand.length > 30 
    ? Math.max(30, Math.floor(iterations * 0.6)) // 手牌多时减少40%
    : rootHand.length > 20
    ? Math.max(40, Math.floor(iterations * 0.8)) // 手牌较多时减少20%
    : iterations;
  
  // 获取所有可出牌选项
  const playableOptions = findPlayableCards(rootHand, lastPlay);
  
  if (playableOptions.length === 0) {
    return null; // 要不起
  }
  
  // 创建根节点
  const root: MCTSNode = {
    hand: rootHand,
    lastPlay: lastPlay,
    playerToMove: 'ai',
    visits: 0,
    wins: 0,
    children: [],
    parent: null,
    action: null,
    untriedActions: [...playableOptions]
  };
  
  // MCTS主循环（使用调整后的迭代次数）
  const startTime = Date.now();
  const maxTime = 2000; // 最多2秒（快速模式）
  
  for (let i = 0; i < adjustedIterations; i++) {
    // 超时保护：如果超过2秒，提前结束
    if (Date.now() - startTime > maxTime) {
      break;
    }
    let node = root;
    
    // 1. Selection（选择）：选择最有希望的节点
    while (node.children.length > 0 && node.untriedActions.length === 0) {
      node = selectBestChild(node, explorationConstant);
    }
    
    // 2. Expansion（扩展）：如果节点可以扩展，添加新节点
    if (node.untriedActions.length > 0) {
      // 如果是根节点或叶子节点，生成所有可能的动作
      if (node.untriedActions.length === 0) {
        const actions = generateActions(node.hand, node.lastPlay);
        node.untriedActions = actions;
      }
      
      const expandedNode = expandNode(node, []);
      if (expandedNode) {
        node = expandedNode;
      }
    }
    
    // 3. Simulation（模拟）：从当前节点模拟游戏
    // 如果节点已经出完手牌，直接判定为获胜
    if (node.hand.length === 0) {
      // AI获胜（节点是AI出牌后的状态，如果AI手牌为空，说明AI刚出完）
      backpropagate(node, 0);
      continue;
    }
    
    // 创建模拟游戏状态
    const playerCount = config.playerCount || 2;
    const allHands: Card[][] = [];
    
    // 初始化所有玩家手牌
    if (config.perfectInformation && config.allPlayerHands) {
      // 完全信息模式：使用已知的手牌
      allHands.push([...node.hand]); // AI手牌
      // 更新已出牌后的手牌状态（简化：假设其他玩家手牌不变）
      config.allPlayerHands.slice(1).forEach(hand => {
        allHands.push([...hand]); // 复制对手手牌
      });
    } else {
      // 估计模式：需要估计对手手牌
      allHands.push([...node.hand]); // AI手牌
      // 简化：暂时只支持2人游戏，需要时可以扩展
      // TODO: 支持多人游戏的对手手牌估计
    }
    
    const gameState: SimulatedGameState = {
      aiHand: [...node.hand], // 复制手牌
      opponentHands: allHands.slice(1), // 对手手牌
      allHands: allHands, // 所有玩家手牌
      lastPlay: node.lastPlay,
      lastPlayPlayerIndex: null, // 初始状态未知
      currentPlayerIndex: node.playerToMove === 'ai' ? 0 : 1, // 0=AI，1+=对手
      playerCount: playerCount,
      roundScore: config.currentRoundScore || 0, // 当前轮次分数
      aiScore: 0, // AI累计分数
      isTerminal: false,
      winner: null,
      perfectInformation: config.perfectInformation || false
    };
    
    const winner = simulateGame(gameState, simulationDepth, config.perfectInformation || false);
    
    // 4. Backpropagation（反向传播）：更新节点统计
    backpropagate(node, winner);
  }
  
  // 选择最佳动作：结合访问次数和动作质量
  if (root.children.length === 0) {
    // 如果没有子节点，使用启发式选择最好的动作
    return selectBestActionByHeuristic(playableOptions, rootHand, root.lastPlay) || playableOptions[0] || null;
  }
  
  // 计算每个子节点的综合分数（访问次数 × 动作质量）
  const scoredChildren = root.children.map(child => {
    if (!child.action) return { child, score: 0 };
    
    // 基础分数：访问次数和胜率
    const visitScore = child.visits;
    const winRate = child.visits > 0 ? child.wins / child.visits : 0;
    const baseScore = visitScore * (0.7 + winRate * 0.3); // 70%权重给访问次数，30%给胜率
    
    // 启发式分数：动作质量（考虑分牌策略和组合牌型）
    const opponentHands = config.perfectInformation && config.allPlayerHands 
      ? config.allPlayerHands.filter((_, idx) => idx > 0) // 排除AI自己（索引0）
      : [];
    const heuristicScore = evaluateActionQuality(
      child.action, 
      rootHand, 
      root.lastPlay,
      opponentHands,
      config.currentRoundScore || 0,
      config.perfectInformation || false
    );
    
    return {
      child,
      score: baseScore + heuristicScore * 5 // 动作质量占较小权重，但能影响接近的选择
    };
  });
  
  // 选择综合分数最高的子节点
  scoredChildren.sort((a, b) => b.score - a.score);
  
  return scoredChildren[0].child.action;
}

// MCTS AI选择出牌
export function mctsChoosePlay(
  hand: Card[],
  lastPlay: Play | null,
  config: MCTSConfig = {}
): Card[] | null {
  try {
    return mcts(hand, lastPlay, config);
  } catch (error) {
    console.error('MCTS算法错误:', error);
    // 降级到简单策略
    const playableOptions = findPlayableCards(hand, lastPlay);
    if (playableOptions.length === 0) return null;
    
    // 选择最小能压过的牌
    const validPlays = playableOptions
      .map(cards => canPlayCards(cards))
      .filter((play): play is Play => {
        if (!play) return false;
        if (!lastPlay) return true;
        return canBeat(play, lastPlay);
      });
    
    if (validPlays.length === 0) return null;
    
    validPlays.sort((a, b) => a.value - b.value);
    return validPlays[0].cards;
  }
}

