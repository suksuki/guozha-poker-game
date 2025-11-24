/**
 * 聊天内容库
 * 包含随机闲聊、事件触发、对骂等内容
 * 使用 i18n 支持多语言
 */

import { ChatEventType } from '../types/chat';
import i18n from '../i18n';

export type Dialect = 'mandarin' | 'cantonese';

// 聊天内容映射类型
type ChatContentMap = Record<Dialect, string[]>;

// 随机闲聊内容（普通话）
const randomChatMandarin = [
  '这把牌不错啊',
  '看我怎么打',
  '哈哈，有意思',
  '这把要小心了',
  '运气不错',
  '看我的',
  '这把稳了',
  '有点紧张',
  '慢慢来',
  '不急不急',
  '好牌啊',
  '这把有意思',
  '看谁厉害',
  '加油加油',
  '这把要赢'
];

// 随机闲聊内容（粤语）
const randomChatCantonese = [
  '呢把牌几好喔',
  '睇我点打',
  '哈哈，有啲意思',
  '呢把要小心啲',
  '运气几好',
  '睇我嘅',
  '呢把稳阵',
  '有啲紧张',
  '慢慢嚟',
  '唔急唔急',
  '好牌啊',
  '呢把有啲意思',
  '睇边个犀利',
  '加油加油',
  '呢把要赢'
];

// 大墩出现（惊讶，其他人看到时的反应）
const bigDunReactions = {
  mandarin: [
    '哇！这么大的墩！',
    '天啊，这么多张！',
    '太厉害了！',
    '这墩好大！',
    '厉害厉害！',
    '这墩真大！',
    '哇塞！',
    '不得了！',
    '我的天！',
    '这么大！',
    '太夸张了！',
    '这怎么打！'
  ],
  cantonese: [
    '哇！咁大嘅墩！',
    '天啊，咁多张！',
    '太犀利啦！',
    '呢墩好大！',
    '犀利犀利！',
    '呢墩真大！',
    '哇塞！',
    '不得了！',
    '我嘅天！',
    '咁大！',
    '太夸张啦！',
    '呢点打！'
  ]
};

// 分牌被捡走（抱怨）
const scoreStolenReactions = {
  mandarin: [
    '哎呀，我的分！',
    '我的分被捡走了！',
    '气死我了！',
    '我的分啊！',
    '太可惜了！',
    '分没了！',
    '哎呀呀！',
    '我的分牌！'
  ],
  cantonese: [
    '哎呀，我嘅分！',
    '我嘅分被捡走咗！',
    '激死我啦！',
    '我嘅分啊！',
    '太可惜啦！',
    '分冇咗！',
    '哎呀呀！',
    '我嘅分牌！'
  ]
};

// 分牌被吃（脏话，更激烈）
const scoreEatenCurseReactions = {
  mandarin: [
    '麻痹！我的分！',
    '卧槽！分被吃了！',
    '我靠！我的分啊！',
    '妈的！分没了！',
    '草！我的分牌！',
    '日！分被抢了！',
    '靠！气死我了！',
    '麻痹！太坑了！',
    '卧槽！我的分！',
    '妈的！分被吃了！'
  ],
  cantonese: [
    '顶！我嘅分！',
    '丢！分被吃咗！',
    '我靠！我嘅分啊！',
    '死！分冇咗！',
    '草！我嘅分牌！',
    '日！分被抢咗！',
    '靠！激死我啦！',
    '顶！太坑啦！',
    '丢！我嘅分！',
    '死！分被吃咗！'
  ]
};

// 催促出牌（对方一直不出牌）
const urgePlayReactions = {
  mandarin: [
    '快点出牌啊！',
    '赶紧的！',
    '快点快点！',
    '别磨蹭了！',
    '快出牌！',
    '等什么呢！',
    '快点啊！',
    '别想了，快出！',
    '赶紧出牌！',
    '快点打！',
    '别拖了！',
    '快一点！'
  ],
  cantonese: [
    '快啲出牌啊！',
    '赶紧啲！',
    '快啲快啲！',
    '唔好磨蹭啦！',
    '快出牌！',
    '等咩啊！',
    '快啲啊！',
    '唔好想啦，快出！',
    '赶紧出牌！',
    '快啲打！',
    '唔好拖啦！',
    '快一啲！'
  ]
};

// 好牌（开心）
const goodPlayReactions = {
  mandarin: [
    '好牌！',
    '这手不错！',
    '漂亮！',
    '打得好！',
    '厉害！',
    '好！',
    '不错不错！',
    '这手可以！'
  ],
  cantonese: [
    '好牌！',
    '呢手几好！',
    '靓！',
    '打得几好！',
    '犀利！',
    '好！',
    '几好几好！',
    '呢手可以！'
  ]
};

