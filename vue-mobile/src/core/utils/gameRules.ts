/**
 * @deprecated 游戏规则逻辑已迁移至 `scoringService.ts`
 * 此文件保留作为类型定义引用，但在未来版本中将被完全移除。
 */

import { Player } from '@/core/types/card';

// 玩家排名信息 (保留此接口以兼容旧代码引用，虽然新的 scoringService 也有定义)
// 建议迁移到 @/core/types/scoring.ts 或统一使用 scoringService 中的定义
export interface PlayerRanking {
  player: Player;
  rank: number; // 排名（1表示第一名）
  finalScore: number; // 最终分数
}
