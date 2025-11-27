/**
 * 吵架王语音服务
 * 集成 DialogueScheduler 和 ttsAudioService，实现"吵架王对轰"效果
 * 
 * 特性：
 * 1. 最多2人同时说话（可配置）
 * 2. QUICK_JAB短插一句（≤1.5s）
 * 3. 主吵架左右声像分离（-0.35 / +0.35）
 * 4. 其他人随机pan分布（[-0.6, 0.6]）
 * 5. Ducking机制（降低其他角色音量）
 * 6. 错误处理和重试机制
 */

import { DialogueScheduler, Utter, Priority, Language } from '../audio/DialogueScheduler';
import { ttsAudioService } from './ttsAudioService';
import { ChannelType } from '../types/channel';
import { VoiceConfig } from '../types/card';
import { BeatsGenerator, BeatsGenerationContext } from '../ai/beatsGenerator';
import { LLMChatStrategy } from '../chat/strategy/LLMChatStrategy';
import { DEFAULT_LLM_CHAT_CONFIG } from '../config/chatConfig';

// QUICK_JAB最大时长（秒）
const QUICK_JAB_MAX_DURATION = 1.5;

// 重试配置
const RETRY_CONFIG = {
  maxRetries: 2,  // 最大重试次数
  retryDelay: 500,  // 重试延迟（毫秒）
};

// 预估文本时长（粗略估算：中文约3字/秒，英文约5字/秒）
function estimateDuration(text: string, lang: string = 'zh'): number {
  const chars = text.length;
  const charsPerSecond = lang.startsWith('zh') || lang === 'nanchang' ? 3 : 5;
  return chars / charsPerSecond;
}

// 主吵架双方的角色ID（动态更新）
let mainFightRoles: Set<string> = new Set();

// 角色pan值映射（用于随机分布）
const rolePanMap: Map<string, number> = new Map();

/**
 * 获取角色的pan值
 * 主吵架：-0.35 / +0.35
 * 其他人：随机分布 [-0.6, 0.6]
 */
function getRolePan(roleId: string, isMainFight: boolean = false): number {
  // 如果已有pan值，直接返回
  if (rolePanMap.has(roleId)) {
    return rolePanMap.get(roleId)!;
  }

  let pan: number;
  if (isMainFight) {
    // 主吵架：左右分离
    const mainFightArray = Array.from(mainFightRoles);
    const index = mainFightArray.indexOf(roleId);
    if (index === 0) {
      pan = -0.35;
    } else if (index === 1) {
      pan = 0.35;
    } else {
      // 如果主吵架超过2人，随机分布
      pan = (Math.random() - 0.5) * 0.7; // -0.35 到 0.35
    }
  } else {
    // 其他人：随机分布 [-0.6, 0.6]
    pan = (Math.random() - 0.5) * 1.2; // -0.6 到 0.6
  }

  rolePanMap.set(roleId, pan);
  return pan;
}

/**
 * 更新主吵架角色
 */
export function updateMainFightRoles(roleIds: string[]): void {
  mainFightRoles = new Set(roleIds);
  // 清除这些角色的pan值，让它们重新分配
  roleIds.forEach(roleId => rolePanMap.delete(roleId));
  console.log('[QuarrelVoiceService] 更新主吵架角色:', roleIds);
}

/**
 * 延迟函数
 */
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * 吵架王语音服务类
 */
class QuarrelVoiceService {
  private scheduler: DialogueScheduler;
  private beatsGenerator: BeatsGenerator;
  private llmStrategy: LLMChatStrategy | null = null;
  private isInitialized: boolean = false;
  private longTextThreshold: number = 40;  // 超过40字认为是长文本，需要分段
  private retryConfig = RETRY_CONFIG;

  constructor() {
    this.beatsGenerator = new BeatsGenerator();
    
    // 创建播放回调
    const playCallback = async (utter: Utter): Promise<void> => {
      await this.playUtterWithRetry(utter);
    };

    // 创建DialogueScheduler
    this.scheduler = new DialogueScheduler(playCallback, {
      maxConcurrent: 2,  // 最多2人同时说话
      quickJabMaxDuration: QUICK_JAB_MAX_DURATION,
      enableDucking: true,
      duckingLevel: 0.25
    });

    // 初始化LLM策略（可选，如果LLM不可用会跳过）
    try {
      this.llmStrategy = new LLMChatStrategy(DEFAULT_LLM_CHAT_CONFIG);
    } catch (error) {
      console.warn('[QuarrelVoiceService] LLM策略初始化失败，将使用回退方案:', error);
    }
  }

