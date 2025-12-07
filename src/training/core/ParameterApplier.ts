/**
 * 参数应用器
 * 负责将训练后的参数应用到实际的游戏算法中
 */

import { MCTSTrainingParams } from '../../types/training';
import { MCTSConfig } from '../../utils/mctsTuning';

export interface AppliedParams {
  mcts?: MCTSTrainingParams;
  appliedAt: number;
  version: string;
}

export class ParameterApplier {
  private static readonly STORAGE_KEY = 'trained_mcts_params';
  private static readonly VERSION = '1.0.0';
  
  /**
   * 应用训练后的MCTS参数
   */
  static applyMCTSParams(params: MCTSTrainingParams): void {
    try {
      const applied: AppliedParams = {
        mcts: params,
        appliedAt: Date.now(),
        version: this.VERSION
      };
      
      // 保存到localStorage
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(applied));
        console.log('[ParameterApplier] MCTS参数已应用:', params);
      }
    } catch (error) {
      console.error('[ParameterApplier] 应用参数失败:', error);
    }
  }
  
  /**
   * 获取已应用的MCTS参数
   */
  static getAppliedMCTSParams(): MCTSTrainingParams | null {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved) {
          const applied: AppliedParams = JSON.parse(saved);
          return applied.mcts || null;
        }
      }
    } catch (error) {
      console.error('[ParameterApplier] 读取参数失败:', error);
    }
    return null;
  }
  
  /**
   * 清除已应用的参数（恢复默认）
   */
  static clearAppliedParams(): void {
    try {
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.removeItem(this.STORAGE_KEY);
        console.log('[ParameterApplier] 已清除训练参数，恢复默认配置');
      }
    } catch (error) {
      console.error('[ParameterApplier] 清除参数失败:', error);
    }
  }
  
  /**
   * 将训练参数转换为MCTS配置
   */
  static toMCTSConfig(params: MCTSTrainingParams): MCTSConfig {
    return {
      iterations: params.iterations,
      explorationConstant: params.explorationConstant,
      simulationDepth: params.simulationDepth,
      perfectInformation: params.perfectInformation
    };
  }
  
  /**
   * 合并训练参数和默认配置
   */
  static mergeWithDefaults(
    trainedParams: MCTSTrainingParams | null,
    defaults: MCTSConfig
  ): MCTSConfig {
    if (!trainedParams) {
      return defaults;
    }
    
    return {
      ...defaults,
      iterations: trainedParams.iterations ?? defaults.iterations,
      explorationConstant: trainedParams.explorationConstant ?? defaults.explorationConstant,
      simulationDepth: trainedParams.simulationDepth ?? defaults.simulationDepth,
      perfectInformation: trainedParams.perfectInformation ?? defaults.perfectInformation
    };
  }
}

