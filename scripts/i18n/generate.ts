/**
 * 生成工具
 * 根据扫描结果生成翻译文件
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { ScanResult } from './scan.js';
import { supportedLanguages, SupportedLanguage } from '../../src/i18n/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 生成选项
 */
export interface GenerateOptions {
  component?: string;
  language?: SupportedLanguage;
  template?: boolean;
  update?: boolean;
  scanResult?: ScanResult;
}

/**
 * 从扫描结果生成翻译文件结构
 */
function generateTranslationStructure(scanResult: ScanResult): Record<string, any> {
  const structure: Record<string, any> = {};
  
  // 根据提取的文本生成结构
  scanResult.extractedTexts.forEach((extracted, index) => {
    // 使用建议的键，如果重复则添加序号
    let key = extracted.suggestedKey;
    let counter = 1;
    
    while (structure[key]) {
      key = `${extracted.suggestedKey}${counter}`;
      counter++;
    }
    
    structure[key] = extracted.text;
  });
  
  return structure;
}

/**
 * 生成组件翻译文件
 */
export async function generateComponentTranslations(
  componentName: string,
  options: GenerateOptions = {}
): Promise<void> {
  const resourcePath = 'i18n-resources/components';
  const componentDir = path.join(resourcePath, componentName);
  
  // 创建组件目录
  if (!fs.existsSync(componentDir)) {
    fs.mkdirSync(componentDir, { recursive: true });
  }
  
  // 确定要生成的语言
  const languages = options.language
    ? [options.language]
    : supportedLanguages.map(lang => lang.code);
  
  // 如果有扫描结果，使用它生成结构
  let translationStructure: Record<string, any> = {};
  
  if (options.scanResult) {
    translationStructure = generateTranslationStructure(options.scanResult);
  } else if (options.update) {
    // 更新模式：读取现有文件，添加新键
    const existingFile = path.join(componentDir, `${supportedLanguages[0].code}.json`);
    if (fs.existsSync(existingFile)) {
      translationStructure = JSON.parse(fs.readFileSync(existingFile, 'utf-8'));
    }
  }
  
  // 为每种语言生成文件
  for (const language of languages) {
    const filePath = path.join(componentDir, `${language}.json`);
    let content: Record<string, any> = {};
    
    // 如果文件已存在且不是模板模式，读取现有内容
    if (fs.existsSync(filePath) && !options.template) {
      try {
        content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      } catch (error) {
        console.warn(`Failed to parse existing file ${filePath}, creating new one`);
      }
    }
    
    // 合并结构（新键会覆盖旧键）
    const merged = {
      ...content,
      ...translationStructure,
    };
    
    // 写入文件
    fs.writeFileSync(
      filePath,
      JSON.stringify(merged, null, 2) + '\n',
      'utf-8'
    );
    
    console.log(`✅ Generated: ${filePath}`);
  }
}

/**
 * 为新语言生成所有翻译文件
 */
export async function generateLanguageFiles(
  language: SupportedLanguage
): Promise<void> {
  const resourcePath = 'i18n-resources';
  
  // 扫描所有组件目录
  const componentsDir = path.join(resourcePath, 'components');
  if (!fs.existsSync(componentsDir)) {
    console.log('No components directory found');
    return;
  }
  
  const componentDirs = fs.readdirSync(componentsDir, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);
  
  for (const componentName of componentDirs) {
    // 检查是否已有该语言的翻译文件
    const filePath = path.join(componentsDir, componentName, `${language}.json`);
    
    if (!fs.existsSync(filePath)) {
      // 读取参考语言文件（使用第一个支持的语言）
      const referenceFile = path.join(
        componentsDir,
        componentName,
        `${supportedLanguages[0].code}.json`
      );
      
      let structure: Record<string, any> = {};
      if (fs.existsSync(referenceFile)) {
        structure = JSON.parse(fs.readFileSync(referenceFile, 'utf-8'));
      }
      
      // 生成新语言文件（使用相同的键，值为空或占位符）
      const newContent: Record<string, any> = {};
      for (const key in structure) {
        newContent[key] = `[${key}]`; // 占位符
      }
      
      fs.writeFileSync(
        filePath,
        JSON.stringify(newContent, null, 2) + '\n',
        'utf-8'
      );
      
      console.log(`✅ Generated: ${filePath}`);
    }
  }
}

/**
 * CLI 入口
 */
async function main() {
  const args = process.argv.slice(2);
  const component = args.find(arg => arg.startsWith('--component='))?.split('=')[1];
  const language = args.find(arg => arg.startsWith('--language='))?.split('=')[1] as SupportedLanguage;
  const template = args.includes('--template');
  const update = args.includes('--update');
  
  const options: GenerateOptions = {
    component,
    language,
    template,
    update,
  };
  
  try {
    if (language && !component) {
      // 为新语言生成所有文件
      await generateLanguageFiles(language);
      console.log(`\n✅ Generated translation files for ${language}`);
    } else if (component) {
      // 为组件生成翻译文件
      await generateComponentTranslations(component, options);
      console.log(`\n✅ Generated translation files for ${component}`);
    } else {
      console.error('❌ Please specify --component or --language');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Generate failed:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

