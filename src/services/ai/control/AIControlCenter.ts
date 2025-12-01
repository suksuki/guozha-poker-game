/**
 * AI中控系统核心类
 * 作为整个应用的"AI大脑"，监控、分析、优化系统
 */

import { AIControlConfig, AnalysisResult, OptimizationSuggestion, ResourceStatus } from './types';
import { MonitorLayer } from './layers/MonitorLayer';
import { AnalyzeLayer } from './layers/AnalyzeLayer';
import { ExecuteLayer } from './layers/ExecuteLayer';
import { KnowledgeBase } from './knowledge/KnowledgeBase';
import { DecisionEngine } from './decision/DecisionEngine';
import { EventBus } from './events/EventBus';
import { DataCollectionLayer } from './data/DataCollectionLayer';
import { LLMService } from './llm/LLMService';
import { LLMEvolutionLayer } from './llm/LLMEvolutionLayer';
import { AlgorithmEvolutionLayer } from './algorithm/AlgorithmEvolutionLayer';

/**
 * AI中控系统（单例）
 */
export class AIControlCenter {
  private static instance: AIControlCenter | null = null;
  
  private monitorLayer: MonitorLayer;
  private analyzeLayer: AnalyzeLayer;
  private executeLayer: ExecuteLayer;
  private knowledgeBase: KnowledgeBase;
  private decisionEngine: DecisionEngine;
  private eventBus: EventBus;
  private dataCollectionLayer: DataCollectionLayer;
  private llmService: LLMService | null = null;
  private llmEvolutionLayer: LLMEvolutionLayer | null = null;
  private algorithmEvolutionLayer: AlgorithmEvolutionLayer | null = null;
  
  private config: AIControlConfig;
  private initialized = false;
  private monitoring = false;
  
  private constructor() {
    // 初始化事件总线
    this.eventBus = new EventBus();
    
    // 初始化各层（延迟初始化，在initialize时创建）
    this.monitorLayer = null as any;
    this.analyzeLayer = null as any;
    this.executeLayer = null as any;
    this.knowledgeBase = null as any;
    this.decisionEngine = null as any;
  }
  
  /**
   * 获取单例实例
   */
  static getInstance(): AIControlCenter {
    if (!AIControlCenter.instance) {
      AIControlCenter.instance = new AIControlCenter();
    }
    return AIControlCenter.instance;
  }
  
  /**
   * 初始化AI中控系统
   */
  async initialize(config?: Partial<AIControlConfig>): Promise<void> {
    if (this.initialized) {
      console.warn('[AIControlCenter] 系统已经初始化');
      return;
    }
    
    try {
      console.log('[AIControlCenter] 开始初始化...');
      
      // 加载配置
      this.config = this.loadConfig(config);
      console.log('[AIControlCenter] 配置已加载');
      
      // 初始化知识库
      console.log('[AIControlCenter] 初始化知识库...');
      this.knowledgeBase = new KnowledgeBase();
      await this.knowledgeBase.initialize();
      console.log('[AIControlCenter] 知识库初始化完成');
      
      // 初始化决策引擎
      console.log('[AIControlCenter] 初始化决策引擎...');
      this.decisionEngine = new DecisionEngine(this.knowledgeBase, this.eventBus);
      console.log('[AIControlCenter] 决策引擎初始化完成');
      
      // 初始化各层
      console.log('[AIControlCenter] 初始化监控层...');
      this.monitorLayer = new MonitorLayer(this.config, this.eventBus);
      console.log('[AIControlCenter] 监控层初始化完成');
      
      // 分析层需要LLM服务（如果可用）
      console.log('[AIControlCenter] 初始化分析层...');
      this.analyzeLayer = new AnalyzeLayer(
        this.config,
        this.knowledgeBase,
        this.eventBus,
        this.llmService
      );
      console.log('[AIControlCenter] 分析层初始化完成');
      
      console.log('[AIControlCenter] 初始化执行层...');
      this.executeLayer = new ExecuteLayer(this.config, this.decisionEngine, this.eventBus);
      console.log('[AIControlCenter] 执行层初始化完成');
      
      // 初始化数据收集层
      console.log('[AIControlCenter] 初始化数据收集层...');
      this.dataCollectionLayer = new DataCollectionLayer();
      await this.dataCollectionLayer.initialize();
      console.log('[AIControlCenter] 数据收集层初始化完成');
    
    // 初始化LLM层（如果启用）
    if (this.config.evolution.llmEnabled) {
      try {
        this.llmService = new LLMService({
          apiUrl: 'http://localhost:11434/api/chat',
          model: 'qwen2.5:latest'
        });
        
        // 检查LLM服务是否可用
        const available = await this.llmService.checkService();
        if (available) {
          this.llmEvolutionLayer = new LLMEvolutionLayer(this.llmService);
          console.log('[AIControlCenter] LLM层初始化成功');
        } else {
          console.warn('[AIControlCenter] LLM服务不可用，LLM功能已禁用');
        }
      } catch (error) {
        console.warn('[AIControlCenter] LLM层初始化失败:', error);
      }
    }
    
    // 初始化算法演化层（如果启用）
    if (this.config.evolution.algorithmEnabled) {
      this.algorithmEvolutionLayer = new AlgorithmEvolutionLayer();
      console.log('[AIControlCenter] 算法演化层初始化成功');
    }
    
      // 注册事件监听
      console.log('[AIControlCenter] 设置事件监听...');
      this.setupEventListeners();
      console.log('[AIControlCenter] 事件监听设置完成');
      
      this.initialized = true;
      console.log('[AIControlCenter] ✅ 初始化完成，所有组件已就绪', {
        config: this.config
      });
    } catch (error) {
      console.error('[AIControlCenter] ❌ 初始化失败:', error);
      this.initialized = false;
      throw error;
    }
  }
  
