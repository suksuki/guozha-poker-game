// 聊天场景类型
export enum ChatScene {
  SPONTANEOUS = 'spontaneous', // 自发聊天（纯闲聊）
  EVENT_DRIVEN = 'event-driven', // 事件触发聊天（基于游戏事件）
  TAUNT = 'taunt' // 对骂（特殊场景）
}

// 聊天消息类型
export interface ChatMessage {
  playerId: number;
  playerName: string;
  content: string;
  timestamp: number;
  type: 'random' | 'event' | 'taunt'; // 随机闲聊、事件触发、对骂（保持向后兼容）
  scene?: ChatScene; // 场景类型（新增，用于场景化处理）
  eventType?: ChatEventType; // 如果是事件触发，记录具体事件类型
  originalContent?: string; // 原文（如果经过翻译）
  civility?: number; // 文明程度（语音播放会用到）
  replyTo?: {
    playerId: number; // 被回复的玩家ID
    playerName: string; // 被回复的玩家名称
    content: string; // 被回复的消息内容
    timestamp: number; // 被回复的消息时间戳
  }; // 如果是回复消息，记录被回复的消息信息
}

// 聊天事件类型
export enum ChatEventType {
  RANDOM = 'random', // 随机闲聊
  BIG_DUN = 'big_dun', // 大墩出现
  SCORE_STOLEN = 'score_stolen', // 分牌被捡走
  SCORE_EATEN_CURSE = 'score_eaten_curse', // 分牌被吃（脏话）
  GOOD_PLAY = 'good_play', // 好牌
  BAD_LUCK = 'bad_luck', // 运气不好
  WINNING = 'winning', // 领先
  LOSING = 'losing', // 落后
  FINISH_FIRST = 'finish_first', // 第一个出完
  FINISH_MIDDLE = 'finish_middle', // 中间名次出完
  FINISH_LAST = 'finish_last', // 最后一个出完
  URGE_PLAY = 'urge_play', // 催促出牌
  DUN_PLAYED = 'dun_played', // 出墩时的得意话
  DEALING = 'dealing', // 发牌时的反应
  DEALING_GOOD_CARD = 'dealing_good_card', // 发到好牌
  DEALING_BAD_CARD = 'dealing_bad_card', // 发到差牌
  DEALING_BOMB_FORMED = 'dealing_bomb_formed', // 理牌时形成炸弹
  DEALING_DUN_FORMED = 'dealing_dun_formed', // 理牌时形成墩
  DEALING_HUGE_CARD = 'dealing_huge_card', // 理牌时抓到超大牌
  DEALING_POOR_HAND = 'dealing_poor_hand', // 理牌时手牌质量差
  TAUNT = 'TAUNT', // 对骂事件（兼容音频模块）
  QUICK_REACTION = 'QUICK_REACTION' // 快速反应（兼容音频模块）
}
