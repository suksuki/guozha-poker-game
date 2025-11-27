/**
 * 测试管理 Vite 插件
 * 提供 API 端点来处理测试相关的操作
 */

import type { Plugin } from 'vite';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

export function testManagementPlugin(): Plugin {
  return {
    name: 'test-management',
    configureServer(server) {
      // API: 获取测试文件列表
      server.middlewares.use('/api/tests/files', (req, res) => {
        if (req.method !== 'GET') {
          res.writeHead(405);
          res.end('Method not allowed');
          return;
        }

        try {
          // 从查询参数获取路径，默认扫描 tests 和 src 目录
          const url = new URL(req.url || '', 'http://localhost');
          const basePaths = url.searchParams.get('path')?.split(',') || ['tests', 'src'];
          
          const files: string[] = [];
          
          function scanDir(dir: string, relativePath: string = '') {
            if (!fs.existsSync(dir)) {
              return; // 目录不存在，跳过
            }
            
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
              const fullPath = path.join(dir, entry.name);
              const relPath = path.join(relativePath, entry.name);
              
              if (entry.isDirectory()) {
                // 跳过不需要的目录
                if (!['node_modules', 'dist', '.git', '.vite', 'coverage'].includes(entry.name)) {
                  scanDir(fullPath, relPath);
                }
              } else if (entry.isFile()) {
                // 包含测试文件
                if (/\.(test|spec)\.(ts|tsx|js|jsx)$/.test(entry.name)) {
                  files.push(relPath);
                }
              }
            }
          }

          // 扫描所有指定的基础路径
          basePaths.forEach(basePath => {
            const fullPath = path.resolve(process.cwd(), basePath);
            scanDir(fullPath, basePath);
          });
          
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(files));
        } catch (error) {
          res.writeHead(500);
          res.end(JSON.stringify({ error: String(error) }));
        }
      });

      // API: 运行测试
      server.middlewares.use('/api/tests/run', (req, res) => {
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
            const { filePath, all } = JSON.parse(body);
            
            // 设置响应头，支持流式输出
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            // 构建测试命令
            const testCommand = all ? 'npm' : 'npx';
            const testArgs = all 
              ? ['test', '--', '--run']
              : ['vitest', 'run', filePath || ''];

            const testProcess = spawn(testCommand, testArgs, {
              cwd: process.cwd(),
              shell: true,
            });

            testProcess.stdout.on('data', (data) => {
              res.write(`data: ${data.toString()}\n\n`);
            });

            testProcess.stderr.on('data', (data) => {
              res.write(`data: ${data.toString()}\n\n`);
            });

            testProcess.on('close', (code) => {
              res.write(`data: [DONE] Exit code: ${code}\n\n`);
              res.end();
            });

            testProcess.on('error', (error) => {
              res.write(`data: [ERROR] ${error.message}\n\n`);
              res.end();
            });

            // 客户端断开连接时终止进程
            req.on('close', () => {
              testProcess.kill();
            });
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: String(error) }));
          }
        });
      });

      // API: 合并测试文件
      server.middlewares.use('/api/tests/merge', (req, res) => {
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
            const { filePaths, outputPath } = JSON.parse(body);
            
            if (!filePaths || filePaths.length < 2) {
              res.writeHead(400);
              res.end(JSON.stringify({ error: 'At least 2 files required' }));
              return;
            }

            const contents = filePaths.map((filePath: string) => {
              const fullPath = path.resolve(process.cwd(), filePath);
              if (!fs.existsSync(fullPath)) {
                throw new Error(`File not found: ${filePath}`);
              }
              return {
                path: filePath,
                name: path.basename(filePath),
                content: fs.readFileSync(fullPath, 'utf-8'),
              };
            });

            // 合并内容
            const mergedContent = contents
              .map(({ name, content }) => `// ===== ${name} =====\n${content}\n`)
              .join('\n\n');

            // 写入合并后的文件
            const output = outputPath || `merged-tests-${Date.now()}.test.ts`;
            const outputFullPath = path.resolve(process.cwd(), output);
            fs.writeFileSync(outputFullPath, mergedContent, 'utf-8');

            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ 
              success: true, 
              outputPath: output,
              fileCount: contents.length,
            }));
          } catch (error) {
            res.writeHead(500);
            res.end(JSON.stringify({ error: String(error) }));
          }
        });
      });
    },
  };
}

