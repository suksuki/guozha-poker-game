/**
 * 多人游戏主面板组件（重构版）
 * 使用拆分的 hooks 和组件
 */

import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GameStatus, PlayerType } from '../types/card';
import { useMultiPlayerGame } from '../hooks/useMultiPlayerGame';
import { useGameConfig, GameMode } from '../hooks/useGameConfig';
import { useChatBubbles } from '../hooks/useChatBubbles';
import { usePlayerHand } from '../hooks/usePlayerHand';
import { useGameActions } from '../hooks/useGameActions';
import { useUrgePlay } from '../hooks/useUrgePlay';
import { soundService } from '../services/soundService';
import { GameConfigPanel } from './game/GameConfigPanel';
import { TrainingConfigPanel } from './game/TrainingConfigPanel';
import { TrainingRunner } from './game/TrainingRunner';
import { GameResultScreen } from './game/GameResultScreen';
import { ErrorScreen } from './game/ErrorScreen';
import { ChatBubblesContainer } from './game/ChatBubblesContainer';
import { DealingAnimation } from './game/DealingAnimation';
import { AIPlayersArea } from './game/AIPlayersArea';
import { AnimationContainer } from './animations/AnimationContainer';
import { PlayArea } from './game/PlayArea';
import { ActionButtons } from './game/ActionButtons';
import { RoundPlaysPanel } from './game/RoundPlaysPanel';
import { PlayerInfo } from './game/PlayerInfo';
import { PlayerHandGrouped } from './game/PlayerHandGrouped';
import './MultiPlayerGameBoard.css';
import './game/DealingAnimation.css'; // 导入AI玩家头像样式

