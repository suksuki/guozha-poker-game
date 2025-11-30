/**
 * i18n 工具 CLI
 * 统一的命令行接口
 */

import { fileURLToPath } from 'url';
import path from 'path';
import { scanComponent, scanDirectory } from './scan.js';
import { generateComponentTranslations, generateLanguageFiles } from './generate.js';
import { validateAllTranslations, printValidationReport } from './validate.js';
import { generateAllTypes } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 显示帮助信息
 */
function showHelp(): void {
  console.log(`
i18n Framework CLI Tool

Usage: npm run i18n:<command> [options]

Commands:
  scan [--component=<name>] [--directory=<path>] [--output=<file>]
    Scan components and extract translatable texts
    
  generate [--component=<name>] [--language=<code>] [--template] [--update]
    Generate translation files
    
  validate [--output=<file>]
    Validate translation completeness
    
  types [--output=<file>] [--component=<name>]
    Generate TypeScript type definitions
    
  sync [--component=<name>]
    Complete workflow: scan + generate + validate + types

Examples:
  npm run i18n:scan --component GameConfigPanel
  npm run i18n:generate --component GameConfigPanel
  npm run i18n:validate
  npm run i18n:types
  npm run i18n:sync --component GameConfigPanel
`);
}

/**
 * 完整同步流程
 */
async function syncWorkflow(component?: string): Promise<void> {
  console.log('🔄 Starting i18n sync workflow...\n');
  
  try {
    // 1. 扫描
    console.log('1️⃣ Scanning components...');
    const scanResults = component
      ? [await scanComponent(`src/components/game/${component}.tsx`)]
      : await scanDirectory('src/components');
    console.log(`   ✅ Scanned ${scanResults.length} component(s)\n`);
    
    // 2. 生成
    console.log('2️⃣ Generating translation files...');
    if (component) {
      await generateComponentTranslations(component, {
        scanResult: scanResults[0],
      });
    } else {
      for (const result of scanResults) {
        await generateComponentTranslations(result.componentName, {
          scanResult: result,
        });
      }
    }
    console.log('   ✅ Translation files generated\n');
    
    // 3. 验证
    console.log('3️⃣ Validating translations...');
    const report = await validateAllTranslations();
    printValidationReport(report);
    console.log();
    
    // 4. 生成类型
    console.log('4️⃣ Generating type definitions...');
    await generateAllTypes({ component });
    console.log('   ✅ Type definitions generated\n');
    
    console.log('✅ Sync workflow completed!');
  } catch (error) {
    console.error('❌ Sync workflow failed:', error);
    process.exit(1);
  }
}

/**
 * CLI 主入口
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === '--help' || command === '-h') {
    showHelp();
    return;
  }
  
  try {
    switch (command) {
      case 'scan': {
        const component = args.find(arg => arg.startsWith('--component='))?.split('=')[1];
        const directory = args.find(arg => arg.startsWith('--directory='))?.split('=')[1] || 'src/components';
        const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
        
        const results = component
          ? [await scanComponent(`src/components/game/${component}.tsx`)]
          : await scanDirectory(directory);
        
        if (output) {
          const fs = await import('fs');
          fs.writeFileSync(output, JSON.stringify(results, null, 2));
          console.log(`✅ Scan results saved to ${output}`);
        } else {
          console.log(JSON.stringify(results, null, 2));
        }
        break;
      }
      
      case 'generate': {
        const component = args.find(arg => arg.startsWith('--component='))?.split('=')[1];
        const language = args.find(arg => arg.startsWith('--language='))?.split('=')[1];
        const template = args.includes('--template');
        const update = args.includes('--update');
        
        if (language && !component) {
          await generateLanguageFiles(language as any);
          console.log(`✅ Generated translation files for ${language}`);
        } else if (component) {
          await generateComponentTranslations(component, { language: language as any, template, update });
          console.log(`✅ Generated translation files for ${component}`);
        } else {
          console.error('❌ Please specify --component or --language');
          process.exit(1);
        }
        break;
      }
      
      case 'validate': {
        const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1];
        const report = await validateAllTranslations();
        
        if (output) {
          const fs = await import('fs');
          fs.writeFileSync(output, JSON.stringify(report, null, 2));
          console.log(`✅ Validation report saved to ${output}`);
        }
        
        printValidationReport(report);
        break;
      }
      
      case 'types': {
        const output = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || 'src/i18n/types/keys.ts';
        const component = args.find(arg => arg.startsWith('--component='))?.split('=')[1];
        await generateAllTypes({ output, component });
        console.log(`✅ Type definitions generated: ${output}`);
        break;
      }
      
      case 'sync': {
        const component = args.find(arg => arg.startsWith('--component='))?.split('=')[1];
        await syncWorkflow(component);
        break;
      }
      
      default:
        console.error(`❌ Unknown command: ${command}`);
        showHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Command failed:`, error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

