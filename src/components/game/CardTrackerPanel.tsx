/**
 * 记牌器面板组件
 * 显示游戏中的所有牌局详细信息，包括轮次详情、玩家手牌变化、统计信息等
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Player, Rank, Suit, Card } from '../../types/card';
import { cardTracker, DetailedRoundRecord, PlayerHandSnapshot } from '../../services/cardTrackerService';
import { CardComponent } from '../CardComponent';
import { getCardScore } from '../../utils/cardUtils';
import './CardTrackerPanel.css';

interface CardTrackerPanelProps {
  players?: Player[];
  currentRoundNumber: number;
  gameStatus: 'waiting' | 'playing' | 'finished';
  currentRoundPlays?: any[]; // 当前轮次的出牌记录
  currentRoundScore?: number; // 当前轮次的分数
  allRoundsFromGameState?: any[]; // 从游戏状态获取的所有轮次（用于补充记牌器）
}

export const CardTrackerPanel: React.FC<CardTrackerPanelProps> = ({
  players = [],
  currentRoundNumber,
  gameStatus,
  currentRoundPlays = [],
  currentRoundScore = 0,
  allRoundsFromGameState = []
}) => {
  const [activeTab, setActiveTab] = useState<'rounds' | 'hands' | 'statistics' | 'cards'>('rounds');
  const [expandedRounds, setExpandedRounds] = useState<Set<number>>(new Set([currentRoundNumber]));
  const [selectedPlayerId, setSelectedPlayerId] = useState<number | null>(null);

  // 获取所有轮次记录（从记牌器）
  const allRoundsFromTracker = useMemo(() => {
    const rounds = cardTracker.getAllRounds();
    return rounds;
  }, [gameStatus, currentRoundNumber]);

  // 合并所有轮次（记牌器中的 + 游戏状态中的 + 当前轮次的实时数据）
  const allRounds = useMemo(() => {
    // 使用 Map 按轮次号去重，优先使用记牌器中的数据
    const roundsMap = new Map<number, DetailedRoundRecord>();
    
    // 1. 先添加记牌器中的所有轮次（优先级最高）
    allRoundsFromTracker.forEach(round => {
      roundsMap.set(round.roundNumber, { ...round });
    });
    
    // 2. 从游戏状态补充缺失的轮次（只添加记牌器中没有的）
    allRoundsFromGameState.forEach(gameRound => {
      if (!roundsMap.has(gameRound.roundNumber)) {
        // 如果记牌器中没有这个轮次，从游戏状态创建
        const totalCardsPlayed = gameRound.plays?.reduce((sum: number, p: any) => sum + (p.cards?.length || 0), 0) || 0;
        const scoreCardsPlayed = gameRound.plays?.reduce((sum: number, p: any) => sum + (p.scoreCards?.length || 0), 0) || 0;
        const dunCount = gameRound.plays?.reduce((sum: number, p: any) => {
          const count = p.cards?.length || 0;
          return sum + (count >= 7 ? Math.pow(2, count - 7) : 0);
        }, 0) || 0;
        
        // 确保 playerName 正确设置
        const playsWithNames = (gameRound.plays || []).map((p: any) => ({
          ...p,
          playerName: p.playerName || players.find(pl => pl.id === p.playerId)?.name || `玩家${p.playerId + 1}`
        }));
        
        // 判断轮次是否已结束：优先使用 gameRound 中的 endTime，如果没有则根据轮次号判断
        // 注意：如果 gameRound 有 endTime，说明轮次已结束；如果没有，且轮次号小于当前轮次号，也说明已结束
        const isRoundEnded = (gameRound as any).endTime !== undefined || 
                             (gameRound.roundNumber < currentRoundNumber);
        const endTime = isRoundEnded 
          ? ((gameRound as any).endTime || Date.now() - 30000) 
          : undefined;
        
        roundsMap.set(gameRound.roundNumber, {
          roundNumber: gameRound.roundNumber,
          plays: playsWithNames,
          totalScore: gameRound.totalScore || 0,
          winnerId: gameRound.winnerId || 0,
          winnerName: gameRound.winnerName || players.find(p => p.id === gameRound.winnerId)?.name || '',
          startTime: (gameRound as any).startTime || (Date.now() - 60000), // 使用 gameRound 中的 startTime，如果没有则估算
          endTime,
          totalCardsPlayed,
          scoreCardsPlayed,
          dunCount
        } as DetailedRoundRecord);
      }
    });
    
    // 3. 如果是当前轮次且还在进行中，合并实时出牌数据
    const currentRound = roundsMap.get(currentRoundNumber);
    if (currentRound && !currentRound.endTime) {
      // 合并记牌器中的记录和实时出牌，避免重复
      const trackerPlayIds = new Set(
        currentRound.plays.map(p => `${p.playerId}_${p.cards?.[0]?.id || ''}_${p.cards?.length || 0}`)
      );
      const newPlays = currentRoundPlays
        .filter(p => {
          const playId = `${p.playerId}_${p.cards?.[0]?.id || ''}_${p.cards?.length || 0}`;
          return !trackerPlayIds.has(playId);
        })
        .map(p => ({
          ...p,
          playerName: p.playerName || players.find(pl => pl.id === p.playerId)?.name || `玩家${p.playerId + 1}`
        }));
      
      const allPlays = [...currentRound.plays, ...newPlays];
      const totalCardsPlayed = allPlays.reduce((sum, p) => sum + (p.cards?.length || 0), 0);
      const scoreCardsPlayed = allPlays.reduce((sum, p) => sum + (p.scoreCards?.length || 0), 0);
      const dunCount = allPlays.reduce((sum, p) => {
        const count = p.cards?.length || 0;
        return sum + (count >= 7 ? Math.pow(2, count - 7) : 0);
      }, 0);
      
      roundsMap.set(currentRoundNumber, {
        ...currentRound,
        plays: allPlays,
        totalScore: currentRoundScore,
        totalCardsPlayed,
        scoreCardsPlayed,
        dunCount
      });
    } else if (gameStatus === 'playing' && !roundsMap.has(currentRoundNumber)) {
      // 如果记牌器中没有当前轮次，但游戏正在进行，创建一个临时记录
      if (currentRoundPlays.length > 0 || currentRoundNumber > 0) {
        const totalCardsPlayed = currentRoundPlays.reduce((sum, p) => sum + (p.cards?.length || 0), 0);
        const scoreCardsPlayed = currentRoundPlays.reduce((sum, p) => sum + (p.scoreCards?.length || 0), 0);
        const dunCount = currentRoundPlays.reduce((sum, p) => {
          const count = p.cards?.length || 0;
          return sum + (count >= 7 ? Math.pow(2, count - 7) : 0);
        }, 0);
        
        // 确保 playerName 正确设置
        const playsWithNames = currentRoundPlays.map(p => ({
          ...p,
          playerName: p.playerName || players.find(pl => pl.id === p.playerId)?.name || `玩家${p.playerId + 1}`
        }));
        
        roundsMap.set(currentRoundNumber, {
          roundNumber: currentRoundNumber,
          plays: playsWithNames,
          totalScore: currentRoundScore,
          winnerId: 0,
          winnerName: '',
          startTime: Date.now(),
          totalCardsPlayed,
          scoreCardsPlayed,
          dunCount
        } as DetailedRoundRecord);
      }
    }

    // 转换为数组并按轮次号倒序排序（最新的轮次在最上面）
    const sortedRounds = Array.from(roundsMap.values()).sort((a, b) => b.roundNumber - a.roundNumber);
    return sortedRounds;
  }, [allRoundsFromTracker, allRoundsFromGameState, currentRoundNumber, currentRoundPlays, currentRoundScore, gameStatus, players]);

  // 获取已出的牌（从所有轮次汇总）
  // 需要从所有历史轮次（allRoundsFromGameState）和当前轮次汇总
  const playedCards = useMemo(() => {
    if (players.length === 0) return [];
    
    // 从所有历史轮次（gameState.allRounds）中汇总所有已出的牌
    const allPlayedCards: Card[] = [];
    
    // 1. 从游戏状态的所有历史轮次汇总
    allRoundsFromGameState.forEach(round => {
      if (round.plays && Array.isArray(round.plays)) {
        round.plays.forEach(play => {
          if (play.cards && Array.isArray(play.cards)) {
            allPlayedCards.push(...play.cards);
          }
        });
      }
    });
    
    // 2. 从当前轮次的实时出牌中汇总（如果当前轮次还没有被保存到 allRoundsFromGameState）
    // 检查当前轮次是否已经在 allRoundsFromGameState 中
    const currentRoundInHistory = allRoundsFromGameState.find(r => r.roundNumber === currentRoundNumber);
    if (!currentRoundInHistory && currentRoundPlays.length > 0) {
      // 当前轮次不在历史记录中，添加当前轮次的出牌
      currentRoundPlays.forEach(play => {
        if (play.cards && Array.isArray(play.cards)) {
          allPlayedCards.push(...play.cards);
        }
      });
    }
    
    // 去重：使用 card.id 去重（避免重复计算）
    const cardMap = new Map<string, Card>();
    allPlayedCards.forEach(card => {
      if (card.id && !cardMap.has(card.id)) {
        cardMap.set(card.id, card);
      }
    });
    
    return Array.from(cardMap.values());
  }, [allRoundsFromGameState, currentRoundNumber, currentRoundPlays]);

  // 计算牌分布统计（基于所有已出牌，包括所有历史轮次和当前轮次）
  const cardDistribution = useMemo(() => {
    const byRank: Record<number, number> = {};
    const bySuit: Record<Suit, number> = {};
    const scoreCards = { five: 0, ten: 0, king: 0 };

    playedCards.forEach(card => {
      // 按点数统计
      byRank[card.rank] = (byRank[card.rank] || 0) + 1;
      
      // 按花色统计
      bySuit[card.suit] = (bySuit[card.suit] || 0) + 1;
      
      // 分牌统计
      if (card.rank === Rank.FIVE) {
        scoreCards.five++;
      } else if (card.rank === Rank.TEN) {
        scoreCards.ten++;
      } else if (card.rank === Rank.KING) {
        scoreCards.king++;
      }
    });

    return { byRank, bySuit, scoreCards };
  }, [playedCards]);

  // 获取游戏统计信息
  // 注意：statistics 应该基于 allRoundsFromGameState（包含末游玩家的额外轮次），而不是 cardTracker
  // 因为 cardTracker 可能没有记录末游玩家的额外轮次
  const statistics = useMemo(() => {
    if (players.length === 0) return null;
    
    // 基于 allRoundsFromGameState 计算统计信息，确保包含末游玩家的额外轮次
    const playerStatistics = players.map(player => {
      const roundsWon = allRoundsFromGameState.filter(r => r.winnerId === player.id).length;
      let totalScoreEarned = 0;
      let totalCardsPlayed = 0;
      let scoreCardsPlayed = 0;
      let dunCount = 0;

      allRoundsFromGameState.forEach(round => {
        if (round.plays && Array.isArray(round.plays)) {
          round.plays.forEach((play: any) => {
            if (play.playerId === player.id) {
              totalCardsPlayed += play.cards?.length || 0;
              scoreCardsPlayed += play.scoreCards?.length || 0;
              const count = play.cards?.length || 0;
              dunCount += count >= 7 ? Math.pow(2, count - 7) : 0;
            }
          });
        }
        if (round.winnerId === player.id) {
          totalScoreEarned += round.totalScore || 0;
        }
      });

      return {
        playerId: player.id,
        playerName: player.name,
        roundsWon,
        totalScoreEarned,
        totalCardsPlayed,
        scoreCardsPlayed,
        dunCount,
        averageCardsPerRound: allRoundsFromGameState.length > 0 
          ? totalCardsPlayed / allRoundsFromGameState.length 
          : 0
      };
    });

    // 计算总轮数、总出牌数、总分牌数、总墩数
    const totalRounds = allRoundsFromGameState.length;
    const totalCardsPlayed = playedCards.length;
    const totalScoreCardsPlayed = cardDistribution.scoreCards.five + 
                                  cardDistribution.scoreCards.ten + 
                                  cardDistribution.scoreCards.king;
    const totalDunCount = allRoundsFromGameState.reduce((sum, r) => {
      if (r.plays && Array.isArray(r.plays)) {
        return sum + r.plays.reduce((dunSum: number, p: any) => {
          const count = p.cards?.length || 0;
          return dunSum + (count >= 7 ? Math.pow(2, count - 7) : 0);
        }, 0);
      }
      return sum;
    }, 0);

    return {
      totalRounds,
      totalCardsPlayed,
      totalScoreCardsPlayed,
      totalDunCount,
      playerStatistics,
      cardDistribution
    };
  }, [players, allRoundsFromGameState, playedCards, cardDistribution]);


  // 获取未出的牌（传入当前轮次的实时出牌，确保统计准确）
  const remainingCards = useMemo(() => {
    if (players.length === 0) return [];
    const cards = cardTracker.getRemainingCards(players, currentRoundPlays);
    return cards;
  }, [players, gameStatus, currentRoundNumber, currentRoundPlays]);

  // 计算已出分数（所有已出牌中的分牌分数总和）
  const totalScorePlayed = useMemo(() => {
    return playedCards.reduce((sum, card) => {
      return sum + getCardScore(card);
    }, 0);
  }, [playedCards]);

  // 切换轮次展开状态
  const toggleRound = (roundNumber: number) => {
    setExpandedRounds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(roundNumber)) {
        newSet.delete(roundNumber);
      } else {
        newSet.add(roundNumber);
      }
      return newSet;
    });
  };

  // 获取玩家手牌历史
  const getPlayerHandHistory = (playerId: number): PlayerHandSnapshot[] => {
    return cardTracker.getPlayerHandHistory(playerId);
  };

  // 格式化时间
  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('zh-CN', { hour12: false });
  };

  // 格式化持续时间
  const formatDuration = (startTime: number, endTime?: number): string => {
    if (!endTime) return '进行中';
    const duration = endTime - startTime;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    return `${minutes}分${seconds % 60}秒`;
  };

  // 获取点数显示名称
  const getRankName = (rank: Rank): string => {
    const rankNames: Record<Rank, string> = {
      [Rank.THREE]: '3',
      [Rank.FOUR]: '4',
      [Rank.FIVE]: '5',
      [Rank.SIX]: '6',
      [Rank.SEVEN]: '7',
      [Rank.EIGHT]: '8',
      [Rank.NINE]: '9',
      [Rank.TEN]: '10',
      [Rank.JACK]: 'J',
      [Rank.QUEEN]: 'Q',
      [Rank.KING]: 'K',
      [Rank.ACE]: 'A',
      [Rank.TWO]: '2',
      [Rank.JOKER_SMALL]: '小王',
      [Rank.JOKER_BIG]: '大王'
    };
    return rankNames[rank] || rank.toString();
  };

  // 获取花色显示名称
  const getSuitName = (suit: Suit): string => {
    const suitNames: Record<Suit, string> = {
      [Suit.SPADES]: '♠',
      [Suit.HEARTS]: '♥',
      [Suit.DIAMONDS]: '♦',
      [Suit.CLUBS]: '♣',
      [Suit.JOKER]: '王'
    };
    return suitNames[suit] || suit;
  };

  if (gameStatus === 'waiting') {
    return (
      <div className="card-tracker-panel">
        <div className="card-tracker-empty">
          <p>游戏尚未开始</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-tracker-panel">
      <div className="card-tracker-header">
        <h3>📊 记牌器</h3>
      </div>

      {/* 标签页 */}
      <div className="card-tracker-tabs">
        <button
          className={`tab-button ${activeTab === 'rounds' ? 'active' : ''}`}
          onClick={() => setActiveTab('rounds')}
        >
          轮次详情
        </button>
        <button
          className={`tab-button ${activeTab === 'hands' ? 'active' : ''}`}
          onClick={() => setActiveTab('hands')}
        >
          手牌历史
        </button>
        <button
          className={`tab-button ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          统计信息
        </button>
        <button
          className={`tab-button ${activeTab === 'cards' ? 'active' : ''}`}
          onClick={() => setActiveTab('cards')}
        >
          牌分布
        </button>
      </div>

      <div className="card-tracker-content">
        {/* 轮次详情 */}
        {activeTab === 'rounds' && (
          <div className="tracker-tab-content">
            {allRounds.length === 0 ? (
              <div className="tracker-empty">暂无轮次记录</div>
            ) : (
              <div className="rounds-list">
                {allRounds.map((round) => {
                  const isCurrentRound = round.roundNumber === currentRoundNumber && !round.endTime;
                  return (
                    <div
                      key={round.roundNumber}
                      className={`round-item ${isCurrentRound ? 'current' : ''} ${!round.endTime ? 'in-progress' : ''}`}
                    >
                    <div
                      className="round-item-header"
                      onClick={() => toggleRound(round.roundNumber)}
                    >
                      <div className="round-header-left">
                        <span className="round-number">第 {round.roundNumber} 轮</span>
                        {round.endTime ? (
                          <>
                            <span className="round-winner">🏆 {round.winnerName}</span>
                            <span className="round-score">+{round.totalScore} 分</span>
                          </>
                        ) : (
                          <span className="round-status">进行中...</span>
                        )}
                        <span className="round-cards-count">{round.totalCardsPlayed} 张</span>
                        {round.dunCount > 0 && (
                          <span className="round-dun">⚡ {round.dunCount} 墩</span>
                        )}
                        {!round.endTime && (
                          <span className="round-score-current">{round.totalScore} 分</span>
                        )}
                      </div>
                      <div className="round-header-right">
                        <span className="expand-icon">
                          {expandedRounds.has(round.roundNumber) ? '▼' : '▶'}
                        </span>
                      </div>
                    </div>

                    {expandedRounds.has(round.roundNumber) && (
                      <div className="round-item-details">
                        <div className="round-meta">
                          <div className="meta-item">
                            <span className="meta-label">开始时间:</span>
                            <span className="meta-value">{formatTime(round.startTime)}</span>
                          </div>
                          {round.endTime && (
                            <div className="meta-item">
                              <span className="meta-label">结束时间:</span>
                              <span className="meta-value">{formatTime(round.endTime)}</span>
                            </div>
                          )}
                          <div className="meta-item">
                            <span className="meta-label">持续时间:</span>
                            <span className="meta-value">{formatDuration(round.startTime, round.endTime)}</span>
                          </div>
                          <div className="meta-item">
                            <span className="meta-label">出牌数:</span>
                            <span className="meta-value">{round.plays.length} 手</span>
                          </div>
                          <div className="meta-item">
                            <span className="meta-label">分牌数:</span>
                            <span className="meta-value">{round.scoreCardsPlayed} 张</span>
                          </div>
                        </div>

                        {/* 出牌记录 */}
                        <div className="round-plays">
                          <div className="plays-title">出牌记录:</div>
                          {round.plays.map((play, index) => (
                            <div key={index} className="play-record">
                              <div className="play-header">
                                <span className="play-player">{play.playerName}</span>
                                <span className="play-cards-count">{play.cards.length} 张</span>
                                {play.score > 0 && (
                                  <span className="play-score">+{play.score} 分</span>
                                )}
                              </div>
                              <div className="play-cards">
                                {play.cards.map((card, cardIndex) => (
                                  <CardComponent
                                    key={card.id || `${cardIndex}`}
                                    card={card}
                                    size="small"
                                  />
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* 轮次开始/结束时的手牌 */}
                        {(round.playerHandsAtStart || round.playerHandsAtEnd) && (
                          <div className="round-hands">
                            {round.playerHandsAtStart && (
                              <div className="hands-section">
                                <div className="hands-title">轮次开始时手牌:</div>
                                {round.playerHandsAtStart.map((hand) => (
                                  <div key={hand.playerId} className="hand-snapshot">
                                    <span className="hand-player">{hand.playerName}:</span>
                                    <span className="hand-count">{hand.handCount} 张</span>
                                  </div>
                                ))}
                              </div>
                            )}
                            {round.playerHandsAtEnd && (
                              <div className="hands-section">
                                <div className="hands-title">轮次结束时手牌:</div>
                                {round.playerHandsAtEnd.map((hand) => (
                                  <div key={hand.playerId} className="hand-snapshot">
                                    <span className="hand-player">{hand.playerName}:</span>
                                    <span className="hand-count">{hand.handCount} 张</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 手牌历史 */}
        {activeTab === 'hands' && (
          <div className="tracker-tab-content">
            <div className="player-selector">
              <label>选择玩家:</label>
              <select
                value={selectedPlayerId ?? ''}
                onChange={(e) => setSelectedPlayerId(e.target.value ? parseInt(e.target.value) : null)}
              >
                <option value="">全部玩家</option>
                {players.map((player) => (
                  <option key={player.id} value={player.id}>
                    {player.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="hands-history">
              {selectedPlayerId !== null ? (
                <>
                  <div className="history-title">
                    {players.find(p => p.id === selectedPlayerId)?.name} 的手牌历史
                  </div>
                  {getPlayerHandHistory(selectedPlayerId).map((snapshot, index) => (
                    <div key={index} className="hand-snapshot-item">
                      <div className="snapshot-header">
                        <span className="snapshot-time">{formatTime(snapshot.timestamp)}</span>
                        <span className="snapshot-context">{snapshot.context}</span>
                        <span className="snapshot-count">{snapshot.handCount} 张</span>
                      </div>
                      <div className="snapshot-cards">
                        {snapshot.hand.map((card, cardIndex) => (
                          <CardComponent
                            key={card.id || `${cardIndex}`}
                            card={card}
                            size="small"
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </>
              ) : (
                <div className="all-players-hands">
                  {players.map((player) => {
                    const history = getPlayerHandHistory(player.id);
                    if (history.length === 0) return null;
                    return (
                      <div key={player.id} className="player-hands-section">
                        <div className="player-hands-title">{player.name} 的手牌历史</div>
                        {history.map((snapshot, index) => (
                          <div key={index} className="hand-snapshot-item">
                            <div className="snapshot-header">
                              <span className="snapshot-time">{formatTime(snapshot.timestamp)}</span>
                              <span className="snapshot-context">{snapshot.context}</span>
                              <span className="snapshot-count">{snapshot.handCount} 张</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 统计信息 */}
        {activeTab === 'statistics' && statistics && (
          <div className="tracker-tab-content">
            <div className="statistics-section">
              <div className="stat-title">游戏统计</div>
              <div className="stat-grid">
                <div className="stat-item">
                  <span className="stat-label">总轮数:</span>
                  <span className="stat-value">{statistics.totalRounds}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">总出牌数:</span>
                  <span className="stat-value">{statistics.totalCardsPlayed}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">总分牌数:</span>
                  <span className="stat-value">{statistics.totalScoreCardsPlayed}</span>
                </div>
                <div className="stat-item">
                  <span className="stat-label">总墩数:</span>
                  <span className="stat-value">{statistics.totalDunCount}</span>
                </div>
              </div>
            </div>

            <div className="statistics-section">
              <div className="stat-title">玩家统计</div>
              {statistics.playerStatistics.map((playerStat) => (
                <div key={playerStat.playerId} className="player-stat-item">
                  <div className="player-stat-header">
                    <span className="player-stat-name">{playerStat.playerName}</span>
                  </div>
                  <div className="player-stat-details">
                    <div className="stat-detail">
                      <span className="detail-label">赢得轮数:</span>
                      <span className="detail-value">{playerStat.roundsWon}</span>
                    </div>
                    <div className="stat-detail">
                      <span className="detail-label">获得总分:</span>
                      <span className="detail-value">{playerStat.totalScoreEarned}</span>
                    </div>
                    <div className="stat-detail">
                      <span className="detail-label">出牌总数:</span>
                      <span className="detail-value">{playerStat.totalCardsPlayed}</span>
                    </div>
                    <div className="stat-detail">
                      <span className="detail-label">分牌数:</span>
                      <span className="detail-value">{playerStat.scoreCardsPlayed}</span>
                    </div>
                    <div className="stat-detail">
                      <span className="detail-label">墩数:</span>
                      <span className="detail-value">{playerStat.dunCount}</span>
                    </div>
                    <div className="stat-detail">
                      <span className="detail-label">平均每轮出牌:</span>
                      <span className="detail-value">{playerStat.averageCardsPerRound.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 牌分布 */}
        {activeTab === 'cards' && statistics && (
          <div className="tracker-tab-content">
            <div className="cards-distribution">
              <div className="distribution-section">
                <div className="dist-title">已出牌统计</div>
                <div className="dist-content">
                  <div className="dist-item">
                    <span className="dist-label">总出牌数:</span>
                    <span className="dist-value">{playedCards.length} 张</span>
                  </div>
                  <div className="dist-item">
                    <span className="dist-label">已出分数:</span>
                    <span className="dist-value">{totalScorePlayed} 分</span>
                  </div>
                  <div className="dist-item">
                    <span className="dist-label">玩家手牌总数:</span>
                    <span className="dist-value">{players.reduce((sum, p) => sum + p.hand.length, 0)} 张</span>
                  </div>
                  <div className="dist-item">
                    <span className="dist-label">总牌数:</span>
                    <span className="dist-value">
                      {(() => {
                        // 总牌数 = 初始牌数（从 cardTracker 获取）
                        const initialCardsCount = cardTracker.getInitialCardsCount();
                        const currentHandsCount = players.reduce((sum, p) => sum + p.hand.length, 0);
                        // 验证：总牌数 = 已出 + 玩家手牌
                        const calculatedTotal = playedCards.length + currentHandsCount;
                        return initialCardsCount > 0 ? initialCardsCount : calculatedTotal;
                      })()} 张
                    </span>
                  </div>
                </div>
              </div>

              <div className="distribution-section">
                <div className="dist-title">按点数统计（已出）</div>
                <div className="rank-distribution">
                  {Object.entries(cardDistribution.byRank)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .map(([rank, count]) => (
                      <div key={rank} className="rank-item">
                        <span className="rank-name">{getRankName(parseInt(rank) as Rank)}</span>
                        <span className="rank-count">{count} 张</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="distribution-section">
                <div className="dist-title">分牌统计（已出）</div>
                <div className="score-cards-dist">
                  <div className="score-card-item">
                    <span className="score-card-name">5:</span>
                    <span className="score-card-count">{cardDistribution.scoreCards.five} 张</span>
                  </div>
                  <div className="score-card-item">
                    <span className="score-card-name">10:</span>
                    <span className="score-card-count">{cardDistribution.scoreCards.ten} 张</span>
                  </div>
                  <div className="score-card-item">
                    <span className="score-card-name">K:</span>
                    <span className="score-card-count">{cardDistribution.scoreCards.king} 张</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

