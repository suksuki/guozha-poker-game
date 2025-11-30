/**
 * 扫描工具
 * 扫描组件文件，提取需要翻译的文本
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 提取的文本信息
 */
export interface ExtractedText {
  text: string;
  line: number;
  column: number;
  context: string;
  suggestedKey: string;
  componentName: string;
  filePath: string;
}

/**
 * 扫描结果
 */
export interface ScanResult {
  componentName: string;
  filePath: string;
  extractedTexts: ExtractedText[];
  suggestedKeys: string[];
}

/**
 * 扫描选项
 */
export interface ScanOptions {
  component?: string;
  directory?: string;
  output?: string;
}

/**
 * 从组件名生成翻译键
 */
function generateKey(text: string, componentName: string): string {
  // 移除特殊字符，转换为驼峰命名
  const cleanText = text
    .replace(/[^\w\s\u4e00-\u9fa5]/g, '') // 移除特殊字符
    .trim();
  
  // 如果是中文，使用拼音或直接使用（简化版）
  // 实际应该使用拼音库，这里先用简化版本
  if (/[\u4e00-\u9fa5]/.test(cleanText)) {
    // 中文键名：使用组件名 + 序号
    return `${componentName}Text${Math.random().toString(36).substr(2, 4)}`;
  }
  
  // 英文：转换为驼峰
  const words = cleanText.split(/\s+/);
  const camelCase = words
    .map((word, index) => {
      if (index === 0) {
        return word.toLowerCase();
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join('');
  
  return camelCase || 'text';
}

/**
 * 提取 JSX 中的文本
 */
function extractJSXText(content: string, filePath: string, componentName: string): ExtractedText[] {
  const results: ExtractedText[] = [];
  const lines = content.split('\n');
  
  // 匹配 JSX 文本节点（简化版）
  // 实际应该使用 AST 解析，这里先用正则
  const textPattern = />([^<>{}\n]+)</g;
  
  lines.forEach((line, lineIndex) => {
    let match;
    while ((match = textPattern.exec(line)) !== null) {
      const text = match[1].trim();
      
      // 过滤掉：
      // 1. 空字符串
      // 2. 纯数字
      // 3. 纯符号
      // 4. 变量名（驼峰或下划线）
      if (
        !text ||
        /^\d+$/.test(text) ||
        /^[^\w\u4e00-\u9fa5]+$/.test(text) ||
        /^[a-z][a-zA-Z0-9_]*$/.test(text) // 可能是变量名
      ) {
        continue;
      }
      
      // 检查是否已经是翻译调用
      if (line.includes('t(') || line.includes('useTranslation')) {
        continue;
      }
      
      results.push({
        text,
        line: lineIndex + 1,
        column: match.index + 1,
        context: line.trim(),
        suggestedKey: generateKey(text, componentName),
        componentName,
        filePath,
      });
    }
  });
  
  return results;
}

/**
 * 从文件路径提取组件名
 */
function extractComponentName(filePath: string): string {
  const fileName = path.basename(filePath, path.extname(filePath));
  // 移除 .tsx, .ts 等扩展名
  return fileName.replace(/\.(tsx?|jsx?)$/, '');
}

/**
 * 扫描组件文件
 */
export async function scanComponent(
  componentPath: string,
  options: ScanOptions = {}
): Promise<ScanResult> {
  const fullPath = path.resolve(componentPath);
  
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  
  const content = fs.readFileSync(fullPath, 'utf-8');
  const componentName = extractComponentName(fullPath);
  
  // 提取文本
  const extractedTexts = extractJSXText(content, fullPath, componentName);
  
  // 生成建议的键
  const suggestedKeys = extractedTexts.map(et => et.suggestedKey);
  
  return {
    componentName,
    filePath: fullPath,
    extractedTexts,
    suggestedKeys: [...new Set(suggestedKeys)], // 去重
  };
}

/**
 * 扫描目录中的所有组件
 */
export async function scanDirectory(
  directory: string,
  options: ScanOptions = {}
): Promise<ScanResult[]> {
  const pattern = options.component
    ? `**/${options.component}.{ts,tsx,js,jsx}`
    : '**/*.{ts,tsx,js,jsx}';
  
  const files = await glob(pattern, {
    cwd: directory,
    ignore: ['**/node_modules/**', '**/*.test.*', '**/*.spec.*'],
  });
  
  const results: ScanResult[] = [];
  
  for (const file of files) {
    const filePath = path.join(directory, file);
    try {
      const result = await scanComponent(filePath, options);
      results.push(result);
    } catch (error) {
      console.error(`Error scanning ${filePath}:`, error);
    }
  }
  
  return results;
}

/**
 * CLI 入口
 */
async function main() {
  const args = process.argv.slice(2);
  const component = args.find(arg => arg.startsWith('--component='))?.split('=')[1];
  const directory = args.find(arg => arg.startsWith('--directory='))?.split('=')[1] || 'src/components';
  const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
  
  const options: ScanOptions = {
    component,
    directory,
    output,
  };
  
  try {
    const results = component
      ? [await scanComponent(path.join(directory, component))]
      : await scanDirectory(directory, options);
    
    // 输出结果
    if (output) {
      fs.writeFileSync(output, JSON.stringify(results, null, 2));
      console.log(`✅ Scan results saved to ${output}`);
    } else {
      console.log(JSON.stringify(results, null, 2));
    }
    
    // 统计信息
    const totalTexts = results.reduce((sum, r) => sum + r.extractedTexts.length, 0);
    console.log(`\n📊 Scan Summary:`);
    console.log(`   Components scanned: ${results.length}`);
    console.log(`   Texts extracted: ${totalTexts}`);
  } catch (error) {
    console.error('❌ Scan failed:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

