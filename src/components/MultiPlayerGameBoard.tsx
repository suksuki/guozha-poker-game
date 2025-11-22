import React, { useState, useMemo, useEffect } from 'react';
import { Card, PlayerType, CardType, GameStatus } from '../types/card';
import { CardComponent } from './CardComponent';
import { DraggablePanel } from './DraggablePanel';
import { useMultiPlayerGame } from '../hooks/useMultiPlayerGame';
import { sortCards, hasPlayableCards, isScoreCard, getCardScore, calculateCardsScore } from '../utils/cardUtils';
import { AIConfig } from '../utils/aiPlayer';
import { waitForVoices } from '../utils/speechUtils';
import './MultiPlayerGameBoard.css';


export const MultiPlayerGameBoard: React.FC = () => {
  const { gameState, startGame, playerPlay, playerPass, suggestPlay, resetGame } = useMultiPlayerGame();
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [playerCount, setPlayerCount] = useState(4);
  const [humanPlayerIndex, setHumanPlayerIndex] = useState(0);
  const [strategy, setStrategy] = useState<'aggressive' | 'conservative' | 'balanced'>('balanced');
  const [algorithm, setAlgorithm] = useState<'simple' | 'mcts'>('mcts');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [expandedRanks, setExpandedRanks] = useState<Set<number>>(new Set());

  // 初始化语音功能（某些浏览器需要等待voices加载）
  useEffect(() => {
    waitForVoices(() => {
      console.log('语音功能已就绪');
    });
  }, []);


  const handleCardClick = (card: Card) => {
    if (gameState.status !== GameStatus.PLAYING) return;
    const humanPlayer = gameState.players.find(p => p.isHuman);
    if (!humanPlayer || gameState.currentPlayerIndex !== humanPlayer.id) return;

    const index = selectedCards.findIndex(c => c.id === card.id);
    if (index >= 0) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const handlePlay = () => {
    if (selectedCards.length === 0) return;
    
    const humanPlayer = gameState.players.find(p => p.isHuman);
    if (!humanPlayer) return;

    const success = playerPlay(humanPlayer.id, selectedCards);
    if (success) {
      setSelectedCards([]);
    } else {
      alert('无法出这些牌！请选择合法的牌型。');
    }
  };

  const handlePass = () => {
    const humanPlayer = gameState.players.find(p => p.isHuman);
    if (!humanPlayer) return;
    playerPass(humanPlayer.id);
    setSelectedCards([]);
  };

  // 使用AI辅助出牌（使用MCTS蒙特卡洛算法）
  const handleSuggestPlay = async () => {
    const humanPlayer = gameState.players.find(p => p.isHuman);
    if (!humanPlayer) return;

    setIsSuggesting(true);
    try {
      const suggestedCards = await suggestPlay(humanPlayer.id, {
        apiKey: '',  // 不需要API Key
        strategy,
        algorithm: algorithm || 'mcts', // 使用MCTS或智能策略
        mctsIterations: 50 // 快速模式：大幅降低迭代次数以提高速度
      });

      if (suggestedCards && suggestedCards.length > 0) {
        setSelectedCards(suggestedCards);
      } else {
        alert('AI建议：要不起');
      }
    } catch (error) {
      console.error('获取AI建议失败:', error);
      alert('获取AI建议失败，请稍后重试');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleStartGame = () => {
    // 为每个AI玩家创建配置（使用本地算法，不需要API Key）
    const aiConfigs = Array.from({ length: playerCount }, (_, i) => ({
      apiKey: '', // 不需要API Key
      strategy: strategy,
      algorithm: algorithm || 'mcts' // 使用MCTS或智能策略
    }));

    startGame({
      playerCount,
      humanPlayerIndex,
      aiConfigs
    });
  };

  const getCardTypeName = (type: CardType): string => {
    const names: { [key: string]: string } = {
      'single': '单张',
      'pair': '对子',
      'triple': '三张',
      'bomb': '炸弹',
      'dun': '墩'
    };
    return names[type] || '';
  };

  const getCurrentPlayer = () => {
    return gameState.players[gameState.currentPlayerIndex];
  };

  // 必须在所有早期返回之前调用所有 hooks
  const humanPlayer = gameState.players.find(p => p.isHuman);
  const currentPlayer = getCurrentPlayer();
  const isPlayerTurn = currentPlayer?.isHuman;

  // 检查玩家是否有能打过的牌（用于强制出牌规则）
  const canPass = useMemo(() => {
    // 如果玩家已经出完牌了，不应该显示"要不起"按钮
    if (!humanPlayer || humanPlayer.hand.length === 0) {
      return false; // 已出完牌，不显示要不起按钮
    }
    if (!isPlayerTurn || !gameState.lastPlay) {
      return true; // 没有上家出牌时可以要不起
    }
    return !hasPlayableCards(humanPlayer.hand, gameState.lastPlay);
  }, [isPlayerTurn, gameState.lastPlay, humanPlayer]);

  // 按数字分组手牌（用于叠放显示）- 必须在早期返回之前
  const groupedHand = useMemo(() => {
    if (!humanPlayer) return new Map();
    const groups = new Map<number, Card[]>();
    humanPlayer.hand.forEach(card => {
      const rank = card.rank;
      if (!groups.has(rank)) {
        groups.set(rank, []);
      }
      groups.get(rank)!.push(card);
    });
    // 对每组内的牌按花色排序
    groups.forEach(cards => {
      cards.sort((a, b) => a.suit.localeCompare(b.suit));
    });
    return groups;
  }, [humanPlayer?.hand]);

  // 现在可以安全地进行早期返回
  if (gameState.status === GameStatus.WAITING) {
    return (
      <div className="game-container">
        <div className="start-screen">
          <h1>过炸扑克游戏（多人版）</h1>
          <div className="config-panel">
            <div className="config-item">
              <label>玩家数量 (4-8人):</label>
              <input
                type="number"
                min="4"
                max="8"
                value={playerCount}
                onChange={(e) => setPlayerCount(parseInt(e.target.value) || 4)}
              />
            </div>
            <div className="config-item">
              <label>你的位置:</label>
              <select 
                value={humanPlayerIndex} 
                onChange={(e) => setHumanPlayerIndex(parseInt(e.target.value))}
              >
                {Array.from({ length: playerCount }, (_, i) => (
                  <option key={i} value={i}>玩家{i + 1}</option>
                ))}
              </select>
            </div>
            <div className="config-item">
              <label>AI算法:</label>
              <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as any)}>
                <option value="mcts">MCTS蒙特卡洛树搜索（推荐）</option>
                <option value="simple">智能策略算法</option>
              </select>
              <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
                MCTS更智能但较慢，如果觉得慢请选择"智能策略算法"（快速模式）
              </small>
            </div>
            <div className="config-item">
              <label>AI策略:</label>
              <select value={strategy} onChange={(e) => setStrategy(e.target.value as any)}>
                <option value="balanced">平衡</option>
                <option value="aggressive">激进</option>
                <option value="conservative">保守</option>
              </select>
              <small style={{display: 'block', color: '#999', marginTop: '5px'}}>
                策略仅影响简单算法，MCTS会自动学习最优策略
              </small>
            </div>
            <button className="btn-primary" onClick={handleStartGame}>
              开始游戏
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState.status === GameStatus.FINISHED) {
    const winner = gameState.players[gameState.winner!];
    const rankings = gameState.finalRankings || [];
    
    return (
      <div className="game-container">
        <div className="result-screen">
          <h1>{winner?.isHuman ? '🎉 你赢了！' : `😢 ${winner?.name}赢了`}</h1>
          
          {/* 显示排名 */}
          {rankings.length > 0 && (
            <div className="rankings-container" style={{ marginTop: '20px', marginBottom: '20px' }}>
              <h2>最终排名</h2>
              <div className="rankings-list" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '15px' }}>
                {rankings
                  .sort((a, b) => b.finalScore - a.finalScore)
                  .map((ranking, index) => (
                    <div 
                      key={ranking.player.id} 
                      className="ranking-item"
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 15px',
                        backgroundColor: index === 0 ? '#ffd700' : index === 1 ? '#c0c0c0' : index === 2 ? '#cd7f32' : '#f0f0f0',
                        borderRadius: '8px',
                        border: index === 0 ? '2px solid #ff6b6b' : '1px solid #ddd'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ fontSize: '20px', fontWeight: 'bold' }}>
                          {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`}
                        </span>
                        <span style={{ fontSize: '16px', fontWeight: 'bold' }}>
                          {ranking.player.name}
                        </span>
                        {ranking.player.isHuman && <span style={{ fontSize: '12px', color: '#666' }}>(你)</span>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ fontSize: '18px', fontWeight: 'bold', color: index === 0 ? '#ff6b6b' : '#333' }}>
                          {ranking.finalScore} 分
                        </span>
                        <span style={{ fontSize: '12px', color: '#666' }}>
                          排名: {ranking.rank}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}
          
          <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
            <button className="btn-primary" onClick={resetGame}>
              再来一局
            </button>
            {gameState.gameRecord && (
              <button 
                className="btn-action"
                onClick={() => {
                  const dataStr = JSON.stringify(gameState.gameRecord, null, 2);
                  const dataBlob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(dataBlob);
                  const link = document.createElement('a');
                  link.href = url;
                  link.download = `guozha-game-${gameState.gameRecord?.gameId}.json`;
                  link.click();
                  URL.revokeObjectURL(url);
                }}
              >
                下载游戏记录
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 调试信息
  console.log('Game State:', {
    status: gameState.status,
    players: gameState.players.length,
    currentPlayerIndex: gameState.currentPlayerIndex,
    humanPlayer: humanPlayer ? 'found' : 'not found',
    humanPlayerHand: humanPlayer?.hand.length,
    groupedHandSize: groupedHand.size
  });

  // 如果游戏状态异常，显示错误信息
  if (gameState.status === GameStatus.PLAYING && gameState.players.length === 0) {
    return (
      <div className="game-container">
        <div className="error-screen">
          <h2>游戏状态错误</h2>
          <p>玩家数据未正确加载，请重新开始游戏</p>
          <button className="btn-primary" onClick={resetGame}>
            返回开始界面
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="game-container">
      {/* 上方区域：AI玩家、出牌区域、按钮 */}
      <div className="top-area">
        {/* 其他玩家区域 */}
        <div className="other-players-area">
          {gameState.players
            .filter(player => !player.isHuman)
            .map((player, index) => {
              const isCurrent = gameState.currentPlayerIndex === player.id;
              const isLastPlay = gameState.lastPlayPlayerIndex === player.id;
              
              return (
                <div 
                  key={player.id} 
                  className={`player-card ${isCurrent ? 'current-player' : ''} ${isLastPlay ? 'last-play-player' : ''}`}
                >
                  <div className="player-name">{player.name}</div>
                  <div className="player-card-count">剩余: {player.hand.length} 张</div>
                  <div className="player-score">得分: {player.score || 0} 分</div>
                  {player.wonRounds && player.wonRounds.length > 0 && (
                    <div className="player-won-rounds">
                      <div className="won-rounds-label">赢得 {player.wonRounds.length} 轮</div>
                      <div className="won-rounds-summary">
                        {player.wonRounds.map((round, idx) => (
                          <div key={idx} className="won-round-badge" title={`第${round.roundNumber}轮: ${round.totalScore}分`}>
                            轮{round.roundNumber}: {round.totalScore}分
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="player-cards-preview">
                    {Array.from({ length: Math.min(player.hand.length, 5) }).map((_, i) => (
                      <CardComponent key={i} card={player.hand[0]} faceDown size="small" />
                    ))}
                  </div>
                  {isCurrent && <div className="turn-indicator">思考中...</div>}
                </div>
              );
            })}
        </div>

        {/* 出牌区域 */}
        <div className="play-area">
          {gameState.lastPlay && (
            <div className="last-play">
              <div className="play-label">
                {gameState.players[gameState.lastPlayPlayerIndex!]?.name} 出牌:
              </div>
              <div className="play-cards">
                {gameState.lastPlay.cards.map((card) => (
                  <CardComponent key={card.id} card={card} size="medium" />
                ))}
              </div>
              <div className="play-type">{getCardTypeName(gameState.lastPlay.type)}</div>
              {gameState.roundScore > 0 && (
                <div className="round-score">本轮分数: {gameState.roundScore} 分</div>
              )}
            </div>
          )}
          {!gameState.lastPlay && (
            <div className="no-play">可以出任意合法牌型</div>
          )}
        </div>

        {/* 操作按钮区域 */}
        {humanPlayer && (
          <div className="action-buttons-top">
            <button
              className="btn-action btn-suggest"
              onClick={handleSuggestPlay}
              disabled={!isPlayerTurn || isSuggesting}
            >
              {isSuggesting ? 'AI思考中...' : '🤖 AI建议'}
            </button>
            <button
              className="btn-action"
              onClick={handlePlay}
              disabled={selectedCards.length === 0 || !isPlayerTurn}
            >
              出牌 ({selectedCards.length})
            </button>
            <button
              className="btn-action btn-pass"
              onClick={handlePass}
              disabled={!isPlayerTurn || !gameState.lastPlay || !canPass}
              title={!canPass && isPlayerTurn && gameState.lastPlay ? "你有能打过的牌，必须出牌！" : "要不起"}
            >
              {!canPass && isPlayerTurn && gameState.lastPlay ? "必须出牌" : "要不起"}
            </button>
            {!canPass && isPlayerTurn && gameState.lastPlay && (
              <div className="must-play-hint">
                ⚠️ 你有能打过的牌，必须出牌！
              </div>
            )}
          </div>
        )}
      </div>

      {/* 当前轮次出牌记录 - 可拖拽面板 */}
      {gameState.currentRoundPlays && gameState.currentRoundPlays.length > 0 && (
        <DraggablePanel
          title={`第 ${gameState.roundNumber || 1} 轮出牌记录`}
          storageKey="round-plays-panel-position"
          defaultPosition={{ x: window.innerWidth - 350, y: 50 }}
          minWidth={280}
          minHeight={200}
          maxWidth={500}
          maxHeight={600}
        >
          <div className="round-plays-panel-content">
            {gameState.currentRoundPlays.map((playRecord, index) => (
              <div key={index} className="round-play-item">
                <div className="round-play-player">{playRecord.playerName}:</div>
                <div className="round-play-cards">
                  {playRecord.cards.map((card) => {
                    const isScore = isScoreCard(card);
                    const score = isScore ? getCardScore(card) : 0;
                    return (
                      <div key={card.id} className={isScore ? 'score-card-wrapper' : ''}>
                        <CardComponent card={card} size="small" />
                        {isScore && (
                          <div className="card-score-badge-small">{score}</div>
                        )}
                      </div>
                    );
                  })}
                </div>
                {playRecord.score > 0 && (
                  <div className="round-play-score">+{playRecord.score} 分</div>
                )}
              </div>
            ))}
            {gameState.roundScore > 0 && (
              <div className="round-total-score">
                本轮累计: {gameState.roundScore} 分
              </div>
            )}
          </div>
        </DraggablePanel>
      )}

      {/* 玩家手牌区域 */}
      <div className="player-area">
        {!humanPlayer ? (
          <div className="no-human-player">
            <p>未找到人类玩家数据</p>
            <p>游戏状态: {gameState.status}</p>
            <p>玩家数量: {gameState.players.length}</p>
          </div>
        ) : (
          <>
            <div className="player-info">
              <h3>你的手牌 ({humanPlayer.hand.length} 张)</h3>
              <div className="player-score-display">得分: {humanPlayer.score || 0} 分</div>
              {humanPlayer.wonRounds && humanPlayer.wonRounds.length > 0 && (
                <div className="player-won-rounds">
                  <div className="won-rounds-label">你赢得了 {humanPlayer.wonRounds.length} 轮</div>
                  <div className="won-rounds-summary">
                    {humanPlayer.wonRounds.map((round, idx) => (
                      <div key={idx} className="won-round-badge" title={`第${round.roundNumber}轮: ${round.totalScore}分`}>
                        轮{round.roundNumber}: {round.totalScore}分
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {isPlayerTurn && <div className="your-turn">轮到你出牌</div>}
            </div>
            <div className="player-hand-grouped">
              {groupedHand.size === 0 ? (
                <div className="no-cards">手牌数据加载中...</div>
              ) : (
                Array.from(groupedHand.entries())
                  .sort(([rankA], [rankB]) => rankA - rankB)
                  .map(([rank, cards]) => {
                  const isExpanded = expandedRanks.has(rank);
                  const selectedCount = cards.filter(c => selectedCards.some(sc => sc.id === c.id)).length;
                  const getRankDisplay = (r: number): string => {
                    const rankMap: { [key: number]: string } = {
                      3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
                      11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
                      16: '小王', 17: '大王'
                    };
                    return rankMap[r] || '';
                  };

                  return (
                    <div key={rank} className="card-group">
                      <div 
                        className={`card-group-header ${isExpanded ? 'expanded' : ''} ${selectedCount > 0 ? 'has-selected' : ''}`}
                        onClick={() => {
                          const newExpanded = new Set(expandedRanks);
                          if (isExpanded) {
                            newExpanded.delete(rank);
                          } else {
                            newExpanded.add(rank);
                          }
                          setExpandedRanks(newExpanded);
                        }}
                      >
                        <span className="rank-label">{getRankDisplay(rank)}</span>
                        <span className="count-badge">{cards.length}</span>
                        {selectedCount > 0 && (
                          <span className="selected-badge">已选 {selectedCount}</span>
                        )}
                      </div>
                        {isExpanded && (
                          <div className="card-group-content">
                            {cards.map((card) => {
                              const isScore = isScoreCard(card);
                              const score = isScore ? getCardScore(card) : 0;
                              return (
                                <div key={card.id} className={isScore ? 'score-card-wrapper' : ''}>
                                  <CardComponent
                                    card={card}
                                    selected={selectedCards.some(c => c.id === card.id)}
                                    onClick={() => handleCardClick(card)}
                                  />
                                  {isScore && (
                                    <div className="card-score-badge">{score}分</div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

