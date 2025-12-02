/**
 * 文本断句工具
 * 用于将长文本智能分段，确保TTS播报自然流畅
 */

export interface SegmentOptions {
  maxSegmentLength?: number;  // 每段最大长度（默认15字）
  maxTotalLength?: number;     // 总长度限制（默认40字）
  preservePunctuation?: boolean; // 是否保留标点符号（默认true）
  forceSegment?: boolean;      // 是否强制分段（即使没有标点符号，默认true）
}

/**
 * 智能断句：将文本按标点符号和长度分段
 * 
 * @param text 要断句的文本
 * @param options 断句选项
 * @returns 分段后的文本数组
 */
export function segmentText(
  text: string,
  options?: SegmentOptions
): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const {
    maxSegmentLength = 15,
    maxTotalLength = 40,
    preservePunctuation = true,
    forceSegment = true
  } = options || {};

  let processed = text.trim();

  // 1. 如果总长度超过限制，先截断
  if (processed.length > maxTotalLength) {
    // 尝试在最后一个标点符号处截断
    let lastPunctuation = -1;
    for (let i = Math.min(maxTotalLength, processed.length - 1); i >= maxTotalLength * 0.7; i--) {
      if (/[。！？，；、]/.test(processed[i])) {
        lastPunctuation = i;
        break;
      }
    }
    if (lastPunctuation > maxTotalLength * 0.7) {
      processed = processed.substring(0, lastPunctuation + 1);
    } else {
      processed = processed.substring(0, maxTotalLength);
    }
  }

  // 2. 先按句号、问号、感叹号分段（主要断句点）
  const primarySegments: string[] = [];
  const primarySplit = processed.split(/([。！？])/);
  
  let currentSegment = '';
  for (let i = 0; i < primarySplit.length; i++) {
    const part = primarySplit[i];
    if (!part) continue;
    
    // 如果是标点符号，添加到当前段并结束
    if (/[。！？]/.test(part)) {
      currentSegment += part;
      if (currentSegment.trim().length > 0) {
        primarySegments.push(currentSegment.trim());
      }
      currentSegment = '';
    } else {
      currentSegment += part;
    }
  }
  
  // 处理最后一段（可能没有句号结尾）
  if (currentSegment.trim().length > 0) {
    primarySegments.push(currentSegment.trim());
  }

  // 3. 如果某段超过maxSegmentLength，按逗号、分号、顿号进一步分段
  const secondarySegments: string[] = [];
  for (const segment of primarySegments) {
    if (segment.length <= maxSegmentLength) {
      secondarySegments.push(segment);
    } else {
      // 按逗号、分号、顿号分段
      const commaSplit = segment.split(/([，；、])/);
      let currentSubSegment = '';
      
      for (let i = 0; i < commaSplit.length; i++) {
        const part = commaSplit[i];
        if (!part) continue;
        
        // 如果是标点符号，添加到当前段
        if (/[，；、]/.test(part)) {
          currentSubSegment += part;
          // 如果加上标点后仍然超过长度，先保存当前段
          if (currentSubSegment.length > maxSegmentLength) {
            const beforePunctuation = currentSubSegment.substring(0, currentSubSegment.length - 1);
            if (beforePunctuation.trim().length > 0) {
              secondarySegments.push(beforePunctuation.trim());
            }
            currentSubSegment = part;
          }
        } else {
          // 如果加上这部分后超过长度，先保存当前段
          if (currentSubSegment.length + part.length > maxSegmentLength && currentSubSegment.trim().length > 0) {
            secondarySegments.push(currentSubSegment.trim());
            currentSubSegment = part;
          } else {
            currentSubSegment += part;
          }
        }
      }
      
      // 处理最后一段
      if (currentSubSegment.trim().length > 0) {
        secondarySegments.push(currentSubSegment.trim());
      }
    }
  }

  // 4. 如果某段仍然超过maxSegmentLength，强制按长度分段
  const finalSegments: string[] = [];
  for (const segment of secondarySegments) {
    if (segment.length <= maxSegmentLength) {
      finalSegments.push(segment);
    } else if (forceSegment) {
      // 强制按长度分段，尽量在词语边界处断开
      let start = 0;
      while (start < segment.length) {
        let end = Math.min(start + maxSegmentLength, segment.length);
        
        // 如果不是最后一段，尝试在词语边界处断开
        if (end < segment.length) {
          // 向前查找标点符号或空格
          let bestBreak = end;
          for (let i = end - 1; i >= start + maxSegmentLength * 0.7; i--) {
            if (/[，。！？；、\s]/.test(segment[i])) {
              bestBreak = i + 1;
              break;
            }
          }
          end = bestBreak;
        }
        
        const subSegment = segment.substring(start, end).trim();
        if (subSegment.length > 0) {
          finalSegments.push(subSegment);
        }
        start = end;
      }
    } else {
      // 不强制分段，直接添加
      finalSegments.push(segment);
    }
  }

  // 5. 清理和验证
  const cleanedSegments = finalSegments
    .map(seg => seg.trim())
    .filter(seg => seg.length > 0);

  // 如果没有分段结果，返回原文本（至少一段）
  if (cleanedSegments.length === 0) {
    return [processed];
  }

  return cleanedSegments;
}

/**
 * 快速断句：只按主要标点符号分段（句号、问号、感叹号）
 * 适用于已经比较短的文本
 */
export function quickSegment(text: string): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const segments = text
    .split(/[。！？]/)
    .map(seg => seg.trim())
    .filter(seg => seg.length > 0);

  return segments.length > 0 ? segments : [text.trim()];
}

/**
 * 检查文本是否需要分段
 */
export function needsSegmentation(text: string, maxLength: number = 15): boolean {
  if (!text || text.trim().length === 0) {
    return false;
  }
  return text.trim().length > maxLength;
}

/**
 * 添加标点符号（如果文本没有合适的结尾标点）
 */
export function ensurePunctuation(text: string): string {
  if (!text || text.trim().length === 0) {
    return text;
  }

  const trimmed = text.trim();
  
  // 如果已经有句号、问号、感叹号结尾，直接返回
  if (/[。！？]$/.test(trimmed)) {
    return trimmed;
  }

  // 如果有逗号、分号结尾，替换为句号
  if (/[，；、]$/.test(trimmed)) {
    return trimmed.slice(0, -1) + '。';
  }

  // 如果没有标点符号，添加句号
  return trimmed + '。';
}

