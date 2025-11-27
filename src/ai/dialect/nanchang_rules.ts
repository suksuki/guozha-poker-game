/**
 * 南昌话改写规则
 * 用于将普通话牌桌/互怼表达转换为南昌话
 * 
 * 使用方式：
 * 1. 先规则/词表改写（快速落地）
 * 2. 再 LoRA 训练"南昌话改写器"（增强地道度）
 */

// 牌桌常用词表（普通话 -> 南昌话）
export const nanchangCardGameDict: Record<string, string> = {
  // 出牌相关
  '我跟一手': '我跟噻',
  '我跟': '我跟',
  '我出': '我出',
  '我压': '我压',
  '要不起': '要不起',
  '过': '过',
  '不要': '不要',
  
  // 催促/挑衅
  '你别急': '你莫急咧',
  '你别急啊': '你莫急咧',
  '你急什么': '你急么子',
  '你快点': '你快滴',
  '你慢点': '你慢滴',
  
  // 反击/互怼
  '你一张嘴就输钱': '你一张嘴就输钱气',
  '你这一手打得': '你这一手打得',
  '我都替你着急': '我都替你着急',
  '别在这儿': '莫在这儿',
  '别在这': '莫在这',
  '别瞎搞': '莫瞎搞',
  '别放屁': '莫放屁',
  
  // 夸张比喻
  '你嘴巴跟漏斗一样': '你嘴巴跟漏斗一样',
  '你这一手打得不行': '你这一手打得不行',
  '你确实打得不行': '你确实打得不行',
  
  // 胜利/失败
  '这局我拿下了': '这局我拿下了',
  '你还有什么话说': '你还有么子话说',
  '这局算你运气好': '这局算你运气好',
  '下局见真章': '下局见真章',
  '我这一手打得': '我这一手打得',
  '确实有点急了': '确实有点急了',
  
  // 语气词
  '啊': '咧',
  '呀': '咧',
  '呢': '咧',
  '吧': '噻',
  '的': '个',
  '了': '了',
  '吗': '啵',
  '什么': '么子',
  '怎么': '咋',
  '怎么搞': '咋搞',
  '怎么弄': '咋弄',
};

// 南昌话特有表达（直接使用）
export const nanchangIdioms: string[] = [
  '我跟噻',
  '你莫急咧',
  '你急么子',
  '你快滴',
  '你慢滴',
  '莫在这儿',
  '莫在这',
  '莫瞎搞',
  '莫放屁',
  '你还有么子话说',
  '咋搞',
  '咋弄',
  '啵',
];

// 语法规则（正则替换）
export interface NanchangRule {
  pattern: RegExp;
  replacement: string;
  description: string;
}

export const nanchangGrammarRules: NanchangRule[] = [
  // 语气词替换
  {
    pattern: /([，。！？])(啊|呀|呢)([，。！？]|$)/g,
    replacement: '$1咧$3',
    description: '句末语气词替换为"咧"'
  },
  {
    pattern: /([，。！？])(吧)([，。！？]|$)/g,
    replacement: '$1噻$3',
    description: '句末"吧"替换为"噻"'
  },
  
  // "什么"替换为"么子"
  {
    pattern: /什么/g,
    replacement: '么子',
    description: '"什么"替换为"么子"'
  },
  
  // "怎么"替换为"咋"
  {
    pattern: /怎么/g,
    replacement: '咋',
    description: '"怎么"替换为"咋"'
  },
  
  // "别"替换为"莫"
  {
    pattern: /别/g,
    replacement: '莫',
    description: '"别"替换为"莫"'
  },
  
  // "的"在某些位置替换为"个"（需要上下文判断，这里简化）
  {
    pattern: /(你|我|他|她|它)(的)([^的]+)([，。！？]|$)/g,
    replacement: '$1个$3$4',
    description: '部分"的"替换为"个"'
  },
];

/**
 * 南昌话改写函数
 * @param text 普通话文本
 * @param useDict 是否使用词表（默认 true）
 * @param useRules 是否使用语法规则（默认 true）
 * @returns 南昌话文本
 */
export function convertToNanchang(
  text: string,
  useDict: boolean = true,
  useRules: boolean = true
): string {
  let result = text;
  
  // 1. 词表替换（优先，精确匹配）
  if (useDict) {
    for (const [key, value] of Object.entries(nanchangCardGameDict)) {
      // 精确匹配整个词
      const regex = new RegExp(`\\b${key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
      result = result.replace(regex, value);
    }
  }
  
  // 2. 语法规则替换
  if (useRules) {
    for (const rule of nanchangGrammarRules) {
      result = result.replace(rule.pattern, rule.replacement);
    }
  }
  
  return result;
}

/**
 * 检查文本是否包含南昌话特征
 * @param text 文本
 * @returns 是否包含南昌话特征
 */
export function hasNanchangFeatures(text: string): boolean {
  return nanchangIdioms.some(idiom => text.includes(idiom)) ||
         /[咧噻么子咋莫啵]/.test(text);
}

/**
 * 南昌话改写器（高级版本，支持上下文）
 * 用于 LoRA 训练数据生成
 */
export interface NanchangRewriteContext {
  scene: 'card_game' | 'quarrel' | 'chat';
  civility: number;
  originalText: string;
}

export function advancedNanchangRewrite(
  context: NanchangRewriteContext
): string {
  let result = context.originalText;
  
  // 根据场景调整
  if (context.scene === 'card_game') {
    // 牌桌场景：优先使用牌桌词表
    result = convertToNanchang(result, true, true);
  } else if (context.scene === 'quarrel') {
    // 吵架场景：加强语气词
    result = convertToNanchang(result, true, true);
    // 可以添加更多语气词
    if (context.civility >= 2) {
      result = result.replace(/([，。！？])/g, '$1');
    }
  }
  
  return result;
}

/**
 * 生成 LoRA 训练数据格式
 * 用于训练南昌话改写模型
 */
export interface NanchangLoRATrainingSample {
  input: string;  // 普通话
  output: string; // 南昌话
  scene: string;
  civility: number;
}

/**
 * 批量生成训练样本
 * @param samples 普通话样本列表
 * @returns 训练样本列表
 */
export function generateLoRATrainingSamples(
  samples: Array<{ text: string; scene: string; civility: number }>
): NanchangLoRATrainingSample[] {
  return samples.map(sample => ({
    input: sample.text,
    output: advancedNanchangRewrite({
      scene: sample.scene as any,
      civility: sample.civility,
      originalText: sample.text
    }),
    scene: sample.scene,
    civility: sample.civility
  }));
}

/**
 * 示例：生成训练数据
 */
export const exampleTrainingSamples = [
  { text: '我跟一手，你别急啊。', scene: 'card_game', civility: 1 },
  { text: '你这一手打得，我都替你着急。', scene: 'quarrel', civility: 2 },
  { text: '你嘴巴跟漏斗一样，别在这儿放屁！', scene: 'quarrel', civility: 3 },
  { text: '这局我拿下了，你还有什么话说？', scene: 'card_game', civility: 1 },
  { text: '这局算你运气好，下局见真章。', scene: 'card_game', civility: 1 },
];

// 导出训练数据（JSON 格式，用于 LoRA 训练）
export const nanchangLoRATrainingData = generateLoRATrainingSamples(exampleTrainingSamples);

