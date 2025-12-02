/**
 * QuarrelVoiceService 统一导出
 * 方便其他模块导入使用
 */

// 服务类
export { getQuarrelVoiceService, updateMainFightRoles, QuarrelVoiceService } from './services/quarrelVoiceService';

// 类型
export type { Utter, Priority, Language } from './services/quarrelVoiceService';

// React Hook
export { useQuarrelVoice, playerToRoleId, playersToRoleIds } from './hooks/useQuarrelVoice';
export type { UseQuarrelVoiceOptions, UseQuarrelVoiceReturn } from './hooks/useQuarrelVoice';

// 辅助工具
export {
  getRoleIdFromPlayer,
  getRoleIdsFromPlayers,
  detectLanguageForQuarrel,
  getPriorityFromEventType,
  createUtterFromChatMessage,
  submitChatMessageToQuarrel,
  handleQuarrelScene,
  handleQuickJab,
} from './utils/quarrelVoiceHelper';

// 调试工具
export {
  getQuarrelVoiceDebugInfo,
  printQuarrelVoiceDebugInfo,
  startQuarrelVoiceMonitoring,
  testQuarrelVoiceService,
  exposeQuarrelVoiceDebugTools,
} from './utils/quarrelVoiceDebug';
export type { QuarrelVoiceDebugInfo } from './utils/quarrelVoiceDebug';

