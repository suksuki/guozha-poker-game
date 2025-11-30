/**
 * 验证工具
 * 检查翻译完整性、一致性和使用情况
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supportedLanguages, SupportedLanguage } from '../../src/i18n/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 验证问题类型
 */
export type ValidationIssueType = 
  | 'missing'      // 缺失翻译
  | 'unused'       // 未使用的键
  | 'inconsistent' // 不一致的键
  | 'hardcoded';   // 硬编码文本

/**
 * 问题严重程度
 */
export type ValidationSeverity = 'error' | 'warning' | 'info';

/**
 * 验证问题
 */
export interface ValidationIssue {
  type: ValidationIssueType;
  severity: ValidationSeverity;
  namespace: string;
  key?: string;
  languages?: SupportedLanguage[];
  message: string;
  filePath?: string;
  line?: number;
}

/**
 * 验证报告
 */
export interface ValidationReport {
  summary: {
    totalKeys: number;
    totalComponents: number;
    missingTranslations: number;
    unusedKeys: number;
    inconsistentKeys: number;
    hardcodedTexts: number;
  };
  issues: ValidationIssue[];
  recommendations: string[];
}

/**
 * 读取翻译文件
 */
function readTranslationFile(filePath: string): Record<string, any> | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null;
    }
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return null;
  }
}

/**
 * 获取所有翻译键（递归）
 */
function getAllKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];
  
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getAllKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  
  return keys;
}

/**
 * 验证组件翻译
 */
function validateComponent(
  componentName: string,
  componentPath: string
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  
  // 读取所有语言的翻译文件
  const translations: Record<SupportedLanguage, Record<string, any> | null> = {} as any;
  const allKeys = new Set<string>();
  
  for (const lang of supportedLanguages) {
    const filePath = path.join(componentPath, `${lang.code}.json`);
    translations[lang.code] = readTranslationFile(filePath);
    
    if (translations[lang.code]) {
      const keys = getAllKeys(translations[lang.code]);
      keys.forEach(key => allKeys.add(key));
    }
  }
  
  // 检查缺失的翻译
  for (const key of allKeys) {
    const missingLanguages: SupportedLanguage[] = [];
    
    for (const lang of supportedLanguages) {
      if (!translations[lang.code]) {
        missingLanguages.push(lang.code);
      } else {
        // 检查键是否存在
        const keys = key.split('.');
        let value = translations[lang.code];
        let exists = true;
        
        for (const k of keys) {
          if (value && typeof value === 'object' && k in value) {
            value = value[k];
          } else {
            exists = false;
            break;
          }
        }
        
        if (!exists) {
          missingLanguages.push(lang.code);
        }
      }
    }
    
    if (missingLanguages.length > 0) {
      issues.push({
        type: 'missing',
        severity: 'error',
        namespace: `component:${componentName}`,
        key,
        languages: missingLanguages,
        message: `Missing translation for key "${key}" in languages: ${missingLanguages.join(', ')}`,
        filePath: path.join(componentPath, `${missingLanguages[0]}.json`),
      });
    }
  }
  
  // 检查不一致的键（某些语言有，某些没有）
  const keyCounts: Record<string, number> = {};
  for (const lang of supportedLanguages) {
    if (translations[lang.code]) {
      const keys = getAllKeys(translations[lang.code]);
      keys.forEach(key => {
        keyCounts[key] = (keyCounts[key] || 0) + 1;
      });
    }
  }
  
  for (const [key, count] of Object.entries(keyCounts)) {
    if (count < supportedLanguages.length && count > 0) {
      issues.push({
        type: 'inconsistent',
        severity: 'warning',
        namespace: `component:${componentName}`,
        key,
        message: `Key "${key}" exists in ${count} out of ${supportedLanguages.length} languages`,
      });
    }
  }
  
  return issues;
}

/**
 * 验证所有翻译
 */
export async function validateAllTranslations(): Promise<ValidationReport> {
  const issues: ValidationIssue[] = [];
  const resourcePath = 'i18n-resources';
  
  // 验证组件翻译
  const componentsPath = path.join(resourcePath, 'components');
  if (fs.existsSync(componentsPath)) {
    const componentDirs = fs.readdirSync(componentsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const componentName of componentDirs) {
      const componentPath = path.join(componentsPath, componentName);
      const componentIssues = validateComponent(componentName, componentPath);
      issues.push(...componentIssues);
    }
  }
  
  // 统计
  const summary = {
    totalKeys: 0, // TODO: 计算总键数
    totalComponents: fs.existsSync(componentsPath)
      ? fs.readdirSync(componentsPath, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory()).length
      : 0,
    missingTranslations: issues.filter(i => i.type === 'missing').length,
    unusedKeys: issues.filter(i => i.type === 'unused').length,
    inconsistentKeys: issues.filter(i => i.type === 'inconsistent').length,
    hardcodedTexts: issues.filter(i => i.type === 'hardcoded').length,
  };
  
  // 生成建议
  const recommendations: string[] = [];
  
  if (summary.missingTranslations > 0) {
    recommendations.push(`Run 'npm run i18n:generate' to generate missing translations`);
  }
  
  if (summary.inconsistentKeys > 0) {
    recommendations.push(`Review inconsistent keys and ensure all languages have the same structure`);
  }
  
  return {
    summary,
    issues,
    recommendations,
  };
}

/**
 * 输出验证报告
 */
export function printValidationReport(report: ValidationReport): void {
  console.log('\n📊 Validation Report\n');
  console.log('Summary:');
  console.log(`  Total Components: ${report.summary.totalComponents}`);
  console.log(`  Missing Translations: ${report.summary.missingTranslations}`);
  console.log(`  Unused Keys: ${report.summary.unusedKeys}`);
  console.log(`  Inconsistent Keys: ${report.summary.inconsistentKeys}`);
  console.log(`  Hardcoded Texts: ${report.summary.hardcodedTexts}`);
  
  if (report.issues.length > 0) {
    console.log('\nIssues:');
    report.issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. [${issue.severity.toUpperCase()}] ${issue.type}`);
      console.log(`   ${issue.message}`);
      if (issue.namespace) {
        console.log(`   Namespace: ${issue.namespace}`);
      }
      if (issue.key) {
        console.log(`   Key: ${issue.key}`);
      }
      if (issue.languages && issue.languages.length > 0) {
        console.log(`   Languages: ${issue.languages.join(', ')}`);
      }
    });
  }
  
  if (report.recommendations.length > 0) {
    console.log('\nRecommendations:');
    report.recommendations.forEach((rec, index) => {
      console.log(`  ${index + 1}. ${rec}`);
    });
  }
  
  // 返回码
  const hasErrors = report.issues.some(i => i.severity === 'error');
  if (hasErrors) {
    console.log('\n❌ Validation failed with errors');
    process.exit(1);
  } else {
    console.log('\n✅ Validation passed');
  }
}

/**
 * CLI 入口
 */
async function main() {
  const args = process.argv.slice(2);
  const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  
  try {
    const report = await validateAllTranslations();
    
    if (output) {
      fs.writeFileSync(output, JSON.stringify(report, null, 2));
      console.log(`✅ Validation report saved to ${output}`);
    }
    
    printValidationReport(report);
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

