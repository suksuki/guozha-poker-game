/**
 * 代码审查 Vite 插件
 * 提供 API 端点来处理代码审查相关的操作
 */

import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';

export function codeReviewPlugin(): Plugin {
  return {
    name: 'code-review',
    configureServer(server) {
      // API: 获取文件列表
      server.middlewares.use('/api/code/files', (req, res) => {
        if (req.method !== 'GET') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        try {
          const basePath = req.url?.split('?path=')[1] || 'src';
          const fullPath = path.resolve(process.cwd(), basePath);
          
          const files: string[] = [];
          function scanDir(dir: string, relativePath: string = '') {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              const relPath = path.join(relativePath, entry.name);
              
              if (entry.isDirectory()) {
                // 跳过 node_modules, dist, .git 等目录
                if (!['node_modules', 'dist', '.git', '.vite'].includes(entry.name)) {
                  scanDir(fullPath, relPath);
                }
              } else if (entry.isFile()) {
                // 只包含 TypeScript/JavaScript 文件
                if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
                  files.push(relPath);
                }
              }
            }
          }

          scanDir(fullPath, basePath);
          
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(files));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(error) }));
        }
      });

      // API: 读取文件内容
      server.middlewares.use('/api/code/read', (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { filePath } = JSON.parse(body);
            const fullPath = path.resolve(process.cwd(), filePath);
            
            if (!fs.existsSync(fullPath)) {
              res.writeHead(404);
              res.end(JSON.stringify({ error: 'File not found' }));
              return;
            }

            const content = fs.readFileSync(fullPath, 'utf-8');
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ content }));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: String(error) }));
          }
        });
      });

      // API: 写入文件（应用修复）
      server.middlewares.use('/api/code/write', (req, res) => {
        if (req.method !== 'POST') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });

        req.on('end', () => {
          try {
            const { filePath, content } = JSON.parse(body);
            const fullPath = path.resolve(process.cwd(), filePath);
            
            // 安全检查：确保文件在项目目录内
            const projectRoot = process.cwd();
            if (!fullPath.startsWith(projectRoot)) {
              res.writeHead(403);
              res.end(JSON.stringify({ error: 'Access denied' }));
              return;
            }

            // 备份原文件
            if (fs.existsSync(fullPath)) {
              const backupPath = `${fullPath}.backup.${Date.now()}`;
              fs.copyFileSync(fullPath, backupPath);
            }

            // 写入新内容
            fs.writeFileSync(fullPath, content, 'utf-8');
            
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ success: true }));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: String(error) }));
          }
        });
      });
    },
  };
}