  /**
   * 初始化服务
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    // 确保ttsAudioService已初始化
    // ttsAudioService在构造函数中会自动初始化，这里只是确保
    this.isInitialized = true;
    console.log('[QuarrelVoiceService] 初始化完成');
  }

  /**
   * 带重试的播放方法
   */
  private async playUtterWithRetry(utter: Utter, retryCount: number = 0): Promise<void> {
    try {
      await this.playUtter(utter);
    } catch (error) {
      // 如果是最后一次重试，直接抛出错误
      if (retryCount >= this.retryConfig.maxRetries) {
        console.error(`[QuarrelVoiceService] 播放失败（已重试${retryCount}次）:`, error);
        throw error;
      }

      // 等待后重试
      console.warn(`[QuarrelVoiceService] 播放失败，${this.retryConfig.retryDelay}ms后重试 (${retryCount + 1}/${this.retryConfig.maxRetries}):`, error);
      await delay(this.retryConfig.retryDelay);
      return this.playUtterWithRetry(utter, retryCount + 1);
    }
  }

  /**
   * 播放一个话语
   */
  private async playUtter(utter: Utter): Promise<void> {
    try {
      // 检查QUICK_JAB时长限制
      if (utter.priority === 'QUICK_JAB') {
        const estimatedDuration = estimateDuration(utter.text, utter.lang);
        if (estimatedDuration > QUICK_JAB_MAX_DURATION) {
          console.warn(`[QuarrelVoiceService] QUICK_JAB文本过长（${estimatedDuration.toFixed(2)}s > ${QUICK_JAB_MAX_DURATION}s），截断`);
          // 截断文本：保留前N个字符，使得时长≤1.5s
          const maxChars = Math.floor(QUICK_JAB_MAX_DURATION * 3); // 假设3字/秒
          utter.text = utter.text.substring(0, maxChars) + '...';
        }
      }

      // 确定是否为主吵架
      const isMainFight = utter.priority === 'MAIN_FIGHT' || mainFightRoles.has(utter.roleId);
      
      // 将roleId映射到ChannelType（使用roleId的hash）
      const channel = this.getChannelFromRoleId(utter.roleId);

      // 获取pan值（用于动态调整声像位置）
      const pan = getRolePan(utter.roleId, isMainFight);
      
      // 动态设置声道的pan值
      ttsAudioService.setChannelPan(channel, pan);

      // 构建VoiceConfig（如果需要）
      const voiceConfig: VoiceConfig = {
        volume: utter.volume ?? 1.0,
        // 可以根据lang和civility设置其他参数
      };

      // 播放音频（通过ttsAudioService）
      // ttsAudioService内部会：
      // 1. 生成音频（使用TTS API）
      // 2. 通过WebAudio播放
      // 3. 应用ducking和panning
      await ttsAudioService.speak(
        utter.text,
        voiceConfig,
        channel,
        {
          onStart: utter.onStart,
          onEnd: utter.onEnd,
          onError: utter.onError
        },
        this.priorityToNumber(utter.priority)
      );

      // 注意：ttsAudioService内部会处理ducking，这里不需要额外处理
      // 但是pan值需要动态设置，这需要在ttsAudioService中支持
      // 目前先使用固定的channel pan值
    } catch (error) {
      console.error('[QuarrelVoiceService] 播放失败:', error);
      if (utter.onError) {
        utter.onError(error as Error);
      }
      throw error;
    }
  }

