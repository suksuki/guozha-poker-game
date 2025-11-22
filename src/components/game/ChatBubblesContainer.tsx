/**
 * 聊天气泡容器组件
 * 管理并显示所有聊天气泡
 */

import React from 'react';
import { ChatMessage } from '../../types/chat';
import { ChatBubble } from '../ChatBubble';

interface ChatBubblesContainerProps {
  activeChatBubbles: Map<number, ChatMessage>;
  getPlayerBubblePosition: (playerId: number) => React.CSSProperties;
  onBubbleComplete: (playerId: number) => void;
}

export const ChatBubblesContainer: React.FC<ChatBubblesContainerProps> = ({
  activeChatBubbles,
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
          onComplete={() => onBubbleComplete(playerId)}
        />
      ))}
    </>
  );
};

