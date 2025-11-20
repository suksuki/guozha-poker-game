import React, { useState, useMemo } from 'react';
import { Card, PlayerType, CardType, GameStatus } from '../types/card';
import { CardComponent } from './CardComponent';
import { useMultiPlayerGame } from '../hooks/useMultiPlayerGame';
import { sortCards } from '../utils/cardUtils';
import { AIConfig } from '../utils/aiPlayer';
import './MultiPlayerGameBoard.css';

export const MultiPlayerGameBoard: React.FC = () => {
  const { gameState, startGame, playerPlay, playerPass, suggestPlay, resetGame } = useMultiPlayerGame();
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [openaiKey, setOpenaiKey] = useState('');
  const [playerCount, setPlayerCount] = useState(4);
  const [humanPlayerIndex, setHumanPlayerIndex] = useState(0);
  const [strategy, setStrategy] = useState<'aggressive' | 'conservative' | 'balanced'>('balanced');
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [expandedRanks, setExpandedRanks] = useState<Set<number>>(new Set());

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

  // 使用OpenAI辅助出牌
  const handleSuggestPlay = async () => {
    const humanPlayer = gameState.players.find(p => p.isHuman);
    if (!humanPlayer) return;
    if (!openaiKey.trim()) {
      alert('请输入OpenAI API Key');
      return;
    }

    setIsSuggesting(true);
    try {
      const suggestedCards = await suggestPlay(humanPlayer.id, {
        apiKey: openaiKey,
        strategy
      });

      if (suggestedCards && suggestedCards.length > 0) {
        setSelectedCards(suggestedCards);
      } else {
        alert('AI建议：要不起');
      }
    } catch (error) {
      console.error('获取AI建议失败:', error);
      alert('获取AI建议失败，请检查API Key');
    } finally {
      setIsSuggesting(false);
    }
  };

  const handleStartGame = () => {
    if (!openaiKey.trim()) {
      alert('请输入OpenAI API Key');
      return;
    }

    // 为每个AI玩家创建配置
    const aiConfigs = Array.from({ length: playerCount }, (_, i) => ({
      apiKey: openaiKey,
      strategy: strategy
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
              <label>OpenAI API Key:</label>
              <input
                type="password"
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                placeholder="输入你的OpenAI API Key"
              />
            </div>
            <div className="config-item">
              <label>AI策略:</label>
              <select value={strategy} onChange={(e) => setStrategy(e.target.value as any)}>
                <option value="balanced">平衡</option>
                <option value="aggressive">激进</option>
                <option value="conservative">保守</option>
              </select>
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
    return (
      <div className="game-container">
        <div className="result-screen">
          <h1>{winner?.isHuman ? '🎉 你赢了！' : `😢 ${winner?.name}赢了`}</h1>
          <button className="btn-primary" onClick={resetGame}>
            再来一局
          </button>
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
          </div>
        )}
        {!gameState.lastPlay && (
          <div className="no-play">可以出任意合法牌型</div>
        )}
      </div>

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
                          {cards.map((card) => (
                            <CardComponent
                              key={card.id}
                              card={card}
                              selected={selectedCards.some(c => c.id === card.id)}
                              onClick={() => handleCardClick(card)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="action-buttons">
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
                disabled={!isPlayerTurn || !gameState.lastPlay}
              >
                要不起
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

