/**
 * 多人游戏主面板组件（重构版）
 * 使用拆分的 hooks 和组件
 */

import React from 'react';
import { GameStatus } from '../types/card';
import { useMultiPlayerGame } from '../hooks/useMultiPlayerGame';
import { useGameConfig, GameMode } from '../hooks/useGameConfig';
import { useChatBubbles } from '../hooks/useChatBubbles';
import { usePlayerHand } from '../hooks/usePlayerHand';
import { useGameActions } from '../hooks/useGameActions';
import { useUrgePlay } from '../hooks/useUrgePlay';
import { GameConfigPanel } from './game/GameConfigPanel';
import { TrainingConfigPanel } from './game/TrainingConfigPanel';
import { TrainingRunner } from './game/TrainingRunner';
import { GameResultScreen } from './game/GameResultScreen';
import { ErrorScreen } from './game/ErrorScreen';
import { ChatBubblesContainer } from './game/ChatBubblesContainer';
import { AIPlayersArea } from './game/AIPlayersArea';
import { PlayArea } from './game/PlayArea';
import { ActionButtons } from './game/ActionButtons';
import { RoundPlaysPanel } from './game/RoundPlaysPanel';
import { PlayerInfo } from './game/PlayerInfo';
import { PlayerHandGrouped } from './game/PlayerHandGrouped';
import './MultiPlayerGameBoard.css';

export const MultiPlayerGameBoard: React.FC = () => {
  const { gameState, startGame, playerPlay, playerPass, suggestPlay, resetGame } = useMultiPlayerGame();
  
  // 使用自定义 hooks
  const gameConfig = useGameConfig();
  const chatBubbles = useChatBubbles(gameState);
  const playerHand = usePlayerHand(gameState);
  
  // 催促出牌检测（当人类玩家等待时间过长时，AI会催促）
  useUrgePlay({ gameState, urgeDelay: 5000 }); // 5秒后催促
  const gameActions = useGameActions({
    gameState,
    humanPlayer: playerHand.humanPlayer,
    selectedCards: playerHand.selectedCards,
    clearSelectedCards: playerHand.clearSelectedCards,
    strategy: gameConfig.strategy,
    algorithm: gameConfig.algorithm,
    playerPlay,
    playerPass,
    suggestPlay
  });

  // 处理AI建议后设置选中的牌
  const handleSuggestPlay = async () => {
    const suggestedCards = await gameActions.handleSuggestPlay();
    if (suggestedCards) {
      playerHand.setSelectedCards(suggestedCards);
    }
  };

  // 等待状态：显示配置面板
  if (gameState.status === GameStatus.WAITING) {
    // 训练模式：显示训练配置面板或训练运行器
    if (gameConfig.mode === 'training') {
      // 如果正在训练，显示训练运行器
      if (gameConfig.isTraining) {
        return (
          <TrainingRunner
            config={gameConfig.trainingConfig}
            onBack={gameConfig.handleTrainingBack}
            onComplete={gameConfig.handleTrainingComplete}
          />
        );
      }
      // 否则显示训练配置面板
      return (
        <TrainingConfigPanel
          config={gameConfig.trainingConfig}
          onConfigChange={gameConfig.setTrainingConfig}
          onStartTraining={gameConfig.handleStartTraining}
          onBack={() => gameConfig.setMode('game')}
        />
      );
    }
    
    // 游戏模式：显示游戏配置面板
    return (
      <GameConfigPanel 
        mode={gameConfig.mode}
        onModeChange={gameConfig.setMode}
        playerCount={gameConfig.playerCount}
        humanPlayerIndex={gameConfig.humanPlayerIndex}
        strategy={gameConfig.strategy}
        algorithm={gameConfig.algorithm}
        onPlayerCountChange={gameConfig.setPlayerCount}
        onHumanPlayerIndexChange={gameConfig.setHumanPlayerIndex}
        onStrategyChange={gameConfig.setStrategy}
        onAlgorithmChange={gameConfig.setAlgorithm}
        onStartGame={() => gameConfig.handleStartGame(startGame)}
        onStartTraining={() => gameConfig.setMode('training')}
      />
    );
  }

  // 结束状态：显示结果屏幕
  if (gameState.status === GameStatus.FINISHED) {
    const winner = gameState.players[gameState.winner!];
    return (
      <GameResultScreen
        winner={winner}
        rankings={gameState.finalRankings || []}
        gameRecord={gameState.gameRecord}
        onReset={resetGame}
      />
    );
  }

  // 错误状态：显示错误屏幕
  if (gameState.status === GameStatus.PLAYING && gameState.players.length === 0) {
    return <ErrorScreen onReset={resetGame} />;
  }

  // 游戏进行中状态
  const humanPlayer = playerHand.humanPlayer;
  const lastPlayPlayerName = gameState.lastPlayPlayerIndex !== null 
    ? gameState.players[gameState.lastPlayPlayerIndex]?.name 
    : undefined;

  return (
    <div className="game-container">
      {/* 聊天气泡 */}
      <ChatBubblesContainer
        activeChatBubbles={chatBubbles.activeChatBubbles}
        getPlayerBubblePosition={chatBubbles.getPlayerBubblePosition}
        onBubbleComplete={chatBubbles.removeChatBubble}
      />

      {/* 上方区域：AI玩家、出牌区域、按钮 */}
      <div className="top-area">
        {/* AI玩家区域 */}
        <AIPlayersArea
          players={gameState.players}
          currentPlayerIndex={gameState.currentPlayerIndex}
          lastPlayPlayerIndex={gameState.lastPlayPlayerIndex}
        />

        {/* 出牌区域 */}
        <PlayArea
          lastPlay={gameState.lastPlay}
          lastPlayPlayerName={lastPlayPlayerName}
          roundScore={gameState.roundScore}
        />

        {/* 操作按钮区域 */}
        {humanPlayer && (
          <ActionButtons
            isPlayerTurn={gameActions.isPlayerTurn}
            canPass={gameActions.canPass}
            selectedCardsCount={playerHand.selectedCards.length}
            isSuggesting={gameActions.isSuggesting}
            lastPlay={gameState.lastPlay}
            onSuggest={handleSuggestPlay}
            onPlay={gameActions.handlePlay}
            onPass={gameActions.handlePass}
          />
        )}
      </div>

      {/* 当前轮次出牌记录 - 可拖拽面板 */}
      <RoundPlaysPanel
        roundNumber={gameState.roundNumber}
        roundPlays={gameState.currentRoundPlays || []}
        roundScore={gameState.roundScore}
      />

      {/* 玩家手牌区域 */}
      <div className="player-area">
        {!humanPlayer ? (
          <div className="no-human-player">
            <p>未找到人类玩家数据</p>
            <p>游戏状态: {gameState.status}</p>
            <p>玩家数量: {gameState.players.length}</p>
          </div>
        ) : (
          <>
            <PlayerInfo
              player={humanPlayer}
              isPlayerTurn={gameActions.isPlayerTurn}
            />
            <PlayerHandGrouped
              groupedHand={playerHand.groupedHand}
              selectedCards={playerHand.selectedCards}
              expandedRanks={playerHand.expandedRanks}
              onCardClick={playerHand.handleCardClick}
              onToggleExpand={playerHand.toggleExpand}
            />
          </>
        )}
      </div>
    </div>
  );
};

