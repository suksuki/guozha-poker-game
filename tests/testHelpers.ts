/**
 * 测试辅助函数模块
 * 提供进度显示、性能监控和通用测试工具
 */

// =====================================================
// 进度显示函数
// =====================================================

/**
 * 显示测试进度条
 * @param testName 测试名称
 * @param current 当前进度
 * @param total 总数
 */
export function logTestProgress(testName: string, current: number, total: number): void {
  const percentage = ((current / total) * 100).toFixed(1);
  const barLength = 30;
  const filled = Math.floor((current / total) * barLength);
  const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);

  process.stdout.write(
    `\r[${bar}] ${percentage}% - ${testName} (${current}/${total})`
  );

  if (current === total) {
    process.stdout.write('\n');
  }
}

/**
 * 记录测试套件开始
 * @param suiteName 套件名称
 * @param testCount 测试数量
 */
export function logTestStart(suiteName: string, testCount: number): void {
  console.log(`\n📦 ${suiteName}`);
  console.log(`   共 ${testCount} 个测试\n`);
}

/**
 * 记录单个测试结果
 * @param testName 测试名称
 * @param passed 是否通过
 * @param duration 耗时（毫秒）
 */
export function logTestResult(testName: string, passed: boolean, duration: number): void {
  const icon = passed ? '✅' : '❌';
  const status = passed ? '通过' : '失败';
  console.log(`   ${icon} ${testName} (${duration.toFixed(2)}ms) - ${status}`);
}

/**
 * 记录测试套件汇总
 * @param suiteName 套件名称
 * @param passed 通过数
 * @param failed 失败数
 * @param skipped 跳过数
 * @param duration 总耗时（毫秒）
 */
export function logSuiteSummary(
  suiteName: string,
  passed: number,
  failed: number,
  skipped: number,
  duration: number
): void {
  console.log(`\n📊 ${suiteName} 汇总:`);
  console.log(`   ✅ 通过: ${passed}`);
  console.log(`   ❌ 失败: ${failed}`);
  console.log(`   ⏭️  跳过: ${skipped}`);
  console.log(`   ⏱️  耗时: ${(duration / 1000).toFixed(2)}秒\n`);
}

// =====================================================
// 性能测试辅助函数
// =====================================================

/**
 * 测量函数执行时间
 * @param fn 要测量的函数
 * @param iterations 迭代次数
 * @returns 平均执行时间（毫秒）
 */
export function measureExecutionTime<T>(fn: () => T, iterations: number = 1): {
  result: T;
  avgTime: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
} {
  const times: number[] = [];
  let result: T;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = fn();
    const end = performance.now();
    times.push(end - start);
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return {
    result: result!,
    avgTime,
    totalTime,
    minTime,
    maxTime,
  };
}

/**
 * 异步函数执行时间测量
 * @param fn 要测量的异步函数
 * @param iterations 迭代次数
 */
export async function measureAsyncExecutionTime<T>(
  fn: () => Promise<T>,
  iterations: number = 1
): Promise<{
  result: T;
  avgTime: number;
  totalTime: number;
  minTime: number;
  maxTime: number;
}> {
  const times: number[] = [];
  let result: T;

  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    result = await fn();
    const end = performance.now();
    times.push(end - start);
  }

  const totalTime = times.reduce((a, b) => a + b, 0);
  const avgTime = totalTime / iterations;
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);

  return {
    result: result!,
    avgTime,
    totalTime,
    minTime,
    maxTime,
  };
}

// =====================================================
// 测试数据验证辅助函数
// =====================================================

/**
 * 深度比较两个对象是否相等
 * @param obj1 第一个对象
 * @param obj2 第二个对象
 */
export function deepEqual(obj1: any, obj2: any): boolean {
  if (obj1 === obj2) return true;

  if (typeof obj1 !== typeof obj2) return false;

  if (typeof obj1 !== 'object' || obj1 === null || obj2 === null) {
    return false;
  }

  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);

  if (keys1.length !== keys2.length) return false;

  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }

  return true;
}

/**
 * 检查数组是否包含所有指定元素
 * @param arr 数组
 * @param elements 要检查的元素
 */
export function containsAll<T>(arr: T[], elements: T[]): boolean {
  return elements.every(el => arr.includes(el));
}

/**
 * 检查数组是否包含任一指定元素
 * @param arr 数组
 * @param elements 要检查的元素
 */
export function containsAny<T>(arr: T[], elements: T[]): boolean {
  return elements.some(el => arr.includes(el));
}

// =====================================================
// 等待辅助函数
// =====================================================

/**
 * 等待指定时间
 * @param ms 毫秒数
 */
export function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 等待条件满足
 * @param condition 条件函数
 * @param timeout 超时时间
 * @param interval 检查间隔
 */
export async function waitFor(
  condition: () => boolean | Promise<boolean>,
  timeout: number = 5000,
  interval: number = 100
): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const result = await Promise.resolve(condition());
    if (result) return true;
    await wait(interval);
  }

  return false;
}

// =====================================================
// 随机测试数据生成器
// =====================================================

/**
 * 生成随机整数
 * @param min 最小值
 * @param max 最大值
 */
export function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * 生成随机字符串
 * @param length 长度
 */
export function randomString(length: number): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[randomInt(0, chars.length - 1)];
  }
  return result;
}

/**
 * 从数组中随机选择元素
 * @param arr 数组
 */
export function randomChoice<T>(arr: T[]): T {
  return arr[randomInt(0, arr.length - 1)];
}

/**
 * 从数组中随机选择多个元素
 * @param arr 数组
 * @param count 选择数量
 */
export function randomChoices<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}
