/**
 * 验证模块
 * 统一管理所有验证逻辑
 */

import { SystemModule, SystemContext, ModuleStatus } from '../../types/SystemModule';
import { ValidationConfig } from '../../types/SystemConfig';
import { ValidationContext, ValidationResult, CardValidationResult, ScoreValidationResult } from './types';
import { validateCardIntegrityCore } from './validators/cardIntegrityValidator';
import { validateScoreIntegrityCore } from './validators/scoreIntegrityValidator';

export class ValidationModule implements SystemModule {
  name = 'validation';
  dependencies = []; // 事件模块是可选的，不强制依赖
  
  private config: ValidationConfig | null = null;
  private context: SystemContext | null = null;
  private initialized = false;
  private enabled = true;
  private errorCallbacks: Array<(result: ValidationResult) => void> = [];
  
  async initialize(config: ValidationConfig, context: SystemContext): Promise<void> {
    this.config = config;
    this.context = context;
    this.enabled = config.enabled;
    this.initialized = true;
  }
  
  configure(config: Partial<ValidationConfig>): void {
    if (this.config) {
      // 深度合并配置
      this.config = {
        ...this.config,
        ...config,
        // 深度合并嵌套对象
        cardIntegrity: config.cardIntegrity 
          ? { ...this.config.cardIntegrity, ...config.cardIntegrity }
          : this.config.cardIntegrity,
        scoreIntegrity: config.scoreIntegrity
          ? { ...this.config.scoreIntegrity, ...config.scoreIntegrity }
          : this.config.scoreIntegrity,
        output: config.output
          ? {
              ...this.config.output,
              ...config.output,
              console: config.output.console
                ? { ...this.config.output.console, ...config.output.console }
                : this.config.output.console,
              events: config.output.events
                ? { ...this.config.output.events, ...config.output.events }
                : this.config.output.events,
              errorHandling: config.output.errorHandling
                ? { ...this.config.output.errorHandling, ...config.output.errorHandling }
                : this.config.output.errorHandling,
            }
          : this.config.output,
      };
      this.enabled = this.config.enabled ?? this.enabled;
    }
  }
  
  async shutdown(): Promise<void> {
    this.errorCallbacks = [];
    this.initialized = false;
    this.config = null;
    this.context = null;
  }
  
  getStatus(): ModuleStatus {
    return {
      initialized: this.initialized,
      enabled: this.enabled,
    };
  }
  
  isEnabled(): boolean {
    return this.enabled && this.initialized;
  }
  
  /**
   * 验证牌数完整性
   */
  validateCardIntegrity(context: ValidationContext): ValidationResult {
    if (!this.isEnabled() || !this.config) {
      return this.createDisabledResult(context);
    }
    
    // 检查是否应该执行验证
    if (!this.shouldValidate(context)) {
      return this.createSkippedResult(context, '验证已禁用或不符合验证时机');
    }
    
    const result = validateCardIntegrityCore(
      context.players,
      context.allRounds,
      context.currentRoundPlays || [],
      context.initialHands,
      {
        detectDuplicates: this.config.cardIntegrity.detectDuplicates,
        logDetails: this.config.output.console.detailed,
        errorPrefix: '牌数不完整'
      }
    );
    
    return this.processCardValidationResult(result, context);
  }
  
  /**
   * 验证分数完整性
   */
  validateScoreIntegrity(context: ValidationContext): ValidationResult {
    if (!this.isEnabled() || !this.config) {
      return this.createDisabledResult(context);
    }
    
    const result = validateScoreIntegrityCore(
      context.players,
      context.initialHands,
      this.config.scoreIntegrity.tolerance
    );
    
    return this.processScoreValidationResult(result, context);
  }
  
  /**
   * 验证轮次结束
   */
  validateRoundEnd(context: ValidationContext): ValidationResult {
    if (!this.isEnabled() || !this.config) {
      return this.createDisabledResult(context);
    }
    
    if (!this.config.validateOnRoundEnd) {
      return this.createSkippedResult(context, '轮次结束验证已禁用');
    }
    
    return this.validateCardIntegrity(context);
  }
  
  /**
   * 验证游戏结束
   */
  validateGameEnd(context: ValidationContext): ValidationResult[] {
    if (!this.isEnabled() || !this.config) {
      return [this.createDisabledResult(context)];
    }
    
    if (!this.config.validateOnGameEnd) {
      return [this.createSkippedResult(context, '游戏结束验证已禁用')];
    }
    
    const results: ValidationResult[] = [];
    
    // 验证牌数完整性
    if (this.config.cardIntegrity.enabled) {
      results.push(this.validateCardIntegrity(context));
    }
    
    // 验证分数完整性
    if (this.config.scoreIntegrity.enabled) {
      results.push(this.validateScoreIntegrity(context));
    }
    
    return results;
  }
  
  /**
   * 订阅验证错误
   */
  onValidationError(callback: (result: ValidationResult) => void): () => void {
    this.errorCallbacks.push(callback);
    
    return () => {
      const index = this.errorCallbacks.indexOf(callback);
      if (index > -1) {
        this.errorCallbacks.splice(index, 1);
      }
    };
  }
  
