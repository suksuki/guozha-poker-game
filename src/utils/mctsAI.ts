import { Card, Play, Rank } from '../types/card';
import { canPlayCards, canBeat, findPlayableCards, isScoreCard, calculateCardsScore } from './cardUtils';
import { evaluateCardBreaking, BreakingContext } from './smartCardBreaking';

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

// 策略调整
interface StrategyAdjustment {
  type: 'weight' | 'parameter' | 'preference';
  target: string;
  value: number;
  priority: number;
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
  strategyAdjustments?: StrategyAdjustment[]; // 动态策略调整
  teamMode?: boolean; // 是否启用团队模式
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

// ========== 辅助函数 ==========

/**
 * 统计手牌中每种点数的数量
 */
export function countRankGroups(hand: Card[]): Map<number, number> {
  const groups = new Map<number, number>();
  hand.forEach(card => {
    const rank = card.rank;
    groups.set(rank, (groups.get(rank) || 0) + 1);
  });
  return groups;
}

/**
 * 计算手牌中的分牌信息
 */
function calculateScoreCardInfo(hand: Card[]): {
  scoreCards: Card[];
  score: number;
} {
  const scoreCards = hand.filter(card => isScoreCard(card));
  return {
    scoreCards,
    score: calculateCardsScore(scoreCards)
  };
}

/**
 * 生成所有牌（用于估计对手手牌）
 */
function generateAllCards(): Card[] {
  const allCards: Card[] = [];
  const suits = ['spades', 'hearts', 'diamonds', 'clubs', 'joker'];
  const ranks = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  
  suits.forEach(suit => {
    ranks.forEach(rank => {
      if ((suit === 'joker' && (rank === 16 || rank === 17)) ||
          (suit !== 'joker' && rank !== 16 && rank !== 17)) {
        allCards.push({ suit: suit as any, rank: rank as Rank, id: `${suit}-${rank}-gen` });
      }
    });
  });
  
  return allCards;
}

// ========== UCT算法 ==========

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
  
  let bestChild = node.children[0];
  let bestValue = uctValue(node.children[0], explorationConstant);
  
  for (const child of node.children) {
    const value = uctValue(child, explorationConstant);
    const isBetter = node.playerToMove === 'ai' 
      ? value > bestValue  // AI回合：选择UCT值最高的
      : value < bestValue; // 对手回合：选择UCT值最低的
    
    if (isBetter) {
      bestValue = value;
      bestChild = child;
    }
  }
  
  return bestChild;
}

// ========== 节点扩展 ==========

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

// ========== 动作质量评估 ==========

/**
 * 评估牌型策略（是否拆散组合牌型）
 */
