/**
 * 简单的文本进度条工具
 * 用于在控制台显示进度
 */

export interface ProgressOptions {
  total: number;
  current: number;
  width?: number;  // 进度条宽度（默认40）
  showPercentage?: boolean;  // 是否显示百分比
  showTime?: boolean;  // 是否显示时间信息
  startTime?: number;  // 开始时间（用于计算剩余时间）
  label?: string;  // 标签文本
}

/**
 * 创建进度条字符串
 */
export function createProgressBar(options: ProgressOptions): string {
  const {
    total,
    current,
    width = 40,
    showPercentage = true,
    showTime = false,
    startTime,
    label = ''
  } = options;

  const percentage = total > 0 ? (current / total) * 100 : 0;
  const filled = Math.floor((percentage / 100) * width);
  const empty = width - filled;

  // 创建进度条
  const bar = '█'.repeat(filled) + '░'.repeat(empty);
  
  // 构建输出
  let output = '';
  
  if (label) {
    output += `${label} `;
  }
  
  output += `[${bar}]`;
  
  if (showPercentage) {
    output += ` ${percentage.toFixed(1)}%`;
  }
  
  if (showTime && startTime && current > 0) {
    const elapsed = Date.now() - startTime;
    const avgTimePerItem = elapsed / current;
    const remaining = (total - current) * avgTimePerItem;
    
    output += ` | 已用: ${formatTime(elapsed)}`;
    if (current < total) {
      output += ` | 剩余: ${formatTime(remaining)}`;
    }
  }
  
  return output;
}

/**
 * 格式化时间（毫秒转可读格式）
 */
function formatTime(ms: number): string {
  if (ms < 1000) {
    return `${Math.round(ms)}ms`;
  } else if (ms < 60000) {
    return `${(ms / 1000).toFixed(1)}秒`;
  } else if (ms < 3600000) {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}分${seconds}秒`;
  } else {
    const hours = Math.floor(ms / 3600000);
    const minutes = Math.floor((ms % 3600000) / 60000);
    return `${hours}小时${minutes}分`;
  }
}

/**
 * 检查是否在Node.js环境
 */
function isNodeEnv(): boolean {
  return typeof process !== 'undefined' && 
         typeof process.stdout !== 'undefined' && 
         typeof process.stdout.write === 'function';
}

/**
 * 更新进度条（在同一行覆盖）
 */
export function updateProgressBar(options: ProgressOptions): void {
  if (!isNodeEnv()) {
    // 浏览器环境，使用console.log（会换行）
    return;
  }
  
  const progress = createProgressBar(options);
  // 使用 \r 回到行首，覆盖之前的输出
  process.stdout.write(`\r${progress}`);
  
  // 如果完成，换行
  if (options.current >= options.total) {
    process.stdout.write('\n');
  }
}

/**
 * 清除当前行
 */
export function clearLine(): void {
  if (!isNodeEnv()) {
    return;
  }
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
}

