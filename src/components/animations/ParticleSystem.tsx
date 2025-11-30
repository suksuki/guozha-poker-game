/**
 * 粒子系统组件
 * 使用 Canvas 实现粒子效果
 */

import { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { DunAnimationConfig } from '../../config/animationConfig';

/**
 * 粒子类
 */
class Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  lifetime: number;
  maxLifetime: number;
  alpha: number;

  constructor(x: number, y: number, config: DunAnimationConfig) {
    this.x = x;
    this.y = y;
    this.maxLifetime = config.particleLifetime;
    this.lifetime = this.maxLifetime;
    
    // 随机方向
    const angle = Math.random() * Math.PI * 2;
    const speed = config.particleSpeed * (0.5 + Math.random() * 0.5);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    
    // 随机颜色
    this.color = config.colors[Math.floor(Math.random() * config.colors.length)];
    
    // 随机大小
    this.size = 2 + Math.random() * 4;
    
    this.alpha = 1;
  }

  update(): void {
    this.x += this.vx;
    this.y += this.vy;
    
    // 重力效果
    this.vy += 0.1;
    
    // 摩擦力
    this.vx *= 0.98;
    this.vy *= 0.98;
    
    // 更新生命周期
    this.lifetime -= 16; // 假设 60fps
    this.alpha = Math.max(0, this.lifetime / this.maxLifetime);
  }

  draw(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.globalAlpha = this.alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  isDead(): boolean {
    return this.lifetime <= 0;
  }
}

export interface ParticleSystemProps {
  config: DunAnimationConfig;
  position: { x: number; y: number };
  onComplete?: () => void;
}

export interface ParticleSystemRef {
  start: () => void;
  stop: () => void;
}

export const ParticleSystem = forwardRef<ParticleSystemRef, ParticleSystemProps>(
  ({ config, position, onComplete }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const particlesRef = useRef<Particle[]>([]);
    const animationFrameRef = useRef<number | null>(null);
    const isRunningRef = useRef(false);

    // 创建粒子
    const createParticles = () => {
      const particles: Particle[] = [];
      for (let i = 0; i < config.particleCount; i++) {
        particles.push(new Particle(position.x, position.y, config));
      }
      return particles;
    };

    // 动画循环
    const animate = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 清空画布
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 更新和绘制粒子
      const particles = particlesRef.current;
      let aliveCount = 0;

      for (const particle of particles) {
        if (!particle.isDead()) {
          particle.update();
          particle.draw(ctx);
          aliveCount++;
        }
      }

      // 如果还有存活的粒子，继续动画
      if (aliveCount > 0 && isRunningRef.current) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        // 动画结束
        isRunningRef.current = false;
        if (onComplete) {
          onComplete();
        }
      }
    };

    // 开始动画
    const start = () => {
      if (isRunningRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // 设置画布大小
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      // 创建粒子
      particlesRef.current = createParticles();
      isRunningRef.current = true;

      // 开始动画循环
      animate();
    };

    // 停止动画
    const stop = () => {
      isRunningRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      particlesRef.current = [];
      
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
      }
    };

    useImperativeHandle(ref, () => ({
      start,
      stop
    }));

    useEffect(() => {
      return () => {
        stop();
      };
    }, []);

    return (
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 2000
        }}
      />
    );
  }
);

ParticleSystem.displayName = 'ParticleSystem';

