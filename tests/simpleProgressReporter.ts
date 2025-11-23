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
  private currentTestFile = '';
  private testFiles: string[] = [];
  private currentFileIndex = 0;
  private fileProgress: Map<string, { total: number; completed: number }> = new Map();

  onInit() {
    console.log('\n🚀 开始运行测试...\n');
    this.startTime = Date.now();
  }

  onCollected(files?: any[]) {
    if (files && files.length > 0) {
      // 处理文件数组
      const processFile = (file: any) => {
        const count = this.countTests(file);
        const fileName = file.name || file.filepath || file.file?.name || 'unknown';
        if (!this.testFiles.includes(fileName)) {
          this.testFiles.push(fileName);
          this.fileProgress.set(fileName, { total: count, completed: 0 });
        }
        return count;
      };
      
      this.totalTests = files.reduce((sum, file) => {
        return sum + processFile(file);
      }, 0);
      
      // 收集完成后立即显示进度
      console.log(`\n📋 测试任务序列: ${this.testFiles.length} 个测试文件，共 ${this.totalTests} 个测试用例\n`);
      this.renderProgress();
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
    let hasUpdate = false;
    
    for (const [id, result] of packs) {
      if (result.type === 'test') {
        // 获取文件信息
        const filePath = result.file?.name || result.filepath || result.file || '';
        const fileName = filePath.split('/').pop() || filePath || '';
        
        if (result.state === 'pass') {
          this.passedTests++;
          this.completedTests++;
          hasUpdate = true;
          // 更新文件进度
          if (filePath && this.fileProgress.has(filePath)) {
            const progress = this.fileProgress.get(filePath)!;
            progress.completed++;
          }
        } else if (result.state === 'fail') {
          this.failedTests++;
          this.completedTests++;
          hasUpdate = true;
          // 更新文件进度
          if (filePath && this.fileProgress.has(filePath)) {
            const progress = this.fileProgress.get(filePath)!;
            progress.completed++;
          }
        } else if (result.state === 'skip') {
          this.skippedTests++;
          this.completedTests++;
          hasUpdate = true;
          // 更新文件进度
          if (filePath && this.fileProgress.has(filePath)) {
            const progress = this.fileProgress.get(filePath)!;
            progress.completed++;
          }
        } else if (result.state === 'run') {
          this.currentTest = result.name || '';
          this.currentTestFile = filePath;
          hasUpdate = true;
        }
      }
    }
    
    // 每次有更新时都显示进度
    if (hasUpdate || this.totalTests > 0) {
      this.renderProgress();
    }
  }

  private lastOutputLines = 0;

  private renderProgress() {
    // 只在有测试数据时显示
    if (this.totalTests === 0) return;
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    const progress = this.totalTests > 0 ? this.completedTests / this.totalTests : 0;
    const estimatedTotal = progress > 0 ? elapsed / progress : 0;
    const remaining = Math.max(0, estimatedTotal - elapsed);
    const running = Math.max(0, this.totalTests - this.completedTests);

    // 进度条
    const barLength = 40;
    const filled = Math.floor(progress * barLength);
    const bar = '█'.repeat(filled) + '░'.repeat(barLength - filled);
    const percentage = (progress * 100).toFixed(1);

    // 使用console.log确保输出可见，每次输出新行
    const currentTestInfo = this.currentTest 
      ? (this.currentTest.length > 60 ? this.currentTest.substring(0, 57) + '...' : this.currentTest)
      : '等待测试...';
    
    console.log(`📊 进度: ${this.completedTests}/${this.totalTests} (${percentage}%) [${bar}] ✅${this.passedTests} ❌${this.failedTests} ⏭️${this.skippedTests} ⏱️${this.formatTime(elapsed)} | ${currentTestInfo}`);
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
    // 输出最终结果（不清除，确保信息可见）
    console.log('\n' + '='.repeat(80));
    
    const totalTime = (Date.now() - this.startTime) / 1000;
    
    console.log('\n' + '='.repeat(100));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(100));
    console.log('');
    console.log(`📝 总测试数: ${this.totalTests} 个测试用例`);
    console.log(`✅ 通过: ${this.passedTests} (${this.totalTests > 0 ? ((this.passedTests / this.totalTests) * 100).toFixed(1) : 0}%)`);
    console.log(`❌ 失败: ${this.failedTests} (${this.totalTests > 0 ? ((this.failedTests / this.totalTests) * 100).toFixed(1) : 0}%)`);
    console.log(`⏭️  跳过: ${this.skippedTests} (${this.totalTests > 0 ? ((this.skippedTests / this.totalTests) * 100).toFixed(1) : 0}%)`);
    console.log(`⏱️  总耗时: ${this.formatTime(totalTime)}`);
    if (totalTime > 0) {
      console.log(`📈 平均速度: ${(this.totalTests / totalTime).toFixed(2)} 测试/秒`);
    }
    console.log('');
    console.log('='.repeat(100));
    
    // 收集所有失败的测试信息
    const failedTests: any[] = [];
    if (files) {
      const collectFailed = (task: any) => {
        if (task.type === 'test' && task.result?.state === 'fail') {
          failedTests.push({
            name: task.name || '未知测试',
            file: task.file?.name || task.filepath || '未知文件',
            error: task.result?.error || task.result?.errors?.[0] || '未知错误',
            duration: task.result?.duration || 0
          });
        }
        if (task.tasks) {
          task.tasks.forEach((t: any) => collectFailed(t));
        }
      };
      files.forEach(file => collectFailed(file));
    }
    
    if (this.failedTests > 0) {
      console.log('\n❌ 失败测试详情:\n');
      if (failedTests.length > 0) {
        failedTests.forEach((test, index) => {
          console.log(`${index + 1}. ${test.name}`);
          console.log(`   文件: ${test.file}`);
          if (test.error) {
            if (typeof test.error === 'string') {
              console.log(`   错误: ${test.error}`);
            } else if (test.error.message) {
              console.log(`   错误: ${test.error.message}`);
              if (test.error.stack) {
                const stackLines = test.error.stack.split('\n').slice(0, 10);
                console.log(`   堆栈:\n${stackLines.map((line: string) => `      ${line}`).join('\n')}`);
              }
            } else {
              console.log(`   错误: ${JSON.stringify(test.error, null, 2)}`);
            }
          }
          console.log('');
        });
      } else if (errors && errors.length > 0) {
        errors.forEach((error, index) => {
          console.log(`${index + 1}. ${error.message || error}`);
          if (error.stack) {
            const stackLines = error.stack.split('\n').slice(0, 10);
            console.log(`   堆栈:\n${stackLines.map((line: string) => `      ${line}`).join('\n')}`);
          }
          console.log('');
        });
      }
    }
    
    if (this.failedTests === 0) {
      console.log('\n🎉 所有测试通过！\n');
    } else {
      console.log(`\n⚠️  有 ${this.failedTests} 个测试失败，请检查上述详情\n`);
    }
  }
}

