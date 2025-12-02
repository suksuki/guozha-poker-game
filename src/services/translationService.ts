/**
 * 翻译服务
 * 用于将聊天内容翻译成目标语言
 */

import { i18n } from '../i18n';
import { detectLanguage } from '../utils/languageDetection';

/**
 * 翻译文本到目标语言
 * @param text 要翻译的文本
 * @param targetLang 目标语言（可选，默认使用当前 i18n 语言）
 * @returns 翻译后的文本
 */
export async function translateText(
  text: string,
  targetLang?: string
): Promise<string> {
  if (!text || text.trim().length === 0) {
    return text;
  }

  const currentLang = targetLang || i18n.language || 'zh-CN';
  const detectedLang = detectLanguage(text);

  // 如果文本已经是目标语言，不需要翻译
  if (detectedLang === currentLang || detectedLang.startsWith(currentLang.split('-')[0])) {
    return text;
  }

  // 如果目标语言是中文，不需要翻译
  if (currentLang.startsWith('zh')) {
    return text;
  }

  // 如果文本不是中文，也不需要翻译（可能是英文或其他语言）
  if (!detectedLang.startsWith('zh')) {
    return text;
  }

  // 尝试使用翻译 API（如果有配置）
  try {
    const translated = await translateWithAPI(text, currentLang);
    if (translated) {
      return translated;
    }
  } catch (error) {
  }

  // 回退：返回原文（让语音系统自动检测语言）
  return text;
}

/**
 * 使用翻译 API 翻译文本
 * 可以配置使用 Google Translate、DeepL 等
 */
async function translateWithAPI(
  text: string,
  targetLang: string
): Promise<string | null> {
  // 方案1：使用 Google Translate API（需要 API 密钥）
  // 方案2：使用免费的翻译服务（如 MyMemory Translation API）
  // 方案3：使用浏览器内置的翻译（如果可用）

  // 这里使用 MyMemory Translation API（免费，无需密钥）
  try {
    const sourceLang = 'zh-CN';
    const langCode = targetLang.split('-')[0]; // 'en', 'ko', 'ja'
    
    const response = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${langCode}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      }
    );

    if (!response.ok) {
      throw new Error(`Translation API error: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.responseStatus === 200 && data.responseData?.translatedText) {
      return data.responseData.translatedText;
    }

    return null;
  } catch (error) {
    return null;
  }
}

/**
 * 批量翻译文本
 */
export async function translateBatch(
  texts: string[],
  targetLang?: string
): Promise<string[]> {
  const results = await Promise.all(
    texts.map(text => translateText(text, targetLang))
  );
  return results;
}

