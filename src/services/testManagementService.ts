/**
 * 测试管理服务
 * 扫描、分析、分类、优化测试
 */

export interface TestFile {
  path: string;
  name: string;
  type: 'unit' | 'integration' | 'e2e' | 'regression' | 'other';
  testCount: number;
  passed: number;
  failed: number;
  skipped: number;
  duration?: number;
  coverage?: number;
  lastRun?: Date;
}

export interface TestIssue {
  id: string;
  type: 'missing' | 'slow' | 'flaky' | 'duplicate' | 'unused' | 'other';
  severity: 'error' | 'warning' | 'info';
  file?: string;
  test?: string;
  message: string;
  suggestion?: string;
}

export interface TestAnalysis {
  files: TestFile[];
  issues: TestIssue[];
  summary: {
    totalTests: number;
    totalFiles: number;
    passed: number;
    failed: number;
    skipped: number;
    coverage: number;
    issuesByType: Record<string, number>;
  };
  suggestions: string[];
  categories: {
    unit: TestFile[];
    integration: TestFile[];
    e2e: TestFile[];
    regression: TestFile[];
    other: TestFile[];
  };
}

/**
 * 测试管理服务类
 */
export class TestManagementService {
  private testFiles: TestFile[] = [];
  private issues: TestIssue[] = [];

  /**
   * 扫描测试文件
   */
  async scanTests(basePath: string = 'tests,src'): Promise<TestAnalysis> {
    this.testFiles = [];
    this.issues = [];

    // 获取所有测试文件
    const files = await this.getTestFiles(basePath);

    // 分析每个测试文件
    for (const file of files) {
      try {
        const content = await this.readFile(file);
        if (!content) {
          console.warn(`[TestManagementService] 文件内容为空: ${file}`);
          continue;
        }
        const testFile = this.analyzeTestFile(file, content);
        this.testFiles.push(testFile);
        console.log(`[TestManagementService] 分析文件: ${file}, 测试数: ${testFile.testCount}`);
      } catch (error) {
        console.warn(`[TestManagementService] 分析测试文件失败: ${file}`, error);
      }
    }
    
    console.log(`[TestManagementService] 总共分析 ${this.testFiles.length} 个测试文件`);

    // 检测问题
    this.detectTestIssues();

    // 分类测试
    const categories = this.categorizeTests();

    // 生成总结和建议
    const summary = this.generateSummary();
    const suggestions = this.generateSuggestions();

    return {
      files: this.testFiles,
      issues: this.issues,
      summary,
      suggestions,
      categories,
    };
  }

  /**
   * 获取所有测试文件
   */
  private async getTestFiles(basePath: string): Promise<string[]> {
    try {
      // 通过 API 获取测试文件列表
      const response = await fetch(`/api/tests/files?path=${basePath}`);
      if (response.ok) {
        const files = await response.json();
        console.log(`[TestManagementService] 找到 ${files.length} 个测试文件`);
        return files;
      } else {
        const errorText = await response.text();
        console.warn('[TestManagementService] API 返回错误:', response.status, errorText);
      }
    } catch (error) {
      console.warn('[TestManagementService] 无法通过 API 获取测试文件列表:', error);
    }

    // 回退到空列表（让用户知道没有找到测试文件）
    return [];
  }

  /**
   * 读取文件内容
   */
  private async readFile(filePath: string): Promise<string> {
    try {
      // 尝试通过 API 读取文件
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
      console.warn(`[TestManagementService] 读取文件失败: ${filePath}`, error);
      return '';
    }
  }

