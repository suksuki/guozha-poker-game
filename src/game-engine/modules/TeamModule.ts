/**
 * TeamModule - 团队管理模块（纯函数）
 * 
 * 从 src/utils/teamManager.ts 和 src/utils/teamScoring.ts 复用
 */

// 团队管理函数
export {
  createTeamConfig4Players,
  createTeamConfig6Players,
  getPlayerTeamId,
  getTeam,
  updateTeamScore,
  type TeamConfig,
  type Team
} from '../../utils/teamManager';

// 团队计分函数
export {
  calculatePlayerPickedScore,
  calculatePlayerDunScore,
  calculateTeamScore,
  calculateTeamDunCount,
  calculateTeamRankings,
  type TeamRanking
} from '../../utils/teamScoring';

