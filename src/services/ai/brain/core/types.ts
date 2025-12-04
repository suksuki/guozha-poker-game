/**
 * AI Brain 核心类型定义
 */

import { Card, Play } from '../../../../types/card';
import { TeamConfig } from '../../../../types/team';

// ==================== 游戏状态 ====================

/**
 * 游戏状态 - AI决策的输入
 */
export interface GameState {
  // 基础信息
  myHand: Card[];
  myPosition: number;
  playerCount: number;
  
  // 当前局面
  lastPlay: Play | null;
  lastPlayerId: number | null;
  currentPlayerId: number;
  
  // 历史信息
  playHistory: PlayRecord[];
  roundNumber: number;
  
  // 对手信息（部分信息）
  opponentHandSizes: number[];
  estimatedOpponentHands?: Card[][];  // 推测的对手手牌
  
  // 团队模式
  teamMode: boolean;
  teamConfig?: TeamConfig;
  myTeamId?: number;
  
  // 得分信息
  currentRoundScore: number;
  cumulativeScores: Map<number, number>;
  
  // 其他上下文
  timeRemaining?: number;
  phase: GamePhase;
}

/**
 * 出牌记录
 */
export interface PlayRecord {
  playerId: number;
  cards: Card[];
  play: Play | null;  // null表示pass
  timestamp: number;
  roundNumber: number;
}

/**
 * 游戏阶段
 */
export type GamePhase = 
  | 'early'      // 开局
  | 'middle'     // 中局
  | 'late'       // 残局
  | 'critical';  // 关键时刻

// ==================== 决策相关 ====================

/**
 * AI决策结果
 */
export interface Decision {
  // 决策内容
  action: GameAction;
  
  // 决策元信息
  confidence: number;        // 置信度 0-1
  reasoning: string;         // 推理过程
  alternatives: GameAction[]; // 备选方案
  
  // 来源信息
  sources: DecisionSource[];  // 参与决策的模块
  fusionMethod: string;       // 融合方法
  
  // 时间信息
  timestamp: number;
  computeTime: number;  // 计算耗时（ms）
  
  // 预期效果
  expectedValue: number;      // 预期收益
  riskLevel: RiskLevel;       // 风险等级
}

/**
 * 游戏动作
 */
export type GameAction = 
  | { type: 'play'; cards: Card[]; play: Play }
  | { type: 'pass' };

/**
 * 决策来源
 */
export interface DecisionSource {
  moduleName: string;
  suggestion: GameAction;
  confidence: number;
  weight: number;
  reasoning: string;
}

/**
 * 风险等级
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

// ==================== 分析结果 ====================

/**
 * 局面分析结果
 */
export interface SituationAnalysis {
  // 基础评估
  handStrength: number;       // 手牌强度 0-1
  winProbability: number;     // 胜率估计 0-1
  
  // 战略判断
  strategicIntent: StrategicIntent;
  recommendedStyle: PlayStyle;
  
  // 关键因素
  keyFactors: KeyFactor[];
  
  // 威胁与机会
  threats: Threat[];
  opportunities: Opportunity[];
  
  // 队友协作（团队模式）
  teamContext?: TeamContext;
}

/**
 * 战略意图
 */
export type StrategicIntent = 
  | 'aggressive_attack'    // 激进进攻
  | 'steady_advance'       // 稳健推进
  | 'defensive_preserve'   // 防守保留
  | 'cooperate_support'    // 配合支援
  | 'sacrifice_assist';    // 牺牲助攻

/**
 * 打法风格
 */
export type PlayStyle = 
  | 'aggressive'   // 激进
  | 'conservative' // 保守
  | 'balanced'     // 平衡
  | 'adaptive';    // 自适应

/**
 * 关键因素
 */
export interface KeyFactor {
  factor: string;
  importance: number;
  description: string;
}

/**
 * 威胁
 */
export interface Threat {
  type: string;
  severity: number;
  source: string;
  mitigation?: string;
}

/**
 * 机会
 */
export interface Opportunity {
  type: string;
  value: number;
  condition: string;
  action?: string;
}

/**
 * 团队上下文
 */
export interface TeamContext {
  teammateStatus: PlayerStatus[];
  teamStrategy: string;
  cooperationOpportunities: CooperationOpportunity[];
}

/**
 * 玩家状态
 */
export interface PlayerStatus {
  playerId: number;
  handSize: number;
  estimatedStrength: number;
  needsSupport: boolean;
}

/**
 * 协作机会
 */
