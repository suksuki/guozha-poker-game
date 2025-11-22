import React, { useState } from 'react';
import { Card, PlayerType, CardType } from '../types/card';
import { CardComponent } from './CardComponent';
import { useGame } from '../hooks/useGame';
import { sortCards } from '../utils/cardUtils';
import './GameBoard.css';

export const GameBoard: React.FC = () => {
  const { gameState, startGame, playerPlay, playerPass, resetGame } = useGame();
  const [selectedCards, setSelectedCards] = useState<Card[]>([]);
  const [strategy, setStrategy] = useState<'aggressive' | 'conservative' | 'balanced'>('balanced');
  const [algorithm, setAlgorithm] = useState<'simple' | 'mcts'>('mcts');

  const handleCardClick = (card: Card) => {
    if (gameState.status !== 'playing' || gameState.currentPlayer !== PlayerType.HUMAN) {
      return;
    }

    const index = selectedCards.findIndex(c => c.id === card.id);
    if (index >= 0) {
      setSelectedCards(selectedCards.filter(c => c.id !== card.id));
    } else {
      setSelectedCards([...selectedCards, card]);
    }
  };

  const handlePlay = () => {
    if (selectedCards.length === 0) return;
    
    const success = playerPlay(selectedCards);
    if (success) {
      setSelectedCards([]);
    } else {
      alert('无法出这些牌！请选择合法的牌型。');
    }
  };

  const handlePass = () => {
    playerPass();
    setSelectedCards([]);
  };

  const handleStartGame = () => {
    // 使用本地算法，不需要API Key
    startGame({
      apiKey: '',  // 不需要API Key
      strategy,
      algorithm: algorithm || 'mcts' // 使用MCTS或智能策略
    });
  };

  const getCardTypeName = (type: CardType): string => {
    const names: { [key: string]: string } = {
      'single': '单张',
      'pair': '对子',
      'triple': '三张',
      'straight': '顺子',
      'pair_sequence': '连对',
      'triple_with_single': '三带一',
      'triple_with_pair': '三带二',
      'bomb': '炸弹',
      'straight_bomb': '顺子炸弹',
      'king_bomb': '王炸'
    };
    return names[type] || '';
  };

  if (gameState.status === 'waiting') {
    return (
      <div className="game-container">
        <div className="start-screen">
          <h1>过炸扑克游戏</h1>
          <div className="config-panel">
            <div className="config-item">
              <label>AI算法:</label>
              <select value={algorithm} onChange={(e) => setAlgorithm(e.target.value as any)}>
                <option value="mcts">MCTS蒙特卡洛树搜索（推荐）</option>
                <option value="simple">智能策略算法</option>
              </select>
              <small style={{display: 'block', color: '#666', marginTop: '5px'}}>
                MCTS通过大量模拟找到最优出牌策略，更智能但计算稍慢
              </small>
            </div>
            <div className="config-item">
              <label>AI策略:</label>
              <select value={strategy} onChange={(e) => setStrategy(e.target.value as any)}>
                <option value="balanced">平衡</option>
                <option value="aggressive">激进</option>
                <option value="conservative">保守</option>
              </select>
              <small style={{display: 'block', color: '#666', marginTop: '5px'}>
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

  if (gameState.status === 'finished') {
    return (
      <div className="game-container">
        <div className="result-screen">
          <h1>{gameState.winner === PlayerType.HUMAN ? '🎉 你赢了！' : '😢 AI赢了'}</h1>
          <button className="btn-primary" onClick={resetGame}>
            再来一局
          </button>
        </div>
      </div>
    );
  }

  const sortedHand = sortCards(gameState.playerHand);

  return (
    <div className="game-container">
      {/* AI区域 */}
      <div className="ai-area">
        <div className="player-info">
          <h3>AI对手</h3>
          <div className="card-count">剩余: {gameState.aiHand.length} 张</div>
        </div>
        <div className="ai-cards">
          {Array.from({ length: Math.min(gameState.aiHand.length, 10) }).map((_, i) => (
            <CardComponent key={i} card={gameState.aiHand[0]} faceDown size="small" />
          ))}
        </div>
      </div>

      {/* 出牌区域 */}
      <div className="play-area">
        {gameState.lastPlay && (
          <div className="last-play">
            <div className="play-label">上家出牌:</div>
            <div className="play-cards">
              {gameState.lastPlay.cards.map((card, index) => (
                <CardComponent key={card.id} card={card} size="medium" />
              ))}
            </div>
            <div className="play-type">{getCardTypeName(gameState.lastPlay.type)}</div>
          </div>
        )}
        {!gameState.lastPlay && (
          <div className="no-play">你可以出任意合法牌型</div>
        )}
      </div>

      {/* 玩家手牌区域 */}
      <div className="player-area">
        <div className="player-hand">
          {sortedHand.map((card) => (
            <CardComponent
              key={card.id}
              card={card}
              selected={selectedCards.some(c => c.id === card.id)}
              onClick={() => handleCardClick(card)}
            />
          ))}
        </div>
        <div className="action-buttons">
          <button
            className="btn-action"
            onClick={handlePlay}
            disabled={selectedCards.length === 0 || gameState.currentPlayer !== PlayerType.HUMAN}
          >
            出牌 ({selectedCards.length})
          </button>
          <button
            className="btn-action btn-pass"
            onClick={handlePass}
            disabled={gameState.currentPlayer !== PlayerType.HUMAN || !gameState.lastPlay}
          >
            要不起
          </button>
        </div>
        {gameState.currentPlayer === PlayerType.AI && (
          <div className="thinking-indicator">AI思考中...</div>
        )}
      </div>
    </div>
  );
};