  /**
   * 检查是否应该执行验证
   */
  private shouldValidate(context: ValidationContext): boolean {
    if (!this.config) return false;
    
    switch (context.trigger) {
      case 'roundEnd':
        return this.config.validateOnRoundEnd;
      case 'gameEnd':
        return this.config.validateOnGameEnd;
      case 'afterPlay':
        return this.config.validateAfterPlay;
      case 'manual':
        return true;
      default:
        return false;
    }
  }
  
  /**
   * 处理牌数验证结果
   */
  private processCardValidationResult(
    result: CardValidationResult,
    context: ValidationContext
  ): ValidationResult {
    const validationResult: ValidationResult = {
      isValid: result.isValid,
      validatorName: 'cardIntegrity',
      timestamp: context.timestamp || Date.now(),
      context,
      details: result,
      stats: {
        totalCardsExpected: result.totalCardsExpected,
        totalCardsFound: result.totalCardsFound,
        missingCards: result.missingCards,
        duplicateCardsCount: result.duplicateCards.length
      }
    };
    
    if (!result.isValid && result.errorMessage) {
      validationResult.errorMessage = result.errorMessage;
      validationResult.errors = [{
        type: 'cardIntegrity',
        message: result.errorMessage,
        details: result
      }];
      
      // 通知错误回调
      this.notifyError(validationResult);
      
      // 输出日志
      this.handleValidationFailure(validationResult);
      
      // 触发事件
      if (this.config?.output.events.dispatchCustomEvents) {
        this.dispatchValidationEvent('cardValidationError', validationResult);
      }
    } else {
      // 验证通过，输出日志
      this.handleValidationSuccess(validationResult);
    }
    
    return validationResult;
  }
  
  /**
   * 处理分数验证结果
   */
  private processScoreValidationResult(
    result: ScoreValidationResult,
    context: ValidationContext
  ): ValidationResult {
    const validationResult: ValidationResult = {
      isValid: result.isValid,
      validatorName: 'scoreIntegrity',
      timestamp: context.timestamp || Date.now(),
      context,
      details: result,
      stats: {
        totalScore: result.totalScore,
        expectedTotalScore: result.expectedTotalScore,
        scoreDifference: result.scoreDifference
      }
    };
    
    if (!result.isValid && result.errorMessage) {
      validationResult.errorMessage = result.errorMessage;
      validationResult.errors = [{
        type: 'scoreIntegrity',
        message: result.errorMessage,
        details: result
      }];
      
      // 通知错误回调
      this.notifyError(validationResult);
      
      // 输出日志
      this.handleValidationFailure(validationResult);
      
      // 触发事件
      if (this.config?.output.events.dispatchCustomEvents) {
        this.dispatchValidationEvent('scoreValidationError', validationResult);
      }
    } else {
      // 验证通过，输出日志
      this.handleValidationSuccess(validationResult);
    }
    
    return validationResult;
  }
  
  /**
   * 通知验证错误
   */
  private notifyError(result: ValidationResult): void {
    for (const callback of this.errorCallbacks) {
      try {
        callback(result);
      } catch (error) {
      }
    }
  }
  
  /**
   * 处理验证失败
   */
  private handleValidationFailure(result: ValidationResult): void {
    if (!this.config?.output.console.enabled) return;
    
    const level = this.config.output.console.level;
    if (level === 'none') return;
    
    const logData = {
      validator: result.validatorName,
      error: result.errorMessage,
      context: result.context.context || result.context.trigger,
      details: result.details,
      stats: result.stats
    };
    
    if (level === 'error' || level === 'warn') {
    } else if (level === 'info' || level === 'debug') {
    }
    
    // 如果配置要求抛出异常
    if (this.config?.output.errorHandling.throwOnError) {
      throw new Error(result.errorMessage || '验证失败');
    }
  }
  
  /**
   * 处理验证成功
   */
  private handleValidationSuccess(result: ValidationResult): void {
    if (!this.config?.output.console.enabled) return;
    
    const level = this.config.output.console.level;
    if (level === 'none' || level === 'error') return;
    
    if (level === 'info' || level === 'debug') {
    }
  }
  
  /**
   * 触发验证事件
   */
  private dispatchValidationEvent(eventName: string, result: ValidationResult): void {
    window.dispatchEvent(new CustomEvent(eventName, {
      detail: {
        message: result.errorMessage || '验证失败',
        result,
        details: result.details,
        stats: result.stats
      }
    }));
  }
  
  /**
   * 创建禁用结果
   */
  private createDisabledResult(context: ValidationContext): ValidationResult {
    return {
      isValid: true, // 禁用时认为通过
      validatorName: 'disabled',
      timestamp: context.timestamp || Date.now(),
      context
    };
  }
  
  /**
   * 创建跳过结果
   */
  private createSkippedResult(context: ValidationContext, reason: string): ValidationResult {
    return {
      isValid: true,
      validatorName: 'skipped',
      timestamp: context.timestamp || Date.now(),
      context,
      errorMessage: reason
    };
  }
}

