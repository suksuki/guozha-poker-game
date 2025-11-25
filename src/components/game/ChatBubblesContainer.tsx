/**
 * 聊天气泡容器组件
 * 管理并显示所有聊天气泡
 */

import React from 'react';
import { ChatMessage } from '../../types/chat';
import { ChatBubble } from '../ChatBubble';

interface ChatBubblesContainerProps {
  activeChatBubbles: Map<number, ChatMessage>;
  speakingStates?: Map<number, boolean>;  // 新增：播放状态
  getPlayerBubblePosition: (playerId: number) => React.CSSProperties;
  onBubbleComplete: (playerId: number) => void;
}

export const ChatBubblesContainer: React.FC<ChatBubblesContainerProps> = ({
  activeChatBubbles,
  speakingStates = new Map(),  // 默认空Map
  getPlayerBubblePosition,
  onBubbleComplete
}) => {
  return (
    <>
      {Array.from(activeChatBubbles.entries()).map(([playerId, message]) => (
        <ChatBubble
          key={`${playerId}-${message.timestamp}`}
          message={message}
          playerPosition={getPlayerBubblePosition(playerId)}
          isSpeaking={speakingStates.get(playerId) ?? false}
          onComplete={() => onBubbleComplete(playerId)}
        />
      ))}
    </>
  );
};

