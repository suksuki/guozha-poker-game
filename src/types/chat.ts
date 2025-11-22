// 聊天消息类型
export interface ChatMessage {
  playerId: number;
  playerName: string;
  content: string;
  timestamp: number;
  type: 'random' | 'event' | 'taunt'; // 随机闲聊、事件触发、对骂
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
  DUN_PLAYED = 'dun_played' // 出墩时的得意话
}

