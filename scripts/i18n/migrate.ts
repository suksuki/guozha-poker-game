/**
 * 迁移工具
 * 将现有的翻译文件从旧结构迁移到新的命名空间结构
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { supportedLanguages, SupportedLanguage } from '../../src/i18n/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 迁移配置
 * 定义如何将旧的命名空间映射到新的结构
 */
const migrationMap: Record<string, { type: 'shared' | 'feature' | 'component'; name: string }> = {
  // 共享翻译
  common: { type: 'shared', name: 'common' },
  ui: { type: 'shared', name: 'ui' },
  
  // 功能翻译
  game: { type: 'feature', name: 'game' },
  chat: { type: 'feature', name: 'chat' },
  cards: { type: 'feature', name: 'cards' },
  
  // 配置相关的（可以归为功能或共享）
  config: { type: 'feature', name: 'config' },
};

/**
 * 读取旧的翻译文件
 */
function readOldTranslationFile(language: SupportedLanguage, namespace: string): Record<string, any> | null {
  const oldPath = path.join(
    __dirname,
    '../../src/i18n/locales',
    language,
    `${namespace}.json`
  );
  
  if (!fs.existsSync(oldPath)) {
    return null;
  }
  
  try {
    const content = fs.readFileSync(oldPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error(`Error reading ${oldPath}:`, error);
    return null;
  }
}

/**
 * 写入新的翻译文件
 */
function writeNewTranslationFile(
  language: SupportedLanguage,
  type: 'shared' | 'feature' | 'component',
  name: string,
  data: Record<string, any>
): void {
  const newPath = path.join(
    __dirname,
    '../../i18n-resources',
    type,
    name,
    `${language}.json`
  );
  
  // 确保目录存在
  const dir = path.dirname(newPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  // 写入文件
  fs.writeFileSync(newPath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
  console.log(`✅ Migrated: ${type}/${name}/${language}.json`);
}

/**
 * 迁移单个命名空间
 */
function migrateNamespace(namespace: string, dryRun: boolean = false): void {
  const migration = migrationMap[namespace];
  
  if (!migration) {
    console.warn(`⚠️  No migration mapping for namespace: ${namespace}`);
    return;
  }
  
  console.log(`\n🔄 Migrating namespace: ${namespace} -> ${migration.type}:${migration.name}`);
  
  for (const lang of supportedLanguages) {
    const data = readOldTranslationFile(lang.code, namespace);
    
    if (!data) {
      console.warn(`  ⚠️  No data for ${lang.code}`);
      continue;
    }
    
    if (!dryRun) {
      writeNewTranslationFile(lang.code, migration.type, migration.name, data);
    } else {
      console.log(`  [DRY RUN] Would migrate ${lang.code}`);
    }
  }
}

/**
 * 迁移所有命名空间
 */
export async function migrateAllTranslations(dryRun: boolean = false): Promise<void> {
  console.log('🚀 Starting translation migration...');
  if (dryRun) {
    console.log('📋 DRY RUN MODE - No files will be modified');
  }
  
  const namespaces = Object.keys(migrationMap);
  
  for (const namespace of namespaces) {
    migrateNamespace(namespace, dryRun);
  }
  
  console.log('\n✅ Migration completed!');
}

/**
 * 创建迁移报告
 */
export function generateMigrationReport(): void {
  console.log('📊 Migration Report\n');
  console.log('Namespace Mapping:');
  
  for (const [oldNs, migration] of Object.entries(migrationMap)) {
    console.log(`  ${oldNs} -> ${migration.type}:${migration.name}`);
  }
  
  console.log('\nNew Structure:');
  console.log('  i18n-resources/');
  console.log('    shared/');
  console.log('      common/');
  console.log('      ui/');
  console.log('    feature/');
  console.log('      game/');
  console.log('      chat/');
  console.log('      cards/');
  console.log('      config/');
  console.log('    component/');
  console.log('      [component-name]/');
}

/**
 * CLI 入口
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const report = args.includes('--report');
  
  if (report) {
    generateMigrationReport();
    return;
  }
  
  try {
    await migrateAllTranslations(dryRun);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// 如果直接运行此脚本
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

