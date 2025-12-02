/**
 * 训练数据收集服务
 * 用于收集大模型的原始输出和精简后的结果，用于后续训练优化
 */

export interface TrainingSample {
  timestamp: number;
  playerId: number;
  playerName: string;
  eventType: string;
  prompt: string;
  originalContent: string;
  processedContent: string;
  processingStats: {
    originalLength: number;
    processedLength: number;
    reduction: number; // 减少的字符数
    reductionPercent: number; // 减少的百分比
  };
  context?: any; // 游戏上下文信息
}

class TrainingDataCollector {
  private samples: TrainingSample[] = [];
  private maxSamples: number = 1000; // 最多保存1000条样本
  private enabled: boolean = true;

  /**
   * 收集训练样本
   */
  collectSample(sample: Omit<TrainingSample, 'timestamp'>): void {
    if (!this.enabled) {
      return;
    }

    const fullSample: TrainingSample = {
      ...sample,
      timestamp: Date.now()
    };

    this.samples.push(fullSample);

    // 如果超过最大数量，移除最旧的样本
    if (this.samples.length > this.maxSamples) {
      this.samples.shift();
    }
  }

  /**
   * 获取所有样本
   */
  getAllSamples(): TrainingSample[] {
    return [...this.samples];
  }

  /**
   * 获取最近的样本
   */
  getRecentSamples(count: number = 100): TrainingSample[] {
    return this.samples.slice(-count);
  }

  /**
   * 导出训练数据为JSON
   */
  exportToJSON(): string {
    return JSON.stringify(this.samples, null, 2);
  }

  /**
   * 导出训练数据为CSV（用于分析）
   */
  exportToCSV(): string {
    if (this.samples.length === 0) {
      return '';
    }

    const headers = [
      'timestamp',
      'playerId',
      'playerName',
      'eventType',
      'originalLength',
      'processedLength',
      'reduction',
      'reductionPercent',
      'originalContent',
      'processedContent'
    ];

    const rows = this.samples.map(sample => [
      sample.timestamp.toString(),
      sample.playerId.toString(),
      sample.playerName,
      sample.eventType,
      sample.processingStats.originalLength.toString(),
      sample.processingStats.processedLength.toString(),
      sample.processingStats.reduction.toString(),
      sample.processingStats.reductionPercent.toFixed(2),
      `"${sample.originalContent.replace(/"/g, '""')}"`, // CSV转义
      `"${sample.processedContent.replace(/"/g, '""')}"`
    ]);

    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  /**
   * 清空所有样本
   */
  clear(): void {
    this.samples = [];
  }

  /**
   * 启用/禁用收集
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * 获取统计信息
   */
  getStats(): {
    totalSamples: number;
    averageReduction: number;
    averageReductionPercent: number;
    maxReduction: number;
    minReduction: number;
  } {
    if (this.samples.length === 0) {
      return {
        totalSamples: 0,
        averageReduction: 0,
        averageReductionPercent: 0,
        maxReduction: 0,
        minReduction: 0
      };
    }

    const reductions = this.samples.map(s => s.processingStats.reduction);
    const reductionPercents = this.samples.map(s => s.processingStats.reductionPercent);

    return {
      totalSamples: this.samples.length,
      averageReduction: reductions.reduce((a, b) => a + b, 0) / reductions.length,
      averageReductionPercent: reductionPercents.reduce((a, b) => a + b, 0) / reductionPercents.length,
      maxReduction: Math.max(...reductions),
      minReduction: Math.min(...reductions)
    };
  }

  /**
   * 下载训练数据
   */
  downloadData(format: 'json' | 'csv' = 'json'): void {
    const data = format === 'json' ? this.exportToJSON() : this.exportToCSV();
    const filename = `training-data-${new Date().toISOString().split('T')[0]}.${format}`;
    
    const blob = new Blob([data], { type: format === 'json' ? 'application/json' : 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
  }
}

export const trainingDataCollector = new TrainingDataCollector();

// 在开发环境中，将收集器暴露到全局，方便调试
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).trainingDataCollector = trainingDataCollector;
}

