/**
 * 游戏音频 Hook
 * 整合多声道音频系统和游戏事件
 */

import { useEffect, useRef } from 'react';
import { useAudioRoom } from '../audio';
import { getGameAudioIntegration } from '../audio/GameAudioIntegration';
import { preloadCommonAudio } from '../audio/audioPreloader';
import { getQuarrelService } from '../ai/quarrelService';
import { defaultSpeakerManager } from '../tts/speakers';
import { Player } from '../types/card';
import { ChatMessage } from '../types/chat';

export interface UseGameAudioConfig {
  enableAudio?: boolean;
  maxConcurrent?: number;
  enableDucking?: boolean;
  preloadCommon?: boolean;  // 是否预加载常用音频，默认 true
}

/**
 * 游戏音频 Hook
 */
export function useGameAudio(config: UseGameAudioConfig = {}) {
  const {
    enableAudio = true,
    maxConcurrent = 2,
    enableDucking = true,
    preloadCommon = true,
  } = config;

  // 初始化音频房间
  const audioRoom = useAudioRoom({
    maxConcurrent,
    enableDucking,
    autoInit: enableAudio,
  });

  const integrationRef = useRef<ReturnType<typeof getGameAudioIntegration> | null>(null);
  const preloadedRef = useRef(false);

  // 初始化游戏音频集成
  useEffect(() => {
    if (!enableAudio) {
      return;
    }

    const integration = getGameAudioIntegration({
      enableAudio,
      maxConcurrent,
      enableDucking,
    });

    integration.setAudioRoom(audioRoom);
    integrationRef.current = integration;

    // 初始化吵架服务
    const quarrelService = getQuarrelService();
    quarrelService.setAudioRoom(audioRoom);

    // 预加载常用音频
    if (preloadCommon && !preloadedRef.current) {
      preloadCommonAudio().catch((error) => {
      });
      preloadedRef.current = true;
    }

    return () => {
      // 清理
      if (integrationRef.current) {
        // 停止所有播放
        audioRoom.stopAll();
      }
    };
  }, [enableAudio, maxConcurrent, enableDucking, preloadCommon, audioRoom]);

  // 配置角色声线（根据游戏玩家）
  const setupSpeakers = (players: Player[]) => {
    players.forEach((player, index) => {
      const roleId = `player${player.id}`;
      
      // 如果角色已存在，跳过
      if (defaultSpeakerManager.getSpeaker(roleId)) {
        return;
      }

      // 创建角色配置
      defaultSpeakerManager.setSpeaker({
        roleId,
        name: player.name,
        lang: 'zh',
        voiceConfig: {
          lang: 'zh-CN',
          rate: 1.0,
          pitch: 1.0 + (index % 3) * 0.1,  // 不同音调
          volume: 1.0,
        },
        pan: index % 2 === 0 ? -0.35 : 0.35,  // 左右分布
        volume: 1.0,
      });
    });
  };

  // 处理聊天消息
  const handleChatMessage = async (message: ChatMessage) => {
    if (!enableAudio || !integrationRef.current) {
      return;
    }

    await integrationRef.current.handleChatMessage(message);
  };

  // 处理出牌事件
  const handlePlayCard = async (player: Player, cards: Card[], isBigDun: boolean = false) => {
    if (!enableAudio || !integrationRef.current) {
      return;
    }

    await integrationRef.current.handlePlayCard(player, cards, isBigDun);
  };

  // 处理要不起事件
  const handlePass = async (player: Player) => {
    if (!enableAudio || !integrationRef.current) {
      return;
    }

    await integrationRef.current.handlePass(player);
  };

  // 处理胜利事件
  const handleWin = async (player: Player) => {
    if (!enableAudio || !integrationRef.current) {
      return;
    }

    await integrationRef.current.handleWin(player);
  };

  // 处理失败事件
  const handleLose = async (player: Player) => {
    if (!enableAudio || !integrationRef.current) {
      return;
    }

    await integrationRef.current.handleLose(player);
  };

  // 处理挑衅事件
  const handleTaunt = async (player: Player, targetPlayer: Player, text?: string) => {
    if (!enableAudio || !integrationRef.current) {
      return;
    }

    await integrationRef.current.handleTaunt(player, targetPlayer, text);
  };

  // 处理长吵架（使用 Beats 生成和分段播放）
  const handleLongQuarrel = async (
    player: Player,
    targetPlayer: Player,
    opponentLastUtterance?: string
  ) => {
    if (!enableAudio || !integrationRef.current) {
      return;
    }

    await integrationRef.current.handleLongQuarrel(player, targetPlayer, opponentLastUtterance);
  };

  return {
    // 音频房间 API
    audioRoom,
    
    // 游戏事件处理
    setupSpeakers,
    handleChatMessage,
    handlePlayCard,
    handlePass,
    handleWin,
    handleLose,
    handleTaunt,
    handleLongQuarrel,
    
    // 状态查询
    isEnabled: enableAudio,
    getPlayingRoles: () => audioRoom.getPlayingRoles(),
    getQueueLength: () => audioRoom.getQueueLength(),
  };
}

