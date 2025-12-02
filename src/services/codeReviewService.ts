/**
 * 代码审查服务
 * 扫描、分析代码质量，提供重构建议
 */

export interface CodeIssue {
  id: string;
  type: 'duplicate' | 'unused' | 'dead' | 'complex' | 'long' | 'import' | 'naming' | 'other';
  severity: 'error' | 'warning' | 'info';
  file: string;
  line: number;
  column?: number;
  message: string;
  suggestion?: string;
  code?: string;  // 相关代码片段
}

export interface CodeMetrics {
  file: string;
  lines: number;
  complexity: number;
  functions: number;
  classes: number;
  imports: number;
  exports: number;
  unusedImports: string[];
  duplicateCode: number;
  deadCode: number;
}

export interface CodeReviewResult {
  files: CodeMetrics[];
  issues: CodeIssue[];
  summary: {
    totalFiles: number;
    totalLines: number;
    totalIssues: number;
    issuesByType: Record<string, number>;
    issuesBySeverity: Record<string, number>;
  };
  suggestions: string[];
}

/**
 * 代码审查服务类
 */
export class CodeReviewService {
  private issues: CodeIssue[] = [];
  private metrics: CodeMetrics[] = [];

  /**
   * 扫描代码目录
   */
  async scanCodebase(basePath: string = 'src'): Promise<CodeReviewResult> {
    this.issues = [];
    this.metrics = [];

    // 获取所有 TypeScript/JavaScript 文件
    const files = await this.getCodeFiles(basePath);

    // 分析每个文件
    for (const file of files) {
      try {
        const content = await this.readFile(file);
        const metrics = this.analyzeFile(file, content);
        this.metrics.push(metrics);
        
        // 检测问题
        const fileIssues = this.detectIssues(file, content, metrics);
        this.issues.push(...fileIssues);
      } catch (error) {
      }
    }

    // 检测跨文件的重复代码
    const duplicateIssues = this.detectDuplicateCode(this.metrics);
    this.issues.push(...duplicateIssues);

    // 生成总结和建议
    const summary = this.generateSummary();
    const suggestions = this.generateSuggestions();

    return {
      files: this.metrics,
      issues: this.issues,
      summary,
      suggestions,
    };
  }

  /**
   * 获取所有代码文件
   */
  private async getCodeFiles(basePath: string): Promise<string[]> {
    try {
      // 通过 API 获取文件列表
      const response = await fetch(`/api/code/files?path=${basePath}`);
      if (response.ok) {
        const files = await response.json();
        return files;
      }
    } catch (error) {
    }

    // 回退到默认文件列表
    return [
      'src/App.tsx',
      'src/components/MultiPlayerGameBoard.tsx',
      'src/hooks/useGameAudio.ts',
      'src/audio/AudioMixer.ts',
      'src/audio/DialogueScheduler.ts',
      'src/tts/ttsClient.ts',
    ];
  }

