/**
 * 采样器
 * 决定是否对某个路径进行采样
 */

export class Sampler {
  private samplingRate: number;
  private keyPaths: Set<string>;
  
  constructor(
    samplingRate: number,
    keyPaths: string[] = []
  ) {
    this.samplingRate = samplingRate;
    this.keyPaths = new Set(keyPaths);
  }
  
  /**
   * 决定是否采样
   */
  shouldSample(path: string): boolean {
    // 关键路径100%采样
    if (this.keyPaths.has(path)) {
      return true;
    }
    
    // 其他路径按采样率
    return Math.random() < this.samplingRate;
  }
  
  /**
   * 调整采样率
   */
  adjustSamplingRate(rate: number): void {
    this.samplingRate = Math.max(0, Math.min(1, rate));
  }
  
  /**
   * 添加关键路径
   */
  addKeyPath(path: string): void {
    this.keyPaths.add(path);
  }
  
  /**
   * 移除关键路径
   */
  removeKeyPath(path: string): void {
    this.keyPaths.delete(path);
  }
  
  /**
   * 获取当前采样率
   */
  getSamplingRate(): number {
    return this.samplingRate;
  }
}

