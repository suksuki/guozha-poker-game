/**
 * 发牌动画组件
 * 支持一张一张发牌，带有动画效果
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Player, Suit, Rank } from '../../types/card';
import { CardComponent } from '../CardComponent';
import { dealCardsWithAlgorithm, DealingConfig, DealingAlgorithm } from '../../utils/dealingAlgorithms';
import { triggerDealingReaction, chatService, getChatMessages } from '../../services/chatService';
import { sortCards, SortOrder, groupCardsByRank } from '../../utils/cardSorting';
import { PlayerHandGrouped } from './PlayerHandGrouped';
import { ChatBubble } from '../ChatBubble';
import { ChatMessage } from '../../types/chat';
import { AIPlayerAvatar } from './AIPlayerAvatar';
import './DealingAnimation.css';

export interface DealingAnimationProps {
  playerCount: number;
  humanPlayerIndex: number;
  players: Omit<Player, 'hand'>[]; // 玩家信息（不含手牌）
  dealingConfig: DealingConfig;
  onComplete: (hands: Card[][]) => void;
  onCancel?: () => void;
  dealingSpeed?: number; // 发牌速度（毫秒/张），默认150
  sortOrder?: SortOrder; // 排序规则，默认'grouped'
}

interface DealingState {
  currentCardIndex: number;
  currentPlayerIndex: number;
  dealtCards: Card[][]; // 每个玩家已发的牌
  allCards: Card[]; // 所有待发的牌（按发牌顺序）
  isDealing: boolean;
  isComplete: boolean;
}

export const DealingAnimation: React.FC<DealingAnimationProps> = ({
  playerCount,
  humanPlayerIndex,
  players,
  dealingConfig,
  onComplete,
  onCancel,
  dealingSpeed = 150,
  sortOrder = 'grouped'
}) => {
  const [dealingState, setDealingState] = useState<DealingState>({
    currentCardIndex: 0,
    currentPlayerIndex: 0,
    dealtCards: Array(playerCount).fill(null).map(() => []),
    allCards: [],
    isDealing: false,
    isComplete: false
  });

  const [flyingCard, setFlyingCard] = useState<{ card: Card; from: { x: number; y: number }; to: { x: number; y: number }; playerIndex: number } | null>(null);
  const [lastDealtCard, setLastDealtCard] = useState<{ card: Card; playerIndex: number } | null>(null);
  const [sortedHands, setSortedHands] = useState<Card[][]>(Array(playerCount).fill(null).map(() => [])); // 排序后的手牌
  const [expandedRanks, setExpandedRanks] = useState<Set<number>>(new Set()); // 展开的rank组
  const [isManualMode, setIsManualMode] = useState(false); // 手动/自动模式
  const [activeChatBubbles, setActiveChatBubbles] = useState<Map<number, ChatMessage>>(new Map()); // 聊天气泡
  const [isDealingToAI, setIsDealingToAI] = useState(false); // 是否正在自动发给AI玩家（手动模式下）
  
  const dealingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const aiDealTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerAreaRefs = useRef<(HTMLDivElement | null)[]>(Array(playerCount).fill(null));
  const centerRef = useRef<HTMLDivElement>(null);
  const humanPlayerHandRef = useRef<HTMLDivElement>(null);

  // 初始化：生成所有牌
  useEffect(() => {
    const result = dealCardsWithAlgorithm(dealingConfig);
    
    // 将手牌转换为发牌顺序（轮询发牌）
    const allCardsInOrder: Card[] = [];
    const maxCards = Math.max(...result.cardsPerPlayer);
    
    for (let round = 0; round < maxCards; round++) {
      for (let playerIndex = 0; playerIndex < playerCount; playerIndex++) {
        if (round < result.hands[playerIndex].length) {
          allCardsInOrder.push(result.hands[playerIndex][round]);
        }
      }
    }
    
    setDealingState(prev => ({
      ...prev,
      allCards: allCardsInOrder
    }));
  }, [playerCount, dealingConfig]);

  // 发牌逻辑
  const dealNextCard = useCallback(() => {
    setDealingState(prev => {
      if (prev.currentCardIndex >= prev.allCards.length) {
        // 发牌完成
        if (dealingIntervalRef.current) {
          clearInterval(dealingIntervalRef.current);
          dealingIntervalRef.current = null;
        }
        
        // 触发完成聊天
        setTimeout(() => {
          const finalHands = prev.dealtCards;
          onComplete(finalHands);
        }, 500);
        
        return {
          ...prev,
          isDealing: false,
          isComplete: true
        };
      }

      const card = prev.allCards[prev.currentCardIndex];
      const playerIndex = prev.currentPlayerIndex;
      
      // 计算飞行动画起点和终点
      const centerElement = centerRef.current;
      const playerElement = playerAreaRefs.current[playerIndex];
      
      let fromX = 0, fromY = 0;
      let toX = 0, toY = 0;
      
      if (centerElement) {
        const centerRect = centerElement.getBoundingClientRect();
        fromX = centerRect.left + centerRect.width / 2;
        fromY = centerRect.top + centerRect.height / 2;
      }
      
      if (playerElement) {
        const playerRect = playerElement.getBoundingClientRect();
        toX = playerRect.left + playerRect.width / 2;
        toY = playerRect.top + playerRect.height / 2;
      }
      
      // 设置飞行中的牌
      setFlyingCard({
        card,
        from: { x: fromX, y: fromY },
        to: { x: toX, y: toY },
        playerIndex
      });
      
      // 更新已发牌
      const newDealtCards = [...prev.dealtCards];
      newDealtCards[playerIndex] = [...newDealtCards[playerIndex], card];
      
      // 排序手牌（理牌）
      const sortedHand = sortCards(newDealtCards[playerIndex], sortOrder);
      
      // 更新排序后的手牌（使用函数式更新）
      setSortedHands(prevSorted => {
        const newSorted = [...prevSorted];
        newSorted[playerIndex] = sortedHand;
        return newSorted;
      });
      
      // 触发发牌聊天反应（所有玩家都可以参与）
      // AI玩家：每发几张牌或特殊牌时触发
      // 人类玩家：只在特殊牌时触发（理牌时会单独触发）
      const isAIPlayer = playerIndex !== humanPlayerIndex;
      const shouldTriggerDealingChat = isAIPlayer && (
        prev.currentCardIndex % (playerCount * 3) === 0 || // AI玩家每发3轮牌触发一次
        card.suit === Suit.JOKER || // 大小王
        card.rank === Rank.TWO || // 2
        card.rank === Rank.ACE || // A
        (prev.currentCardIndex < playerCount * 5 && Math.random() < 0.3) // 前5轮有30%概率随机触发
      );
      
      if (shouldTriggerDealingChat) {
        // 为当前玩家触发发牌聊天反应
        const currentPlayer = { ...players[playerIndex], hand: newDealtCards[playerIndex] } as Player;
        triggerDealingReaction(currentPlayer, card, prev.currentCardIndex, prev.allCards.length)
          .then(() => {
            // 获取最新的聊天消息并显示气泡
            const messages = getChatMessages();
            const latestMessage = messages[messages.length - 1];
            if (latestMessage && latestMessage.playerId === currentPlayer.id) {
              setActiveChatBubbles(prev => {
                const newMap = new Map(prev);
                newMap.set(latestMessage.playerId, latestMessage);
                return newMap;
              });
              // 3秒后移除气泡
              setTimeout(() => {
                setActiveChatBubbles(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(latestMessage.playerId);
                  return newMap;
                });
              }, 3000);
            }
          })
          .catch(console.error);
      }
      
      // 触发理牌聊天反应（仅对人类玩家，且是刚发的牌）
      if (playerIndex === humanPlayerIndex && sortedHand.length > 0) {
        // 延迟触发，让排序动画先完成
        setTimeout(() => {
          const humanPlayer = { ...players[playerIndex], hand: sortedHand } as Player;
          chatService.triggerSortingReaction(
            humanPlayer,
            sortedHand,
            card
          ).then(() => {
            // 获取最新的聊天消息并显示气泡
            const messages = getChatMessages();
            const latestMessage = messages[messages.length - 1];
            if (latestMessage && latestMessage.playerId === humanPlayer.id) {
              setActiveChatBubbles(prev => {
                const newMap = new Map(prev);
                newMap.set(latestMessage.playerId, latestMessage);
                return newMap;
              });
              // 3秒后移除气泡
              setTimeout(() => {
                setActiveChatBubbles(prev => {
                  const newMap = new Map(prev);
                  newMap.delete(latestMessage.playerId);
                  return newMap;
                });
              }, 3000);
            }
          }).catch(console.error);
        }, 200);
      }
      
      // 清除飞行牌（动画结束后）
      setTimeout(() => {
        setFlyingCard(null);
        setLastDealtCard({ card, playerIndex });
        setTimeout(() => setLastDealtCard(null), 300);
      }, 400);
      
      // 计算下一个玩家
      const nextPlayerIndex = (playerIndex + 1) % playerCount;
      
      return {
        ...prev,
        currentCardIndex: prev.currentCardIndex + 1,
        currentPlayerIndex: nextPlayerIndex,
        dealtCards: newDealtCards,
        isDealing: true
      };
    });
  }, [playerCount, players, onComplete, humanPlayerIndex, sortOrder]);

  // 开始发牌
  const startDealing = useCallback(() => {
    if (dealingState.allCards.length === 0) return;
    
    setDealingState(prev => ({ ...prev, isDealing: true }));
    
    // 如果是自动模式，第一张牌立即发出，然后设置定时器
    if (!isManualMode) {
      dealNextCard();
      
      // 设置定时器，每张牌间隔
      dealingIntervalRef.current = setInterval(() => {
        dealNextCard();
      }, dealingSpeed); // 使用配置的发牌速度
    }
    // 手动模式：等待用户点击牌堆
  }, [dealingState.allCards.length, dealNextCard, isManualMode, dealingSpeed]);

  // 组件挂载时自动开始发牌（仅自动模式）
  useEffect(() => {
    if (dealingState.allCards.length > 0 && !dealingState.isDealing && !dealingState.isComplete && !isManualMode) {
      const timer = setTimeout(() => {
        startDealing();
      }, 500); // 延迟500ms开始，让UI准备好
      
      return () => clearTimeout(timer);
    } else if (dealingState.allCards.length > 0 && !dealingState.isDealing && !dealingState.isComplete && isManualMode) {
      // 手动模式：只设置状态，不自动发牌
      setDealingState(prev => ({ ...prev, isDealing: true }));
    }
  }, [dealingState.allCards.length, dealingState.isDealing, dealingState.isComplete, isManualMode, startDealing]);

  // 手动抓牌：点击牌堆
  // 逻辑：点击后，如果还没轮到人类玩家，先自动发给前面的玩家直到轮到人类玩家
  // 然后发一张给人类玩家，再自动发给所有AI玩家（每人一张），然后停住
  const handleManualDeal = useCallback(() => {
    if (!isManualMode || dealingState.isComplete) return;
    if (dealingState.currentCardIndex >= dealingState.allCards.length) return;
    
    // 如果正在发给AI玩家，不应该再次触发
    if (isDealingToAI) {
      return;
    }
    
    // 如果还没轮到人类玩家，先自动发给前面的玩家，直到轮到人类玩家
    const currentPlayerIndex = dealingState.currentPlayerIndex;
    if (currentPlayerIndex !== humanPlayerIndex) {
      // 自动发给前面的玩家，直到轮到人类玩家
      setIsDealingToAI(true);
      return;
    }
    
    // 轮到人类玩家了，发一张给人类玩家
    dealNextCard();
    
    // 设置标志，开始自动发给AI玩家
    // 延迟一下，让人类玩家的牌先发完
    setTimeout(() => {
      setIsDealingToAI(true);
    }, dealingSpeed);
    
  }, [isManualMode, dealingState, dealNextCard, humanPlayerIndex, isDealingToAI, dealingSpeed]);
  
  // 在手动模式下，当轮到AI玩家时，自动发牌
  useEffect(() => {
    if (!isManualMode || !isDealingToAI) return;
    if (dealingState.isComplete) {
      setIsDealingToAI(false);
      return;
    }
    if (dealingState.currentCardIndex >= dealingState.allCards.length) {
      setIsDealingToAI(false);
      return;
    }
    
    // 检查当前是否轮到人类玩家（说明已经发完一轮）
    if (dealingState.currentPlayerIndex === humanPlayerIndex) {
      // 又轮到人类玩家，停止自动发牌
      setIsDealingToAI(false);
      return;
    }
    
    // 当前轮到AI玩家，自动发牌
    if (aiDealTimeoutRef.current) {
      clearTimeout(aiDealTimeoutRef.current);
    }
    
    aiDealTimeoutRef.current = setTimeout(() => {
      dealNextCard();
    }, dealingSpeed);
    
    return () => {
      if (aiDealTimeoutRef.current) {
        clearTimeout(aiDealTimeoutRef.current);
      }
    };
  }, [isManualMode, isDealingToAI, dealingState.currentPlayerIndex, dealingState.currentCardIndex, dealingState.isComplete, humanPlayerIndex, dealNextCard, dealingSpeed]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (dealingIntervalRef.current) {
        clearInterval(dealingIntervalRef.current);
      }
      if (aiDealTimeoutRef.current) {
        clearTimeout(aiDealTimeoutRef.current);
      }
    };
  }, []);

  // 计算玩家位置（圆形布局）
  const getPlayerPosition = (index: number): { x: number; y: number; angle: number } => {
    // AI玩家显示在顶部，水平排列
    // 计算当前index是第几个AI玩家（跳过人类玩家）
    let aiIndex = 0;
    for (let i = 0; i < index; i++) {
      if (i !== humanPlayerIndex) {
        aiIndex++;
      }
    }
    
    // 计算总AI玩家数
    const totalAIPlayers = playerCount - 1; // 减去人类玩家
    const spacing = 100 / (totalAIPlayers + 1); // 平均分布
    const x = spacing * (aiIndex + 1); // 水平位置（从左边开始）
    const y = 0; // 从顶部开始（实际位置会加上10px padding）
    
    return {
      x,
      y,
      angle: 0 // 不需要角度
    };
  };

  // 人类玩家的分组手牌（用于显示）
  const humanPlayerGroupedHand = useMemo(() => {
    const humanHand = sortedHands[humanPlayerIndex] || [];
    return groupCardsByRank(humanHand);
  }, [sortedHands, humanPlayerIndex]);

  // 处理手牌点击（在发牌过程中禁用）
  const handleCardClick = useCallback((card: Card) => {
    // 发牌过程中不允许点击
  }, []);

  // 切换展开/收起
  const handleToggleExpand = useCallback((rank: number) => {
    setExpandedRanks(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(rank)) {
        newExpanded.delete(rank);
      } else {
        newExpanded.add(rank);
      }
      return newExpanded;
    });
  }, []);

  return (
    <div className="dealing-animation-container" ref={containerRef}>
      <div className="dealing-center" ref={centerRef}>
        <div 
          className={`dealing-deck ${isManualMode && !dealingState.isComplete ? 'clickable-deck' : ''}`}
          onClick={isManualMode && !dealingState.isComplete ? handleManualDeal : undefined}
          style={{ cursor: isManualMode && !dealingState.isComplete ? 'pointer' : 'default' }}
        >
          <div className="deck-count">
            {dealingState.allCards.length - dealingState.currentCardIndex}
          </div>
          {isManualMode && !dealingState.isComplete && (
            <div className="manual-deal-hint">点击抓牌</div>
          )}
        </div>
      </div>

      {/* AI玩家区域（卡通头像 + 状态面板） */}
      {players.map((player, index) => {
        if (index === humanPlayerIndex) return null; // 人类玩家单独显示
        
        const position = getPlayerPosition(index);
        const dealtCount = dealingState.dealtCards[index]?.length || 0;
        
        return (
          <AIPlayerAvatar
            key={index}
            player={player}
            handCount={dealtCount}
            position={position}
            showPosition={true}
            ref={el => { playerAreaRefs.current[index] = el; }}
          />
        );
      })}

      {/* 人类玩家手牌区域（真实显示） */}
      <div 
        className="human-player-hand-area"
        ref={humanPlayerHandRef}
        style={{
          position: 'absolute',
          bottom: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '90%',
          maxWidth: '1200px',
          zIndex: 100
        }}
      >
        <div className="human-player-hand-header">
          <div className="player-name">{players[humanPlayerIndex]?.name || '你'}</div>
          <div className="player-card-count">
            {sortedHands[humanPlayerIndex]?.length || 0} 张
          </div>
        </div>
        <div className="human-player-hand-content">
          <PlayerHandGrouped
            groupedHand={humanPlayerGroupedHand}
            selectedCards={[]}
            expandedRanks={expandedRanks}
            onCardClick={handleCardClick}
            onToggleExpand={handleToggleExpand}
          />
        </div>
      </div>

      {/* 飞行中的牌 */}
      {flyingCard && (
        <div
          className="flying-card"
          style={{
            left: `${flyingCard.from.x}px`,
            top: `${flyingCard.from.y}px`,
            '--to-x': `${flyingCard.to.x}px`,
            '--to-y': `${flyingCard.to.y}px`
          } as React.CSSProperties}
        >
          <CardComponent card={flyingCard.card} size="medium" />
        </div>
      )}

      {/* 最后发出的牌（短暂高亮） */}
      {lastDealtCard && (
        <div className="last-dealt-card-highlight">
          <CardComponent card={lastDealtCard.card} size="medium" />
        </div>
      )}

      {/* 进度信息 */}
      <div className="dealing-progress">
        <div className="progress-text">
          发牌中... {dealingState.currentCardIndex} / {dealingState.allCards.length}
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill"
            style={{ width: `${(dealingState.currentCardIndex / dealingState.allCards.length) * 100}%` }}
          />
        </div>
      </div>

      {/* 控制按钮 */}
      <div className="dealing-controls">
        {onCancel && (
          <button className="dealing-cancel-btn" onClick={onCancel}>
            跳过发牌动画
          </button>
        )}
        <button 
          className="dealing-mode-btn" 
          onClick={() => {
            const newMode = !isManualMode;
            setIsManualMode(newMode);
            
            // 如果切换到自动模式，清除手动模式的标志，并开始自动发牌
            if (!newMode) {
              setIsDealingToAI(false);
              // 清除手动模式的定时器
              if (aiDealTimeoutRef.current) {
                clearTimeout(aiDealTimeoutRef.current);
                aiDealTimeoutRef.current = null;
              }
              // 如果还没开始发牌，自动开始
              if (!dealingState.isDealing && !dealingState.isComplete) {
                setTimeout(() => startDealing(), 100);
              } else if (dealingState.isDealing && !dealingState.isComplete) {
                // 如果正在发牌，继续自动发牌
                if (!dealingIntervalRef.current) {
                  dealingIntervalRef.current = setInterval(() => {
                    dealNextCard();
                  }, dealingSpeed);
                }
              }
            } else {
              // 如果切换到手动模式，清除自动定时器
              if (dealingIntervalRef.current) {
                clearInterval(dealingIntervalRef.current);
                dealingIntervalRef.current = null;
              }
            }
          }}
        >
          {isManualMode ? '🔄 切换到自动' : '👆 切换到手动'}
        </button>
        {/* 手动模式下的抓牌按钮 */}
        {isManualMode && !dealingState.isComplete && (
          <button 
            className="dealing-draw-btn" 
            onClick={handleManualDeal}
            disabled={
              dealingState.currentCardIndex >= dealingState.allCards.length || 
              isDealingToAI
            }
          >
            🎴 抓牌
          </button>
        )}
      </div>

      {/* 聊天气泡显示 - 所有玩家都可以显示 */}
      {Array.from(activeChatBubbles.entries()).map(([playerId, message]) => {
        const player = players.find(p => p.id === playerId);
        if (!player) return null;
        
        const playerIndex = players.findIndex(p => p.id === playerId);
        const position = getPlayerPosition(playerIndex);
        
        // 如果是人类玩家，气泡显示在底部手牌区域上方
        // 如果是AI玩家，气泡显示在玩家位置附近
        const bubbleStyle: React.CSSProperties = playerIndex === humanPlayerIndex
          ? {
              position: 'absolute',
              bottom: '350px',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1500
            }
          : {
              position: 'absolute',
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: 'translate(-50%, -100%)',
              marginTop: '-20px',
              zIndex: 1500
            };
        
        return (
          <ChatBubble
            key={`${playerId}-${message.timestamp}`}
            message={message}
            playerPosition={bubbleStyle}
            onComplete={() => {
              setActiveChatBubbles(prev => {
                const newMap = new Map(prev);
                newMap.delete(playerId);
                return newMap;
              });
            }}
          />
        );
      })}
    </div>
  );
};

