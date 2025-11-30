/**
 * 验证模块 React Hook
 * 提供便捷的访问验证模块的方式
 */

import { useSystemApplication } from './useSystemApplication';
import { ValidationModule } from '../services/system/modules/validation/ValidationModule';
import type { ValidationContext, ValidationResult } from '../services/system/modules/validation/types';

export interface UseValidationModuleReturn {
  validationModule: ValidationModule | null;
  isReady: boolean;
  validateCardIntegrity: (context: ValidationContext) => ValidationResult;
  validateScoreIntegrity: (context: ValidationContext) => ValidationResult;
  validateRoundEnd: (context: ValidationContext) => ValidationResult;
  validateGameEnd: (context: ValidationContext) => ValidationResult[];
}

/**
 * 使用验证模块
 */
export function useValidationModule(): UseValidationModuleReturn {
  const { getModule, isInitialized } = useSystemApplication();
  const validationModule = getModule<ValidationModule>('validation');
  const isReady = isInitialized && !!validationModule;
  
  const validateCardIntegrity = (context: ValidationContext): ValidationResult => {
    if (!validationModule) {
      return {
        isValid: true,
        validatorName: 'disabled',
        timestamp: context.timestamp || Date.now(),
        context,
        errorMessage: '验证模块未初始化'
      };
    }
    return validationModule.validateCardIntegrity(context);
  };
  
  const validateScoreIntegrity = (context: ValidationContext): ValidationResult => {
    if (!validationModule) {
      return {
        isValid: true,
        validatorName: 'disabled',
        timestamp: context.timestamp || Date.now(),
        context,
        errorMessage: '验证模块未初始化'
      };
    }
    return validationModule.validateScoreIntegrity(context);
  };
  
  const validateRoundEnd = (context: ValidationContext): ValidationResult => {
    if (!validationModule) {
      return {
        isValid: true,
        validatorName: 'disabled',
        timestamp: context.timestamp || Date.now(),
        context,
        errorMessage: '验证模块未初始化'
      };
    }
    return validationModule.validateRoundEnd(context);
  };
  
  const validateGameEnd = (context: ValidationContext): ValidationResult[] => {
    if (!validationModule) {
      return [{
        isValid: true,
        validatorName: 'disabled',
        timestamp: context.timestamp || Date.now(),
        context,
        errorMessage: '验证模块未初始化'
      }];
    }
    return validationModule.validateGameEnd(context);
  };
  
  return {
    validationModule,
    isReady,
    validateCardIntegrity,
    validateScoreIntegrity,
    validateRoundEnd,
    validateGameEnd,
  };
}