  /**
   * 读取文件内容
   */
  private async readFile(filePath: string): Promise<string> {
    try {
      // 优先使用 API 读取文件
      const response = await fetch('/api/code/read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ filePath }),
      });

      if (response.ok) {
        const { content } = await response.json();
        return content;
      }

      // 回退到直接读取
      const directResponse = await fetch(`/${filePath}`);
      if (directResponse.ok) {
        return await directResponse.text();
      }

      throw new Error(`无法读取文件: ${filePath}`);
    } catch (error) {
      return '';
    }
  }

  /**
   * 分析单个文件
   */
  private analyzeFile(filePath: string, content: string): CodeMetrics {
    const lines = content.split('\n');
    const lineCount = lines.length;

    // 统计函数
    const functionMatches = content.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s+)?\(|=>\s*{)/g);
    const functions = functionMatches ? functionMatches.length : 0;

    // 统计类
    const classMatches = content.match(/class\s+\w+/g);
    const classes = classMatches ? classMatches.length : 0;

    // 统计导入
    const importMatches = content.match(/^import\s+.*from\s+['"]/gm);
    const imports = importMatches ? importMatches.length : 0;

    // 统计导出
    const exportMatches = content.match(/^export\s+/gm);
    const exports = exportMatches ? exportMatches.length : 0;

    // 计算复杂度（简单的圈复杂度估算）
    const complexity = this.calculateComplexity(content);

    // 检测未使用的导入（简单检测）
    const unusedImports = this.detectUnusedImports(content, lines);

    return {
      file: filePath,
      lines: lineCount,
      complexity,
      functions,
      classes,
      imports,
      exports,
      unusedImports,
      duplicateCode: 0,  // 将在跨文件检测中计算
      deadCode: 0,  // 将在问题检测中计算
    };
  }

  /**
   * 计算代码复杂度
   */
  private calculateComplexity(content: string): number {
    let complexity = 1;  // 基础复杂度

    // 检测控制流语句
    const controlFlowPatterns = [
      /if\s*\(/g,
      /else\s+if\s*\(/g,
      /for\s*\(/g,
      /while\s*\(/g,
      /switch\s*\(/g,
      /catch\s*\(/g,
      /\?\s*.*\s*:/g,  // 三元运算符
    ];

    controlFlowPatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        complexity += matches.length;
      }
    });

    return complexity;
  }

  /**
   * 检测未使用的导入
   */
  private detectUnusedImports(content: string, lines: string[]): string[] {
    const unused: string[] = [];
    const importLines = lines.filter(line => line.trim().startsWith('import'));

    for (const importLine of importLines) {
      // 提取导入的名称
      const importMatch = importLine.match(/import\s+(?:\{([^}]+)\}|(\w+)|(\*)\s+as\s+(\w+))/);
      if (!importMatch) continue;

      const importedNames = importMatch[1]?.split(',').map(s => s.trim()) || 
                           (importMatch[2] ? [importMatch[2]] : []) ||
                           (importMatch[4] ? [importMatch[4]] : []);

      // 检查是否在代码中使用
      for (const name of importedNames) {
        const cleanName = name.split(' as ')[0].trim();
        // 简单检测：检查是否在代码中出现（排除导入行）
        const usagePattern = new RegExp(`\\b${cleanName}\\b`);
        const used = lines.some((line, index) => {
          const importIndex = lines.indexOf(importLine);
          return index !== importIndex && usagePattern.test(line);
        });

        if (!used) {
          unused.push(cleanName);
        }
      }
    }

    return unused;
  }

  /**
   * 检测代码问题
   */
  private detectIssues(filePath: string, content: string, metrics: CodeMetrics): CodeIssue[] {
    const issues: CodeIssue[] = [];
    const lines = content.split('\n');

    // 检测未使用的导入
    metrics.unusedImports.forEach(importName => {
      const lineIndex = lines.findIndex(line => line.includes(`import`) && line.includes(importName));
      if (lineIndex >= 0) {
        issues.push({
          id: `${filePath}:${lineIndex + 1}:unused-import`,
          type: 'import',
          severity: 'warning',
          file: filePath,
          line: lineIndex + 1,
          message: `未使用的导入: ${importName}`,
          suggestion: `删除未使用的导入 "${importName}"`,
          code: lines[lineIndex],
        });
      }
    });

    // 检测过长的文件
    if (metrics.lines > 500) {
      issues.push({
        id: `${filePath}:long-file`,
        type: 'long',
        severity: 'warning',
        file: filePath,
        line: 1,
        message: `文件过长 (${metrics.lines} 行)`,
        suggestion: '考虑将文件拆分为多个模块',
      });
    }

    // 检测高复杂度
    if (metrics.complexity > 20) {
      issues.push({
        id: `${filePath}:high-complexity`,
        type: 'complex',
        severity: 'warning',
        file: filePath,
        line: 1,
        message: `代码复杂度较高 (${metrics.complexity})`,
        suggestion: '考虑重构，减少嵌套和控制流',
      });
    }

    // 检测过长的函数（简单检测：超过 50 行的函数）
    lines.forEach((line, index) => {
      if (line.match(/^(?:function|const\s+\w+\s*=\s*(?:async\s+)?\(|=>\s*{)/)) {
        // 找到函数开始，计算函数长度
        let functionLength = 0;
        let braceCount = 0;
        let foundStart = false;

        for (let i = index; i < lines.length; i++) {
          const currentLine = lines[i];
          if (!foundStart && currentLine.includes('{')) {
            foundStart = true;
            braceCount = 1;
          } else if (foundStart) {
            functionLength++;
            braceCount += (currentLine.match(/{/g) || []).length;
            braceCount -= (currentLine.match(/}/g) || []).length;
            
            if (braceCount === 0) {
              break;
            }
          }
        }

        if (functionLength > 50) {
          issues.push({
            id: `${filePath}:${index + 1}:long-function`,
            type: 'long',
            severity: 'info',
            file: filePath,
            line: index + 1,
            message: `函数过长 (${functionLength} 行)`,
            suggestion: '考虑将函数拆分为多个小函数',
            code: lines[index],
          });
        }
      }
    });

    return issues;
  }

  /**
   * 检测跨文件的重复代码
   */
  private detectDuplicateCode(metrics: CodeMetrics[]): CodeIssue[] {
    const issues: CodeIssue[] = [];
    
    // 简单的重复代码检测：比较文件之间的相似度
    // 实际实现中应该使用更复杂的算法（如基于 AST 的比较）
    
    for (let i = 0; i < metrics.length; i++) {
      for (let j = i + 1; j < metrics.length; j++) {
        const file1 = metrics[i];
        const file2 = metrics[j];

        // 如果两个文件的结构相似（函数数量、类数量等），可能是重复代码
        const similarity = this.calculateSimilarity(file1, file2);
        if (similarity > 0.7) {
          issues.push({
            id: `duplicate:${file1.file}:${file2.file}`,
            type: 'duplicate',
            severity: 'info',
            file: file1.file,
            line: 1,
            message: `与 ${file2.file} 可能存在重复代码 (相似度: ${(similarity * 100).toFixed(0)}%)`,
            suggestion: `检查 ${file1.file} 和 ${file2.file} 是否可以合并或提取公共代码`,
          });
        }
      }
    }

    return issues;
  }

  /**
   * 计算两个文件的相似度
   */
  private calculateSimilarity(metrics1: CodeMetrics, metrics2: CodeMetrics): number {
    // 简单的相似度计算
    const factors = [
      Math.abs(metrics1.functions - metrics2.functions) / Math.max(metrics1.functions, metrics2.functions, 1),
      Math.abs(metrics1.classes - metrics2.classes) / Math.max(metrics1.classes, metrics2.classes, 1),
      Math.abs(metrics1.complexity - metrics2.complexity) / Math.max(metrics1.complexity, metrics2.complexity, 1),
    ];

    const avgDiff = factors.reduce((a, b) => a + b, 0) / factors.length;
    return 1 - avgDiff;  // 相似度 = 1 - 平均差异
  }

  /**
   * 生成总结
   */
  private generateSummary(): CodeReviewResult['summary'] {
    const totalFiles = this.metrics.length;
    const totalLines = this.metrics.reduce((sum, m) => sum + m.lines, 0);
    const totalIssues = this.issues.length;

    const issuesByType: Record<string, number> = {};
    const issuesBySeverity: Record<string, number> = {};

    this.issues.forEach(issue => {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
      issuesBySeverity[issue.severity] = (issuesBySeverity[issue.severity] || 0) + 1;
    });

    return {
      totalFiles,
      totalLines,
      totalIssues,
      issuesByType,
      issuesBySeverity,
    };
  }

  /**
   * 生成建议
   */
  private generateSuggestions(): string[] {
    const suggestions: string[] = [];

    const unusedImportCount = this.issues.filter(i => i.type === 'import').length;
    if (unusedImportCount > 0) {
      suggestions.push(`清理 ${unusedImportCount} 个未使用的导入`);
    }

    const longFileCount = this.issues.filter(i => i.type === 'long').length;
    if (longFileCount > 0) {
      suggestions.push(`重构 ${longFileCount} 个过长的文件`);
    }

    const complexCount = this.issues.filter(i => i.type === 'complex').length;
    if (complexCount > 0) {
      suggestions.push(`降低 ${complexCount} 个高复杂度文件的复杂度`);
    }

    const duplicateCount = this.issues.filter(i => i.type === 'duplicate').length;
    if (duplicateCount > 0) {
      suggestions.push(`消除 ${duplicateCount} 处重复代码`);
    }

    return suggestions;
  }

  /**
   * 获取文件列表（从服务器 API）
   */
  async getFileList(basePath: string = 'src'): Promise<string[]> {
    // 实际实现中，应该调用后端 API 获取文件列表
    // 这里提供一个占位实现
    try {
      const response = await fetch(`/api/code/files?path=${basePath}`);
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
    }

    // 返回默认文件列表
    return [];
  }
}

// 单例实例
let codeReviewServiceInstance: CodeReviewService | null = null;

/**
 * 获取代码审查服务实例
 */
export function getCodeReviewService(): CodeReviewService {
  if (!codeReviewServiceInstance) {
    codeReviewServiceInstance = new CodeReviewService();
  }
  return codeReviewServiceInstance;
}

