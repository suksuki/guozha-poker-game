/**
 * 简单的语言检测工具
 * 根据文本内容检测语言
 */

/**
 * 检测文本的主要语言
 * @param text 要检测的文本
 * @returns 语言代码（如 'zh-CN', 'en-US'）
 */
export function detectLanguage(text: string): string {
  if (!text || text.trim().length === 0) {
    return 'zh-CN'; // 默认中文
  }

  // 移除标点符号和空格
  const cleanText = text.replace(/[^\w\u4e00-\u9fa5]/g, '');

  // 检测中文字符
  const chineseRegex = /[\u4e00-\u9fa5]/;
  const hasChinese = chineseRegex.test(cleanText);
  
  // 检测韩文字符
  const koreanRegex = /[\uac00-\ud7a3]/;
  const hasKorean = koreanRegex.test(cleanText);
  
  // 检测日文字符（平假名、片假名、汉字）
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff\u4e00-\u9fa5]/;
  const hasJapanese = japaneseRegex.test(cleanText);

  // 检测英文字符
  const englishRegex = /[a-zA-Z]/;
  const hasEnglish = englishRegex.test(cleanText);

  // 统计各语言字符数量
  const chineseCount = (cleanText.match(/[\u4e00-\u9fa5]/g) || []).length;
  const koreanCount = (cleanText.match(/[\uac00-\ud7a3]/g) || []).length;
  const japaneseCount = (cleanText.match(/[\u3040-\u309f\u30a0-\u30ff]/g) || []).length;
  const englishCount = (cleanText.match(/[a-zA-Z]/g) || []).length;

  // 根据字符数量判断主要语言
  if (hasChinese && chineseCount > englishCount) {
    return 'zh-CN';
  }
  if (hasKorean && koreanCount > englishCount) {
    return 'ko-KR';
  }
  if (hasJapanese && japaneseCount > englishCount) {
    return 'ja-JP';
  }
  if (hasEnglish && englishCount > 0) {
    return 'en-US';
  }

  // 默认返回中文
  return 'zh-CN';
}

/**
 * 检测文本是否主要是某种语言
 */
export function isLanguage(text: string, lang: string): boolean {
  const detected = detectLanguage(text);
  return detected.startsWith(lang.split('-')[0]);
}

