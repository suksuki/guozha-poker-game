/**
 * 人类玩家沟通输入组件
 * 允许人类玩家输入消息与AI队友沟通
 */

import React, { useState, useCallback } from 'react';
import { Player } from '../../types/card';
import { chatService } from '../../services/chatService';
import './CommunicationInput.css';

interface CommunicationInputProps {
  humanPlayer: Player;
  teammate?: Player; // 队友玩家（可选）
  isEnabled?: boolean;
  onMessageSent?: (message: string) => void;
}

// 快捷短语列表
interface QuickPhrase {
  text: string;
  meaning: string;
  category: 'strategy' | 'information' | 'cooperation';
}

const QUICK_PHRASES: QuickPhrase[] = [
  // 策略请求
  { text: '我来', meaning: '让我来出牌', category: 'strategy' },
  { text: '你来', meaning: '你来出牌', category: 'strategy' },
  { text: '保留大牌', meaning: '保留大牌用于关键时刻', category: 'strategy' },
  { text: '要不起', meaning: '我要不起', category: 'strategy' },
  
  // 信息透露
  { text: '我有炸弹', meaning: '我有炸弹，可以支援', category: 'information' },
  { text: '我没有大牌', meaning: '我没有大牌，需要帮助', category: 'information' },
  { text: '我还有10张', meaning: '我还有10张牌', category: 'information' },
  
  // 配合请求
  { text: '我来拿分', meaning: '让我来拿这一轮的分', category: 'cooperation' },
  { text: '你保护', meaning: '你来保护分牌', category: 'cooperation' },
  { text: '配合一下', meaning: '我们配合一下', category: 'cooperation' },
];

export const CommunicationInput: React.FC<CommunicationInputProps> = ({
  humanPlayer,
  teammate,
  isEnabled = true,
  onMessageSent
}) => {
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSend = useCallback(async () => {
    if (!inputText.trim() || !isEnabled) return;

    const messageContent = inputText.trim();
    
    // 创建并发送消息
    const message = chatService.createMessage(
      humanPlayer,
      messageContent,
      'event' // 人类输入的消息归类为事件类型
    );
    
    chatService.addMessage(message);
    
    // 通知消息已发送
    if (onMessageSent) {
      onMessageSent(messageContent);
    }
    
    // 清空输入框
    setInputText('');
    setIsExpanded(false);
    
  }, [inputText, isEnabled, humanPlayer, onMessageSent]);

  const handleQuickPhrase = useCallback((phrase: QuickPhrase) => {
    setInputText(phrase.meaning);
    setIsExpanded(true);
  }, []);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const categories = {
    strategy: QUICK_PHRASES.filter(p => p.category === 'strategy'),
    information: QUICK_PHRASES.filter(p => p.category === 'information'),
    cooperation: QUICK_PHRASES.filter(p => p.category === 'cooperation')
  };

  const categoryNames = {
    strategy: '策略',
    information: '信息',
    cooperation: '配合'
  };

  if (!isEnabled) {
    return null;
  }

  return (
    <div className="communication-input-container">
      <div className="communication-input-header">
        <span className="communication-label">
          💬 和{teammate ? `${teammate.name}` : '队友'}沟通
        </span>
        <button
          className="toggle-button"
          onClick={() => setIsExpanded(!isExpanded)}
          title={isExpanded ? '收起' : '展开'}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      </div>

      {isExpanded && (
        <div className="communication-input-content">
          {/* 输入框 */}
          <div className="input-wrapper">
            <textarea
              className="message-input"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="输入消息与队友沟通..."
              rows={2}
              maxLength={50}
            />
            <button
              className="send-button"
              onClick={handleSend}
              disabled={!inputText.trim()}
              title="发送消息 (Enter)"
            >
              发送
            </button>
          </div>

          {/* 快捷短语 */}
          <div className="quick-phrases">
            <div className="quick-phrases-title">快捷短语：</div>
            
            {Object.entries(categories).map(([category, phrases]) => (
              <div key={category} className="phrase-category">
                <span className="category-label">{categoryNames[category as keyof typeof categoryNames]}：</span>
                <div className="phrase-buttons">
                  {phrases.map((phrase, idx) => (
                    <button
                      key={idx}
                      className="phrase-button"
                      onClick={() => handleQuickPhrase(phrase)}
                      title={phrase.meaning}
                    >
                      {phrase.text}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

