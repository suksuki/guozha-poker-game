import React, { useEffect, useState } from 'react';
import { ChatMessage } from '../types/chat';
import './ChatBubble.css';

interface ChatBubbleProps {
  message: ChatMessage;
  playerPosition: React.CSSProperties;
  isSpeaking?: boolean;        // 是否正在播放语音
  onSpeechStart?: () => void;  // 语音开始回调
  onSpeechEnd?: () => void;    // 语音结束回调
  onComplete?: () => void;
}

export const ChatBubble: React.FC<ChatBubbleProps> = ({
  message,
  playerPosition,
  isSpeaking = false,
  onSpeechStart,
  onSpeechEnd,
  onComplete
}) => {
  const [visible, setVisible] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const speechStartRef = React.useRef(false);
  const speechEndRef = React.useRef(false);

  // 初始显示：只有在 isSpeaking=true 时才显示气泡（确保和语音同步）
  useEffect(() => {
    // 只有当语音开始播放时才显示气泡
    if (isSpeaking) {
      setVisible(true);
      setSpeaking(true);
      if (!speechStartRef.current) {
        speechStartRef.current = true;
        onSpeechStart?.();
      }
    }
  }, [isSpeaking]);

  // 监听语音播放状态变化
  useEffect(() => {
    // 当 isSpeaking 从 false 变为 true 时，表示语音开始
    if (isSpeaking && !speaking) {
      setSpeaking(true);
      setVisible(true);
      if (!speechStartRef.current) {
        speechStartRef.current = true;
        onSpeechStart?.();
      }
    }
    // 当 isSpeaking 从 true 变为 false 时，表示语音结束
    else if (!isSpeaking && speaking && !speechEndRef.current) {
      setSpeaking(false);
      speechEndRef.current = true;
      // 开始淡出动画
      setFadeOut(true);
      onSpeechEnd?.();
      // 淡出完成后隐藏
      const hideTimer = setTimeout(() => {
        setVisible(false);
        onComplete?.();
      }, 1000); // 淡出动画1秒
      
      return () => clearTimeout(hideTimer);
    }
  }, [isSpeaking, speaking, onSpeechStart, onSpeechEnd, onComplete]);

  // 超时保护机制：如果5秒后还没有开始播放，或者8秒后还没有结束，自动隐藏
  useEffect(() => {
    if (visible) {
      // 如果5秒后还没有开始播放，自动隐藏
      const startTimeout = setTimeout(() => {
        if (visible && !speaking && !speechStartRef.current) {
          setFadeOut(true);
          speechEndRef.current = true;
          setTimeout(() => {
            setVisible(false);
            onComplete?.();
          }, 1000);
        }
      }, 5000);
      
      // 如果8秒后还没有结束，自动隐藏
      const endTimeout = setTimeout(() => {
        if (visible && !speechEndRef.current) {
          setFadeOut(true);
          speechEndRef.current = true;
          setTimeout(() => {
            setVisible(false);
            onComplete?.();
          }, 1000);
        }
      }, 8000);
      
      return () => {
        clearTimeout(startTimeout);
        clearTimeout(endTimeout);
      };
    }
  }, [visible, speaking, onComplete]);

  if (!visible) return null;

  return (
    <div
      className={`chat-bubble ${fadeOut ? 'fade-out' : ''} ${message.type} ${speaking ? 'speaking' : ''}`}
      style={playerPosition}
    >
      <div className="chat-bubble-content">
        <div className="chat-bubble-name">{message.playerName}</div>
        <div className="chat-bubble-text">
          {message.content}
          {speaking && <span className="speaking-indicator">🔊</span>}
        </div>
      </div>
      <div className="chat-bubble-arrow"></div>
    </div>
  );
};