export interface CooperationOpportunity {
  type: string;
  benefit: number;
  description: string;
}

// ==================== 通信相关 ====================

/**
 * 通信消息
 */
export interface CommunicationMessage {
  // 消息内容
  text: string;
  type: MessageType;
  
  // 发送者
  senderId: number;
  targetId?: number;  // 指定接收者，undefined表示全体
  
  // 意图
  intent: MessageIntent;
  tacticalInfo?: TacticalInfo;
  
  // 元信息
  timestamp: number;
  emotion?: Emotion;
  personality?: string;
}

/**
 * 消息类型
 */
export type MessageType = 
  | 'tactical'      // 战术通信
  | 'social'        // 社交聊天
  | 'taunt'         // 嘲讽
  | 'encourage'     // 鼓励
  | 'celebrate'     // 庆祝
  | 'complain';     // 抱怨

/**
 * 消息意图
 */
export type MessageIntent = 
  | 'signal_strength'     // 示强
  | 'signal_weakness'     // 示弱
  | 'request_support'     // 请求支援
  | 'offer_support'       // 提供支援
  | 'warn_threat'         // 警告威胁
  | 'celebrate_win'       // 庆祝胜利
  | 'mock_opponent'       // 嘲讽对手
  | 'build_rapport'       // 建立关系
  | 'pure_chat';          // 纯聊天

/**
 * 战术信息（隐含信号）
 */
export interface TacticalInfo {
  hasBomb?: boolean;
  canControl?: boolean;
  needPass?: boolean;
  confidence?: number;
}

/**
 * 情感
 */
export type Emotion = 
  | 'confident'   // 自信
  | 'cautious'    // 谨慎
  | 'excited'     // 兴奋
  | 'frustrated'  // 沮丧
  | 'relaxed'     // 轻松
  | 'tense';      // 紧张

// ==================== 配置相关 ====================

/**
 * AI大脑配置
 */
export interface BrainConfig {
  // 基础配置
  personality: PersonalityConfig;
  
  // 模块配置
  modules: ModuleConfigs;
  
  // 融合策略
  fusion: FusionConfig;
  
  // 通信配置
  communication: CommunicationConfig;
  
  // 学习配置
  learning: LearningConfig;
  
  // 性能配置
  performance: PerformanceConfig;
}

/**
 * 性格配置
 */
export interface PersonalityConfig {
  // 预设性格或自定义
  preset?: 'aggressive' | 'conservative' | 'balanced' | 'adaptive';
  
  // 自定义参数
  aggression?: number;        // 激进度 0-1
  cooperation?: number;       // 合作倾向 0-1
  riskTolerance?: number;     // 风险承受 0-1
  chattiness?: number;        // 话痨程度 0-1
  toxicity?: number;          // 毒舌程度 0-1
  adaptability?: number;      // 适应性 0-1
}

/**
 * 模块配置集合
 */
export interface ModuleConfigs {
  llm?: ModuleConfig;
  mcts?: ModuleConfig;
  rule?: ModuleConfig;
  pattern?: ModuleConfig;
  experience?: ModuleConfig;
  [key: string]: ModuleConfig | undefined;
}

/**
 * 单个模块配置
 */
export interface ModuleConfig {
  enabled: boolean;
  baseWeight: number;
  
  // 动态权重规则
  weightRules?: WeightRule[];
  
  // 模块特定配置
  options?: Record<string, any>;
}

/**
 * 权重规则
 */
export interface WeightRule {
  condition: string | ((state: GameState) => boolean);
  weight: number;
  priority?: number;
}

/**
 * 融合配置
 */
export interface FusionConfig {
  strategy: 'weighted_average' | 'voting' | 'cascade' | 'adaptive';
  
  // 权重调整
  dynamicWeighting: boolean;
  learningRate?: number;
  
  // 置信度阈值
  minConfidence?: number;
  
  // 其他选项
  options?: Record<string, any>;
}

/**
 * 通信配置
 */
export interface CommunicationConfig {
  enabled: boolean;
  
  // 战术通信
  tacticalEnabled: boolean;
  signalStyle: 'subtle' | 'moderate' | 'obvious';
  
  // 社交聊天
  socialEnabled: boolean;
  chatFrequency: number;  // 0-1
  
  // 个性化
  usePersonality: boolean;
  emotionExpression: boolean;
}

/**
 * 学习配置
 */
export interface LearningConfig {
  enabled: boolean;
  