  /**
   * 启动监控
   */
  startMonitoring(): void {
    if (!this.initialized) {
      const error = new Error('[AIControlCenter] 系统未初始化，请先调用initialize()');
      console.error(error);
      throw error;
    }
    
    if (this.monitoring) {
      console.warn('[AIControlCenter] 监控已经启动');
      return;
    }
    
    try {
      // 检查监控层是否存在
      if (!this.monitorLayer) {
        throw new Error('[AIControlCenter] 监控层未初始化');
      }
      
      this.monitorLayer.start();
      this.monitoring = true;
      
      // 启动定时分析（如果启用）
      if (this.config.analysis.enabled) {
        this.startPeriodicAnalysis();
      }
      
      // 发送事件通知
      this.eventBus.emit('monitoring:started', {
        timestamp: Date.now()
      });
      
      console.log('[AIControlCenter] 监控已启动');
    } catch (error) {
      console.error('[AIControlCenter] 启动监控失败:', error);
      this.monitoring = false;
      throw error;
    }
  }
  
  /**
   * 停止监控
   */
  stopMonitoring(): void {
    if (!this.monitoring) {
      console.warn('[AIControlCenter] 监控未启动');
      return;
    }
    
    try {
      if (this.monitorLayer) {
        this.monitorLayer.stop();
      }
      this.monitoring = false;
      
      // 发送事件通知
      this.eventBus.emit('monitoring:stopped', {
        timestamp: Date.now()
      });
      
      console.log('[AIControlCenter] 监控已停止');
    } catch (error) {
      console.error('[AIControlCenter] 停止监控失败:', error);
      // 即使出错也更新状态
      this.monitoring = false;
    }
  }
  
  /**
   * 获取分析结果
   */
  getAnalysisResults(): AnalysisResult[] {
    if (!this.initialized || !this.analyzeLayer) {
      return [];
    }
    return this.analyzeLayer.getResults();
  }
  
  /**
   * 执行优化
   */
  async executeOptimization(id: string): Promise<void> {
    const result = this.analyzeLayer.getResult(id);
    if (!result) {
      throw new Error(`[AIControlCenter] 未找到分析结果: ${id}`);
    }
    
    await this.executeLayer.execute(result);
  }
  
  /**
   * 获取监控层
   */
  getMonitorLayer(): MonitorLayer {
    return this.monitorLayer;
  }
  
  /**
   * 获取监控层
   */
  getMonitorLayer(): MonitorLayer {
    return this.monitorLayer;
  }
  
  /**
   * 获取分析层
   */
  getAnalyzeLayer(): AnalyzeLayer | null {
    return this.analyzeLayer || null;
  }
  
  /**
   * 获取监控状态
   */
  getMonitoringStatus(): boolean {
    return this.monitoring;
  }
  
  /**
   * 获取配置
   */
  getConfig(): AIControlConfig {
    return this.config;
  }
  
  /**
   * 获取执行层
   */
  getExecuteLayer(): ExecuteLayer {
    return this.executeLayer;
  }
  
  /**
   * 获取知识库
   */
  getKnowledgeBase(): KnowledgeBase {
    return this.knowledgeBase;
  }
  
  /**
   * 获取决策引擎
   */
  getDecisionEngine(): DecisionEngine {
    return this.decisionEngine;
  }
  
