import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'
import { codeReviewPlugin } from './vite-plugins/codeReviewPlugin'
import { testManagementPlugin } from './vite-plugins/testManagementPlugin'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    codeReviewPlugin(),
    testManagementPlugin(),
    {
      name: 'utf8-headers',
      configureServer(server) {
        // 提供项目根目录和 docs 目录的 MD 文件
        server.middlewares.use((req, res, next) => {
          if (req.url && req.url.match(/\.md$/)) {
            // 处理 Markdown 文件请求
            const filePath = path.resolve(__dirname, req.url.startsWith('/') ? req.url.substring(1) : req.url);
            
            // 检查文件是否存在
            if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
              try {
                const content = fs.readFileSync(filePath, 'utf-8');
                res.setHeader('Content-Type', 'text/markdown; charset=UTF-8');
                res.end(content);
                return;
              } catch (error) {
                // 如果读取失败，继续到下一个中间件
              }
            }
          }
          next();
        });
        
        server.middlewares.use((req, res, next) => {
          // 确保所有文本类型文件都包含UTF-8编码
          if (req.url) {
            // 音频文件 - 确保正确的Content-Type（重要！）
            if (req.url.match(/\.(mp3|aiff|aif|wav|ogg|m4a)$/i)) {
              const ext = req.url.split('.').pop()?.toLowerCase();
              const mimeTypes: Record<string, string> = {
                'mp3': 'audio/mpeg',
                'aiff': 'audio/aiff',
                'aif': 'audio/aiff',
                'wav': 'audio/wav',
                'ogg': 'audio/ogg',
                'm4a': 'audio/mp4'
              };
              if (ext && mimeTypes[ext]) {
                res.setHeader('Content-Type', mimeTypes[ext]);
              }
              // 不要修改音频文件的响应，直接传递给下一个中间件
              next();
              return;
            }
            
            // Markdown 文件
            if (req.url.endsWith('.md')) {
              res.setHeader('Content-Type', 'text/markdown; charset=UTF-8');
            }
            // JSON文件
            else if (req.url.endsWith('.json') || req.url.includes('/locales/')) {
              res.setHeader('Content-Type', 'application/json; charset=UTF-8');
            }
            // JavaScript/TypeScript文件
            else if (req.url.endsWith('.js') || req.url.endsWith('.mjs') || req.url.endsWith('.ts') || req.url.endsWith('.tsx')) {
              const existingType = res.getHeader('Content-Type');
              if (existingType && typeof existingType === 'string' && !existingType.includes('charset')) {
                res.setHeader('Content-Type', existingType + '; charset=UTF-8');
              }
            }
            // CSS文件
            else if (req.url.endsWith('.css')) {
              const existingType = res.getHeader('Content-Type');
              if (existingType && typeof existingType === 'string' && !existingType.includes('charset')) {
                res.setHeader('Content-Type', existingType + '; charset=UTF-8');
              }
            }
            // HTML文件
            else if (req.url.endsWith('.html') || req.url === '/' || !req.url.includes('.')) {
              const existingType = res.getHeader('Content-Type');
              if (existingType && typeof existingType === 'string' && !existingType.includes('charset')) {
                res.setHeader('Content-Type', existingType + '; charset=UTF-8');
              }
            }
          }
          next();
        });
      }
    }
  ],
  cacheDir: path.resolve(__dirname, 'node_modules/.vite'), // 使用绝对路径，确保缓存目录在项目内
  server: {
    host: process.platform === 'win32' ? 'localhost' : '0.0.0.0', // Windows 使用 localhost，WSL 使用 0.0.0.0
    port: 3000,
    strictPort: false, // 如果端口被占用，自动选择其他端口
    open: false, // 不自动打开浏览器
    hmr: {
      host: 'localhost' // HMR 使用 localhost
    }
  },
  // 确保构建输出使用UTF-8
  build: {
    charset: 'utf8'
  },
  // 确保public目录正确映射（Electron需要）
  publicDir: 'public'
})