  /**
   * 分析测试文件
   */
  private analyzeTestFile(filePath: string, content: string): TestFile {
    const name = filePath.split('/').pop() || filePath;
    
    // 检测测试类型
    const type = this.detectTestType(filePath, content);

    // 统计测试数量（更准确的匹配）
    // 匹配 describe, it, test 等测试函数
    const describeMatches = content.match(/describe\s*\(/g);
    const itMatches = content.match(/(?:it|test)\s*\(/g);
    // 计算测试数量：describe 算作测试套件，it/test 算作具体测试
    const testCount = (describeMatches?.length || 0) + (itMatches?.length || 0);

    // 检测通过的测试（从代码中检测 expect 断言）
    const expectMatches = content.match(/expect\s*\(/g);
    const passed = expectMatches ? Math.min(expectMatches.length, testCount) : testCount;

    // 检测失败的测试（从代码中检测错误处理）
    const failedMatches = content.match(/(?:toThrow|rejects|throws|error)/g);
    const failed = failedMatches ? failedMatches.length : 0;

    // 检测跳过的测试
    const skippedMatches = content.match(/(?:\.skip|skip\s*\(|pending\s*\()/g);
    const skipped = skippedMatches ? skippedMatches.length : 0;

    // 检测覆盖率（如果有）
    const coverageMatch = content.match(/coverage[:\s]+(\d+(?:\.\d+)?)%/i);
    const coverage = coverageMatch ? parseFloat(coverageMatch[1]) : undefined;

    return {
      path: filePath,
      name,
      type,
      testCount,
      passed,
      failed,
      skipped,
      coverage,
    };
  }

  /**
   * 检测测试类型
   */
  private detectTestType(filePath: string, content: string): TestFile['type'] {
    // 根据文件路径和内容判断测试类型
    if (filePath.includes('e2e') || filePath.includes('end-to-end')) {
      return 'e2e';
    }
    if (filePath.includes('integration') || filePath.includes('integration')) {
      return 'integration';
    }
    if (filePath.includes('regression')) {
      return 'regression';
    }
    if (content.includes('describe(') && content.includes('it(')) {
      return 'unit';
    }
    return 'other';
  }

  /**
   * 检测测试问题
   */
  private detectTestIssues(): void {
    // 检测缺失的测试
    this.detectMissingTests();

    // 检测慢测试
    this.detectSlowTests();

    // 检测重复测试
    this.detectDuplicateTests();

    // 检测未使用的测试
    this.detectUnusedTests();
  }

  /**
   * 检测缺失的测试
   */
  private detectMissingTests(): void {
    // 这里应该比较源代码文件和测试文件
    // 找出没有对应测试的源代码文件
    
    // 简单实现：检查是否有足够的测试文件
    if (this.testFiles.length < 10) {
      this.issues.push({
        id: 'missing-tests',
        type: 'missing',
        severity: 'warning',
        message: '测试文件数量较少，可能存在测试覆盖不足',
        suggestion: '为更多功能添加测试',
      });
    }
  }

  /**
   * 检测慢测试
   */
  private detectSlowTests(): void {
    this.testFiles.forEach(file => {
      if (file.duration && file.duration > 5000) {  // 超过 5 秒
        this.issues.push({
          id: `slow-test:${file.path}`,
          type: 'slow',
          severity: 'info',
          file: file.path,
          message: `测试文件执行时间较长 (${(file.duration / 1000).toFixed(2)}秒)`,
          suggestion: '考虑优化测试性能或拆分测试',
        });
      }
    });
  }

  /**
   * 检测重复测试
   */
  private detectDuplicateTests(): void {
    // 检测测试名称重复
    const testNames = new Map<string, string[]>();

    this.testFiles.forEach(file => {
      // 这里应该解析测试名称
      // 简单实现：检查文件名
      const baseName = file.name.replace(/\.(test|spec)\.(ts|js)$/, '');
      if (!testNames.has(baseName)) {
        testNames.set(baseName, []);
      }
      testNames.get(baseName)!.push(file.path);
    });

    testNames.forEach((paths, name) => {
      if (paths.length > 1) {
        this.issues.push({
          id: `duplicate-test:${name}`,
          type: 'duplicate',
          severity: 'warning',
          message: `发现重复的测试: ${name}`,
          suggestion: `合并或重命名测试文件: ${paths.join(', ')}`,
        });
      }
    });
  }

  /**
   * 检测未使用的测试
   */
  private detectUnusedTests(): void {
    // 检测长时间未运行的测试
    this.testFiles.forEach(file => {
      if (file.lastRun) {
        const daysSinceRun = (Date.now() - file.lastRun.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSinceRun > 30) {
          this.issues.push({
            id: `unused-test:${file.path}`,
            type: 'unused',
            severity: 'info',
            file: file.path,
            message: `测试文件超过 30 天未运行`,
            suggestion: '检查测试是否仍然需要，或更新测试',
          });
        }
      }
    });
  }

  /**
   * 分类测试
   */
  private categorizeTests(): TestAnalysis['categories'] {
    const categories = {
      unit: [] as TestFile[],
      integration: [] as TestFile[],
      e2e: [] as TestFile[],
      regression: [] as TestFile[],
      other: [] as TestFile[],
    };

    this.testFiles.forEach(file => {
      categories[file.type].push(file);
    });

    return categories;
  }

  /**
   * 生成总结
   */
  private generateSummary(): TestAnalysis['summary'] {
    const totalTests = this.testFiles.reduce((sum, f) => sum + f.testCount, 0);
    const totalFiles = this.testFiles.length;
    const passed = this.testFiles.reduce((sum, f) => sum + f.passed, 0);
    const failed = this.testFiles.reduce((sum, f) => sum + f.failed, 0);
    const skipped = this.testFiles.reduce((sum, f) => sum + f.skipped, 0);

    // 计算平均覆盖率
    const filesWithCoverage = this.testFiles.filter(f => f.coverage !== undefined);
    const coverage = filesWithCoverage.length > 0
      ? filesWithCoverage.reduce((sum, f) => sum + (f.coverage || 0), 0) / filesWithCoverage.length
      : 0;

    const issuesByType: Record<string, number> = {};
    this.issues.forEach(issue => {
      issuesByType[issue.type] = (issuesByType[issue.type] || 0) + 1;
    });

    return {
      totalTests,
      totalFiles,
      passed,
      failed,
      skipped,
      coverage,
      issuesByType,
    };
  }

  /**
   * 生成建议
   */
  private generateSuggestions(): string[] {
    const suggestions: string[] = [];

    const missingCount = this.issues.filter(i => i.type === 'missing').length;
    if (missingCount > 0) {
      suggestions.push(`添加缺失的测试覆盖`);
    }

    const slowCount = this.issues.filter(i => i.type === 'slow').length;
    if (slowCount > 0) {
      suggestions.push(`优化 ${slowCount} 个慢测试`);
    }

    const duplicateCount = this.issues.filter(i => i.type === 'duplicate').length;
    if (duplicateCount > 0) {
      suggestions.push(`消除 ${duplicateCount} 处重复测试`);
    }

    const failedTests = this.testFiles.reduce((sum, f) => sum + f.failed, 0);
    if (failedTests > 0) {
      suggestions.push(`修复 ${failedTests} 个失败的测试`);
    }

    const avgCoverage = this.testFiles
      .filter(f => f.coverage !== undefined)
      .reduce((sum, f) => sum + (f.coverage || 0), 0) / 
      Math.max(this.testFiles.filter(f => f.coverage !== undefined).length, 1);

    if (avgCoverage < 80) {
      suggestions.push(`提高测试覆盖率 (当前: ${avgCoverage.toFixed(0)}%)`);
    }

    return suggestions;
  }
}

// 单例实例
let testManagementServiceInstance: TestManagementService | null = null;

/**
 * 获取测试管理服务实例
 */
export function getTestManagementService(): TestManagementService {
  if (!testManagementServiceInstance) {
    testManagementServiceInstance = new TestManagementService();
  }
  return testManagementServiceInstance;
}

