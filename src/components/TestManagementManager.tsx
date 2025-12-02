/**
 * 测试管理管理器
 * 可视化展示测试分析结果
 */

import React, { useState, useEffect } from 'react';
import { getTestManagementService, TestAnalysis, TestFile } from '../services/testManagementService';
import './TestManagementManager.css';

const TEST_TYPE_LABELS = {
  unit: '单元测试',
  integration: '集成测试',
  e2e: '端到端测试',
  regression: '回归测试',
  other: '其他',
};

export const TestManagementManager: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [analysis, setAnalysis] = useState<TestAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const service = getTestManagementService();

  // 加载测试分析结果
  const handleScan = async () => {
    setIsLoading(true);
    try {
      // 扫描 tests 和 src 目录
      const testAnalysis = await service.scanTests('tests,src');
      setAnalysis(testAnalysis);
    } catch (error) {
      alert('测试扫描失败，请检查控制台');
    } finally {
      setIsLoading(false);
    }
  };

  // 运行单个测试文件
  const handleRunTest = async (file: TestFile) => {
    try {
      const response = await fetch('/api/tests/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath: file.path }),
      });

      if (!response.ok) {
        throw new Error('运行测试失败');
      }

      // 显示测试结果（流式输出）
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let output = '';

      if (reader) {
        const resultWindow = window.open('', '_blank', 'width=800,height=600');
        if (resultWindow) {
          resultWindow.document.write(`
            <html>
              <head><title>测试结果: ${file.name}</title></head>
              <body style="font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4;">
                <h2>测试结果: ${file.name}</h2>
                <pre id="output" style="white-space: pre-wrap; word-wrap: break-word;"></pre>
              </body>
            </html>
          `);

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data === '[DONE]') {
                  output += '\n\n✅ 测试完成';
                } else if (data.startsWith('[ERROR]')) {
                  output += `\n❌ ${data}`;
                } else {
                  output += data;
                }
                
                const outputEl = resultWindow.document.getElementById('output');
                if (outputEl) {
                  outputEl.textContent = output;
                  resultWindow.scrollTo(0, resultWindow.document.body.scrollHeight);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      alert(`运行测试失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 运行所有测试
  const handleRunAllTests = async () => {
    if (!confirm('确定要运行所有测试吗？这可能需要一些时间。')) {
      return;
    }

    try {
      const response = await fetch('/api/tests/run', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ all: true }),
      });

      if (!response.ok) {
        throw new Error('运行所有测试失败');
      }

      // 显示测试结果
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let output = '';

      if (reader) {
        const resultWindow = window.open('', '_blank', 'width=800,height=600');
        if (resultWindow) {
          resultWindow.document.write(`
            <html>
              <head><title>所有测试结果</title></head>
              <body style="font-family: monospace; padding: 20px; background: #1e1e1e; color: #d4d4d4;">
                <h2>所有测试结果</h2>
                <pre id="output" style="white-space: pre-wrap; word-wrap: break-word;"></pre>
              </body>
            </html>
          `);

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.substring(6);
                if (data.includes('[DONE]')) {
                  output += '\n\n✅ 所有测试完成';
                } else if (data.startsWith('[ERROR]')) {
                  output += `\n❌ ${data}`;
                } else {
                  output += data;
                }
                
                const outputEl = resultWindow.document.getElementById('output');
                if (outputEl) {
                  outputEl.textContent = output;
                  resultWindow.scrollTo(0, resultWindow.document.body.scrollHeight);
                }
              }
            }
          }
        }
      }
    } catch (error) {
      alert(`运行所有测试失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 合并测试文件
  const handleMergeTests = async (files: TestFile[]) => {
    if (files.length < 2) {
      alert('至少需要选择 2 个测试文件才能合并');
      return;
    }

    if (!confirm(`确定要合并 ${files.length} 个测试文件吗？`)) {
      return;
    }

    try {
      const response = await fetch('/api/tests/merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePaths: files.map(f => f.path),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || '合并测试失败');
      }

      const result = await response.json();
      alert(`✅ 合并成功！\n\n已创建文件: ${result.outputPath}\n包含 ${result.fileCount} 个测试文件`);
      
      // 重新扫描以更新结果
      handleScan();
    } catch (error) {
      alert(`合并测试失败: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // 导出测试报告
  const handleExportReport = () => {
    if (!analysis) return;
    
    const report = {
      summary: analysis.summary,
      files: analysis.files,
      issues: analysis.issues,
      suggestions: analysis.suggestions,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `test-report-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 过滤测试文件
  const filteredFiles = analysis?.files.filter(file => {
    if (selectedCategory === 'all') return true;
    return file.type === selectedCategory;
  }) || [];

  if (!isOpen) {
    return (
      <button
        className="test-management-manager-toggle"
        onClick={() => setIsOpen(true)}
        title="打开测试管理器"
      >
        🧪
      </button>
    );
  }

  return (
    <div className="test-management-manager-overlay" onClick={() => setIsOpen(false)}>
      <div className="test-management-manager-container" onClick={(e) => e.stopPropagation()}>
        <div className="test-management-manager-header">
          <h2>🧪 测试管理器</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
        </div>

        <div className="test-management-manager-actions">
          <button
            className="btn-primary"
            onClick={handleScan}
            disabled={isLoading}
          >
            {isLoading ? '扫描中...' : '🔄 扫描测试'}
          </button>
          {analysis && (
            <>
              <button
                className="btn-secondary"
                onClick={handleRunAllTests}
              >
                ▶️ 运行所有测试
              </button>
              <button
                className="btn-secondary"
                onClick={() => handleMergeTests(analysis.files)}
              >
                🔀 合并所有测试
              </button>
              <button
                className="btn-secondary"
                onClick={handleExportReport}
              >
                📥 导出报告
              </button>
            </>
          )}
        </div>

        {analysis && (
          <>
            {/* 统计信息 */}
            <div className="test-stats">
              <div className="stat-item">
                <span className="stat-label">总测试数</span>
                <span className="stat-value">{analysis.summary.totalTests}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">测试文件</span>
                <span className="stat-value">{analysis.summary.totalFiles}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">通过</span>
                <span className="stat-value success">{analysis.summary.passed}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">失败</span>
                <span className="stat-value error">{analysis.summary.failed}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">跳过</span>
                <span className="stat-value warning">{analysis.summary.skipped}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">覆盖率</span>
                <span className="stat-value">{analysis.summary.coverage.toFixed(0)}%</span>
              </div>
            </div>

            {/* 建议 */}
            {analysis.suggestions.length > 0 && (
              <div className="test-suggestions">
                <h3>💡 优化建议</h3>
                <ul>
                  {analysis.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 分类标签 */}
            <div className="test-categories">
              <button
                className={`category-btn ${selectedCategory === 'all' ? 'active' : ''}`}
                onClick={() => setSelectedCategory('all')}
              >
                全部 ({analysis.files.length})
              </button>
              {Object.entries(analysis.categories).map(([type, files]) => (
                <button
                  key={type}
                  className={`category-btn ${selectedCategory === type ? 'active' : ''}`}
                  onClick={() => setSelectedCategory(type)}
                >
                  {TEST_TYPE_LABELS[type as keyof typeof TEST_TYPE_LABELS]} ({files.length})
                </button>
              ))}
            </div>

            {/* 问题列表 */}
            {analysis.issues.length > 0 && (
              <div className="test-issues">
                <h3>⚠️ 测试问题</h3>
                {analysis.issues.map((issue) => (
                  <div key={issue.id} className="issue-item">
                    <div className="issue-header">
                      <span className="issue-type">{issue.type}</span>
                      <span className="issue-severity">{issue.severity}</span>
                    </div>
                    <div className="issue-message">{issue.message}</div>
                    {issue.suggestion && (
                      <div className="issue-suggestion">💡 {issue.suggestion}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 测试文件列表 */}
            <div className="test-files-list-wrapper">
              <div className="test-files-list">
                <h3>📁 测试文件</h3>
                {filteredFiles.map((file) => (
                <div
                  key={file.path}
                  className="test-file-item"
                >
                  <div
                    className="test-file-header"
                    onClick={() => setSelectedFile(selectedFile === file.path ? null : file.path)}
                  >
                    <span className="test-file-name">{file.name}</span>
                    <span className="test-file-type">{TEST_TYPE_LABELS[file.type]}</span>
                    <span className="test-file-count">{file.testCount} 个测试</span>
                  </div>
                  {selectedFile === file.path && (
                    <div className="test-file-details">
                      <div className="test-file-stats">
                        <span className="stat-badge success">通过: {file.passed}</span>
                        <span className="stat-badge error">失败: {file.failed}</span>
                        <span className="stat-badge warning">跳过: {file.skipped}</span>
                        {file.coverage !== undefined && (
                          <span className="stat-badge">覆盖率: {file.coverage}%</span>
                        )}
                      </div>
                      <div className="test-file-path">{file.path}</div>
                      <div className="test-file-actions">
                        <button
                          className="btn-run-test"
                          onClick={() => handleRunTest(file)}
                        >
                          ▶️ 运行测试
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              </div>
            </div>
          </>
        )}

        {!analysis && !isLoading && (
          <div className="empty-state">
            <p>点击"扫描测试"开始测试分析</p>
          </div>
        )}
      </div>
    </div>
  );
};

