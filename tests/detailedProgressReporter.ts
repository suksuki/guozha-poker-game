/**
 * 详细进度报告器
 * 显示每个测试文件的进度和每个测试用例的进度
 */

import type { Reporter, File, Task, TaskResultPack } from 'vitest';

interface TestInfo {
  filepath: string;
  name: string;
  totalTests: number;
  completedTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  currentTest?: string;
  startTime: number;
}

export default class DetailedProgressReporter implements Reporter {
  private startTime = Date.now();
  private testFiles: Map<string, TestInfo> = new Map();
  private totalFiles = 0;
  private totalTests = 0;
  private completedFiles = 0;
  private currentFile?: string;
  private lastUpdate = 0;
  private updateInterval = 100; // 每100ms更新一次

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
          totalTests: testCount,
          completedTests: 0,
          passedTests: 0,
          failedTests: 0,
          skippedTests: 0,
          startTime: Date.now()
        });
      });

      console.log(`📋 发现 ${this.totalFiles} 个测试文件，共 ${this.totalTests} 个测试用例\n`);
      this.renderHeader();
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
    const now = Date.now();
    if (now - this.lastUpdate < this.updateInterval) {
      return; // 限制更新频率
    }
    this.lastUpdate = now;

    for (const [id, result] of packs) {
      if (result.type === 'test') {
        this.updateTestResult(result);
      }
    }
    
    this.renderProgress();
  }

  private updateTestResult(result: TaskResultPack) {
    // 找到对应的测试文件 - 通过文件路径匹配
    let fileInfo: TestInfo | undefined;
    
    // 尝试通过文件路径匹配
    if (result.file?.filepath) {
      fileInfo = this.testFiles.get(result.file.filepath);
    }
    
    // 如果没找到，尝试通过文件名匹配
    if (!fileInfo && result.file?.name) {
      for (const [filepath, info] of this.testFiles.entries()) {
        if (info.name === result.file.name || filepath.includes(result.file.name)) {
          fileInfo = info;
          break;
        }
      }
    }

    // 如果还是没找到，尝试创建新条目
    if (!fileInfo && result.file) {
      const filepath = result.file.filepath || result.file.name || 'unknown';
      fileInfo = {
        filepath: filepath,
        name: result.file.name || 'Unknown',
        totalTests: 1,
        completedTests: 0,
        passedTests: 0,
        failedTests: 0,
        skippedTests: 0,
        startTime: Date.now()
      };
      this.testFiles.set(filepath, fileInfo);
      this.totalFiles++;
      this.totalTests++;
    }

    if (!fileInfo) return;

    if (result.state === 'pass') {
      fileInfo.passedTests++;
      fileInfo.completedTests++;
    } else if (result.state === 'fail') {
      fileInfo.failedTests++;
      fileInfo.completedTests++;
    } else if (result.state === 'skip') {
      fileInfo.skippedTests++;
      fileInfo.completedTests++;
    } else if (result.state === 'run') {
      fileInfo.currentTest = result.name;
    }

    // 检查文件是否完成
    if (fileInfo.completedTests === fileInfo.totalTests && !this.currentFile) {
      this.completedFiles++;
    }
  }

  private renderHeader() {
    console.log('='.repeat(100));
    console.log('测试进度');
    console.log('='.repeat(100));
  }

  private renderProgress() {
    // 清屏（移动光标到顶部）
    process.stdout.write('\x1B[2J\x1B[0f');
    
    const elapsed = (Date.now() - this.startTime) / 1000;
    const totalCompleted = Array.from(this.testFiles.values())
      .reduce((sum, info) => sum + info.completedTests, 0);
    const totalPassed = Array.from(this.testFiles.values())
      .reduce((sum, info) => sum + info.passedTests, 0);
    const totalFailed = Array.from(this.testFiles.values())
      .reduce((sum, info) => sum + info.failedTests, 0);
    const totalSkipped = Array.from(this.testFiles.values())
      .reduce((sum, info) => sum + info.skippedTests, 0);

    const overallProgress = this.totalTests > 0 ? totalCompleted / this.totalTests : 0;
    const estimatedTotal = overallProgress > 0 ? elapsed / overallProgress : 0;
    const remaining = Math.max(0, estimatedTotal - elapsed);

    // 总体进度
    console.log('\n📊 总体进度');
    console.log('='.repeat(100));
    const overallBar = this.createProgressBar(overallProgress, 60);
    console.log(
      `[${overallBar}] ${(overallProgress * 100).toFixed(1)}% | ` +
      `✅ ${totalPassed} ` +
      `❌ ${totalFailed} ` +
      `⏭️  ${totalSkipped} ` +
      `| ${totalCompleted}/${this.totalTests} ` +
      `| ⏱️  ${this.formatTime(elapsed)} (剩余: ${this.formatTime(remaining)})`
    );
    console.log('');

    // 文件进度
    console.log('📁 测试文件进度');
    console.log('='.repeat(100));
    
    let fileIndex = 0;
    for (const [filepath, info] of this.testFiles.entries()) {
      fileIndex++;
      const fileProgress = info.totalTests > 0 ? info.completedTests / info.totalTests : 0;
      const fileBar = this.createProgressBar(fileProgress, 40);
      const status = info.completedTests === info.totalTests 
        ? (info.failedTests > 0 ? '❌' : '✅')
        : '⏳';
      
      const fileName = info.name.length > 50 ? info.name.substring(0, 47) + '...' : info.name;
      
      console.log(
        `${status} [${fileBar}] ${(fileProgress * 100).toFixed(0)}% | ` +
        `${fileName} | ` +
        `✅ ${info.passedTests} ❌ ${info.failedTests} ⏭️  ${info.skippedTests} | ` +
        `${info.completedTests}/${info.totalTests}`
      );

      // 显示当前运行的测试
      if (info.currentTest && info.completedTests < info.totalTests) {
        const testName = info.currentTest.length > 60 
          ? info.currentTest.substring(0, 57) + '...' 
          : info.currentTest;
        console.log(`   ⏳ 运行中: ${testName}`);
      }
    }

    console.log('\n' + '='.repeat(100));
  }

  private createProgressBar(progress: number, length: number): string {
    const filled = Math.floor(progress * length);
    return '█'.repeat(filled) + '░'.repeat(length - filled);
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
    // 清屏并显示最终结果
    process.stdout.write('\x1B[2J\x1B[0f');
    
    const totalTime = (Date.now() - this.startTime) / 1000;
    const totalPassed = Array.from(this.testFiles.values())
      .reduce((sum, info) => sum + info.passedTests, 0);
    const totalFailed = Array.from(this.testFiles.values())
      .reduce((sum, info) => sum + info.failedTests, 0);
    const totalSkipped = Array.from(this.testFiles.values())
      .reduce((sum, info) => sum + info.skippedTests, 0);

    console.log('\n' + '='.repeat(100));
    console.log('📊 测试结果汇总');
    console.log('='.repeat(100));
    console.log(`📁 测试文件: ${this.totalFiles}`);
    console.log(`📝 测试用例: ${this.totalTests}`);
    console.log(`✅ 通过: ${totalPassed} (${((totalPassed / this.totalTests) * 100).toFixed(1)}%)`);
    console.log(`❌ 失败: ${totalFailed} (${((totalFailed / this.totalTests) * 100).toFixed(1)}%)`);
    console.log(`⏭️  跳过: ${totalSkipped} (${((totalSkipped / this.totalTests) * 100).toFixed(1)}%)`);
    console.log(`⏱️  总耗时: ${this.formatTime(totalTime)}`);
    console.log('='.repeat(100));
    
    if (totalFailed > 0 && errors && errors.length > 0) {
      console.log('\n❌ 失败详情:\n');
      errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.message || error}`);
        if (error.stack) {
          const stackLines = error.stack.split('\n').slice(0, 10);
          console.log(stackLines.join('\n'));
        }
        console.log('');
      });
    }
    
    if (totalFailed === 0) {
      console.log('\n🎉 所有测试通过！\n');
    } else {
      console.log(`\n⚠️  有 ${totalFailed} 个测试失败\n`);
    }
  }
}

