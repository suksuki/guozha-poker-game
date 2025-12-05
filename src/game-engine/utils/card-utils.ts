/**
 * 卡牌工具函数（纯函数）
 * 
 * 从 src/utils/cardUtils.ts 复用
 * 这些都是纯函数，可以100%复用
 */

// 直接导出所有纯函数
export {
  // 分值计算
  isScoreCard,
  getCardScore,
  calculateCardsScore,
  calculateDunCount,
  calculateDunScore,
  
  // 牌堆操作
  createDeck,
  shuffleDeck,
  dealCards,
  
  // 牌型判断
  canPlayCards,
  canBeat,
  findPlayableCards,
  getPlayType,
  
  // 卡牌比较
  compareCards,
  getRankValue,
  
  // 其他工具
  hasPlayableCards,
  sortCards,
  groupCardsByRank,
  groupCardsBySuit
} from '../../utils/cardUtils';

// 重新导出类型
export type { Play } from '../../types/card';

