/**
 * 错误屏幕组件
 * 显示游戏状态错误信息
 */

import React from 'react';

interface ErrorScreenProps {
  onReset: () => void;
}

export const ErrorScreen: React.FC<ErrorScreenProps> = ({ onReset }) => {
  return (
    <div className="game-container">
      <div className="error-screen">
        <h2>游戏状态错误</h2>
        <p>玩家数据未正确加载，请重新开始游戏</p>
        <button className="btn-primary" onClick={onReset}>
          返回开始界面
        </button>
      </div>
    </div>
  );
};

