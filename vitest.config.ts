import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'
import SimpleProgressReporter from './tests/simpleProgressReporter'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './tests/setup.ts',
    // 使用简单进度报告器（显示实时进度条和步骤）
    reporters: process.env.CI ? ['default'] : [SimpleProgressReporter],
    // 测试超时设置
    testTimeout: 30000,
    hookTimeout: 30000,
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
    // 序列化输出，避免混乱
    sequence: {
      shuffle: false,
      concurrent: true
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})

