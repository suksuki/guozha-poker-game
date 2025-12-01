/**
 * 多人游戏主面板组件（重构版）
 * 使用拆分的 hooks 和组件
 */

import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GameStatus, PlayerType, Player, Card } from '../types/card';
import { useMultiPlayerGame } from '../hooks/useMultiPlayerGame';
import { useGameConfigContext } from '../contexts/GameConfigContext';
import { useChatBubbles } from '../hooks/useChatBubbles';
import { useSimplifiedCardSelection } from '../hooks/useSimplifiedCardSelection';
import { useGameActions } from '../hooks/useGameActions';
import { useCardPlaying } from '../hooks/useCardPlaying';
import { useUrgePlay } from '../hooks/useUrgePlay';
import { useGameAudio } from '../hooks/useGameAudio';
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
import { SimplifiedHandCards } from './game/SimplifiedHandCards';
import { IdeaGenerationToggle } from './game/IdeaGenerationToggle';
import { CardTrackerPanel } from './game/CardTrackerPanel';
import { CardValidationAlert } from './game/CardValidationAlert';
import { getCurrentRoundNumber, getCurrentRoundPlays, getCurrentRoundScore, getLastPlay, getLastPlayPlayerIndex } from '../utils/gameStateUtils';
import './MultiPlayerGameBoard.css';
import './game/DealingAnimation.css'; // 导入AI玩家头像样式