// 头名出完牌（兴奋）
const finishFirstReactions = {
  mandarin: [
    '老娘第一名！',
    '哈哈，我第一！',
    '第一名！爽！',
    '我赢了！',
    '第一名到手！',
    '太棒了！第一！',
    '哈哈哈，第一！',
    '第一名！'
  ],
  cantonese: [
    '我第一！',
    '哈哈，我第一！',
    '第一！爽！',
    '我赢咗！',
    '第一到手！',
    '太棒啦！第一！',
    '哈哈哈，第一！',
    '第一！'
  ]
};

// 中间名次出完牌（感慨）
const finishMiddleReactions = {
  mandarin: [
    '烦死了！',
    '唉，就这样吧',
    '终于出完了',
    '累死了',
    '总算出完了',
    '唉，没办法',
    '就这样吧',
    '出完了'
  ],
  cantonese: [
    '烦死啦！',
    '唉，就咁啦',
    '终于出完咗',
    '累死啦',
    '总算出完咗',
    '唉，冇办法',
    '就咁啦',
    '出完咗'
  ]
};

// 出墩时的得意话
const dunPlayedReactions = {
  mandarin: [
    '怕怕了把！',
    '看我的大墩！',
    '哈哈，大墩！',
    '这墩够大吧！',
    '怕了吧！',
    '大墩来了！',
    '看你们怎么打！',
    '这墩够你们受的！'
  ],
  cantonese: [
    '怕怕咗把！',
    '睇我嘅大墩！',
    '哈哈，大墩！',
    '呢墩够大吧！',
    '怕咗吧！',
    '大墩嚟啦！',
    '睇你哋点打！',
    '呢墩够你哋受嘅！'
  ]
};

// 对骂内容（普通话）
const tauntMandarin = [
  '你不行啊',
  '太弱了',
  '就这？',
  '你打不过我的',
  '太菜了',
  '看我怎么收拾你',
  '你完了',
  '这把我要赢',
  '你输定了',
  '太简单了',
  '你不行',
  '看我的厉害',
  '你太弱了',
  '这把稳赢',
  '你等着瞧'
];

// 对骂内容（粤语）
const tauntCantonese = [
  '你唔得啊',
  '太弱啦',
  '就咁？',
  '你打不过我嘅',
  '太菜啦',
  '睇我点收拾你',
  '你完咗',
  '呢把我要赢',
  '你输定咗',
  '太简单啦',
  '你唔得',
  '睇我嘅犀利',
  '你太弱啦',
  '呢把稳赢',
  '你等住睇'
];

// 默认内容（用于未实现的事件类型）
const defaultContent: ChatContentMap = {
  mandarin: ['不错', '好的', '可以'],
  cantonese: ['几好', '可以', 'OK']
};

// 聊天内容库映射
const chatContentLibrary: Partial<Record<ChatEventType | 'taunt', ChatContentMap>> = {
  [ChatEventType.RANDOM]: {
    mandarin: randomChatMandarin,
    cantonese: randomChatCantonese
  },
  [ChatEventType.BIG_DUN]: bigDunReactions,
  [ChatEventType.SCORE_STOLEN]: scoreStolenReactions,
  [ChatEventType.SCORE_EATEN_CURSE]: scoreEatenCurseReactions,
  [ChatEventType.GOOD_PLAY]: goodPlayReactions,
  [ChatEventType.FINISH_FIRST]: finishFirstReactions,
  [ChatEventType.FINISH_MIDDLE]: finishMiddleReactions,
  [ChatEventType.DUN_PLAYED]: dunPlayedReactions,
  [ChatEventType.URGE_PLAY]: urgePlayReactions,
  taunt: {
    mandarin: tauntMandarin,
    cantonese: tauntCantonese
  }
};

// 从内容列表中随机选择
function getRandomFromList(list: string[]): string {
  if (!list || list.length === 0) {
    return '';
  }
  return list[Math.floor(Math.random() * list.length)];
}

