/**
 * 内容处理服务
 * 用于精简和优化大模型返回的聊天内容
 */

/**
 * 精简文本内容
 * 移除冗余、过长、无意义的表达
 * 只选择一句话，最多15个字
 */
export function processChatContent(text: string, maxLength: number = 15): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  let processed = text.trim();

  // 1. 移除常见的冗余开头
  const redundantPrefixes = [
    /^好的，/i,
    /^嗯，/i,
    /^哦，/i,
    /^啊，/i,
    /^这个，/i,
    /^那个，/i,
    /^其实，/i,
    /^说实话，/i,
    /^说实话吧，/i,
    /^说真的，/i,
    /^我觉得，/i,
    /^我认为，/i,
    /^在我看来，/i,
    /^从我的角度来看，/i,
    /^让我想想，/i,
    /^让我想想看，/i,
    /^嗯嗯，/i,
    /^哈哈，/i,
    /^嘿嘿，/i,
  ];

  for (const prefix of redundantPrefixes) {
    processed = processed.replace(prefix, '');
  }

  // 2. 移除常见的冗余结尾
  const redundantSuffixes = [
    /，对吧$/,
    /，是吧$/,
    /，对不对$/,
    /，是不是$/,
    /，你说呢$/,
    /，你觉得呢$/,
    /，怎么样$/,
    /，如何$/,
    /，好吗$/,
    /，好不好$/,
    /，可以吗$/,
    /，行不行$/,
    /，对吧？$/,
    /，是吧？$/,
    /，对不对？$/,
    /，是不是？$/,
    /，你说呢？$/,
    /，你觉得呢？$/,
    /，怎么样？$/,
    /，如何？$/,
    /，好吗？$/,
    /，好不好？$/,
    /，可以吗？$/,
    /，行不行？$/,
  ];

  for (const suffix of redundantSuffixes) {
    processed = processed.replace(suffix, '');
  }

  // 3. 移除重复的标点符号
  processed = processed.replace(/[。，、]{2,}/g, '。');
  processed = processed.replace(/[！]{2,}/g, '！');
  processed = processed.replace(/[？]{2,}/g, '？');
  processed = processed.replace(/[，]{2,}/g, '，');

  // 4. 只选择第一句话（按句号、问号、感叹号、逗号分割）
  // 先按句号、问号、感叹号分割，取第一句
  let firstSentence = '';
  const sentenceEnders = /([。！？])/;
  const sentences = processed.split(sentenceEnders);
  
  if (sentences.length >= 2) {
    // 有明确的句子结束符，取第一句
    firstSentence = sentences[0] + (sentences[1] || '');
  } else {
    // 没有明确的句子结束符，尝试按逗号分割
    const commaSplit = processed.split(/[，,]/);
    if (commaSplit.length > 1) {
      // 有逗号，取逗号前的部分
      firstSentence = commaSplit[0];
    } else {
      // 没有逗号，直接使用整个文本
      firstSentence = processed;
    }
  }
  
  // 如果第一句话超过maxLength，截断
  if (firstSentence.length > maxLength) {
    firstSentence = firstSentence.substring(0, maxLength);
    // 移除最后一个不完整的字符（如果是中文）
    if (/[\u4e00-\u9fa5]/.test(firstSentence[firstSentence.length - 1])) {
      firstSentence = firstSentence.substring(0, firstSentence.length - 1);
    }
    // 移除末尾的标点（如果截断了）
    firstSentence = firstSentence.replace(/[。！？，、]$/, '');
  }
  
  processed = firstSentence.trim();
  
  // 5. 最终检查：确保不超过maxLength
  if (processed.length > maxLength) {
    processed = processed.substring(0, maxLength);
    // 移除最后一个不完整的字符（如果是中文）
    if (/[\u4e00-\u9fa5]/.test(processed[processed.length - 1])) {
      processed = processed.substring(0, processed.length - 1);
    }
    // 移除末尾的标点
    processed = processed.replace(/[。！？，、]$/, '');
  }

  // 6. 移除多余的空格
  processed = processed.replace(/\s+/g, ' ').trim();

  // 7. 确保以合适的标点结尾（如果没有标点，且长度允许）
  if (processed.length > 0 && !/[。！？]$/.test(processed)) {
    // 如果最后是中文，且长度允许，添加句号
    if (/[\u4e00-\u9fa5]$/.test(processed) && processed.length < maxLength) {
      processed += '。';
    }
  }

  return processed.trim();
}

/**
 * 检测并移除过于正式或冗长的表达
 */
export function removeFormalExpressions(text: string): string {
  let processed = text;

  // 移除过于正式的开头
  const formalPrefixes = [
    /^根据我的分析，/i,
    /^根据当前情况，/i,
    /^从游戏规则来看，/i,
    /^从牌局情况来看，/i,
    /^从目前的情况来看，/i,
    /^从当前局势来看，/i,
    /^综合分析，/i,
    /^总的来说，/i,
    /^综上所述，/i,
    /^总而言之，/i,
  ];

  for (const prefix of formalPrefixes) {
    processed = processed.replace(prefix, '');
  }

  // 移除过于正式的表达
  processed = processed.replace(/我认为应该/i, '应该');
  processed = processed.replace(/我觉得应该/i, '应该');
  processed = processed.replace(/我建议/i, '');
  processed = processed.replace(/我建议你/i, '');
  processed = processed.replace(/我建议我们/i, '我们');

  return processed.trim();
}

/**
 * 完整的内容处理流程
 * 目标：只选择一句话，最多15个字
 */
export function processContent(text: string, options?: {
  maxLength?: number;
  removeFormal?: boolean;
}): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  const maxLength = options?.maxLength ?? 15; // 默认最多15个字
  const removeFormal = options?.removeFormal ?? true;

  let processed = text;

  // 1. 移除正式表达
  if (removeFormal) {
    processed = removeFormalExpressions(processed);
  }

  // 2. 精简内容
  processed = processChatContent(processed, maxLength);

  return processed;
}

