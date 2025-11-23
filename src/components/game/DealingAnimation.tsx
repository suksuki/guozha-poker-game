/**
 * 发牌动画组件
 * 支持一张一张发牌，带有动画效果
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Card, Player, Suit, Rank } from '../../types/card';
import { CardComponent } from '../CardComponent';
import { dealCardsWithAlgorithm, DealingConfig, DealingAlgorithm } from '../../utils/dealingAlgorithms';
import { triggerDealingReaction, chatService } from '../../services/chatService';
import { sortCards, SortOrder, groupCardsByRank } from '../../utils/cardSorting';
import { PlayerHandGrouped } from './PlayerHandGrouped';
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
  
  const dealingIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
      
      // 触发发牌聊天反应（每发几张牌或特殊牌时）
      if (prev.currentCardIndex % (playerCount * 5) === 0 || 
          card.suit === Suit.JOKER || 
          (card.rank === Rank.TWO && prev.currentCardIndex < playerCount * 10)) {
        triggerDealingReaction(players[playerIndex], card, prev.currentCardIndex, prev.allCards.length).catch(console.error);
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
          ).catch(console.error);
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
  const handleManualDeal = useCallback(() => {
    if (!isManualMode || dealingState.isComplete) return;
    if (dealingState.currentCardIndex >= dealingState.allCards.length) return;
    
    dealNextCard();
  }, [isManualMode, dealingState, dealNextCard]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (dealingIntervalRef.current) {
        clearInterval(dealingIntervalRef.current);
      }
    };
  }, []);

  // 计算玩家位置（圆形布局）
  const getPlayerPosition = (index: number): { x: number; y: number; angle: number } => {
    const angle = (index * 2 * Math.PI) / playerCount - Math.PI / 2; // 从顶部开始
    const radius = 200; // 半径（像素）
    const centerX = 50; // 百分比
    const centerY = 50;
    
    return {
      x: centerX + (radius / 10) * Math.cos(angle),
      y: centerY + (radius / 10) * Math.sin(angle),
      angle: angle * (180 / Math.PI)
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

      {/* AI玩家区域（小预览） */}
      {players.map((player, index) => {
        if (index === humanPlayerIndex) return null; // 人类玩家单独显示
        
        const position = getPlayerPosition(index);
        const dealtCount = dealingState.dealtCards[index]?.length || 0;
        
        return (
          <div
            key={index}
            className="player-dealing-area ai-player"
            ref={el => playerAreaRefs.current[index] = el}
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
              transform: `translate(-50%, -50%)`
            }}
          >
            <div className="player-name">{player.name}</div>
            <div className="player-card-count">{dealtCount} 张</div>
            <div className="player-cards-preview">
              {dealingState.dealtCards[index]?.slice(-5).map((card) => (
                <CardComponent
                  key={card.id}
                  card={card}
                  size="small"
                  faceDown={true}
                />
              ))}
            </div>
          </div>
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
            setIsManualMode(!isManualMode);
            // 如果切换到自动模式且还没开始，自动开始
            if (!isManualMode && !dealingState.isDealing && !dealingState.isComplete) {
              setTimeout(() => startDealing(), 100);
            }
            // 如果切换到手动模式，清除自动定时器
            if (isManualMode && dealingIntervalRef.current) {
              clearInterval(dealingIntervalRef.current);
              dealingIntervalRef.current = null;
            }
          }}
        >
          {isManualMode ? '🔄 切换到自动' : '👆 切换到手动'}
        </button>
      </div>
    </div>
  );
};

