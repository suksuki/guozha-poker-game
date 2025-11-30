/**
 * 类型生成工具
 * 从翻译文件生成 TypeScript 类型定义
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supportedLanguages } from '../../src/i18n/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 生成选项
 */
export interface TypeGenerateOptions {
  output?: string;
  component?: string;
}

/**
 * 将对象转换为 TypeScript 类型定义
 */
function objectToType(
  obj: Record<string, any>,
  indent = 0
): string {
  const spaces = '  '.repeat(indent);
  const lines: string[] = [];
  
  for (const key in obj) {
    const value = obj[key];
    const validKey = /^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key) ? key : `"${key}"`;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      lines.push(`${spaces}${validKey}: {`);
      lines.push(objectToType(value, indent + 1));
      lines.push(`${spaces}};`);
    } else {
      lines.push(`${spaces}${validKey}: string;`);
    }
  }
  
  return lines.join('\n');
}

/**
 * 生成组件类型定义
 */
function generateComponentTypes(
  componentName: string,
  componentPath: string
): string {
  // 读取参考语言文件（使用第一个支持的语言）
  const referenceFile = path.join(componentPath, `${supportedLanguages[0].code}.json`);
  
  if (!fs.existsSync(referenceFile)) {
    return '';
  }
  
  const content = JSON.parse(fs.readFileSync(referenceFile, 'utf-8'));
  const typeName = `${componentName}Keys`;
  
  return `
export interface ${typeName} {
${objectToType(content, 1)}
}
`;
}

/**
 * 生成所有类型定义
 */
export async function generateAllTypes(
  options: TypeGenerateOptions = {}
): Promise<string> {
  const resourcePath = 'i18n-resources';
  const componentsPath = path.join(resourcePath, 'components');
  
  const typeDefinitions: string[] = [
    '/**',
    ' * 自动生成的翻译键类型定义',
    ' * 请勿手动编辑此文件',
    ' */',
    '',
  ];
  
  // 生成组件类型
  if (fs.existsSync(componentsPath)) {
    const componentDirs = fs.readdirSync(componentsPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    for (const componentName of componentDirs) {
      if (options.component && componentName !== options.component) {
        continue;
      }
      
      const componentPath = path.join(componentsPath, componentName);
      const typeDef = generateComponentTypes(componentName, componentPath);
      
      if (typeDef) {
        typeDefinitions.push(typeDef);
      }
    }
  }
  
  // 生成联合类型
  const componentNames = fs.existsSync(componentsPath)
    ? fs.readdirSync(componentsPath, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name)
    : [];
  
  if (componentNames.length > 0) {
    typeDefinitions.push('\n// 组件翻译键类型');
    typeDefinitions.push('export type ComponentTranslationKeys =');
    componentNames.forEach((name, index) => {
      const prefix = index === 0 ? '  ' : '  | ';
      const suffix = index === componentNames.length - 1 ? ';' : '';
      typeDefinitions.push(`${prefix}component:${name}:${name}Keys${suffix}`);
    });
  }
  
  return typeDefinitions.join('\n');
}

/**
 * CLI 入口
 */
async function main() {
  const args = process.argv.slice(2);
  const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 
                 'src/i18n/types/keys.ts';
  const component = args.find(arg => arg.startsWith('--component='))?.split('=')[1];
  
  try {
    const typeDefinitions = await generateAllTypes({ output, component });
    
    // 确保输出目录存在
    const outputDir = path.dirname(output);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 写入文件
    fs.writeFileSync(output, typeDefinitions, 'utf-8');
    console.log(`✅ Type definitions generated: ${output}`);
  } catch (error) {
    console.error('❌ Type generation failed:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

