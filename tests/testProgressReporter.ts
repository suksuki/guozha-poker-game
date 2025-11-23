/**
 * 自定义测试进度报告器
 * 显示详细的测试进度、进度条和预计时间
 */

import type { Reporter, File, Task, TaskResultPack } from 'vitest';

interface TestFile {
  filepath: string;
  name: string;
  tasks: Task[];
  result?: TaskResultPack;
}

export default class TestProgressReporter implements Reporter {
  private startTime = Date.now();
  private testFiles: Map<string, TestFile> = new Map();
  private currentFileIndex = 0;
  private totalFiles = 0;
  private totalTests = 0;
  private passedTests = 0;
  private failedTests = 0;
  private skippedTests = 0;
  private runningTests = 0;
  private completedTests = 0;

  onInit() {
    console.log('\n🚀 开始运行测试...\n');
    this.startTime = Date.now();
  }

  onCollected(files?: File[]) {
    if (files) {
      this.totalFiles = files.length;
      this.totalTests = 0;
      
      files.forEach(file => {
        const testCount = this.countTests(file);
        this.totalTests += testCount;
        this.testFiles.set(file.filepath, {
          filepath: file.filepath,
          name: file.name,
          tasks: file.tasks || []
        });
      });

      console.log(`📋 发现 ${this.totalFiles} 个测试文件，共 ${this.totalTests} 个测试\n`);
      console.log('='.repeat(80));
    }
  }

  private countTests(task: Task): number {
    if (task.type === 'test') {
      return 1;
    }
    if (task.tasks) {
      return task.tasks.reduce((sum, t) => sum + this.countTests(t), 0);
    }
    return 0;
  }

  onTaskUpdate(packs: TaskResultPack[]) {
    for (const [id, result] of packs) {
      if (result.type === 'suite') {
        // 处理测试套件
        this.updateSuiteProgress(result);
      } else if (result.type === 'test') {
        // 处理测试用例
        this.updateTestProgress(result);
      }
    }
    
    // 实时更新总体进度
    this.renderOverallProgress();
  }

  private updateSuiteProgress(result: TaskResultPack) {
    // 可以在这里处理套件级别的更新
  }

  private updateTestProgress(result: TaskResultPack) {
    if (result.state === 'pass') {
      this.passedTests++;
      this.completedTests++;
      this.runningTests = Math.max(0, this.runningTests - 1);
    } else if (result.state === 'fail') {
      this.failedTests++;
      this.completedTests++;
      this.runningTests = Math.max(0, this.runningTests - 1);
    } else if (result.state === 'skip') {
      this.skippedTests++;
      this.completedTests++;
    } else if (result.state === 'run') {
      this.runningTests++;
    }
  }

  private renderOverallProgress() {
    const elapsed = (Date.now() - this.startTime) / 1000;
    const progress = this.totalTests > 0 ? this.completedTests / this.totalTests : 0;
    const estimatedTotal = progress > 0 ? elapsed / progress : 0;
    const remaining = Math.max(0, estimatedTotal - elapsed);

    // 进度条
    const barLength = 50;
    const filled = Math.floor(progress * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    const percentage = (progress * 100).toFixed(1);

    // 清空当前行并输出进度
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    process.stdout.write(
      `[${bar}] ${percentage}% | ` +
      `✅ ${this.passedTests} ` +
      `❌ ${this.failedTests} ` +
      `⏭️  ${this.skippedTests} ` +
      `⏱️  ${this.formatTime(elapsed)} ` +
      `(剩余: ${this.formatTime(remaining)})`
    );
  }

  private formatTime(seconds: number): string {
    if (seconds < 60) {
      return `${seconds.toFixed(1)}s`;
    }
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(0);
    return `${mins}m${secs}s`;
  }

  onFinished(files?: File[], errors?: any[]) {
    // 清空进度行
    process.stdout.write('\r' + ' '.repeat(80) + '\r');
    
    const totalTime = (Date.now() - this.startTime) / 1000;
    
    console.log('\n' + '='.repeat(80));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(80));
    console.log(`📁 测试文件: ${this.totalFiles}`);
    console.log(`📝 测试用例: ${this.totalTests}`);
    console.log(`✅ 通过: ${this.passedTests} (${((this.passedTests / this.totalTests) * 100).toFixed(1)}%)`);
    console.log(`❌ 失败: ${this.failedTests} (${((this.failedTests / this.totalTests) * 100).toFixed(1)}%)`);
    console.log(`⏭️  跳过: ${this.skippedTests} (${((this.skippedTests / this.totalTests) * 100).toFixed(1)}%)`);
    console.log(`⏱️  总耗时: ${this.formatTime(totalTime)}`);
    console.log('='.repeat(80));
    
    if (this.failedTests > 0 && errors && errors.length > 0) {
      console.log('\n❌ 失败详情:\n');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message || error}`);
        if (error.stack) {
          console.log(error.stack.split('\n').slice(0, 5).join('\n'));
        }
        console.log('');
      });
    }
    
    if (this.failedTests === 0) {
      console.log('\n🎉 所有测试通过！\n');
    }
  }
}
