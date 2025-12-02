/**
 * 单个建议卡片组件
 */

import React from 'react';
import { PlaySuggestion } from '../../services/cardPlaying/types';
import { CardComponent } from '../CardComponent';
import './SuggestionCard.css';

interface SuggestionCardProps {
  suggestion: PlaySuggestion;
  index: number;
  isSelected?: boolean;
  onSelect?: (suggestion: PlaySuggestion) => void;
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({
  suggestion,
  index,
  isSelected = false,
  onSelect
}) => {
  const handleClick = () => {
    if (onSelect) {
      onSelect(suggestion);
    }
  };

  const renderStars = (rating: number) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < fullStars; i++) {
      stars.push(<span key={i} className="star full">★</span>);
    }
    if (hasHalfStar) {
      stars.push(<span key="half" className="star half">☆</span>);
    }
    const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
    for (let i = 0; i < emptyStars; i++) {
      stars.push(<span key={`empty-${i}`} className="star empty">☆</span>);
    }

    return <div className="star-rating">{stars}</div>;
  };

  const getRiskColor = (risk: 'low' | 'medium' | 'high') => {
    switch (risk) {
      case 'low':
        return '#4caf50';
      case 'medium':
        return '#ff9800';
      case 'high':
        return '#f44336';
      default:
        return '#757575';
    }
  };

  return (
    <div
      className={`suggestion-card ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="suggestion-header">
        <div className="suggestion-index">方案 {index + 1}</div>
        {renderStars(suggestion.rating)}
        <div
          className="risk-badge"
          style={{ backgroundColor: getRiskColor(suggestion.riskLevel) }}
        >
          {suggestion.riskLevel === 'low' ? '低风险' :
           suggestion.riskLevel === 'medium' ? '中风险' : '高风险'}
        </div>
      </div>

      <div className="suggestion-cards">
        {suggestion.cards.map((card, idx) => (
          <CardComponent
            key={card.id || `${card.rank}-${card.suit}-${idx}`}
            card={card}
            size="small"
          />
        ))}
      </div>

      <div className="suggestion-type">
        {suggestion.type === 'single' ? '单张' :
         suggestion.type === 'pair' ? '对子' :
         suggestion.type === 'triple' ? '三张' :
         suggestion.type === 'bomb' ? '炸弹' :
         suggestion.type === 'dun' ? '墩' : suggestion.type}
        <span className="play-value">（值：{suggestion.value}）</span>
      </div>

      <div className="suggestion-main-reason">
        <strong>主要理由：</strong>
        {suggestion.mainReason}
      </div>

      <div className="suggestion-details">
        <div className="detailed-reason">
          <strong>详细说明：</strong>
          {suggestion.detailedReason}
        </div>

        {suggestion.advantages.length > 0 && (
          <div className="advantages">
            <strong>优点：</strong>
            <ul>
              {suggestion.advantages.map((adv, idx) => (
                <li key={idx}>{adv}</li>
              ))}
            </ul>
          </div>
        )}

        {suggestion.disadvantages.length > 0 && (
          <div className="disadvantages">
            <strong>缺点：</strong>
            <ul>
              {suggestion.disadvantages.map((dis, idx) => (
                <li key={idx}>{dis}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="expected-benefit">
          <strong>预期收益：</strong>
          {suggestion.expectedBenefit}
        </div>

        <div className="confidence">
          <strong>置信度：</strong>
          <span className="confidence-value">
            {Math.round(suggestion.confidence * 100)}%
          </span>
        </div>
      </div>

      {onSelect && (
        <button className="select-button" onClick={handleClick}>
          选择此方案
        </button>
      )}
    </div>
  );
};

