#!/usr/bin/env node

/**
 * 完整测试套件运行脚本（带详细日志记录）
 * 遇到问题会记录详细信息到日志，然后继续运行
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// 配置
const LOG_DIR = path.join(projectRoot, 'test-logs');
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
const LOG_FILE = path.join(LOG_DIR, `test-run-${timestamp}.log`);
const SUMMARY_FILE = path.join(LOG_DIR, `test-summary-${timestamp}.txt`);
const ERROR_LOG = path.join(LOG_DIR, `test-errors-${timestamp}.log`);

// 确保日志目录存在
await fs.mkdir(LOG_DIR, { recursive: true });

// 日志函数
const log = async (level, message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level}] ${message}\n`;
  await fs.appendFile(LOG_FILE, logMessage);
  console.log(logMessage.trim());
};

const logError = async (message) => {
  await log('ERROR', message);
  await fs.appendFile(ERROR_LOG, `${new Date().toISOString()} - ${message}\n`);
};

const logInfo = async (message) => {
  await log('INFO', message);
};

const logWarn = async (message) => {
  await log('WARN', message);
};

// 测试结果统计
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;
const failedTestNames = [];
const errorDetails = [];

// 开始测试
await logInfo('==========================================');
await logInfo('开始运行完整测试套件');
await logInfo('==========================================');
await logInfo(`日志文件: ${LOG_FILE}`);
await logInfo(`错误日志: ${ERROR_LOG}`);
await logInfo(`摘要文件: ${SUMMARY_FILE}`);
await logInfo('');

// 运行测试
await logInfo('开始运行测试...');
const startTime = Date.now();

try {
  // 运行测试命令
  const testCommand = 'npm run test:realtime';
  const { stdout, stderr } = await execAsync(testCommand, {
    cwd: projectRoot,
    maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    env: { ...process.env, FORCE_COLOR: '1' }
  });

  // 写入完整输出到日志
  await fs.appendFile(LOG_FILE, '\n=== 测试输出 ===\n');
  await fs.appendFile(LOG_FILE, stdout);
  if (stderr) {
    await fs.appendFile(LOG_FILE, '\n=== 错误输出 ===\n');
    await fs.appendFile(LOG_FILE, stderr);
  }

  // 解析测试结果
  const output = stdout + stderr;
  const lines = output.split('\n');

  for (const line of lines) {
    // 检测通过的测试
    if (line.match(/✓|PASS|passed/i)) {
      passedTests++;
      totalTests++;
    }
    // 检测失败的测试
    else if (line.match(/✗|FAIL|failed/i)) {
      failedTests++;
      totalTests++;
      
      // 提取失败的测试名称
      const failMatch = line.match(/FAIL.*?(\w+\.test\.\w+|\w+\.test\.ts)/i) ||
                       line.match(/✗\s+(.+?)(?:\s|$)/);
      if (failMatch) {
        const testName = failMatch[1] || failMatch[0];
        failedTestNames.push(testName);
        await logError(`测试失败: ${testName}`);
        errorDetails.push({
          test: testName,
          line: line.trim(),
          timestamp: new Date().toISOString()
        });
      }
    }
    // 检测跳过的测试
    else if (line.match(/SKIP|skipped/i)) {
      skippedTests++;
    }
  }

} catch (error) {
  await logError(`测试执行出错: ${error.message}`);
  await fs.appendFile(ERROR_LOG, `\n=== 错误堆栈 ===\n${error.stack}\n`);
  failedTests++;
}

const endTime = Date.now();
const duration = Math.floor((endTime - startTime) / 1000);

// 生成测试摘要
await logInfo('');
await logInfo('==========================================');
await logInfo('测试运行完成');
await logInfo('==========================================');
await logInfo(`总测试数: ${totalTests}`);
await logInfo(`通过: ${passedTests}`);
await logInfo(`失败: ${failedTests}`);
await logInfo(`跳过: ${skippedTests}`);
await logInfo(`总耗时: ${duration}秒`);
await logInfo('');

// 如果有失败的测试，列出详细信息
if (failedTests > 0) {
  await logError('==========================================');
  await logError('失败的测试列表:');
  await logError('==========================================');
  for (const testName of failedTestNames) {
    await logError(`  - ${testName}`);
  }
  await logError('');
  await logError(`详细错误信息请查看: ${ERROR_LOG}`);
}

// 写入摘要文件
const summary = `测试运行摘要
========================================
运行时间: ${new Date().toISOString()}
总测试数: ${totalTests}
通过: ${passedTests}
失败: ${failedTests}
跳过: ${skippedTests}
总耗时: ${duration}秒

失败测试列表:
${failedTestNames.map(name => `  - ${name}`).join('\n')}

错误详情:
${errorDetails.map(detail => `  [${detail.timestamp}] ${detail.test}\n    ${detail.line}`).join('\n\n')}

详细日志: ${LOG_FILE}
错误日志: ${ERROR_LOG}
`;

await fs.writeFile(SUMMARY_FILE, summary);
await logInfo(`测试摘要已保存到: ${SUMMARY_FILE}`);

// 如果有失败的测试，返回非零退出码
if (failedTests > 0) {
  await logError(`测试完成，但有 ${failedTests} 个测试失败`);
  process.exit(1);
} else {
  await logInfo('✅ 所有测试通过！');
  process.exit(0);
}

