/**
 * 动画容器组件
 * 统一管理所有游戏动画
 */

import React, { useState, useEffect, useCallback } from 'react';
import { GameEventType, GameEvent, DunExplosionEventData } from '../../types/gameEvent';
import { gameEventService } from '../../services/gameEventService';
import { DunExplosionAnimation } from './DunExplosionAnimation';

export const AnimationContainer: React.FC = () => {
  const [activeAnimations, setActiveAnimations] = useState<Map<string, GameEvent>>(new Map());

  useEffect(() => {
    // 订阅出墩爆炸事件
    const unsubscribeDun = gameEventService.subscribe(
      GameEventType.DUN_EXPLOSION,
      (event: GameEvent) => {
        const animationId = `dun-${event.timestamp}`;
        setActiveAnimations(prev => {
          const newMap = new Map(prev);
          newMap.set(animationId, event);
          return newMap;
        });
      }
    );

    // 订阅炸弹爆炸事件（暂时使用出墩动画）
    const unsubscribeBomb = gameEventService.subscribe(
      GameEventType.BOMB_EXPLOSION,
      (event: GameEvent) => {
        const animationId = `bomb-${event.timestamp}`;
        setActiveAnimations(prev => {
          const newMap = new Map(prev);
          newMap.set(animationId, event);
          return newMap;
        });
      }
    );

    return () => {
      unsubscribeDun();
      unsubscribeBomb();
    };
  }, []);

  const handleAnimationComplete = useCallback((animationId: string) => {
    setActiveAnimations(prev => {
      const newMap = new Map(prev);
      newMap.delete(animationId);
      return newMap;
    });
  }, []);

  return (
    <>
      {Array.from(activeAnimations.entries()).map(([id, event]) => {
        if (event.type === GameEventType.DUN_EXPLOSION) {
          return (
            <DunExplosionAnimation
              key={id}
              event={event.data as DunExplosionEventData}
              onComplete={() => handleAnimationComplete(id)}
            />
          );
        }
        // 炸弹爆炸暂时使用出墩动画
        if (event.type === GameEventType.BOMB_EXPLOSION) {
          const bombData = event.data as any;
          return (
            <DunExplosionAnimation
              key={id}
              event={{
                playerId: bombData.playerId,
                playerName: bombData.playerName,
                dunSize: 10, // 炸弹使用较大的动画
                intensity: 'large',
                position: bombData.position
              }}
              onComplete={() => handleAnimationComplete(id)}
            />
          );
        }
        return null;
      })}
    </>
  );
};

