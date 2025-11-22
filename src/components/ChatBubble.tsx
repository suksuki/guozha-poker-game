import React, { useEffect, useState } from 'react';
import { ChatMessage } from '../types/chat';
import './ChatBubble.css';

interface ChatBubbleProps {
  message: ChatMessage;
  playerPosition: React.CSSProperties;
  onComplete?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({ message, playerPosition, onComplete }) => {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // 显示动画
    setTimeout(() => setVisible(true), 50);

    // 3秒后开始淡出
    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, 3000);

    // 4秒后完全消失
    const hideTimer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, 4000);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`chat-bubble ${fadeOut ? 'fade-out' : ''} ${message.type}`}
      style={playerPosition}
    >
      <div className="chat-bubble-content">
        <div className="chat-bubble-name">{message.playerName}</div>
        <div className="chat-bubble-text">{message.content}</div>
      </div>
      <div className="chat-bubble-arrow"></div>
    </div>
  );
};

