/**
 * 知识库
 * 存储项目知识、历史记录、最佳实践等
 */

export class KnowledgeBase {
  private initialized = false;
  private db: IDBDatabase | null = null;
  private cache: Map<string, any> = new Map();
  
  /**
   * 初始化知识库
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }
    
    // 初始化IndexedDB
    try {
      this.db = await this.openDatabase();
      this.initialized = true;
    } catch (error) {
      // 降级到内存存储
      this.initialized = true;
    }
  }
  
  /**
   * 打开数据库
   */
  private openDatabase(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('AIControlKnowledgeBase', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // 创建对象存储
        if (!db.objectStoreNames.contains('errors')) {
          db.createObjectStore('errors', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('performance')) {
          db.createObjectStore('performance', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('executions')) {
          db.createObjectStore('executions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('patterns')) {
          db.createObjectStore('patterns', { keyPath: 'id' });
        }
      };
    });
  }
  
  /**
   * 记录错误
   */
  async recordError(error: any): Promise<void> {
    if (this.db) {
      try {
        const tx = this.db.transaction(['errors'], 'readwrite');
        await tx.objectStore('errors').put({
          id: this.generateId(),
          ...error,
          timestamp: Date.now()
        });
      } catch (e) {
      }
    } else {
      // 内存存储
      this.cache.set(`error_${Date.now()}`, error);
    }
  }
  
  /**
   * 记录性能数据
   */
  async recordPerformance(performance: any): Promise<void> {
    if (this.db) {
      try {
        const tx = this.db.transaction(['performance'], 'readwrite');
        await tx.objectStore('performance').put({
          id: this.generateId(),
          ...performance,
          timestamp: Date.now()
        });
      } catch (e) {
      }
    } else {
      this.cache.set(`performance_${Date.now()}`, performance);
    }
  }
  
  /**
   * 记录执行结果
   */
  async recordExecution(execution: any): Promise<void> {
    if (this.db) {
      try {
        const tx = this.db.transaction(['executions'], 'readwrite');
        await tx.objectStore('executions').put({
          id: this.generateId(),
          ...execution,
          timestamp: Date.now()
        });
      } catch (e) {
      }
    } else {
      this.cache.set(`execution_${Date.now()}`, execution);
    }
  }
  
  /**
   * 查询历史记录
   */
  async queryHistory(type: string, limit: number = 100): Promise<any[]> {
    if (this.db) {
      try {
        const tx = this.db.transaction([type], 'readonly');
        const store = tx.objectStore(type);
        const index = store.index('timestamp') || store;
        const request = index.getAll();
        
        return new Promise((resolve, reject) => {
          request.onsuccess = () => {
            const results = request.result || [];
            resolve(results.slice(-limit)); // 取最后N条
          };
          request.onerror = () => reject(request.error);
        });
      } catch (e) {
        return [];
      }
    } else {
      // 内存存储查询
      const results: any[] = [];
      this.cache.forEach((value, key) => {
        if (key.startsWith(`${type}_`)) {
          results.push(value);
        }
      });
      return results.slice(-limit);
    }
  }
  
  /**
   * 生成ID
   */
  private generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