export const MultiPlayerGameBoard: React.FC = () => {
  const { t } = useTranslation(['game']);
  const [showRankings, setShowRankings] = useState(false);
  
  const { 
    gameState, 
    startGame, 
    playerPlay, 
    playerPass, 
    suggestPlay, 
    resetGame,
    isDealing,
    pendingGameConfig,
    handleDealingComplete,
    handleDealingCancel
  } = useMultiPlayerGame();
  
  // 当游戏重新开始时，重置显示排名状态
  useEffect(() => {
    if (gameState.status !== GameStatus.FINISHED) {
      setShowRankings(false);
    }
  }, [gameState.status]);
  
  // 初始化音效服务（在组件挂载时）
  useEffect(() => {
    console.log('[MultiPlayerGameBoard] 初始化音效服务（使用 Web Audio API）');
    
    // 异步预加载音效
    soundService.preloadSounds().catch(error => {
      console.warn('[MultiPlayerGameBoard] 音效预加载失败', error);
    });
    
    // 尝试解锁音频上下文（处理浏览器自动播放限制）
    const unlockAudio = () => {
      // 通过播放一个静音音效来解锁音频上下文
      try {
        soundService.playSound('dun-small', 0);
        console.log('[MultiPlayerGameBoard] 尝试解锁音频上下文');
      } catch (error) {
        // 忽略错误，这只是为了解锁
        console.warn('[MultiPlayerGameBoard] 解锁音频上下文失败', error);
      }
    };
    
    // 在用户第一次交互时解锁
    const handleFirstInteraction = () => {
      unlockAudio();
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    
    document.addEventListener('click', handleFirstInteraction, { once: true });
    document.addEventListener('keydown', handleFirstInteraction, { once: true });
  }, []);
  
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

  // 发牌动画状态
  if (isDealing && pendingGameConfig) {
    const playersWithoutHands = Array(pendingGameConfig.playerCount).fill(null).map((_, index) => ({
      id: index,
      name: index === pendingGameConfig.humanPlayerIndex ? '你' : `玩家${index + 1}`,
      type: index === pendingGameConfig.humanPlayerIndex ? PlayerType.HUMAN : PlayerType.AI,
      isHuman: index === pendingGameConfig.humanPlayerIndex,
      score: 0,
      aiConfig: index === pendingGameConfig.humanPlayerIndex ? undefined : pendingGameConfig.aiConfigs[index],
      voiceConfig: {} as any
    }));

    return (
      <DealingAnimation
        playerCount={pendingGameConfig.playerCount}
        humanPlayerIndex={pendingGameConfig.humanPlayerIndex}
        players={playersWithoutHands}
        dealingConfig={{
          algorithm: pendingGameConfig.dealingAlgorithm || 'random',
          playerCount: pendingGameConfig.playerCount,
          favorPlayerIndex: pendingGameConfig.humanPlayerIndex
        }}
        onComplete={handleDealingComplete}
        onCancel={handleDealingCancel}
        dealingSpeed={pendingGameConfig.dealingSpeed}
        sortOrder={pendingGameConfig.sortOrder}
      />
    );
  }

  // 等待状态：显示配置面板
  if (gameState.status === GameStatus.WAITING) {
    // 训练模式：显示训练配置面板或训练运行器
    if (gameConfig.mode === 'training') {
      console.log('MultiPlayerGameBoard: 训练模式, isTraining:', gameConfig.isTraining);
      // 如果正在训练，显示训练运行器
      if (gameConfig.isTraining) {
        console.log('MultiPlayerGameBoard: 显示TrainingRunner');
        return (
          <TrainingRunner
            config={gameConfig.trainingConfig}
            onBack={gameConfig.handleTrainingBack}
            onComplete={gameConfig.handleTrainingComplete}
          />
        );
      }
      // 否则显示训练配置面板
      console.log('MultiPlayerGameBoard: 显示TrainingConfigPanel');
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
        dealingSpeed={gameConfig.dealingSpeed}
        sortOrder={gameConfig.sortOrder}
        onDealingSpeedChange={gameConfig.setDealingSpeed}
        onSortOrderChange={gameConfig.setSortOrder} 
        mode={gameConfig.mode}
        onModeChange={gameConfig.setMode}
        playerCount={gameConfig.playerCount}
        humanPlayerIndex={gameConfig.humanPlayerIndex}
        strategy={gameConfig.strategy}
        algorithm={gameConfig.algorithm}
        dealingAlgorithm={gameConfig.dealingAlgorithm}
        skipDealingAnimation={gameConfig.skipDealingAnimation}
        onPlayerCountChange={gameConfig.setPlayerCount}
        onHumanPlayerIndexChange={gameConfig.setHumanPlayerIndex}
        onStrategyChange={gameConfig.setStrategy}
        onAlgorithmChange={gameConfig.setAlgorithm}
        onDealingAlgorithmChange={gameConfig.setDealingAlgorithm}
        onSkipDealingAnimationChange={gameConfig.setSkipDealingAnimation}
        onStartGame={() => gameConfig.handleStartGame(startGame)}
        onStartTraining={() => gameConfig.setMode('training')}
      />
    );
  }

  // 结束状态：根据 showRankings 决定显示排名界面还是游戏界面
  if (gameState.status === GameStatus.FINISHED) {
    const winner = gameState.players[gameState.winner!];
    
    // 如果用户点击了查看排名按钮，显示排名界面
    if (showRankings) {
      return (
        <GameResultScreen
          winner={winner}
          rankings={gameState.finalRankings || []}
          gameRecord={gameState.gameRecord}
          onReset={resetGame}
          onBackToGame={() => setShowRankings(false)}
        />
      );
    }
    
    // 否则继续显示游戏界面，但添加"查看排名"按钮
    // 这样用户可以查看最后的牌面情况
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
      {/* 动画容器 */}
      <AnimationContainer />

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

        {/* 出牌区域 - 放在最上层，避免被遮挡 */}
        <div style={{ position: 'relative', zIndex: 2000 }}>
          <PlayArea
            lastPlay={gameState.lastPlay}
            lastPlayPlayerName={lastPlayPlayerName}
            roundScore={gameState.roundScore}
          />
        </div>

        {/* 操作按钮区域 */}
        {humanPlayer && gameState.status === GameStatus.PLAYING && (
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
        
        {/* 游戏结束后的查看排名按钮 */}
        {gameState.status === GameStatus.FINISHED && !showRankings && (
          <div className="game-finished-actions" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '15px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            backdropFilter: 'blur(10px)',
            marginTop: '20px'
          }}>
            <div style={{ 
              color: 'white', 
              fontSize: '1.5em', 
              fontWeight: 'bold',
              textShadow: '2px 2px 4px rgba(0, 0, 0, 0.3)'
            }}>
              {t('game:result.gameOver')}
            </div>
            <button 
              className="btn-primary" 
              onClick={() => setShowRankings(true)}
              style={{
                padding: '15px 30px',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              {t('game:result.viewRankings')}
            </button>
          </div>
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

