/**
 * 出墩爆炸动画组件
 * 结合 CSS 动画和 Canvas 粒子系统
 */

import React, { useRef, useEffect, useState } from 'react';
import { DunExplosionEventData } from '../../types/gameEvent';
import { getDunAnimationConfig } from '../../config/animationConfig';
import { ParticleSystem, ParticleSystemRef } from './ParticleSystem';
import './DunExplosionAnimation.css';

export interface DunExplosionAnimationProps {
  event: DunExplosionEventData;
  onComplete?: () => void;
}

export const DunExplosionAnimation: React.FC<DunExplosionAnimationProps> = ({
  event,
  onComplete
}) => {
  const particleSystemRef = useRef<ParticleSystemRef>(null);
  const [isVisible, setIsVisible] = useState(true);
  const config = getDunAnimationConfig(event.dunSize);

  useEffect(() => {
    // 启动粒子系统
    if (particleSystemRef.current) {
      particleSystemRef.current.start();
    }

    // 动画结束后清理
    const timer = setTimeout(() => {
      setIsVisible(false);
      if (onComplete) {
        onComplete();
      }
    }, config.duration);

    return () => {
      clearTimeout(timer);
      if (particleSystemRef.current) {
        particleSystemRef.current.stop();
      }
    };
  }, [config.duration, onComplete]);

  if (!isVisible) {
    return null;
  }

  return (
    <>
      {/* CSS 爆炸动画（中心缩放效果） */}
      <div
        className={`dun-explosion dun-explosion-${config.intensity}`}
        style={{
          left: `${event.position.x}px`,
          top: `${event.position.y}px`,
          '--explosion-scale': config.scale,
          '--explosion-duration': `${config.duration}ms`
        } as React.CSSProperties}
      >
        <div className="explosion-core">
          <div className="explosion-ring"></div>
          <div className="explosion-ring ring-2"></div>
          <div className="explosion-ring ring-3"></div>
        </div>
      </div>

      {/* Canvas 粒子系统 */}
      <ParticleSystem
        ref={particleSystemRef}
        config={config}
        position={event.position}
      />
    </>
  );
};

