import React from 'react';
import { Card, Suit, Rank } from '../types/card';
import './CardComponent.css';

interface CardComponentProps {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  faceDown?: boolean;
  size?: 'small' | 'medium' | 'large';
}

export const CardComponent: React.FC<CardComponentProps> = ({
  card,
  selected = false,
  onClick,
  faceDown = false,
  size = 'medium'
}) => {
  const getRankDisplay = (rank: Rank): string => {
    const rankMap: { [key: number]: string } = {
      3: '3', 4: '4', 5: '5', 6: '6', 7: '7', 8: '8', 9: '9', 10: '10',
      11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
      16: '小', 17: '大' // 小王、大王
    };
    return rankMap[rank] || '';
  };

  const getSuitSymbol = (suit: Suit): string => {
    const suitMap: { [key: string]: string } = {
      [Suit.SPADES]: '♠',
      [Suit.HEARTS]: '♥',
      [Suit.DIAMONDS]: '♦',
      [Suit.CLUBS]: '♣',
      [Suit.JOKER]: '🃏'
    };
    return suitMap[suit] || '';
  };

  const getSuitColor = (suit: Suit): string => {
    if (suit === Suit.JOKER) {
      return card.rank === Rank.JOKER_BIG ? 'red' : 'black';
    }
    return suit === Suit.HEARTS || suit === Suit.DIAMONDS ? 'red' : 'black';
  };

  if (faceDown) {
    return (
      <div className={`card card-${size} card-face-down ${selected ? 'card-selected' : ''}`} onClick={onClick}>
        <div className="card-back">🂠</div>
      </div>
    );
  }

  // 大小王特殊显示
  if (card.suit === Suit.JOKER) {
    return (
      <div
        className={`card card-${size} card-joker ${selected ? 'card-selected' : ''}`}
        onClick={onClick}
        style={{ 
          color: card.rank === Rank.JOKER_BIG ? 'red' : 'black',
          background: card.rank === Rank.JOKER_BIG 
            ? 'linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%)' 
            : 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)'
        }}
      >
        <div className="card-rank">{getRankDisplay(card.rank)}</div>
        <div className="card-suit">{getSuitSymbol(card.suit)}</div>
        <div className="card-joker-text">{card.rank === Rank.JOKER_BIG ? '王' : '王'}</div>
      </div>
    );
  }

  return (
    <div
      className={`card card-${size} ${selected ? 'card-selected' : ''}`}
      onClick={onClick}
      style={{ color: getSuitColor(card.suit) }}
    >
      <div className="card-rank">{getRankDisplay(card.rank)}</div>
      <div className="card-suit">{getSuitSymbol(card.suit)}</div>
    </div>
  );
};