  /**
   * 将roleId映射到ChannelType
   */
  private getChannelFromRoleId(roleId: string): ChannelType {
    // 使用roleId的hash值映射到0-7
    let hash = 0;
    for (let i = 0; i < roleId.length; i++) {
      hash = ((hash << 5) - hash) + roleId.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    const channelIndex = Math.abs(hash) % 8;
    return channelIndex as ChannelType;
  }

  /**
   * 将Priority转换为数字
   */
  private priorityToNumber(priority: Priority): number {
    switch (priority) {
      case 'MAIN_FIGHT':
        return 3;
      case 'QUICK_JAB':
        return 2;
      case 'NORMAL_CHAT':
        return 1;
      default:
        return 1;
    }
  }

  /**
   * 提交话语
   * 如果是长文本，会自动分段播放
   */
  async submitUtter(utter: Utter): Promise<void> {
    if (!this.isInitialized) {
      await this.init();
    }

    // 检查是否是长文本（需要分段）
    if (utter.text.length > this.longTextThreshold && utter.priority === 'MAIN_FIGHT') {
      // 长吵架：先生成beats，然后分段播放
      await this.submitLongQuarrel(utter);
    } else {
      // 短文本：直接提交
      this.scheduler.submit(utter);
    }
  }

  /**
   * 提交长吵架（分段播放）
   */
  private async submitLongQuarrel(utter: Utter): Promise<void> {
    try {
      // 生成beats结构
      const context: BeatsGenerationContext = {
        scene: 'quarrel',
        targetLength: utter.text.length,
        civility: utter.civility,
        opponentLastUtterance: undefined  // 可以从上下文获取
      };

      // 先生成beats结构（不包含segments）
      const beatsStructure = await this.beatsGenerator.generateBeats(context);

      // 如果有segments，直接使用
      if (beatsStructure.segments && beatsStructure.segments.length > 0) {
        for (const segment of beatsStructure.segments) {
          const segmentUtter: Utter = {
            ...utter,
            text: segment.text,
            priority: utter.priority,
          };
          this.scheduler.submit(segmentUtter);
        }
        return;
      }

      // 如果没有segments，尝试使用LLM生成
      const segments = await this.generateSegmentsWithLLM(utter, beatsStructure, context);
      if (segments && segments.length > 0) {
        for (const segmentText of segments) {
          const segmentUtter: Utter = {
            ...utter,
            text: segmentText.trim(),
            priority: utter.priority,
          };
          this.scheduler.submit(segmentUtter);
        }
        return;
      }

      // 如果LLM生成失败，回退到按标点符号分段
      const fallbackSegments = this.splitByPunctuation(utter.text);
      if (fallbackSegments.length > 0) {
        for (const segmentText of fallbackSegments) {
          const segmentUtter: Utter = {
            ...utter,
            text: segmentText.trim(),
            priority: utter.priority,
          };
          this.scheduler.submit(segmentUtter);
        }
        return;
      }

      // 如果所有分段方法都失败，直接提交原文本
      console.warn('[QuarrelVoiceService] 所有分段方法都失败，直接提交原文本');
      this.scheduler.submit(utter);
    } catch (error) {
      console.error('[QuarrelVoiceService] 长吵架分段失败，回退到直接播放:', error);
      // 回退：直接提交原文本
      this.scheduler.submit(utter);
    }
  }

  /**
   * 使用LLM生成segments（带重试）
   */
  private async generateSegmentsWithLLM(
    utter: Utter,
    beatsStructure: { beats: any[] },
    context: BeatsGenerationContext,
    retryCount: number = 0
  ): Promise<string[] | null> {
    if (!this.llmStrategy) {
      console.warn('[QuarrelVoiceService] LLM策略不可用，跳过segments生成');
      return null;
    }

    try {
      // 生成prompt
      const prompt = this.beatsGenerator.generateBeatsPrompt(context);
      
      // 调用LLM（使用私有方法，需要类型断言）
      // @ts-ignore - 访问私有方法
      const response = await this.llmStrategy.callLLMAPI(prompt, 1);

      if (!response || !response.trim()) {
        console.warn('[QuarrelVoiceService] LLM返回空响应');
        return null;
      }

      // 解析LLM响应
      const parsed = this.beatsGenerator.parseLLMResponse(response);
      if (parsed && parsed.segments && parsed.segments.length > 0) {
        // 按beat_index排序
        const sortedSegments = parsed.segments
          .sort((a, b) => a.beat_index - b.beat_index)
          .map(s => s.text);
        console.log('[QuarrelVoiceService] LLM生成segments成功:', sortedSegments);
        return sortedSegments;
      }

      return null;
    } catch (error) {
      // 如果是最后一次重试，返回null
      if (retryCount >= this.retryConfig.maxRetries) {
        console.error(`[QuarrelVoiceService] LLM生成segments失败（已重试${retryCount}次）:`, error);
        return null;
      }

      // 等待后重试
      console.warn(`[QuarrelVoiceService] LLM生成segments失败，${this.retryConfig.retryDelay}ms后重试 (${retryCount + 1}/${this.retryConfig.maxRetries}):`, error);
      await delay(this.retryConfig.retryDelay);
      return this.generateSegmentsWithLLM(utter, beatsStructure, context, retryCount + 1);
    }
  }

  /**
   * 按标点符号分段（简单实现）
   */
  private splitByPunctuation(text: string): string[] {
    // 按句号、问号、感叹号分段
    const segments = text.split(/[。！？]/).filter(s => s.trim().length > 0);
    return segments;
  }

  /**
   * 停止所有播放
   */
  stopAll(): void {
    this.scheduler.stopAll();
    // ttsAudioService的stop方法需要实现
  }

  /**
   * 停止指定角色
   */
  stopRole(roleId: string): void {
    this.scheduler.cancelRole(roleId);
  }

  /**
   * 获取正在播放的角色列表
   */
  getPlayingRoles(): string[] {
    return this.scheduler.getPlayingRoles();
  }

  /**
   * 获取队列长度
   */
  getQueueLength(): number {
    return this.scheduler.getQueueLength();
  }

  /**
   * 清空队列
   */
  clearQueue(): void {
    this.scheduler.clearQueue();
  }

  /**
   * 更新配置
   */
  updateConfig(config: {
    maxConcurrent?: number;
    quickJabMaxDuration?: number;
    enableDucking?: boolean;
    duckingLevel?: number;
    longTextThreshold?: number;
    maxRetries?: number;
    retryDelay?: number;
  }): void {
    // 注意：DialogueScheduler的配置在创建时设置，这里只能更新部分参数
    if (config.longTextThreshold !== undefined) {
      this.longTextThreshold = config.longTextThreshold;
    }
    if (config.maxRetries !== undefined) {
      this.retryConfig.maxRetries = config.maxRetries;
    }
    if (config.retryDelay !== undefined) {
      this.retryConfig.retryDelay = config.retryDelay;
    }
    console.log('[QuarrelVoiceService] 配置已更新:', config);
  }

  /**
   * 获取当前配置
   */
  getConfig(): {
    maxConcurrent: number;
    quickJabMaxDuration: number;
    enableDucking: boolean;
    duckingLevel: number;
    longTextThreshold: number;
    maxRetries: number;
    retryDelay: number;
  } {
    return {
      maxConcurrent: 2,  // 从DialogueScheduler获取
      quickJabMaxDuration: QUICK_JAB_MAX_DURATION,
      enableDucking: true,
      duckingLevel: 0.25,
      longTextThreshold: this.longTextThreshold,
      maxRetries: this.retryConfig.maxRetries,
      retryDelay: this.retryConfig.retryDelay,
    };
  }

  /**
   * 获取服务状态
   */
  getStatus(): {
    initialized: boolean;
    playingRoles: string[];
    queueLength: number;
    hasLLM: boolean;
  } {
    return {
      initialized: this.isInitialized,
      playingRoles: this.getPlayingRoles(),
      queueLength: this.getQueueLength(),
      hasLLM: this.llmStrategy !== null,
    };
  }
}

// 单例实例
let quarrelVoiceServiceInstance: QuarrelVoiceService | null = null;

/**
 * 获取QuarrelVoiceService单例
 */
export function getQuarrelVoiceService(): QuarrelVoiceService {
  if (!quarrelVoiceServiceInstance) {
    quarrelVoiceServiceInstance = new QuarrelVoiceService();
  }
  return quarrelVoiceServiceInstance;
}

// 导出类型和函数
export { QuarrelVoiceService };
export type { Utter, Priority, Language };
