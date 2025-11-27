/**
 * 音频缓存系统
 * 使用 IndexedDB 持久化存储音频数据
 */

import { TTSResult } from './ttsClient';

const DB_NAME = 'tts_audio_cache';
const DB_VERSION = 1;
const STORE_NAME = 'audio_cache';

interface CacheEntry {
  key: string;
  audioBuffer: ArrayBuffer;
  duration: number;
  format: string;
  timestamp: number;  // 缓存时间戳
  accessCount: number;  // 访问次数
  lastAccess: number;  // 最后访问时间
}

/**
 * 音频缓存管理器
 */
export class AudioCache {
  private db: IDBDatabase | null = null;
  private memoryCache: Map<string, TTSResult> = new Map();  // 内存缓存（快速访问）
  private maxMemoryCacheSize: number = 100;  // 内存缓存最大条目数
  private maxDBSize: number = 100 * 1024 * 1024;  // IndexedDB 最大大小（100MB）
  private maxAge: number = 7 * 24 * 60 * 60 * 1000;  // 缓存最大年龄（7天）

  /**
   * 初始化 IndexedDB
   */
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('[AudioCache] IndexedDB 打开失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('[AudioCache] IndexedDB 初始化成功');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建对象存储
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'key' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('lastAccess', 'lastAccess', { unique: false });
        }
      };
    });
  }

  /**
   * 获取缓存
   */
  async get(key: string): Promise<TTSResult | null> {
    // 先检查内存缓存
    const memoryCached = this.memoryCache.get(key);
    if (memoryCached) {
      // 更新访问统计
      this.updateAccessStats(key);
      return memoryCached;
    }

    // 从 IndexedDB 获取
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      return null;
    }

    try {
      const entry = await this.getFromDB(key);
      if (entry) {
        // 检查是否过期
        const age = Date.now() - entry.timestamp;
        if (age > this.maxAge) {
          // 过期，删除
          await this.delete(key);
          return null;
        }

        // 转换为 TTSResult
        const result: TTSResult = {
          audioBuffer: entry.audioBuffer,
          duration: entry.duration,
          format: entry.format,
        };

        // 添加到内存缓存
        this.addToMemoryCache(key, result);

        // 更新访问统计
        await this.updateAccessStats(key);

        return result;
      }
    } catch (error) {
      console.error('[AudioCache] 获取缓存失败:', error);
    }

    return null;
  }

  /**
   * 设置缓存
   */
  async set(key: string, result: TTSResult): Promise<void> {
    // 添加到内存缓存
    this.addToMemoryCache(key, result);

    // 保存到 IndexedDB
    if (!this.db) {
      await this.init();
    }

    if (!this.db) {
      return;
    }

    try {
      const entry: CacheEntry = {
        key,
        audioBuffer: result.audioBuffer,
        duration: result.duration,
        format: result.format,
        timestamp: Date.now(),
        accessCount: 0,
        lastAccess: Date.now(),
      };

      await this.saveToDB(entry);

      // 检查是否需要清理
      await this.cleanupIfNeeded();
    } catch (error) {
      console.error('[AudioCache] 保存缓存失败:', error);
    }
  }

  /**
   * 删除缓存
   */
  async delete(key: string): Promise<void> {
    // 从内存缓存删除
    this.memoryCache.delete(key);

    // 从 IndexedDB 删除
    if (!this.db) {
      return;
    }

    try {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await store.delete(key);
    } catch (error) {
      console.error('[AudioCache] 删除缓存失败:', error);
    }
  }

  /**
   * 清空所有缓存
   */
  async clear(): Promise<void> {
    // 清空内存缓存
    this.memoryCache.clear();

    // 清空 IndexedDB
    if (!this.db) {
      return;
    }

    try {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      await store.clear();
    } catch (error) {
      console.error('[AudioCache] 清空缓存失败:', error);
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{
    memoryCacheSize: number;
    dbSize: number;
    totalEntries: number;
  }> {
    const memoryCacheSize = this.memoryCache.size;
    let dbSize = 0;
    let totalEntries = 0;

    if (this.db) {
      try {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        await new Promise<void>((resolve, reject) => {
          request.onsuccess = () => {
            const entries = request.result;
            totalEntries = entries.length;
            
            // 估算大小
            entries.forEach((entry: CacheEntry) => {
              dbSize += entry.audioBuffer.byteLength;
            });
            
            resolve();
          };
          request.onerror = () => reject(request.error);
        });
      } catch (error) {
        console.error('[AudioCache] 获取统计信息失败:', error);
      }
    }

    return {
      memoryCacheSize,
      dbSize,
      totalEntries,
    };
  }

  /**
   * 添加到内存缓存
   */
  private addToMemoryCache(key: string, result: TTSResult): void {
    // 如果内存缓存已满，删除最旧的条目
    if (this.memoryCache.size >= this.maxMemoryCacheSize) {
      const firstKey = this.memoryCache.keys().next().value;
      if (firstKey) {
        this.memoryCache.delete(firstKey);
      }
    }

    this.memoryCache.set(key, result);
  }

  /**
   * 从 IndexedDB 获取
   */
  private getFromDB(key: string): Promise<CacheEntry | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve(null);
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 保存到 IndexedDB
   */
  private saveToDB(entry: CacheEntry): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        resolve();
        return;
      }

      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(entry);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * 更新访问统计
   */
  private async updateAccessStats(key: string): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const entry = await this.getFromDB(key);
      if (entry) {
        entry.accessCount++;
        entry.lastAccess = Date.now();
        await this.saveToDB(entry);
      }
    } catch (error) {
      // 静默失败
    }
  }

  /**
   * 如果需要，清理缓存
   */
  private async cleanupIfNeeded(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const stats = await this.getStats();
      
      // 如果超过最大大小，删除最旧的条目
      if (stats.dbSize > this.maxDBSize) {
        await this.cleanupOldEntries();
      }

      // 删除过期条目
      await this.cleanupExpiredEntries();
    } catch (error) {
      console.error('[AudioCache] 清理缓存失败:', error);
    }
  }

  /**
   * 清理旧条目（按访问时间）
   */
  private async cleanupOldEntries(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('lastAccess');
      const request = index.openCursor(null, 'next');

      const entriesToDelete: string[] = [];
      let totalSize = 0;

      await new Promise<void>((resolve) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            const entry: CacheEntry = cursor.value;
            totalSize += entry.audioBuffer.byteLength;
            
            if (totalSize > this.maxDBSize * 0.8) {  // 保留 80% 的空间
              entriesToDelete.push(entry.key);
            }
            
            cursor.continue();
          } else {
            resolve();
          }
        };
      });

      // 删除选中的条目
      for (const key of entriesToDelete) {
        await this.delete(key);
      }
    } catch (error) {
      console.error('[AudioCache] 清理旧条目失败:', error);
    }
  }

  /**
   * 清理过期条目
   */
  private async cleanupExpiredEntries(): Promise<void> {
    if (!this.db) {
      return;
    }

    try {
      const transaction = this.db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('timestamp');
      const cutoffTime = Date.now() - this.maxAge;
      const request = index.openCursor(IDBKeyRange.upperBound(cutoffTime));

      await new Promise<void>((resolve) => {
        request.onsuccess = (event) => {
          const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          } else {
            resolve();
          }
        };
      });
    } catch (error) {
      console.error('[AudioCache] 清理过期条目失败:', error);
    }
  }
}

// 单例实例
let audioCacheInstance: AudioCache | null = null;

/**
 * 获取音频缓存实例
 */
export function getAudioCache(): AudioCache {
  if (!audioCacheInstance) {
    audioCacheInstance = new AudioCache();
    // 异步初始化
    audioCacheInstance.init().catch((error) => {
      console.error('[AudioCache] 初始化失败:', error);
    });
  }
  return audioCacheInstance;
}

