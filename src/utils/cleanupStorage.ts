/**
 * localStorage 清理工具
 * 用于清理过大的数据和损坏的配置
 */

/**
 * 清理 localStorage 中的大数据
 */
export function cleanupLargeStorage(): void {
  const keysToCheck = [
    'ollama_servers',
    'game_config',
    'chat_history',
    'training_results'
  ];

  let totalCleaned = 0;

  keysToCheck.forEach(key => {
    try {
      const data = localStorage.getItem(key);
      if (data) {
        const sizeKB = data.length / 1024;
        
        // 如果数据超过 50KB，清除它
        if (sizeKB > 50) {
          console.warn(`Removing large data: ${key} (${sizeKB.toFixed(2)} KB)`);
          localStorage.removeItem(key);
          totalCleaned += sizeKB;
        }
      }
    } catch (e) {
      console.error(`Error checking ${key}:`, e);
      // 如果读取失败，尝试删除
      try {
        localStorage.removeItem(key);
      } catch (removeError) {
        console.error(`Failed to remove ${key}:`, removeError);
      }
    }
  });

  if (totalCleaned > 0) {
    console.log(`Cleaned up ${totalCleaned.toFixed(2)} KB from localStorage`);
  }
}

/**
 * 获取 localStorage 使用情况
 */
export function getStorageUsage(): { used: number; total: number; percentage: number } {
  let used = 0;
  
  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const item = localStorage.getItem(key);
      if (item) {
        used += item.length + key.length;
      }
    }
  }

  // 大多数浏览器的 localStorage 限制是 5MB (5 * 1024 * 1024 字节)
  const total = 5 * 1024 * 1024;
  const percentage = (used / total) * 100;

  return {
    used,
    total,
    percentage
  };
}

/**
 * 检查并警告 localStorage 使用情况
 */
export function checkStorageHealth(): void {
  const usage = getStorageUsage();
  const usedMB = (usage.used / (1024 * 1024)).toFixed(2);
  const totalMB = (usage.total / (1024 * 1024)).toFixed(2);

  console.log(`localStorage usage: ${usedMB} MB / ${totalMB} MB (${usage.percentage.toFixed(1)}%)`);

  if (usage.percentage > 80) {
    console.warn('⚠️ localStorage is nearly full! Consider cleaning up.');
    cleanupLargeStorage();
  } else if (usage.percentage > 50) {
    console.log('ℹ️ localStorage usage is moderate.');
  }
}

/**
 * 列出所有 localStorage 项及其大小
 */
export function listStorageItems(): Array<{ key: string; sizeKB: number }> {
  const items: Array<{ key: string; sizeKB: number }> = [];

  for (let key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      const item = localStorage.getItem(key);
      if (item) {
        items.push({
          key,
          sizeKB: item.length / 1024
        });
      }
    }
  }

  return items.sort((a, b) => b.sizeKB - a.sizeKB);
}

