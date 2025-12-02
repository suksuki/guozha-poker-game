/**
 * 异步出牌处理辅助函数
 * 封装使用 Round 类的异步出牌逻辑
 */

import { Round, PlayProcessResult } from './Round';
import { Card, RoundPlayRecord, Player } from '../types/card';
import { canPlayCards, canBeat, calculateCardsScore, isScoreCard } from './cardUtils';
import { handleDunScoring, updatePlayerAfterPlay, triggerGoodPlayReactions } from './playManager';
import { Round as RoundType } from './Round';
import { calculatePlayAnimationPosition } from './animationUtils';
import { triggerTaunt, triggerScoreEatenCurseReaction } from '../services/chatService';
import { cardTracker } from '../services/cardTrackerService';
import { announcePlay } from '../services/systemAnnouncementService';

// 定义游戏状态类型
export interface MultiPlayerGameState {
  rounds: RoundType[];
  players: Player[];
  currentRoundIndex: number;
}

/**
 * 异步处理玩家出牌
 */
export async function processPlayAsync(
  round: Round,
  playerIndex: number,
  selectedCards: Card[],
  players: Player[],
  playerCount: number,
  humanPlayerIndex: number,
  gameConfig: { timingConfig?: any; cardTrackerEnabled?: boolean; announcementDelay?: number },
  updateState: (updater: (prev: MultiPlayerGameState) => MultiPlayerGameState) => void,
  getState: () => MultiPlayerGameState,
  onAnnouncementComplete?: () => void
): Promise<PlayProcessResult> {
  // 从配置或 localStorage 读取计分器开关配置（默认关闭）
  const cardTrackerEnabled = gameConfig?.cardTrackerEnabled ?? (() => {
    const saved = localStorage.getItem('cardTrackerEnabled');
    return saved !== null ? saved === 'true' : false;
  })();
  const processStartTime = Date.now();
  
  // 0. 在开始处理之前，检查轮次是否已结束
  if (round.isEnded()) {
    return {
      status: 'failed' as any,
      startTime: processStartTime,
      endTime: Date.now(),
      error: new Error(`轮次 ${round.roundNumber} 已结束，无法处理出牌`)
    };
  }
  
  // 1. 等待最短间隔
  await round.waitForMinInterval();
  
  // 1.1 等待后再次检查轮次状态
  if (round.isEnded()) {
    return {
      status: 'failed' as any,
      startTime: processStartTime,
      endTime: Date.now(),
      error: new Error(`轮次 ${round.roundNumber} 已结束，无法处理出牌`)
    };
  }
  
  // 2. 验证牌型
  const play = canPlayCards(selectedCards);
  if (!play) {
    throw new Error('不合法的牌型');
  }

  // 3. 检查是否能压过上家
  // 注意：如果 lastPlay 为 null，说明新轮次开始，可以自由出任意牌型
  const lastPlay = round.getLastPlay();
  
  if (lastPlay !== null) {
    if (!canBeat(play, lastPlay)) {
      throw new Error('不能压过上家的牌');
    }
  }

  // 4. 创建出牌记录
  const player = players[playerIndex];
  if (!player) {
    throw new Error(`玩家索引 ${playerIndex} 无效`);
  }
  const playScore = calculateCardsScore(selectedCards);
  const scoreCards = selectedCards.filter(card => isScoreCard(card));
  
  // 确保 playerName 正确设置
  const playerName = player.name || `玩家${playerIndex + 1}`;
  
  const playRecord: RoundPlayRecord = {
    playerId: playerIndex,
    playerName: playerName,
    cards: selectedCards,
    scoreCards: scoreCards,
    score: playScore
  };

  // 5. 异步处理出牌
  return await round.processPlayAsync(playerIndex, async () => {
    // 5.1 计算动画位置
    const animationPosition = calculatePlayAnimationPosition(
      playerIndex,
      players,
      humanPlayerIndex,
      playerCount
    );

    // 5.2 处理墩的计分
    const { updatedPlayers: playersAfterDun, dunScore } = handleDunScoring(
      players,
      playerIndex,
      selectedCards,
      playerCount,
      play,
      animationPosition
    );

    // 5.3 记录出牌到 Round（在记录前再次检查轮次状态）
    if (!round.isEnded()) {
      round.recordPlay(playRecord, play);
      
      // 同时记录到追踪模块（如果启用）
      if (cardTrackerEnabled) {
        try {
          cardTracker.recordPlay(round.roundNumber, playRecord);
        } catch (error) {
          // 追踪失败不应该阻止游戏继续
        }
      }
    } else {
      // 如果轮次已结束，仍然需要更新玩家手牌，但不记录到轮次中
    }

    // 5.4 更新玩家手牌
    const updatedPlayer = updatePlayerAfterPlay(player, selectedCards, dunScore);
    
    const newPlayers = [...playersAfterDun];
    // 合并更新：保留 handleDunScoring 中更新的 dunCount，同时更新手牌和分数
    const playerAfterDun = playersAfterDun[playerIndex];
    const dunCount = (playerAfterDun as any)?.dunCount ?? (updatedPlayer as any).dunCount ?? 0;
    newPlayers[playerIndex] = {
      ...updatedPlayer,
      ...(dunCount !== undefined ? { dunCount } : {})
    } as Player;
    

    // 5.5 生成TTS并播放语音（使用回调，不等待完成）
    // 如果轮次已结束，跳过 TTS 生成和播放，直接触发回调
    if (round.isEnded()) {
      // 轮次已结束，立即触发回调
      onAnnouncementComplete?.();
    } else {
      // 启动报牌（不await），使用回调机制
      let announcementCompleted = false;
      const completeAnnouncement = () => {
        if (announcementCompleted) return;
        announcementCompleted = true;
        
        // 去掉报牌后延迟，立即触发回调继续游戏
        onAnnouncementComplete?.();
      };
      
      // 4秒超时保护，确保回调一定会被触发
      const timeoutId = setTimeout(() => {
        completeAnnouncement();
      }, 4000);
      
      try {
        // 不await，使用onEnd回调
        announcePlay(play, player.voiceConfig, {
          onStart: () => {
            // 动画同步回调（如果需要）
          },
          onEnd: () => {
            clearTimeout(timeoutId);
            completeAnnouncement();
          },
          onError: (error) => {
            // 报牌失败也触发回调，不阻止游戏继续
            clearTimeout(timeoutId);
            completeAnnouncement();
          }
        }).catch((error) => {
          // Promise rejection 也触发回调
          clearTimeout(timeoutId);
          completeAnnouncement();
        });
      } catch (error) {
        // 调用失败也触发回调
        clearTimeout(timeoutId);
        completeAnnouncement();
      }
    }
    
    // 5.6 更新游戏状态（如果轮次未结束）
    if (!round.isEnded()) {
      updateState(prev => {
        // 使用新的状态结构：rounds 数组
        if (prev.currentRoundIndex < 0 || prev.currentRoundIndex >= prev.rounds.length) {
          return prev;
        }
        
        // 更新当前轮次对象
        const updatedRounds = [...prev.rounds];
        updatedRounds[prev.currentRoundIndex] = round;
        
        // 重要：合并玩家状态，保留原有的 finishedRank 和 scoreRank
        // newPlayers 包含手牌和分数的更新，需要从 prev.players 中保留 finishedRank 和 scoreRank
        
        const mergedPlayers = prev.players.map((prevPlayer: Player, i: number) => {
          const newPlayer = newPlayers[i];
          if (!newPlayer) {
            return prevPlayer;
          }
          
          // 合并状态：使用 newPlayer 的分数和手牌（已正确更新），保留 finishedRank 和 scoreRank
          const merged: Player = {
            ...newPlayer, // 使用新玩家的所有属性（包括更新后的手牌、分数、wonRounds等）
            // 重要：finishedRank 和 scoreRank 从 prevPlayer 保留（如果存在）
            // 因为这两个属性是由 GameController 通过回调更新的，不应该被覆盖
            finishedRank: prevPlayer.finishedRank !== undefined && prevPlayer.finishedRank !== null 
              ? prevPlayer.finishedRank 
              : newPlayer.finishedRank,
            scoreRank: prevPlayer.scoreRank !== undefined && prevPlayer.scoreRank !== null 
              ? prevPlayer.scoreRank 
              : newPlayer.scoreRank
          };
          
          
          return merged;
        });
        
        return {
          ...prev,
          rounds: updatedRounds,
          players: mergedPlayers  // 更新玩家手牌（已移除出的牌），但保留 finishedRank 和 scoreRank
        };
      });
    } else {
    }

    // 5.7 触发反应（在状态更新后）
    const currentState = getState();
    triggerGoodPlayReactions(player, play, scoreCards, currentState);
    
    // 触发对骂和其他反应
    if (play.type === 'bomb' || play.type === 'dun' || scoreCards.length > 0) {
      newPlayers.forEach((p, idx) => {
        if (idx !== playerIndex && p.hand.length > 0) {
          if (Math.random() < 0.5) {
            triggerTaunt(p, player, currentState).catch(() => {});
          }
        }
      });
    }

    if (playScore > 0) {
      const totalRoundScore = round.getTotalScore();
      newPlayers.forEach((p, idx) => {
        if (idx !== playerIndex && p.hand.length > 0) {
          const shouldCurse = playScore >= 5 || totalRoundScore >= 10;
          if (shouldCurse && Math.random() < 0.5) {
            triggerScoreEatenCurseReaction(p, playScore, currentState).catch(() => {});
          }
        }
      });
    }
  });
}

