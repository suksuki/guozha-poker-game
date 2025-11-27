/**
 * 代码审查管理器
 * 可视化展示代码质量分析结果
 */

import React, { useState, useEffect } from 'react';
import { getCodeReviewService, CodeReviewResult, CodeIssue } from '../services/codeReviewService';
import './CodeReviewManager.css';

const ISSUE_TYPE_LABELS = {
  duplicate: '重复代码',
  unused: '未使用',
  dead: '死代码',
  complex: '高复杂度',
  long: '过长',
  import: '导入问题',
  naming: '命名问题',
  other: '其他',
};

const SEVERITY_COLORS = {
  error: '#dc3545',
  warning: '#ffc107',
  info: '#17a2b8',
};

export const CodeReviewManager: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [result, setResult] = useState<CodeReviewResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const service = getCodeReviewService();

  // 加载代码审查结果
  const handleScan = async () => {
    setIsLoading(true);
    try {
      const reviewResult = await service.scanCodebase('src');
      setResult(reviewResult);
    } catch (error) {
      console.error('[CodeReviewManager] 扫描失败:', error);
      alert('代码扫描失败，请检查控制台');
    } finally {
      setIsLoading(false);
    }
  };

  // 应用修复（删除未使用的导入）
  const handleApplyFix = async (issue: CodeIssue) => {
    if (issue.type === 'import' && issue.suggestion) {
      if (!confirm(`确定要自动修复 "${issue.file}" 中的未使用导入吗？\n\n系统会自动备份原文件。`)) {
        return;
      }

      try {
        // 读取文件
        const readResponse = await fetch('/api/code/read', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ filePath: issue.file }),
        });

        if (!readResponse.ok) {
          throw new Error('无法读取文件');
        }

        const { content } = await readResponse.json();
        const lines = content.split('\n');
        
        // 删除未使用的导入行
        if (issue.line > 0 && issue.line <= lines.length) {
          lines.splice(issue.line - 1, 1);
          const newContent = lines.join('\n');
          
          // 自动写入文件
          const writeResponse = await fetch('/api/code/write', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              filePath: issue.file,
              content: newContent,
            }),
          });

          if (writeResponse.ok) {
            alert(`✅ 修复成功！已自动删除未使用的导入。\n\n原文件已备份为 ${issue.file}.backup.*`);
            // 重新扫描以更新结果
            handleScan();
          } else {
            const error = await writeResponse.json();
            throw new Error(error.error || '写入文件失败');
          }
        }
      } catch (error) {
        console.error('[CodeReviewManager] 应用修复失败:', error);
        alert(`❌ 应用修复失败: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      alert('此问题类型暂不支持自动修复');
    }
  };

  // 导出报告
  const handleExportReport = () => {
    if (!result) return;
    
    const report = {
      summary: result.summary,
      issues: result.issues,
      suggestions: result.suggestions,
      timestamp: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `code-review-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // 生成 Cursor 提示词
  const generateCursorPrompt = (issue?: CodeIssue): string => {
    if (!result) return '';

    if (issue) {
      // 为单个问题生成提示词
      return `请修复以下代码问题：

文件：${issue.file}
行号：${issue.line}
问题类型：${ISSUE_TYPE_LABELS[issue.type]}
严重程度：${issue.severity === 'error' ? '错误' : issue.severity === 'warning' ? '警告' : '信息'}
问题描述：${issue.message}
${issue.suggestion ? `修复建议：${issue.suggestion}` : ''}
${issue.code ? `相关代码：\n\`\`\`\n${issue.code}\n\`\`\`` : ''}

请直接修复这个问题，不要询问。`;
    } else {
      // 为整个审查结果生成提示词
      const highPriorityIssues = result.issues.filter(i => i.severity === 'error' || i.severity === 'warning');
      const issuesByFile = highPriorityIssues.reduce((acc, issue) => {
        if (!acc[issue.file]) {
          acc[issue.file] = [];
        }
        acc[issue.file].push(issue);
        return acc;
      }, {} as Record<string, CodeIssue[]>);

      let prompt = `# 代码审查和重构请求

## 审查摘要
- 总文件数：${result.summary.totalFiles}
- 总代码行数：${result.summary.totalLines.toLocaleString()}
- 发现问题：${result.summary.totalIssues} 个
  - 错误：${result.summary.issuesBySeverity.error || 0} 个
  - 警告：${result.summary.issuesBySeverity.warning || 0} 个
  - 信息：${result.summary.issuesBySeverity.info || 0} 个

## 主要问题类型
${Object.entries(result.summary.issuesByType).map(([type, count]) => `- ${ISSUE_TYPE_LABELS[type as keyof typeof ISSUE_TYPE_LABELS]}：${count} 个`).join('\n')}

## 重构建议
${result.suggestions.map(s => `- ${s}`).join('\n')}

## 需要修复的问题（按文件分组）

`;

      // 按文件分组列出问题
      Object.entries(issuesByFile).forEach(([file, issues]) => {
        prompt += `### ${file}\n\n`;
        issues.forEach((issue, index) => {
          prompt += `${index + 1}. **${ISSUE_TYPE_LABELS[issue.type]}** (${issue.severity === 'error' ? '错误' : '警告'}) - 行 ${issue.line}\n`;
          prompt += `   - ${issue.message}\n`;
          if (issue.suggestion) {
            prompt += `   - 建议：${issue.suggestion}\n`;
          }
          if (issue.code) {
            prompt += `   - 代码：\`${issue.code.trim().substring(0, 100)}${issue.code.length > 100 ? '...' : ''}\`\n`;
          }
          prompt += '\n';
        });
      });

      prompt += `\n## 任务要求

请按以下优先级修复这些问题：
1. 首先修复所有错误级别的问题
2. 然后修复警告级别的问题
3. 对于重复代码，考虑提取公共模块
4. 对于未使用的导入，直接删除
5. 对于过长的文件/函数，进行拆分重构

请直接开始修复，不需要询问。每个文件修复后，请简要说明修改内容。`;

      return prompt;
    }
  };

  // 复制到剪贴板
  const handleCopyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('✅ 已复制到剪贴板！现在可以在 Cursor 中粘贴使用了。');
    } catch (error) {
      // 降级方案
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        alert('✅ 已复制到剪贴板！现在可以在 Cursor 中粘贴使用了。');
      } catch (err) {
        alert('❌ 复制失败，请手动复制');
      }
      document.body.removeChild(textarea);
    }
  };

  // 复制单个问题的提示词
  const handleCopyIssuePrompt = (issue: CodeIssue) => {
    const prompt = generateCursorPrompt(issue);
    handleCopyToClipboard(prompt);
  };

  // 复制完整审查的提示词
  const handleCopyFullPrompt = () => {
    const prompt = generateCursorPrompt();
    handleCopyToClipboard(prompt);
  };

  // 过滤问题
  const filteredIssues = result?.issues.filter(issue => {
    if (selectedFilter === 'all') return true;
    if (selectedFilter === 'severity') {
      return issue.severity === 'error' || issue.severity === 'warning';
    }
    return issue.type === selectedFilter;
  }) || [];

  // 按文件分组的问题
  const issuesByFile = filteredIssues.reduce((acc, issue) => {
    if (!acc[issue.file]) {
      acc[issue.file] = [];
    }
    acc[issue.file].push(issue);
    return acc;
  }, {} as Record<string, CodeIssue[]>);

  if (!isOpen) {
    return (
      <button
        className="code-review-manager-toggle"
        onClick={() => setIsOpen(true)}
        title="打开代码审查管理器"
      >
        🔍
      </button>
    );
  }

  return (
    <div className="code-review-manager-overlay" onClick={() => setIsOpen(false)}>
      <div className="code-review-manager-container" onClick={(e) => e.stopPropagation()}>
        <div className="code-review-manager-header">
          <h2>🔍 代码审查管理器</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>×</button>
        </div>

        <div className="code-review-manager-actions">
          <button
            className="btn-primary"
            onClick={handleScan}
            disabled={isLoading}
          >
            {isLoading ? '扫描中...' : '🔄 扫描代码'}
          </button>
          {result && (
            <>
              <button
                className="btn-cursor"
                onClick={handleCopyFullPrompt}
                title="生成并复制 Cursor 提示词"
              >
                📋 复制 Cursor 提示词
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

        {result && (
          <>
            {/* 统计信息 */}
            <div className="code-review-stats">
              <div className="stat-item">
                <span className="stat-label">总文件数</span>
                <span className="stat-value">{result.summary.totalFiles}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">总代码行数</span>
                <span className="stat-value">{result.summary.totalLines.toLocaleString()}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">问题总数</span>
                <span className="stat-value">{result.summary.totalIssues}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">错误</span>
                <span className="stat-value error">{result.summary.issuesBySeverity.error || 0}</span>
              </div>
              <div className="stat-item">
                <span className="stat-label">警告</span>
                <span className="stat-value warning">{result.summary.issuesBySeverity.warning || 0}</span>
              </div>
            </div>

            {/* 建议 */}
            {result.suggestions.length > 0 && (
              <div className="code-review-suggestions">
                <h3>💡 重构建议</h3>
                <ul>
                  {result.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 过滤器 */}
            <div className="code-review-filters">
              <select
                className="filter-select"
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
              >
                <option value="all">所有问题</option>
                <option value="severity">错误和警告</option>
                {Object.entries(ISSUE_TYPE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>

            {/* 问题列表 */}
            <div className="code-review-content-wrapper">
              <div className="code-review-content">
                {filteredIssues.length === 0 ? (
                <div className="empty-state">
                  <p>✅ 没有发现问题</p>
                </div>
              ) : (
                <div className="issues-list">
                  {Object.entries(issuesByFile).map(([file, issues]) => (
                    <div key={file} className="file-issues">
                      <div
                        className="file-header"
                        onClick={() => setSelectedFile(selectedFile === file ? null : file)}
                      >
                        <span className="file-name">{file}</span>
                        <span className="issue-count">{issues.length} 个问题</span>
                      </div>
                      {selectedFile === file && (
                        <div className="file-issues-list">
                          {issues.map((issue) => (
                            <div key={issue.id} className="issue-item">
                              <div className="issue-header">
                                <span
                                  className="issue-severity"
                                  style={{ color: SEVERITY_COLORS[issue.severity] }}
                                >
                                  {issue.severity === 'error' ? '❌' : issue.severity === 'warning' ? '⚠️' : 'ℹ️'}
                                </span>
                                <span className="issue-type">{ISSUE_TYPE_LABELS[issue.type]}</span>
                                <span className="issue-line">行 {issue.line}</span>
                              </div>
                              <div className="issue-message">{issue.message}</div>
                              {issue.suggestion && (
                                <div className="issue-suggestion">
                                  💡 建议: {issue.suggestion}
                                </div>
                              )}
                              {issue.code && (
                                <div className="issue-code">
                                  <pre>{issue.code}</pre>
                                </div>
                              )}
                              <div className="issue-actions">
                                {issue.type === 'import' && (
                                  <button
                                    className="btn-fix"
                                    onClick={() => handleApplyFix(issue)}
                                    title="应用修复（删除未使用的导入）"
                                  >
                                    🔧 应用修复
                                  </button>
                                )}
                                <button
                                  className="btn-copy-prompt"
                                  onClick={() => handleCopyIssuePrompt(issue)}
                                  title="生成并复制 Cursor 提示词"
                                >
                                  📋 复制 Cursor 提示词
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </>
        )}

        {!result && !isLoading && (
          <div className="empty-state">
            <p>点击"扫描代码"开始代码审查</p>
          </div>
        )}
      </div>
    </div>
  );
};

