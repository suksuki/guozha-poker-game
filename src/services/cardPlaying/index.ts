/**
 * 打牌系统服务统一导出
 */

export { ValidationService, validationService } from './ValidationService';
export { CardSelectorService, cardSelectorService } from './CardSelectorService';
export { PlayExecutorService, playExecutorService } from './PlayExecutorService';
export { AISuggesterService, aiSuggesterService } from './AISuggesterService';
export { CardPlayingService, cardPlayingService } from './CardPlayingService';
export type { 
  ValidationResult, 
  ValidationOptions,
  SelectionResult,
  SelectionMode,
  CardSelectionState,
  RankSelectionState,
  PlayOptions,
  PlayResult,
  SuggestOptions,
  SuggestResult,
  CardPlayingServiceConfig
} from './types';

