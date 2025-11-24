import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  cacheDir: path.resolve(__dirname, 'node_modules/.vite'), // 使用绝对路径，确保缓存目录在项目内
  server: {
    host: '0.0.0.0', // 监听所有网络接口，允许从 Windows 访问 WSL
    port: 3000,
    strictPort: false, // 如果端口被占用，自动选择其他端口
    open: false, // 不在 WSL 中自动打开浏览器
    hmr: {
      host: 'localhost' // HMR 使用 localhost
    }
    // 注意：不在server级别设置headers，避免覆盖JS模块的Content-Type
    // 字符编码由Electron的webRequest拦截器处理
  },
  // 确保构建输出使用UTF-8
  build: {
    charset: 'utf8'
  }
})
