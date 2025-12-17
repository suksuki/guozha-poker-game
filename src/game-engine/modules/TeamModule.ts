/**
 * TeamModule - 团队管理模块（纯函数）
 * 
 * 从 src/utils/teamManager.ts 和 src/utils/teamScoring.ts 复用
 * 类型从 src/types/team.ts 导入
 */

// 类型定义（从types导入）
export type { TeamConfig, Team, TeamRanking } from '../../types/team';

// 团队管理函数
export {
  createTeamConfig4Players,
  createTeamConfig6Players,
  getPlayerTeamId,
  getTeam,
  updateTeamScore
} from '../../utils/teamManager';

// 团队计分函数
export {
  calculatePlayerPickedScore,
  calculatePlayerDunScore,
  calculateTeamScore,
  calculateTeamDunCount,
  calculateTeamRankings
} from '../../utils/teamScoring';