function evaluateCardTypeStrategy(
  action: Card[],
  hand: Card[],
  lastPlay: Play | null,
  play: Play
): number {
  let score = 0;
  const handRankGroups = countRankGroups(hand);
  const actionRank = action[0].rank;
  const originalCount = handRankGroups.get(actionRank) || 0;
  const remainingCount = originalCount - action.length;
  
  // 如果没有上家出牌（首发），优先保持组合牌型
  if (!lastPlay) {
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
  
  return score;
}

/**
 * 评估分牌策略
 */
function evaluateScoreCardStrategy(
  action: Card[],
  hand: Card[],
  lastPlay: Play | null,
  play: Play,
  currentRoundScore: number
): number {
  let score = 0;
  const actionInfo = calculateScoreCardInfo(action);
  const remainingHand = hand.filter(card => !action.some(c => c.id === card.id));
  const remainingInfo = calculateScoreCardInfo(remainingHand);
  
  // 评估是否保护自己的分牌
  if (actionInfo.scoreCards.length > 0) {
    // 如果出牌中包含分牌，需要评估是否能拿到分
    if (!lastPlay) {
      // 首发出牌时，如果出分牌，需要确保后面能拿回来
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
      if (currentRoundScore > 0 && play.value > lastPlay.value) {
        score += 40; // 能拿到分，出分牌是值得的
      } else {
        score -= 30; // 不能确保拿到分，不要出分牌
      }
    }
  } else {
    // 出牌中没有分牌，这是好的（保护分牌）
    if (remainingInfo.score > 0) {
      score += 20; // 保护了自己的分牌，加分
    }
  }
  
  return score;
}

/**
 * 评估完全信息模式策略
 */
function evaluatePerfectInformationStrategy(
  action: Card[],
  hand: Card[],
  lastPlay: Play | null,
  play: Play,
  opponentHands: Card[][],
  currentRoundScore: number
): number {
  let score = 0;
  
  if (opponentHands.length === 0) {
    return score;
  }
  
  // 计算对手手牌中的分牌
  let opponentTotalScore = 0;
  opponentHands.forEach(oppHand => {
    const oppInfo = calculateScoreCardInfo(oppHand);
    opponentTotalScore += oppInfo.score;
  });
  
  // 如果对手有很多分牌，引诱他们出分牌是好的
  if (opponentTotalScore > 20 && !lastPlay) {
    // 没有上家出牌，可以考虑用小牌引诱对手出分牌
    const actionInfo = calculateScoreCardInfo(action);
    if (play.value <= 8 && actionInfo.scoreCards.length === 0) {
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
  
  return score;
}

// 评估动作质量（考虑分牌策略和组合牌型）
function evaluateActionQuality(
  action: Card[], 
  hand: Card[], 
  lastPlay: Play | null,
  opponentHands: Card[][] = [],
  currentRoundScore: number = 0,
  perfectInformation: boolean = false,
  strategyAdjustments: StrategyAdjustment[] = [],
  config?: MCTSConfig
): number {
  if (!action || action.length === 0) return -1000;
  
  const play = canPlayCards(action);
  if (!play) return -1000;
  
  let score = 0;
  
  // 检查是否拆牌
  const handRankGroups = countRankGroups(hand);
  const actionRank = action[0].rank;
  const originalCount = handRankGroups.get(actionRank) || 0;
  const remainingCount = originalCount - action.length;
  const isBreaking = originalCount >= 3 && remainingCount > 0;
  
  // 如果拆牌，使用智能拆牌评估
  if (isBreaking) {
    const remainingHand = hand.filter(card => !action.some(c => c.id === card.id));
    const teamMode = config?.teamMode || false;
    const breakingContext: BreakingContext = {
      lastPlay,
      currentRoundScore,
      remainingHandCount: remainingHand.length,
      teamMode,
      opponentHands: perfectInformation ? opponentHands : undefined
    };
    
    const breakingEvaluation = evaluateCardBreaking(action, hand, play, breakingContext);
    score += breakingEvaluation;  // 拆牌净价值（可能是正数或负数）
  } else {
    // 如果不拆牌，使用原有评估
    score += evaluateCardTypeStrategy(action, hand, lastPlay, play);
  }
  
  // 评估分牌策略
  score += evaluateScoreCardStrategy(action, hand, lastPlay, play, currentRoundScore);
  
  // 评估完全信息模式策略
  if (perfectInformation) {
    score += evaluatePerfectInformationStrategy(
      action, hand, lastPlay, play, opponentHands, currentRoundScore
    );
  }
  
  // 确保自己有大牌能拿分
  const remainingHand = hand.filter(card => !action.some(c => c.id === card.id));
  const hasBombOrDun = remainingHand.some(card => {
    const rank = card.rank;
    const count = remainingHand.filter(c => c.rank === rank).length;
    return count >= 4; // 有炸弹或墩
  });
  
  if (hasBombOrDun && currentRoundScore > 0) {
    score += 15; // 保留大牌拿分
  }
  
  // 应用动态策略调整
  score = applyStrategyAdjustments(score, action, hand, lastPlay, play, strategyAdjustments);
  
  return score;
}

/**
 * 应用动态策略调整
 */
function applyStrategyAdjustments(
  baseScore: number,
  action: Card[],
  hand: Card[],
  lastPlay: Play | null,
  play: Play,
  adjustments: StrategyAdjustment[]
): number {
  let adjustedScore = baseScore;
  const remainingHand = hand.filter(card => !action.some(c => c.id === card.id));
  
  for (const adjustment of adjustments) {
    switch (adjustment.type) {
      case 'weight':
        // 权重调整
        if (adjustment.target === 'bigCardPreservationWeight') {
          // 检查是否保留了大牌
          const hasBigCards = remainingHand.some(card => {
            const testPlay = canPlayCards([card]);
            return testPlay && testPlay.value >= 12;
          });
          if (hasBigCards) {
            adjustedScore += adjustment.value * 50;
          }
        } else if (adjustment.target === 'supportWeight') {
          // 检查是否支援了队友（比如出牌让队友能够出）
          // 这里简化处理：如果出牌后剩余手牌少，可能是在支援
          if (remainingHand.length <= 6) {
            adjustedScore += adjustment.value * 50;
          }
        } else if (adjustment.target === 'aggressiveWeight') {
          // 激进权重：如果出的是大牌或炸弹，加分
          if (play.type === 'bomb' || play.type === 'dun' || play.value >= 12) {
            adjustedScore += adjustment.value * 50;
          }
        }
        break;
        
      case 'preference':
        // 偏好调整
        if (adjustment.target === 'action_preference') {
          // 直接调整基础分数
          adjustedScore += adjustment.value;
        } else if (adjustment.target === 'supportHuman') {
          // 如果出牌可能支援人类玩家（比如出小牌让人类能压过）
          if (play.value <= 10 && lastPlay && play.value > lastPlay.value) {
            adjustedScore += adjustment.value;
          }
        }
        break;
        
      case 'parameter':
        // 参数调整（这里可以扩展）
        break;
    }
  }
  
  return adjustedScore;
}

// 使用启发式选择最佳动作（当MCTS没有生成子节点时）
function selectBestActionByHeuristic(actions: Card[][], hand: Card[], lastPlay: Play | null): Card[] | null {
  if (actions.length === 0) return null;
  if (actions.length === 1) return actions[0];
  
  // 评估每个动作的质量
  const scoredActions = actions.map(action => ({
    action,
    score: evaluateActionQuality(action, hand, lastPlay, [], 0, false, [], undefined) // 基础版本
  }));
  
  // 选择得分最高的动作
  scoredActions.sort((a, b) => b.score - a.score);
  
  return scoredActions[0].action;
}

// ========== 对手手牌估计 ==========

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

// ========== 游戏模拟 ==========

/**
 * 初始化模拟游戏的手牌
 */
function initializeSimulationHands(
  state: SimulatedGameState,
  perfectInformation: boolean
): void {
  const allCards = generateAllCards();
  
  if (perfectInformation && state.allHands && state.allHands.length > 0) {
    // 完全信息模式：使用已知的手牌
    state.allHands = [...state.allHands];
  } else {
    // 估计模式：为所有对手估计手牌
    const playerCount = state.playerCount || 2;
    state.allHands = [state.aiHand];
    
    let usedCards = new Set(state.aiHand.map(c => `${c.suit}-${c.rank}`));
    
    for (let i = 1; i < playerCount; i++) {
      const allUsedCards = [...state.aiHand, ...state.allHands.slice(1).flat()];
      const opponentHand = estimateOpponentHand(allUsedCards, allCards, state.aiHand.length);
      state.allHands.push(opponentHand);
      opponentHand.forEach(card => usedCards.add(`${card.suit}-${card.rank}`));
    }
  }
  
  // 如果只有一个对手，兼容旧代码
  if (!state.opponentHands || state.opponentHands.length === 0) {
    state.opponentHands = state.allHands.slice(1); // 排除AI（索引0）
  }
}

/**
 * 处理要不起的情况
 */
function handlePassTurn(state: SimulatedGameState): void {
  if (state.lastPlay) {
    // 清空上家出牌，下一个玩家可以出任意牌
    state.lastPlay = null;
    state.lastPlayPlayerIndex = null;
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.playerCount;
  } else {
    // 所有人都要不起，这轮结束，分数给最后出牌的人
    if (state.lastPlayPlayerIndex !== null) {
      state.roundScore = 0; // 重置轮次分数（已分配）
    }
    state.lastPlay = null;
    state.lastPlayPlayerIndex = null;
    state.currentPlayerIndex = (state.lastPlayPlayerIndex !== null 
      ? (state.lastPlayPlayerIndex + 1) 
      : (state.currentPlayerIndex + 1)) % state.playerCount;
  }
}

/**
 * 在模拟中选择动作（使用启发式策略）
 */
function selectActionInSimulation(
  playableOptions: Card[][],
  currentHand: Card[],
  state: SimulatedGameState,
  currentPlayerIdx: number
): Card[] {
  if (playableOptions.length === 1) {
    return playableOptions[0];
  }
  
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
    
    // 3. 炸弹和墩谨慎使用
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
    
    // 5. 如果需要压牌，选择最小的能压过的牌
    if (state.lastPlay && play.value <= state.lastPlay.value + 3) {
      score += 15; // 优先使用小牌压过
    }
    
    // 6. 检查是否会拆散组合牌型
    const handRankGroups = countRankGroups(currentHand);
    const playRank = cards[0].rank;
    const originalCount = handRankGroups.get(playRank) || 0;
    const remainingCount = originalCount - cards.length;
    
    if (originalCount >= 3 && remainingCount > 0) {
      if (originalCount === 3 && play.type === 'single') {
        score -= 80; // 避免拆散三张
      } else if (originalCount === 3 && play.type === 'pair') {
        score -= 100; // 避免拆散三张产生死牌
      } else if (originalCount >= 4 && originalCount < 7 && remainingCount > 0 && remainingCount < 3) {
        score -= 150; // 避免拆散炸弹
      } else if (originalCount >= 7 && play.type !== 'dun') {
        score -= 200; // 严重惩罚拆散墩
      }
    }
    
    // 7. 分牌策略
    const actionInfo = calculateScoreCardInfo(cards);
    const remainingHand = currentHand.filter(card => !cards.some(c => c.id === card.id));
    const remainingInfo = calculateScoreCardInfo(remainingHand);
    
    if (currentPlayerIdx === 0) {
      // AI的策略：保护自己的分牌
      if (actionInfo.scoreCards.length > 0) {
        if (state.roundScore > 0 && state.lastPlay && canBeat(play, state.lastPlay)) {
          score += 50; // 能拿到分，出分牌值得
        } else if (!state.lastPlay && remainingHand.some(c => {
          const testPlay = canPlayCards([c]);
          return testPlay && testPlay.value >= 12; // 有大牌保护
        })) {
          score += 30; // 有大牌保护，可以出分牌引诱
        } else {
          score -= 60; // 不能确保拿到分，不要出分牌
        }
      } else if (remainingInfo.score > 0) {
        score += 20; // 保护了自己的分牌
      }
    } else {
      // 对手的策略（模拟）：如果这轮有分且能拿，会出分牌
      if (state.roundScore > 10 && state.lastPlay && canBeat(play, state.lastPlay)) {
        score += 40; // 对手会尽量拿分
      }
    }
    
    return { cards, score };
  });
  
  // 选择得分最高的选项（添加一些随机性）
  scoredOptions.sort((a, b) => b.score - a.score);
  const topScore = scoredOptions[0].score;
  const goodOptions = scoredOptions.filter(opt => opt.score >= topScore - 5);
  
  // 从得分相近的选项中随机选择
  return goodOptions[Math.floor(Math.random() * goodOptions.length)].cards;
}

/**
 * 更新游戏状态（出牌后）
 */
function updateGameStateAfterPlay(
  state: SimulatedGameState,
  selectedAction: Card[],
  play: Play
): void {
  const playerIdx = state.currentPlayerIndex;
  
  // 移除已出的牌
  if (playerIdx === 0) {
    state.aiHand = state.aiHand.filter(
      card => !selectedAction.some(c => c.id === card.id)
    );
    state.allHands[0] = state.aiHand;
  } else {
    state.allHands[playerIdx] = state.allHands[playerIdx].filter(
      card => !selectedAction.some(c => c.id === card.id)
    );
    if (state.allHands[playerIdx].length === 0) {
      state.isTerminal = true;
      state.winner = playerIdx;
      return;
    }
  }
  
  // 检查AI是否获胜
  if (state.aiHand.length === 0) {
    state.isTerminal = true;
    state.winner = 0;
    return;
  }
  
  // 更新轮次分数
  const actionInfo = calculateScoreCardInfo(selectedAction);
  state.roundScore += actionInfo.score;
  
  // 更新最后出牌信息
  state.lastPlay = play;
  state.lastPlayPlayerIndex = playerIdx;
  
  // 转到下一个玩家
  state.currentPlayerIndex = (playerIdx + 1) % state.playerCount;
}

// 快速模拟游戏（从当前状态到游戏结束）- 支持完全信息和分牌策略
function simulateGame(
  state: SimulatedGameState,
  maxDepth: number,
  perfectInformation: boolean = false
): number { // 返回获胜者索引（0=AI，1+是对手）
  let currentState: SimulatedGameState = { ...state };
  let depth = 0;
  
  // 初始化手牌
  initializeSimulationHands(currentState, perfectInformation);
  
  while (!currentState.isTerminal && depth < maxDepth) {
    // 获取当前玩家的手牌
    const currentPlayerIdx = currentState.currentPlayerIndex;
    const currentHand = currentPlayerIdx === 0 
      ? currentState.aiHand 
      : currentState.allHands[currentPlayerIdx] || [];
    
    // 获取可出牌选项
    const playableOptions = findPlayableCards(currentHand, currentState.lastPlay);
    
    if (playableOptions.length === 0) {
      // 要不起
      handlePassTurn(currentState);
      depth++;
      continue;
    }
    
    // 选择动作
    const selectedAction = selectActionInSimulation(
      playableOptions,
      currentHand,
      currentState,
      currentPlayerIdx
    );
    
    const play = canPlayCards(selectedAction);
    if (!play) {
      depth++;
      continue;
    }
    
    // 更新游戏状态
    updateGameStateAfterPlay(currentState, selectedAction, play);
    
    if (currentState.isTerminal) {
      break;
    }
    
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

// ========== 反向传播 ==========

// 反向传播：更新节点统计
function backpropagate(node: MCTSNode | null, winner: number) {
  let currentNode: MCTSNode | null = node;
  
  while (currentNode) {
    currentNode.visits++;
    
    // 判断这个节点是否导致AI获胜
    if (winner === 0) {
      currentNode.wins += 1;
    }
    
    currentNode = currentNode.parent;
  }
}

// ========== MCTS主算法 ==========

/**
 * 初始化MCTS模拟的手牌
 */
function initializeMCTSHands(
  node: MCTSNode,
  config: MCTSConfig,
  allCards: Card[]
): Card[][] {
  const playerCount = config.playerCount || 2;
  const allHands: Card[][] = [];
  
  if (config.perfectInformation && config.allPlayerHands) {
    // 完全信息模式：使用已知的手牌
    allHands.push([...node.hand]); // AI手牌
    config.allPlayerHands.slice(1).forEach(hand => {
      allHands.push([...hand]); // 复制对手手牌
    });
  } else {
    // 估计模式：需要估计对手手牌
    allHands.push([...node.hand]); // AI手牌
    
    const aiHandSize = node.hand.length;
    
    for (let i = 1; i < playerCount; i++) {
      const allUsedCards = [...node.hand, ...allHands.slice(1).flat()];
      const opponentHand = estimateOpponentHand(allUsedCards, allCards, aiHandSize);
      allHands.push(opponentHand);
    }
  }
  
  return allHands;
}

// MCTS主算法
function mcts(
  rootHand: Card[],
  lastPlay: Play | null,
  config: MCTSConfig
): Card[] | null {
  // 快速模式：大幅降低默认迭代次数以提高速度
  const iterations = config.iterations || 50;
  const explorationConstant = config.explorationConstant || 1.414; // √2
  const baseDepth = config.simulationDepth || 20;
  const maxDepth = Math.min(50, rootHand.length * 2);
  const simulationDepth = Math.max(baseDepth, maxDepth);
  
  // 添加超时保护：如果手牌太多，进一步降低迭代次数
  const adjustedIterations = rootHand.length > 30 
    ? Math.max(30, Math.floor(iterations * 0.6))
    : rootHand.length > 20
    ? Math.max(40, Math.floor(iterations * 0.8))
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
  
  // 生成所有牌（用于估计对手手牌）
  const allCards = generateAllCards();
  
  // MCTS主循环
  const startTime = Date.now();
  const maxTime = 2000; // 最多2秒（快速模式）
  
  for (let i = 0; i < adjustedIterations; i++) {
    // 超时保护
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
    if (node.hand.length === 0) {
      // AI获胜
      backpropagate(node, 0);
      continue;
    }
    
    // 初始化所有玩家手牌
    const allHands = initializeMCTSHands(node, config, allCards);
    
    const gameState: SimulatedGameState = {
      aiHand: [...node.hand],
      opponentHands: allHands.slice(1),
      allHands: allHands,
      lastPlay: node.lastPlay,
      lastPlayPlayerIndex: null,
      currentPlayerIndex: node.playerToMove === 'ai' ? 0 : 1,
      playerCount: config.playerCount || 2,
      roundScore: config.currentRoundScore || 0,
      aiScore: 0,
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
    return selectBestActionByHeuristic(playableOptions, rootHand, root.lastPlay) 
      || playableOptions[0] 
      || null;
  }
  
  // 计算每个子节点的综合分数
  const scoredChildren = root.children.map(child => {
    if (!child.action) return { child, score: 0 };
    
    // 基础分数：访问次数和胜率
    const visitScore = child.visits;
    const winRate = child.visits > 0 ? child.wins / child.visits : 0;
    const baseScore = visitScore * (0.7 + winRate * 0.3);
    
    // 启发式分数：动作质量
    const opponentHands = config.perfectInformation && config.allPlayerHands 
      ? config.allPlayerHands.filter((_, idx) => idx > 0)
      : [];
    const heuristicScore = evaluateActionQuality(
      child.action, 
      rootHand, 
      root.lastPlay,
      opponentHands,
      config.currentRoundScore || 0,
      config.perfectInformation || false,
      config.strategyAdjustments || [],
      config
    );
    
    return {
      child,
      score: baseScore + heuristicScore * 5
    };
  });
  
  // 选择综合分数最高的子节点
  scoredChildren.sort((a, b) => b.score - a.score);
  
  return scoredChildren[0].child.action;
}

/**
 * MCTS生成多个候选动作（用于多方案建议）
 * @param hand 手牌
 * @param lastPlay 上家出的牌
 * @param config MCTS配置
 * @param topN 返回前N个最佳动作
 * @returns 前N个最佳动作列表
 */
export function mctsChooseMultiplePlays(
  hand: Card[],
  lastPlay: Play | null,
  config: MCTSConfig = {},
  topN: number = 5
): Array<{ cards: Card[]; score: number }> {
  try {
    // 快速模式：降低迭代次数以提高速度
    const iterations = config.iterations || 50;
    const explorationConstant = config.explorationConstant || 1.414;
    const baseDepth = config.simulationDepth || 20;
    const maxDepth = Math.min(50, hand.length * 2);
    const simulationDepth = Math.max(baseDepth, maxDepth);
    
    const adjustedIterations = hand.length > 30 
      ? Math.max(30, Math.floor(iterations * 0.6))
      : hand.length > 20
      ? Math.max(40, Math.floor(iterations * 0.8))
      : iterations;
    
    const playableOptions = findPlayableCards(hand, lastPlay);
    
    if (playableOptions.length === 0) {
      return [];
    }
    
    const root: MCTSNode = {
      hand: hand,
      lastPlay: lastPlay,
      playerToMove: 'ai',
      visits: 0,
      wins: 0,
      children: [],
      parent: null,
      action: null,
      untriedActions: [...playableOptions]
    };
    
    const allCards = generateAllCards();
    const startTime = Date.now();
    const maxTime = 2000;
    
    // MCTS主循环
    for (let i = 0; i < adjustedIterations; i++) {
      if (Date.now() - startTime > maxTime) {
        break;
      }
      
      let node = root;
      
      // Selection
      while (node.children.length > 0 && node.untriedActions.length === 0) {
        node = selectBestChild(node, explorationConstant);
      }
      
      // Expansion
      if (node.untriedActions.length > 0) {
        if (node.untriedActions.length === 0) {
          const actions = generateActions(node.hand, node.lastPlay);
          node.untriedActions = actions;
        }
        
        const expandedNode = expandNode(node, []);
        if (expandedNode) {
          node = expandedNode;
        }
      }
      
      // Simulation
      if (node.hand.length === 0) {
        backpropagate(node, 0);
        continue;
      }
      
      const allHands = initializeMCTSHands(node, config, allCards);
      
      const gameState: SimulatedGameState = {
        aiHand: [...node.hand],
        opponentHands: allHands.slice(1),
        allHands: allHands,
        lastPlay: node.lastPlay,
        lastPlayPlayerIndex: null,
        currentPlayerIndex: node.playerToMove === 'ai' ? 0 : 1,
        playerCount: config.playerCount || 2,
        roundScore: config.currentRoundScore || 0,
        aiScore: 0,
        isTerminal: false,
        winner: null,
        perfectInformation: config.perfectInformation || false
      };
      
      const winner = simulateGame(gameState, simulationDepth, config.perfectInformation || false);
      
      // Backpropagation
      backpropagate(node, winner);
    }
    
    // 计算所有子节点的综合分数
    const scoredActions: Array<{ cards: Card[]; score: number }> = [];
    
    if (root.children.length === 0) {
      // 如果没有子节点，使用启发式选择前N个
      const heuristicScored = playableOptions.map(action => {
        const play = canPlayCards(action);
        if (!play) return null;
        
        const opponentHands = config.perfectInformation && config.allPlayerHands 
          ? config.allPlayerHands.filter((_, idx) => idx > 0)
          : [];
        const heuristicScore = evaluateActionQuality(
          action,
          hand,
          lastPlay,
          opponentHands,
          config.currentRoundScore || 0,
          config.perfectInformation || false,
          config.strategyAdjustments || [],
          config
        );
        
        return { cards: action, score: heuristicScore };
      }).filter((item): item is { cards: Card[]; score: number } => item !== null);
      
      heuristicScored.sort((a, b) => b.score - a.score);
      return heuristicScored.slice(0, topN);
    }
    
    // 使用MCTS结果
    root.children.forEach(child => {
      if (!child.action) return;
      
      const visitScore = child.visits;
      const winRate = child.visits > 0 ? child.wins / child.visits : 0;
      const baseScore = visitScore * (0.7 + winRate * 0.3);
      
      const opponentHands = config.perfectInformation && config.allPlayerHands 
        ? config.allPlayerHands.filter((_, idx) => idx > 0)
        : [];
      const heuristicScore = evaluateActionQuality(
        child.action,
        hand,
        lastPlay,
        opponentHands,
        config.currentRoundScore || 0,
        config.perfectInformation || false,
        config.strategyAdjustments || [],
        config
      );
      
      const totalScore = baseScore + heuristicScore * 5;
      scoredActions.push({ cards: child.action, score: totalScore });
    });
    
    // 按分数排序，返回前N个
    scoredActions.sort((a, b) => b.score - a.score);
    return scoredActions.slice(0, topN);
  } catch (error) {
    // 降级到简单策略
    const playableOptions = findPlayableCards(hand, lastPlay);
    if (playableOptions.length === 0) return [];
    
    const validPlays = playableOptions
      .map(cards => ({ cards, play: canPlayCards(cards) }))
      .filter((item): item is { cards: Card[]; play: Play } => {
        if (!item.play) return false;
        if (!lastPlay) return true;
        return canBeat(item.play, lastPlay);
      });
    
    validPlays.sort((a, b) => a.play.value - b.play.value);
    return validPlays.slice(0, topN).map(item => ({ cards: item.cards, score: 50 }));
  }
}

// ========== 导出函数 ==========

// MCTS AI选择出牌
export function mctsChoosePlay(
  hand: Card[],
  lastPlay: Play | null,
  config: MCTSConfig = {}
): Card[] | null {
  try {
    return mcts(hand, lastPlay, config);
  } catch (error) {
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