  // 数据收集
  collectData: boolean;
  dataQuality: 'all' | 'high_quality_only';
  
  // 在线学习
  onlineLearning: boolean;
  updateInterval: string;  // e.g., '24h', '1w'
  
  // 模型更新
  autoUpdate: boolean;
  updateStrategy: 'conservative' | 'moderate' | 'aggressive';
  
  // A/B测试
  enableABTest: boolean;
  testRatio: number;  // 0-1
}

/**
 * 性能配置
 */
export interface PerformanceConfig {
  // 缓存
  enableCache: boolean;
  cacheSize: number;
  
  // 预判
  enablePrediction: boolean;
  predictionDepth: number;
  
  // 异步
  asyncMode: boolean;
  timeout: number;  // ms
  
  // 降级策略
  fallbackModule: string;
}

// ==================== 学习相关 ====================

/**
 * 训练样本
 */
export interface TrainingSample {
  // 输入
  gameState: GameState;
  situationAnalysis: SituationAnalysis;
  
  // 输出
  action: GameAction;
  
  // 标注
  label: 'positive' | 'negative' | 'neutral';
  quality: number;  // 0-1
  
  // 结果
  outcome?: GameOutcome;
  
  // 元信息
  timestamp: number;
  source: 'expert' | 'selfplay' | 'real_player';
  weight: number;
}

/**
 * 游戏结果
 */
export interface GameOutcome {
  winner: number;
  scores: Map<number, number>;
  duration: number;
  totalRounds: number;
}

/**
 * 经验样本
 */
export interface ExperienceSample {
  state: GameState;
  action: GameAction;
  reward: number;
  nextState: GameState;
  done: boolean;
  
  // 额外信息
  priority: number;
  timestamp: number;
}

// ==================== 进化相关 ====================

/**
 * 进化洞察
 */
export interface EvolutionInsight {
  // 发现的模式
  patterns: DiscoveredPattern[];
  
  // 弱点
  weaknesses: Weakness[];
  
  // 改进机会
  improvements: Improvement[];
  
  // 对手策略
  opponentStrategies: OpponentStrategy[];
  
  // 统计信息
  statistics: Statistics;
}

/**
 * 发现的模式
 */
export interface DiscoveredPattern {
  id: string;
  description: string;
  frequency: number;
  significance: number;
  examples: GameState[];
}

/**
 * 弱点
 */
export interface Weakness {
  type: string;
  description: string;
  frequency: number;
  severity: number;
  examples: FailureCase[];
  suggestedFix: string;
}

/**
 * 失败案例
 */
export interface FailureCase {
  gameState: GameState;
  wrongAction: GameAction;
  correctAction: GameAction;
  reasoning: string;
}

/**
 * 改进建议
 */
export interface Improvement {
  area: string;
  description: string;
  expectedBenefit: number;
  difficulty: 'easy' | 'medium' | 'hard';
  priority: number;
}

/**
 * 对手策略
 */
export interface OpponentStrategy {
  playerId: string;
  style: PlayStyle;
  patterns: string[];
  weaknesses: string[];
  counterStrategy: string;
}

/**
 * 统计信息
 */
export interface Statistics {
  totalGames: number;
  winRate: number;
  avgScore: number;
  decisionQuality: number;
  [key: string]: number;
}

// ==================== 其他 ====================

/**
 * 模块性能指标
 */
export interface ModuleMetrics {
  moduleName: string;
  
  // 准确性
  accuracy: number;
  precision: number;
  recall: number;
  
  // 性能
  avgResponseTime: number;
  successRate: number;
  
  // 使用情况
  totalCalls: number;
  acceptedSuggestions: number;
  
  // 贡献度
  contributionScore: number;
}

/**
 * Brain状态
 */
export interface BrainState {
  initialized: boolean;
  active: boolean;
  currentConfig: BrainConfig;
  
  // 模块状态
  modules: Map<string, ModuleStatus>;
  
  // 性能指标
  metrics: BrainMetrics;
  
  // 版本信息
  version: string;
  lastUpdate: number;
}

/**
 * 模块状态
 */
export interface ModuleStatus {
  name: string;
  enabled: boolean;
  healthy: boolean;
  currentWeight: number;
  metrics: ModuleMetrics;
}

/**
 * Brain指标
 */
export interface BrainMetrics {
  totalDecisions: number;
  avgDecisionTime: number;
  winRate: number;
  playerSatisfaction: number;
  
  // 各模块指标
  moduleMetrics: Map<string, ModuleMetrics>;
}

