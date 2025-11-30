/**
 * 音频预加载器
 * 预加载常用音频，提高播放响应速度
 */

import { getTTSServiceManager } from '../tts';
import { defaultSpeakerManager } from '../tts/speakers';

export interface PreloadItem {
  text: string;
  roleId: string;
  lang?: string;
  priority?: 'high' | 'medium' | 'low';
}

/**
 * 常用游戏台词（预加载列表）
 */
export const COMMON_GAME_PHRASES: PreloadItem[] = [
  // 出牌相关
  { text: '我跟一手', roleId: 'player0', priority: 'high' },
  { text: '我跟一手', roleId: 'player1', priority: 'high' },
  { text: '我跟一手', roleId: 'player2', priority: 'high' },
  { text: '我跟一手', roleId: 'player3', priority: 'high' },
  
  // 要不起
  { text: '要不起', roleId: 'player0', priority: 'high' },
  { text: '要不起', roleId: 'player1', priority: 'high' },
  { text: '要不起', roleId: 'player2', priority: 'high' },
  { text: '要不起', roleId: 'player3', priority: 'high' },
  
  // 挑衅
  { text: '你这一手打得不行！', roleId: 'player0', priority: 'medium' },
  { text: '你这一手打得不行！', roleId: 'player1', priority: 'medium' },
  { text: '你莫急咧', roleId: 'player0', priority: 'medium' },
  { text: '你莫急咧', roleId: 'player1', priority: 'medium' },
  
  // 胜利/失败
  { text: '这局我拿下了！', roleId: 'player0', priority: 'low' },
  { text: '这局我拿下了！', roleId: 'player1', priority: 'low' },
  { text: '这局算你运气好', roleId: 'player0', priority: 'low' },
  { text: '这局算你运气好', roleId: 'player1', priority: 'low' },
];

/**
 * 音频预加载器类
 */
export class AudioPreloader {
  private preloaded: Map<string, ArrayBuffer> = new Map();
  private loading: Set<string> = new Set();
  private maxConcurrent: number = 3;  // 最大并发加载数
  private ttsManager = getTTSServiceManager();

  /**
   * 预加载音频列表
   */
  async preload(items: PreloadItem[]): Promise<void> {
    // 按优先级排序
    const sortedItems = items.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority || 'low'] || 0) - (priorityOrder[a.priority || 'low'] || 0);
    });

    // 分批加载
    const batchSize = this.maxConcurrent;
    for (let i = 0; i < sortedItems.length; i += batchSize) {
      const batch = sortedItems.slice(i, i + batchSize);
      await Promise.all(batch.map(item => this.preloadItem(item)));
    }

    console.log(`[AudioPreloader] 预加载完成，共 ${this.preloaded.size} 个音频`);
  }

  /**
   * 预加载单个音频
   */
  private async preloadItem(item: PreloadItem): Promise<void> {
    const cacheKey = this.getCacheKey(item);
    
    // 如果已加载，跳过
    if (this.preloaded.has(cacheKey)) {
      return;
    }

    // 如果正在加载，等待
    if (this.loading.has(cacheKey)) {
      return;
    }

    this.loading.add(cacheKey);

    try {
      const speaker = defaultSpeakerManager.getSpeaker(item.roleId);
      if (!speaker) {
        console.warn(`[AudioPreloader] 角色 ${item.roleId} 未配置`);
        return;
      }

      const ttsResult = await this.ttsManager.synthesize(item.text, {
        lang: (item.lang || speaker.lang) as any,
        voiceConfig: speaker.voiceConfig,
        useCache: true,
      });

      this.preloaded.set(cacheKey, ttsResult.audioBuffer);
      console.log(`[AudioPreloader] 预加载: ${item.text} (${item.roleId})`);
    } catch (error) {
      console.error(`[AudioPreloader] 预加载失败: ${item.text}`, error);
    } finally {
      this.loading.delete(cacheKey);
    }
  }

  /**
   * 获取预加载的音频
   */
  getPreloaded(text: string, roleId: string, lang?: string): ArrayBuffer | null {
    const cacheKey = this.getCacheKey({ text, roleId, lang });
    return this.preloaded.get(cacheKey) || null;
  }

  /**
   * 检查是否已预加载
   */
  isPreloaded(text: string, roleId: string, lang?: string): boolean {
    const cacheKey = this.getCacheKey({ text, roleId, lang });
    return this.preloaded.has(cacheKey);
  }

  /**
   * 获取缓存键
   */
  private getCacheKey(item: PreloadItem): string {
    const speaker = defaultSpeakerManager.getSpeaker(item.roleId);
    const lang = item.lang || speaker?.lang || 'zh';
    return `${item.text}_${item.roleId}_${lang}`;
  }

  /**
   * 清空预加载缓存
   */
  clear(): void {
    this.preloaded.clear();
    this.loading.clear();
  }

  /**
   * 获取预加载统计
   */
  getStats(): { total: number; loading: number } {
    return {
      total: this.preloaded.size,
      loading: this.loading.size,
    };
  }
}

// 单例实例
let audioPreloaderInstance: AudioPreloader | null = null;

/**
 * 获取音频预加载器单例
 */
export function getAudioPreloader(): AudioPreloader {
  if (!audioPreloaderInstance) {
    audioPreloaderInstance = new AudioPreloader();
  }
  return audioPreloaderInstance;
}

/**
 * 预加载常用音频（便捷函数）
 */
export async function preloadCommonAudio(): Promise<void> {
  const preloader = getAudioPreloader();
  await preloader.preload(COMMON_GAME_PHRASES);
}

