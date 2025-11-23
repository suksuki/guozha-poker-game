/**
 * 测试辅助函数
 * 提供进度显示和性能监控
 */

export function logTestProgress(testName: string, current: number, total: number) {
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

export function logTestStart(suiteName: string, testCount: number) {
  console.log(`\n📦 ${suiteName}`);
  console.log(`   共 ${testCount} 个测试\n`);
}

export function logTestResult(testName: string, passed: boolean, duration: number) {
  const icon = passed ? '✅' : '❌';
  const status = passed ? '通过' : '失败';
  console.log(`   ${icon} ${testName} (${duration.toFixed(2)}ms) - ${status}`);
}

export function logSuiteSummary(
  suiteName: string,
  passed: number,
  failed: number,
  skipped: number,
  duration: number
) {
  console.log(`\n📊 ${suiteName} 汇总:`);
  console.log(`   ✅ 通过: ${passed}`);
  console.log(`   ❌ 失败: ${failed}`);
  console.log(`   ⏭️  跳过: ${skipped}`);
  console.log(`   ⏱️  耗时: ${(duration / 1000).toFixed(2)}秒\n`);
}