  /**
   * 获取事件总线
   */
  getEventBus(): EventBus {
    return this.eventBus;
  }
  
  /**
   * 获取数据收集层
   */
  getDataCollectionLayer(): DataCollectionLayer {
    return this.dataCollectionLayer;
  }
  
  /**
   * 获取LLM服务
   */
  getLLMService(): LLMService | null {
    return this.llmService;
  }
  
  /**
   * 获取LLM演化层
   */
  getLLMEvolutionLayer(): LLMEvolutionLayer | null {
    return this.llmEvolutionLayer;
  }
  
  /**
   * 获取算法演化层
   */
  getAlgorithmEvolutionLayer(): AlgorithmEvolutionLayer | null {
    return this.algorithmEvolutionLayer;
  }
  
  /**
   * 获取资源状态
   */
  getResourceStatus(): ResourceStatus {
    if (!this.initialized || !this.monitorLayer) {
      // 返回默认状态
      return {
        cpu: { used: 0, limit: 1, usage: 0 },
        memory: { used: 0, limit: 100 * 1024 * 1024, usage: 0 }
      };
    }
    return this.monitorLayer.getResourceStatus();
  }
  
  /**
   * 订阅事件
   */
  on(event: string, handler: (...args: any[]) => void): void {
    this.eventBus.on(event, handler);
  }
  
  /**
   * 取消订阅
   */
  off(event: string, handler: (...args: any[]) => void): void {
    this.eventBus.off(event, handler);
  }
  
  /**
   * 加载配置
   */
  private loadConfig(config?: Partial<AIControlConfig>): AIControlConfig {
    const defaultConfig: AIControlConfig = {
      monitor: {
        enabled: true,
        samplingRate: 0.1, // 10%采样
        keyPaths: [], // 关键路径
        maxMemoryUsage: 50 * 1024 * 1024, // 50MB
        maxCPUUsage: 0.05 // 5%
      },
      analysis: {
        enabled: true,
        interval: 300000, // 5分钟
        batchSize: 100,
        depth: 'medium'
      },
      execute: {
        enabled: false, // 默认不自动执行
        autoFix: false,
        requireConfirmation: true,
        maxRiskLevel: 'low'
      },
      evolution: {
        enabled: false, // 默认不启用演化
        llmEnabled: false,
        algorithmEnabled: false,
        evolutionInterval: 3600000 // 1小时
      }
    };
    
    return this.mergeConfig(defaultConfig, config || {});
  }
  
  /**
   * 合并配置
   */
  private mergeConfig(
    defaultConfig: AIControlConfig,
    userConfig: Partial<AIControlConfig>
  ): AIControlConfig {
    return {
      monitor: { ...defaultConfig.monitor, ...userConfig.monitor },
      analysis: { ...defaultConfig.analysis, ...userConfig.analysis },
      execute: { ...defaultConfig.execute, ...userConfig.execute },
      evolution: { ...defaultConfig.evolution, ...userConfig.evolution }
    };
  }
  
  /**
   * 设置事件监听
   */
  private setupEventListeners(): void {
    // 监控层事件
    this.eventBus.on('monitor:data', (data) => {
      // 异步分析，不阻塞
      requestIdleCallback(() => {
        this.analyzeLayer.addData(data);
      });
    });
    
    // 分析层事件
    this.eventBus.on('analysis:complete', (results) => {
      console.log('[AIControlCenter] 分析完成', results.length, '个结果');
      
      // 决策引擎评估
      results.forEach(result => {
        const action = this.decisionEngine.decideAction(result);
        if (action.type === 'autoFix' && this.config.execute.autoFix) {
          // 自动执行
          this.executeLayer.execute(result);
        }
      });
    });
    
    // 执行层事件
    this.eventBus.on('execute:complete', (result) => {
      console.log('[AIControlCenter] 执行完成', result);
      
      // 记录到知识库
      this.knowledgeBase.recordExecution(result);
    });
  }
  
  /**
   * 启动定时分析
   */
  private startPeriodicAnalysis(): void {
    const interval = this.config.analysis.interval;
    
    setInterval(() => {
      if (!this.monitoring) return;
      
      // 触发分析
      requestIdleCallback(() => {
        this.analyzeLayer.analyze();
      });
    }, interval);
  }
  
  /**
   * 重置（用于测试）
   */
  reset(): void {
    this.stopMonitoring();
    this.monitorLayer = null as any;
    this.analyzeLayer = null as any;
    this.executeLayer = null as any;
    this.knowledgeBase = null as any;
    this.decisionEngine = null as any;
    this.initialized = false;
    this.monitoring = false;
  }
}

