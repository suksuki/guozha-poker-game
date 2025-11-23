/**
 * 简单进度报告器
 * 显示测试进度条和步骤信息
 */

import type { Reporter } from 'vitest';

export default class SimpleProgressReporter implements Reporter {
  private startTime = Date.now();
  private totalTests = 0;
  private completedTests = 0;
  private passedTests = 0;
  private failedTests = 0;
  private skippedTests = 0;
  private currentTest = '';
  private testFiles: string[] = [];
  private currentFileIndex = 0;

  onInit() {
    console.log('\n🚀 开始运行测试...\n');
    this.startTime = Date.now();
  }

  onCollected(files?: any[]) {
    if (files) {
      this.totalTests = files.reduce((sum, file) => {
        const count = this.countTests(file);
        this.testFiles.push(file.name);
        return sum + count;
      }, 0);
      
      // 初始信息会在第一次 renderProgress 时显示
    }
  }

  private countTests(task: any): number {
    if (task.type === 'test') {
      return 1;
    }
    if (task.tasks) {
      return task.tasks.reduce((sum: number, t: any) => sum + this.countTests(t), 0);
    }
    return 0;
  }

  onTaskUpdate(packs: any[]) {
    for (const [id, result] of packs) {
      if (result.type === 'test') {
        if (result.state === 'pass') {
          this.passedTests++;
          this.completedTests++;
        } else if (result.state === 'fail') {
          this.failedTests++;
          this.completedTests++;
        } else if (result.state === 'skip') {
          this.skippedTests++;
          this.completedTests++;
        } else if (result.state === 'run') {
          this.currentTest = result.name || '';
        }
      }
    }
    
    this.renderProgress();
  }

  private lastOutputLines = 0;

  private renderProgress() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const progress = this.totalTests > 0 ? this.completedTests / this.totalTests : 0;
    const estimatedTotal = progress > 0 ? elapsed / progress : 0;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    const running = Math.max(0, this.totalTests - this.completedTests);

    // 进度条
    const barLength = 50;
    const filled = Math.floor(progress * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    const percentage = (progress * 100).toFixed(1);

    // 构建输出内容
    const lines: string[] = [];
    lines.push('\n' + '='.repeat(100));
    lines.push('📊 测试进度总览');
    lines.push('='.repeat(100));
    lines.push('');
    
    // 显示测试文件信息（如果有）
    if (this.testFiles.length > 0) {
      lines.push(`📋 测试文件: ${this.testFiles.length} 个文件，共 ${this.totalTests} 个测试用例`);
      lines.push('');
    }
    
    // 总体进度
    lines.push(`总体进度: [${bar}] ${percentage}%`);
    lines.push(`步骤进度: ${this.completedTests} / ${this.totalTests} 已完成 (剩余 ${running} 个)`);
    lines.push(`测试统计: ✅ ${this.passedTests} 通过 | ❌ ${this.failedTests} 失败 | ⏭️  ${this.skippedTests} 跳过`);
    lines.push(`时间信息: ⏱️  已用 ${this.formatTime(elapsed)} | 剩余约 ${this.formatTime(remaining)}`);
    lines.push('');
    
    // 显示当前测试
    if (this.currentTest) {
      const testName = this.currentTest.length > 80 
        ? this.currentTest.substring(0, 77) + '...' 
        : this.currentTest;
      lines.push(`⏳ 当前运行: ${testName}`);
      lines.push('');
    } else if (this.completedTests === 0) {
      lines.push('⏳ 等待测试开始...');
      lines.push('');
    } else {
      lines.push('⏳ 等待下一个测试...');
      lines.push('');
    }
    
    lines.push('='.repeat(100));

    // 清除之前的输出行
    for (let i = 0; i < this.lastOutputLines; i++) {
      process.stdout.write('\x1B[1A\x1B[2K'); // 上移一行并清除
    }
    
    // 输出新内容
    const output = lines.join('\n');
    process.stdout.write(output);
    this.lastOutputLines = lines.length;
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(0);
    return `${mins}m${secs}s`;
  }

  onFinished(files?: any[], errors?: any[]) {
    // 清除进度显示
    for (let i = 0; i < this.lastOutputLines; i++) {
      process.stdout.write('\x1B[1A\x1B[2K');
    }
    
    const totalTime = (Date.now() - this.startTime) / 1000;
    
    console.log('\n' + '='.repeat(100));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(100));
    console.log('');
    console.log(`📝 总测试数: ${this.totalTests} 个测试用例`);
    console.log(`✅ 通过: ${this.passedTests} (${((this.passedTests / this.totalTests) * 100).toFixed(1)}%)`);
    console.log(`❌ 失败: ${this.failedTests} (${((this.failedTests / this.totalTests) * 100).toFixed(1)}%)`);
    console.log(`⏭️  跳过: ${this.skippedTests} (${((this.skippedTests / this.totalTests) * 100).toFixed(1)}%)`);
    console.log(`⏱️  总耗时: ${this.formatTime(totalTime)}`);
    console.log(`📈 平均速度: ${(this.totalTests / totalTime).toFixed(2)} 测试/秒`);
    console.log('');
    console.log('='.repeat(100));
    
    if (this.failedTests > 0 && errors && errors.length > 0) {
      console.log('\n❌ 失败详情:\n');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message || error}`);
        if (error.stack) {
          const stackLines = error.stack.split('\n').slice(0, 5);
          console.log(stackLines.join('\n'));
        }
        console.log('');
      });
    }
    
    if (this.failedTests === 0) {
      console.log('\n🎉 所有测试通过！\n');
    } else {
      console.log(`\n⚠️  有 ${this.failedTests} 个测试失败，请检查上述详情\n`);
    }
  }
}