export const MultiPlayerGameBoard: React.FC = () => {
  const { t } = useTranslation(['game']);
  const [showRankings, setShowRankings] = useState(false);
  const [validationError, setValidationError] = useState<any>(null);
  
  const { 
    game, 
    startGame, 
    resetGame,
    isDealing,
    pendingGameConfig,
    handleDealingComplete,
    handleDealingCancel,
    isAutoPlay,
    toggleAutoPlay
  } = useMultiPlayerGame();
  
  // 当游戏重新开始时，重置显示排名状态
  // 注意：游戏结束后不会自动跳转到排名界面，需要用户点击按钮
  useEffect(() => {
    if (game.status !== GameStatus.FINISHED) {
      setShowRankings(false);
    }
    // 游戏结束时，确保 showRankings 为 false（停留在游戏界面）
    // 只有当用户点击"查看排名"按钮时，才会设置为 true
  }, [game.status]);

  // 监听卡牌验证错误事件
  useEffect(() => {
    const handleValidationError = (event: CustomEvent) => {
      console.log('[MultiPlayerGameBoard] 收到卡牌验证错误事件:', event.detail);
      setValidationError(event.detail);
    };

    window.addEventListener('cardValidationError', handleValidationError as EventListener);
    
    return () => {
      window.removeEventListener('cardValidationError', handleValidationError as EventListener);
    };
  }, []);
  
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
  const gameConfig = useGameConfigContext();
  const gameAudio = useGameAudio({
    enableAudio: true,
    maxConcurrent: 2,
    enableDucking: true,
    preloadCommon: true,
  });
  const chatBubbles = useChatBubbles(game, gameAudio);
  
  // 获取人类玩家
  const humanPlayer = useMemo(() => {
    return game.players.find(p => p.isHuman);
  }, [game.players, game.players.length, game.players.map(p => p.hand.length).join(',')]);
  
  // 使用新的打牌系统 Hook（优先使用）
  const cardPlaying = useCardPlaying({
    game,
    playerId: humanPlayer?.id || 0,
    autoInit: true
  });

  // 保留旧的简化选牌系统（用于 SimplifiedHandCards 组件，基于点数选择）
  const simplifiedSelection = useSimplifiedCardSelection(game, humanPlayer);
  
  // 配置角色声线（当游戏开始时）
  useEffect(() => {
    if (game.status === GameStatus.PLAYING && game.players.length > 0) {
      gameAudio.setupSpeakers(game.players);
    }
  }, [game.status, game.players, gameAudio]);
  
  // 催促出牌检测（当人类玩家等待时间过长时，AI会催促）
  useUrgePlay({ game, urgeDelay: 5000 }); // 5秒后催促
  
  // 获取选中的牌（优先使用新的系统，如果为空则使用旧的）
  const selectedCards = useMemo(() => {
    // 优先使用新的 cardPlaying 系统
    if (cardPlaying.selectedCards.length > 0) {
      return cardPlaying.selectedCards;
    }
    // 回退到旧的简化选牌系统
    return simplifiedSelection.getSelectedCards();
  }, [cardPlaying.selectedCards, simplifiedSelection.selection, humanPlayer?.hand]);
  
  // 保留旧的 gameActions（用于向后兼容）
  const gameActions = useGameActions({
    game,
    humanPlayer: humanPlayer,
    selectedCards: selectedCards,
    clearSelectedCards: () => {
      // 同时清空两个系统的选择
      cardPlaying.clearSelection();
      simplifiedSelection.clearSelection();
    },
    strategy: gameConfig.strategy,
    algorithm: gameConfig.algorithm
  });

  // 处理AI建议（使用新的系统）
  const handleSuggestPlay = async () => {
    // 检查是否真的轮到玩家了（直接从game对象获取最新状态）
    const isPlayerTurn = game.status === GameStatus.PLAYING && game.currentPlayerIndex === (humanPlayer?.id ?? -1);
    if (!isPlayerTurn) {
      alert('还没轮到您出牌，请稍候');
      return;
    }

    try {
      const suggestion = await cardPlaying.suggestPlay({
        strategy: gameConfig.strategy,
        algorithm: gameConfig.algorithm || 'mcts',
        mctsIterations: 50
      });
      
      if (suggestion && suggestion.cards && suggestion.cards.length > 0) {
        // SimplifiedHandCards 使用的是 useSimplifiedCardSelection，所以需要更新它的状态
        simplifiedSelection.setSelectionFromCards(suggestion.cards);
        
        // 同时也更新新的系统（保持同步）
        cardPlaying.applySuggestion(suggestion);
      } else {
        // 如果没有建议，尝试使用旧系统
        const suggestedCards = await gameActions.handleSuggestPlay();
        if (suggestedCards && suggestedCards.length > 0) {
          simplifiedSelection.setSelectionFromCards(suggestedCards);
        } else {
          // 如果两个系统都没有建议，提示用户
          alert('AI建议：要不起');
        }
      }
    } catch (error) {
      console.error('获取AI建议失败:', error);
      alert('获取AI建议失败，请稍后重试');
    }
  };

  // 本地状态：跟踪是否正在出牌（用于立即禁用按钮）
  const [isPlayingLocal, setIsPlayingLocal] = useState(false);

  // 当轮到玩家时，重置 isPlayingLocal
  useEffect(() => {
    const isPlayerTurn = game.currentPlayerIndex === (humanPlayer?.id ?? -1);
    if (isPlayerTurn) {
      setIsPlayingLocal(false);
    }
  }, [game.currentPlayerIndex, humanPlayer?.id]);

  // 处理出牌（使用新的系统）
  const handlePlay = async () => {
    if (selectedCards.length === 0) return;
    
    // 立即设置本地状态，禁用按钮
    setIsPlayingLocal(true);
    
    try {
      const result = await cardPlaying.playCards(selectedCards);
      if (!result.success) {
        // 如果新系统失败，显示错误并回退到旧系统
        alert(result.error || '出牌失败');
        // 出牌失败时恢复按钮状态
        setIsPlayingLocal(false);
        // 可选：回退到旧系统
        // await gameActions.handlePlay();
      }
      // 注意：出牌成功后，isPlayerTurn 会由 game.currentPlayerIndex 更新自动变为 false
      // 所以不需要在这里手动设置 setIsPlayingLocal(false)
    } catch (error) {
      console.error('出牌失败:', error);
      setIsPlayingLocal(false);
    }
  };

  // 处理要不起（使用新的系统）
  const handlePass = async () => {
    // 立即设置本地状态，禁用按钮
    setIsPlayingLocal(true);
    
    try {
      await cardPlaying.passCards();
      // 注意：要不起成功后，isPlayerTurn 会由 game.currentPlayerIndex 更新自动变为 false
    } catch (error) {
      console.error('要不起失败:', error);
      setIsPlayingLocal(false);
    }
  };

  // 发牌动画状态
  if (isDealing && pendingGameConfig) {
    const playersWithoutHands = Array(pendingGameConfig.playerCount).fill(null).map((_, index) => {
      const isHuman = index === pendingGameConfig.humanPlayerIndex;
      const aiConfig = isHuman ? undefined : (pendingGameConfig.aiConfigs[index] || { apiKey: '' });
      return {
        id: index,
        name: isHuman ? '你' : `玩家${index + 1}`,
        type: isHuman ? PlayerType.HUMAN : PlayerType.AI,
        isHuman,
        score: -100, // 初始分数为-100（每个人基本分100，所以初始扣除100）
        aiConfig,
        voiceConfig: {} as any
      };
    }) as Omit<Player, 'hand'>[];

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
  if (game.status === GameStatus.WAITING) {
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
        llmModel={gameConfig.llmModel}
        llmApiUrl={gameConfig.llmApiUrl}
        ideaGenerationEnabled={gameConfig.ideaGenerationEnabled}
        cardTrackerEnabled={gameConfig.cardTrackerEnabled}
        cardTrackerPanelVisible={gameConfig.cardTrackerPanelVisible}
        playTimeout={gameConfig.playTimeout}
        announcementDelay={gameConfig.announcementDelay}
        onPlayerCountChange={gameConfig.setPlayerCount}
        onHumanPlayerIndexChange={gameConfig.setHumanPlayerIndex}
        onStrategyChange={gameConfig.setStrategy}
        onAlgorithmChange={gameConfig.setAlgorithm}
        onDealingAlgorithmChange={gameConfig.setDealingAlgorithm}
        onSkipDealingAnimationChange={gameConfig.setSkipDealingAnimation}
        onLlmModelChange={gameConfig.setLlmModel}
        onLlmApiUrlChange={gameConfig.setLlmApiUrl}
        onIdeaGenerationEnabledChange={gameConfig.setIdeaGenerationEnabled}
        onCardTrackerEnabledChange={gameConfig.setCardTrackerEnabled}
        onCardTrackerPanelVisibleChange={gameConfig.setCardTrackerPanelVisible}
        onPlayTimeoutChange={gameConfig.setPlayTimeout}
        onAnnouncementDelayChange={gameConfig.setAnnouncementDelay}
        onStartGame={() => gameConfig.handleStartGame(startGame)}
        onStartTraining={() => gameConfig.setMode('training')}
      />
    );
  }

  // 结束状态：根据 showRankings 决定显示排名界面还是游戏界面
  if (game.status === GameStatus.FINISHED) {
    const winner = game.players[game.winner!];
    
    // 如果用户点击了查看排名按钮，显示排名界面
    if (showRankings) {
      return (
        <GameResultScreen
          winner={winner}
          rankings={game.finalRankings || []}
          gameRecord={game.gameRecord}
          onReset={resetGame}
          onBackToGame={() => setShowRankings(false)}
        />
      );
    }
    
    // 否则继续显示游戏界面，但添加"查看排名"按钮
    // 这样用户可以查看最后的牌面情况
  }

  // 错误状态：显示错误屏幕
  if (game.status === GameStatus.PLAYING && game.players.length === 0) {
    return <ErrorScreen onReset={resetGame} />;
  }

  // 游戏进行中状态
  const lastPlayPlayerIndex = getLastPlayPlayerIndex(game);
  const lastPlayPlayerName = lastPlayPlayerIndex !== null 
    ? game.players[lastPlayPlayerIndex]?.name 
    : undefined;

  return (
    <div className="game-container">
      {/* 卡牌验证错误提示 */}
      <CardValidationAlert
        error={validationError}
        onClose={() => setValidationError(null)}
      />

      {/* 动画容器 */}
      <AnimationContainer />

      {/* 想法生成开关 - 游戏进行中显示 */}
      {game.status === GameStatus.PLAYING && (
        <IdeaGenerationToggle
          enabled={gameConfig.ideaGenerationEnabled}
          onChange={gameConfig.setIdeaGenerationEnabled}
        />
      )}

      {/* 聊天气泡 */}
      <ChatBubblesContainer
        activeChatBubbles={chatBubbles.activeChatBubbles}
        speakingStates={chatBubbles.speakingStates}
        getPlayerBubblePosition={chatBubbles.getPlayerBubblePosition}
        onBubbleComplete={chatBubbles.removeChatBubble}
      />

      {/* 上方区域：AI玩家、出牌区域、按钮 */}
      <div className="top-area">
        {/* AI玩家区域 */}
        <AIPlayersArea
          players={game.players}
          currentPlayerIndex={game.currentPlayerIndex}
          lastPlayPlayerIndex={lastPlayPlayerIndex}
          playerCount={game.playerCount}
        />

        {/* 当前轮次出牌记录 - 放在AI玩家面板下面，横向排列 */}
        {game.status === GameStatus.PLAYING && (
          <div className="round-plays-horizontal-container">
            <RoundPlaysPanel
              roundNumber={getCurrentRoundNumber(game)}
              roundPlays={getCurrentRoundPlays(game)}
              roundScore={getCurrentRoundScore(game)}
              players={game.players}
            />
          </div>
        )}

        {/* 出牌区域 - 放在最上层，避免被遮挡 */}
        <div style={{ position: 'relative', zIndex: 2000 }}>
          <PlayArea
            lastPlay={getLastPlay(game)}
            lastPlayPlayerName={lastPlayPlayerName}
            lastPlayPlayerIndex={lastPlayPlayerIndex}
            players={game.players}
            roundScore={getCurrentRoundScore(game)}
          />
        </div>

        {/* 操作按钮区域 */}
        {humanPlayer && game.status === GameStatus.PLAYING && (
          <div className="human-player-controls-container">
            <ActionButtons
              isPlayerTurn={game.currentPlayerIndex === (humanPlayer?.id ?? -1) && !isPlayingLocal}
              canPass={cardPlaying.canPass}
              selectedCardsCount={selectedCards.length}
              isSuggesting={cardPlaying.isSuggesting}
              lastPlay={getLastPlay(game)}
              isAutoPlay={isAutoPlay}
              onSuggest={handleSuggestPlay}
              onPlay={handlePlay}
              onPass={handlePass}
              onToggleAutoPlay={toggleAutoPlay}
            />
          </div>
        )}
        
        {/* 游戏结束后的查看排名按钮 - 停留在游戏界面，点击按钮才进入分数牌 */}
        {game.status === GameStatus.FINISHED && !showRankings && (
          <div className="game-finished-actions" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            gap: '15px',
            padding: '20px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '15px',
            backdropFilter: 'blur(10px)',
            marginTop: '20px',
            zIndex: 1000
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
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
            >
              {t('game:result.viewRankings')}
            </button>
          </div>
        )}
      </div>

      {/* 记牌器面板 */}
      {game.status === GameStatus.PLAYING && gameConfig.cardTrackerPanelVisible && (
        <CardTrackerPanel
          players={game.players}
          currentRoundNumber={getCurrentRoundNumber(game)}
          gameStatus={game.status}
          currentRoundPlays={getCurrentRoundPlays(game)}
          currentRoundScore={getCurrentRoundScore(game)}
          allRoundsFromGameState={game.rounds.map(r => r.toDetailedRecord())}
        />
      )}

      {/* 玩家手牌区域 */}
      <div className="player-area">
        {!humanPlayer ? (
          <div className="no-human-player">
            <p>未找到人类玩家数据</p>
            <p>游戏状态: {game.status}</p>
            <p>玩家数量: {game.players.length}</p>
          </div>
        ) : (
          <div 
            className="player-hand-wrapper"
            style={{
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              maxWidth: '100%',
              padding: '8px 0 8px 30px',
              background: 'transparent',
              borderRadius: '0',
              backdropFilter: 'none',
              boxShadow: 'none',
              minHeight: '180px',
              border: 'none',
              boxSizing: 'border-box',
              overflow: 'visible'
            }}
          >
            {/* 玩家信息面板 - 放在手牌左边 */}
            {game.status === GameStatus.PLAYING && (
              <div className="player-info-sidebar">
                <PlayerInfo
                  player={humanPlayer}
                  isPlayerTurn={gameActions.isPlayerTurn}
                  playerCount={game.playerCount}
                />
              </div>
            )}
            {/* 手牌 - 使用新的简化选牌系统 */}
            <div className="player-hand-container">
              <SimplifiedHandCards
                game={game}
                humanPlayer={humanPlayer}
                highlightedCards={cardPlaying.highlightedCards}
                onPlay={async (cards: Card[]) => {
                  if (cards.length === 0) return;
                  const result = await cardPlaying.playCards(cards);
                  if (!result.success) {
                    alert(result.error || '出牌失败');
                  } else {
                    // 出牌成功后清空选择
                    simplifiedSelection.clearSelection();
                  }
                }}
                validatePlay={(cards: Card[]) => {
                  const lastPlay = getLastPlay(game);
                  const result = cardPlaying.validatePlayRules(cards, lastPlay);
                  return {
                    valid: result.valid,
                    error: result.error
                  };
                }}
                showPlayButton={game.status === GameStatus.PLAYING && game.currentPlayerIndex === (humanPlayer?.id ?? -1)}
                // 传递 selection 状态和相关方法，确保状态同步
                selection={simplifiedSelection.selection}
                groupedHand={simplifiedSelection.groupedHand}
                clickRank={simplifiedSelection.clickRank}
                doubleClickRank={simplifiedSelection.doubleClickRank}
                cancelRank={simplifiedSelection.cancelRank}
                clearSelection={simplifiedSelection.clearSelection}
                getSelectedCards={simplifiedSelection.getSelectedCards}
                getPlayableRanks={simplifiedSelection.getPlayableRanks}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

