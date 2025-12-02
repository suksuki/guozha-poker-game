/**
 * 游戏配置 Context
 * 用于在组件之间共享游戏配置状态
 */

import React, { createContext, useContext, ReactNode } from 'react';
import { useGameConfig } from '../hooks/useGameConfig';

interface GameConfigContextType extends ReturnType<typeof useGameConfig> {}

const GameConfigContext = createContext<GameConfigContextType | null>(null);

export const GameConfigProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const gameConfig = useGameConfig();
  
  return (
    <GameConfigContext.Provider value={gameConfig}>
      {children}
    </GameConfigContext.Provider>
  );
};

export const useGameConfigContext = (): GameConfigContextType => {
  const context = useContext(GameConfigContext);
  if (!context) {
    throw new Error('useGameConfigContext must be used within GameConfigProvider');
  }
  return context;
};