// 将 ChatEventType 映射到 i18n 键名
function getI18nKey(eventType: ChatEventType, dialect: Dialect): string {
  const keyMap: Record<ChatEventType, string> = {
    [ChatEventType.RANDOM]: dialect === 'cantonese' ? 'randomCantonese' : 'random',
    [ChatEventType.BIG_DUN]: dialect === 'cantonese' ? 'bigDunCantonese' : 'bigDun',
    [ChatEventType.SCORE_STOLEN]: dialect === 'cantonese' ? 'scoreStolenCantonese' : 'scoreStolen',
    [ChatEventType.SCORE_EATEN_CURSE]: dialect === 'cantonese' ? 'scoreEatenCurseCantonese' : 'scoreEatenCurse',
    [ChatEventType.GOOD_PLAY]: dialect === 'cantonese' ? 'goodPlayCantonese' : 'goodPlay',
    [ChatEventType.FINISH_FIRST]: dialect === 'cantonese' ? 'finishFirstCantonese' : 'finishFirst',
    [ChatEventType.FINISH_MIDDLE]: dialect === 'cantonese' ? 'finishMiddleCantonese' : 'finishMiddle',
    [ChatEventType.DUN_PLAYED]: dialect === 'cantonese' ? 'dunPlayedCantonese' : 'dunPlayed',
    [ChatEventType.URGE_PLAY]: dialect === 'cantonese' ? 'urgePlayCantonese' : 'urgePlay',
    // 其他事件类型使用默认内容
    [ChatEventType.BAD_LUCK]: 'default',
    [ChatEventType.WINNING]: 'default',
    [ChatEventType.LOSING]: 'default',
    [ChatEventType.FINISH_LAST]: 'default',
    [ChatEventType.DEALING]: 'default',
    [ChatEventType.DEALING_GOOD_CARD]: 'default',
    [ChatEventType.DEALING_BAD_CARD]: 'default',
    [ChatEventType.DEALING_BOMB_FORMED]: 'default',
    [ChatEventType.DEALING_DUN_FORMED]: 'default',
    [ChatEventType.DEALING_HUGE_CARD]: 'default',
    [ChatEventType.DEALING_POOR_HAND]: 'default',
  };
  return keyMap[eventType] || 'default';
}

// 根据事件类型和方言获取聊天内容（使用 i18n）
export function getChatContent(
  eventType: ChatEventType,
  dialect: Dialect,
  isTaunt: boolean = false
): string {
  const currentLang = i18n.language || 'zh-CN';
  
  // 对骂内容
  if (isTaunt) {
    // 如果当前语言是中文，支持 mandarin 和 cantonese 的区别
    // 否则使用当前语言的 taunt 内容
    let key = 'taunt';
    if (currentLang.startsWith('zh')) {
      key = dialect === 'cantonese' ? 'tauntCantonese' : 'taunt';
    }
    
    const content = i18n.t(`chat:${key}`, { returnObjects: true }) as string[];
    if (Array.isArray(content) && content.length > 0) {
      return getRandomFromList(content);
    }
    // 回退到旧的内容库
    const contentMap = chatContentLibrary.taunt;
    return getRandomFromList(contentMap[dialect]);
  }

  // 事件触发内容 - 使用 i18n
  // 如果当前语言是中文，支持 mandarin 和 cantonese 的区别
  // 否则使用当前语言的对应内容
  let i18nKey = getI18nKey(eventType, dialect);
  if (!currentLang.startsWith('zh')) {
    // 非中文语言，使用标准键名（不带 Cantonese 后缀）
    i18nKey = getI18nKey(eventType, 'mandarin').replace('Cantonese', '');
  }
  
  const content = i18n.t(`chat:${i18nKey}`, { returnObjects: true }) as string[];
  
  if (Array.isArray(content) && content.length > 0) {
    return getRandomFromList(content);
  }

  // 回退到旧的内容库（兼容性，仅中文）
  if (currentLang.startsWith('zh')) {
  const contentMap = chatContentLibrary[eventType] || chatContentLibrary[ChatEventType.RANDOM] || defaultContent;
  return getRandomFromList(contentMap[dialect]);
  }
  
  // 非中文语言，使用默认内容
  const defaultContentArray = i18n.t('chat:default', { returnObjects: true }) as string[];
  if (Array.isArray(defaultContentArray) && defaultContentArray.length > 0) {
    return getRandomFromList(defaultContentArray);
  }
  
  return 'OK';
}

// 获取随机闲聊内容
export function getRandomChat(dialect: Dialect): string {
  return getChatContent(ChatEventType.RANDOM, dialect);
}

// 获取对骂内容
export function getTaunt(dialect: Dialect): string {
  return getChatContent(ChatEventType.RANDOM, dialect, true);
}

// 获取指定事件类型的所有内容（用于测试和调试）
export function getAllContentForEvent(eventType: ChatEventType, dialect: Dialect): string[] {
  // 尝试从 i18n 获取
  const i18nKey = getI18nKey(eventType, dialect);
  const content = i18n.t(`chat:${i18nKey}`, { returnObjects: true }) as string[];
  
  if (Array.isArray(content) && content.length > 0) {
    return [...content];
  }

  // 回退到旧的内容库
  const contentMap = chatContentLibrary[eventType] || chatContentLibrary[ChatEventType.RANDOM] || defaultContent;
  if (!contentMap) {
    return [...defaultContent[dialect]];
  }
  return [...contentMap[dialect]];
}

