import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import SimpleProgressReporter from './tests/simpleProgressReporter.js'

export default defineConfig({
  plugins: [react({
    jsxRuntime: 'automatic',
    jsxImportSource: 'react',
    babel: {
      parserOpts: {
        plugins: ['jsx']
      }
    }
  })],
  esbuild: {
    jsx: 'automatic',
    jsxDev: false,
    target: 'es2020',
    loader: 'tsx'
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: path.resolve(__dirname, './tests/setup.ts'),
    // 测试文件排除规则（慢测试和UI/异步测试）
    // 可以通过环境变量 TEST_FAST=true 来跳过慢测试
    exclude: process.env.TEST_FAST 
      ? [
          '**/node_modules/**',
          '**/dist/**',
          '**/cypress/**',
          '**/.{idea,git,cache,output,temp}/**',
          // UI 和异步测试
          '**/dealingAnimation.test.ts',
          '**/useChatBubbles.test.ts',
          '**/speechIntegration.test.ts',
          '**/speechUtils.test.ts',
          '**/chatAndVoiceRegression.test.ts',
          '**/chatServiceRegression.test.ts',
          '**/i18n.test.ts',
          // 慢测试（MCTS 微调）
          '**/mctsTuning.test.ts',
          '**/mctsTrainingRegression.test.ts',
          '**/mctsTuningWithProgress.test.ts',
          '**/mctsTuningQuick.test.ts',
          '**/quickTuningFast.test.ts',
          '**/runQuickTuning.test.ts'
          // 注意：chatService.test.ts 和 chatSystem.test.ts 不是异步/UI测试，需要修复并运行
          // dealingManualMode.test.ts 是 UI 测试，已在上面的 UI 测试中排除
        ]
      : [
          '**/node_modules/**',
          '**/dist/**',
          '**/cypress/**',
          '**/.{idea,git,cache,output,temp}/**'
        ],
    transformMode: {
      web: [/\.[jt]sx?$/]
    },
    // 使用默认报告器（显示详细信息）+ 简单进度报告器（显示进度）
    // 实时输出配置：使用 verbose 报告器可以显示详细的实时测试输出
    // 在命令行中使用 --reporter=verbose 可以覆盖此设置
    reporters: process.env.CI ? ['default'] : ['verbose', SimpleProgressReporter],
    // 测试超时设置（5秒）
    testTimeout: 5000,
    hookTimeout: 5000,
    // 并发测试（提高速度）
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        minThreads: 1,
        maxThreads: 4
      }
    },
    // 显示覆盖率
    coverage: {
      reporter: ['text', 'text-summary', 'html'],
      exclude: [
        'node_modules/',
        'tests/',
        '*.config.*',
        'dist/'
      ]
    },
    // 序列化输出，避免混乱 - 改为串行输出以确保实时显示
    // 实时输出关键配置：
    // - concurrent: false 确保测试串行执行，输出不会混乱
    // - 配合 --reporter=verbose 可以显示每个测试的实时进度
    sequence: {
      shuffle: false,
      concurrent: false, // 改为 false 确保实时输出，避免输出混乱
      hooks: 'stack' // 串行执行 hooks
    },
    // 输出配置
    outputFile: {
      verbose: './test-results.txt'
    },
    // 实时输出配置
    // silent: false 确保所有输出都显示（包括 console.log, stdout, stderr）
    logHeapUsage: false,
    silent: false
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

