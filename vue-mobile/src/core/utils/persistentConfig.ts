/**
 * 持久化配置工具
 * 支持 localStorage，如果失败则使用 cookies 作为后备
 */

/**
 * 保存配置（带后备机制）
 */
export function saveConfig(key: string, value: string): boolean {
  try {
    // 尝试 localStorage
    localStorage.setItem(key, value);
    return true;
  } catch (e) {
    
    try {
      // 后备：使用 cookie（最多 4KB）
      if (value.length > 4000) {
        return false;
      }
      
      // 设置 cookie（1年有效期）
      const expires = new Date();
      expires.setFullYear(expires.getFullYear() + 1);
      document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires.toUTCString()}; path=/`;
      return true;
    } catch (cookieError) {
      return false;
    }
  }
}

/**
 * 读取配置（自动从 localStorage 或 cookies）
 */
export function loadConfig(key: string): string | null {
  try {
    // 尝试 localStorage
    const value = localStorage.getItem(key);
    if (value !== null) {
      return value;
    }
  } catch (e) {
  }
  
  try {
    // 后备：从 cookie 读取
    const cookies = document.cookie.split(';');
    for (const cookie of cookies) {
      const [cookieKey, cookieValue] = cookie.trim().split('=');
      if (cookieKey === key) {
        return decodeURIComponent(cookieValue);
      }
    }
  } catch (e) {
  }
  
  return null;
}

/**
 * 删除配置
 */
export function removeConfig(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch (e) {
  }
  
  try {
    // 删除 cookie
    document.cookie = `${key}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  } catch (e) {
  }
}

/**
 * 测试存储是否可用
 */
export function testStorage(): {
  localStorage: boolean;
  cookies: boolean;
  message: string;
} {
  let localStorageWorks = false;
  let cookiesWork = false;
  let message = '';

  // 测试 localStorage
  try {
    const testKey = '_storage_test_';
    localStorage.setItem(testKey, 'test');
    const value = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    localStorageWorks = value === 'test';
  } catch (e) {
    message += 'localStorage 不可用; ';
  }

  // 测试 cookies
  try {
    document.cookie = '_cookie_test_=test; path=/';
    cookiesWork = document.cookie.includes('_cookie_test_=test');
    document.cookie = '_cookie_test_=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
  } catch (e) {
    message += 'Cookies 不可用; ';
  }

  if (localStorageWorks && cookiesWork) {
    message = '✅ 所有存储机制正常';
  } else if (localStorageWorks) {
    message = '⚠️ localStorage 正常，但 cookies 不可用';
  } else if (cookiesWork) {
    message = '⚠️ cookies 正常，但 localStorage 不可用';
  } else {
    message = '❌ 所有存储机制都不可用！可能处于隐私模式';
  }

  return {
    localStorage: localStorageWorks,
    cookies: cookiesWork,
    message
  };
}

