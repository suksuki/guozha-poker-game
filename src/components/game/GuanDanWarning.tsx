/**
 * 关单/关双警告提示组件
 * 当团队即将被关时显示警告
 */

import React from 'react';

interface GuanDanWarningProps {
  type: 'guan-dan' | 'guan-shuang' | null;  // 关单或关双
  unfinishedCount: number;  // 未出完的玩家数量
  onClose?: () => void;
}

export const GuanDanWarning: React.FC<GuanDanWarningProps> = ({
  type,
  unfinishedCount,
  onClose
}) => {
  if (!type) return null;

  const isGuanDan = type === 'guan-dan';
  const penalty = isGuanDan ? 30 : 15;

  return (
    <div style={{
      position: 'fixed',
      top: '20%',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 10000,
      background: 'linear-gradient(135deg, #ff6b6b 0%, #ff8e53 100%)',
      color: 'white',
      padding: '20px 30px',
      borderRadius: '15px',
      boxShadow: '0 8px 24px rgba(255, 107, 107, 0.4)',
      animation: 'pulse 2s ease-in-out infinite',
      maxWidth: '400px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '36px', marginBottom: '10px' }}>
        ⚠️
      </div>
      <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>
        {isGuanDan ? '关单警告！' : '关双警告！'}
      </div>
      <div style={{ fontSize: '16px', lineHeight: '1.6', marginBottom: '15px' }}>
        {isGuanDan 
          ? `你是最后一名！如果对手出完，你将被关单（-${penalty}分）`
          : `你们团队还有${unfinishedCount}人未出完！如果对手全部出完，将被关双（每人-${penalty}分）`
        }
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'white',
            color: '#ff6b6b',
            border: 'none',
            padding: '8px 20px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '14px'
          }}
        >
          知道了
        </button>
      )}
      
      <style>{`
        @keyframes pulse {
          0%, 100% {
            transform: translateX(-50%) scale(1);
          }
          50% {
            transform: translateX(-50%) scale(1.05);
          }
        }
      `}</style>
    </div>
  );
};

