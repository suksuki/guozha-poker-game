/**
 * 牌数验证错误提示组件
 * 当牌数验证失败时，在界面上显示错误信息
 */

import React, { useEffect, useState } from 'react';
import './CardValidationAlert.css';

interface CardValidationAlertProps {
  error: {
    message: string;
    details: {
      expected: number;
      found: number;
      missing: number;
      playedCards: number;
      playerHands: number;
      duplicateCards?: Array<{ card: any; locations: string[] }>;
      details?: {
        playedCardsByRound: Array<{ roundNumber: number; count: number }>;
        playerHandsByPlayer: Array<{ playerId: number; playerName: string; count: number }>;
      };
    };
  } | null;
  onClose: () => void;
}

export const CardValidationAlert: React.FC<CardValidationAlertProps> = ({ error, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      // 自动关闭（10秒后）
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // 等待动画完成
      }, 10000);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [error, onClose]);

  if (!error) return null;

  return (
    <div className={`card-validation-alert ${isVisible ? 'visible' : ''}`}>
      <div className="alert-content">
        <div className="alert-header">
          <span className="alert-icon">⚠️</span>
          <span className="alert-title">牌数验证失败！</span>
          <button className="alert-close" onClick={() => {
            setIsVisible(false);
            setTimeout(onClose, 300);
          }}>×</button>
        </div>
        <div className="alert-body">
          <div className="alert-message">{error.message}</div>
          <div className="alert-details">
            <div className="detail-row">
              <span className="detail-label">期望总数:</span>
              <span className="detail-value">{error.details.expected} 张</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">实际总数:</span>
              <span className="detail-value">{error.details.found} 张</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">缺失:</span>
              <span className="detail-value error">{error.details.missing} 张</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">已出牌数:</span>
              <span className="detail-value">{error.details.playedCards} 张</span>
            </div>
            <div className="detail-row">
              <span className="detail-label">玩家手牌数:</span>
              <span className="detail-value">{error.details.playerHands} 张</span>
            </div>
            {error.details.duplicateCards && error.details.duplicateCards.length > 0 && (
              <div className="detail-section">
                <div className="detail-label">重复的牌:</div>
                {error.details.duplicateCards.map((dup, idx) => (
                  <div key={idx} className="duplicate-item">
                    <span>牌ID: {dup.card.id}</span>
                    <span>位置: {dup.locations.join(', ')}</span>
                  </div>
                ))}
              </div>
            )}
            {error.details.details && (
              <>
                {error.details.details.playedCardsByRound && error.details.details.playedCardsByRound.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-label">各轮次出牌数:</div>
                    {error.details.details.playedCardsByRound.map((round, idx) => (
                      <div key={idx} className="round-item">
                        轮次{round.roundNumber === 0 ? '当前' : round.roundNumber}: {round.count} 张
                      </div>
                    ))}
                  </div>
                )}
                {error.details.details.playerHandsByPlayer && error.details.details.playerHandsByPlayer.length > 0 && (
                  <div className="detail-section">
                    <div className="detail-label">各玩家手牌数:</div>
                    {error.details.details.playerHandsByPlayer.map((player, idx) => (
                      <div key={idx} className="player-item">
                        {player.playerName}: {player.count} 张
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

