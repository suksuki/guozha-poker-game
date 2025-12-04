/**
 * 游戏类
 * 统一管理所有游戏数据、配置和状态
 */

import { GameStatus, Player, RoundRecord, Card, PlayerType, Play, RoundPlayRecord } from '../types/card';
import { Round } from './Round';
import { GameController, GameControllerCallbacks } from './gameController';
import { PlayerRanking } from './gameRules';
import { hasPlayableCards } from './cardUtils';
import { aiChoosePlay, AIConfig } from './aiPlayer';
import { processPlayAsync } from './asyncPlayHandler';
import { RoundScheduler } from './roundScheduler';
import { generateRandomVoiceConfig } from '../services/voiceConfigService';
import { getGameConfig } from '../config/gameConfig';
import { announcePass } from '../services/systemAnnouncementService';
import { voiceService } from '../services/voiceService';
import { clearChatMessages } from '../services/chatService';
import { dealCards } from './cardUtils';
import { cardTracker } from '../services/cardTrackerService';
import { cumulativeScoreService } from '../services/cumulativeScoreService';
import { TeamConfig, TeamRanking } from '../types/team';
import { createTeamConfig, getPlayerTeamId } from './teamManager';
import { IGameModeStrategy, createGameModeStrategy, isTeamModeConfig } from './gameMode';

/**
 * 游戏设置配置（用于初始化游戏）
 */
export interface GameSetupConfig {
  playerCount: number;
  humanPlayerIndex: number;
  aiConfigs: { 
    apiKey?: string;
    strategy?: 'aggressive' | 'conservative' | 'balanced';
    algorithm?: 'simple' | 'mcts';
    mctsIterations?: number;
  }[];
  dealingAlgorithm?: 'random' | 'fair' | 'favor-human' | 'favor-ai' | 'balanced-score' | 'clustered' | 'bomb-friendly' | 'monte-carlo';
  skipDealingAnimation?: boolean;
  dealingSpeed?: number;
  sortOrder?: 'asc' | 'desc' | 'grouped';
  cardTrackerEnabled?: boolean;
  // 团队模式配置（合作模式）
  teamMode?: boolean;  // 是否启用团队模式（2v2或3v3）
}

/**
 * 游戏记录
 */
export interface GameRecord {
  gameId: string;
  startTime: number;
  endTime?: number;
  playerCount: number;
  initialHands: Card[][];
  allRounds: RoundRecord[];
  finishOrder: number[];
  finalRankings?: PlayerRanking[];
  winner: number;
}

/**
 * 游戏类
 * 统一管理所有游戏数据、配置和状态
 */
export class Game {
  // ========== 配置 ==========
  config: GameSetupConfig;

  // ========== 游戏状态 ==========
  status: GameStatus;
  players: Player[];
  currentPlayerIndex: number;
  winner: number | null;
  playerCount: number;

  // ========== 排名相关（由 controller 管理） ==========
  finishOrder: number[];
  finalRankings?: PlayerRanking[];
  teamRankings?: TeamRanking[];  // 团队排名（团队模式下使用）
  winningTeamId?: number | null;  // 获胜团队ID（团队模式下使用）

  // ========== 轮次相关 ==========
  rounds: Round[];
  currentRoundIndex: number;

  // ========== 游戏记录 ==========
  gameRecord?: GameRecord;
  initialHands?: Card[][];
  
  // ========== 累积积分相关 ==========
  private gameStartTime: number = 0;
  private gameId: string = '';

  // ========== 团队模式相关 ==========
  teamConfig?: TeamConfig | null;  // 团队配置（团队模式下使用）

  // ========== 游戏模式策略 ==========
  private modeStrategy: IGameModeStrategy;  // 游戏模式策略（团队/个人）

  // ========== 游戏控制器（内部） ==========
  controller: GameController;

  // ========== 轮次调度器（内部管理） ==========
  private scheduler?: RoundScheduler;

  // ========== React 更新回调 ==========
  onUpdateCallback?: (game: Game) => void;

  // ========== 出牌回调（由外部设置，仅保留必要的） ==========

  // ========== 游戏配置（由外部设置） ==========
  private gameConfig?: {
    timingConfig?: any;
    cardTrackerEnabled?: boolean;
    announcementDelay?: number;
  };

  // ========== 托管状态（由外部设置） ==========
  private isAutoPlay: boolean = false;

  // ========== 防重复调用标志 ==========
  private isProcessingPlayMap = new Map<number, number>();

  constructor(config?: GameSetupConfig) {
    // 初始化配置（确保有默认值）
    this.config = config || {
      playerCount: 0,
      humanPlayerIndex: 0,
      aiConfigs: [],
      dealingAlgorithm: 'random',
      skipDealingAnimation: false,
      dealingSpeed: 150,
      sortOrder: 'grouped',
      cardTrackerEnabled: false,
      teamMode: false  // 默认个人模式
    };

    // 初始化游戏状态
    this.status = GameStatus.WAITING;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.winner = null;
    this.winningTeamId = null;
    this.playerCount = this.config.playerCount || 0;

    // 初始化排名相关
    this.finishOrder = [];
    this.finalRankings = undefined;
    this.teamRankings = undefined;

    // 初始化轮次相关
    this.rounds = [];
    this.currentRoundIndex = -1;

    // 初始化游戏记录
    this.gameRecord = undefined;
    this.initialHands = undefined;
    
    // 初始化团队配置为null（会在startNewGame中设置）
    this.teamConfig = null;

    // 创建游戏模式策略（必须在初始化之后）
    this.modeStrategy = createGameModeStrategy(this.config);
    console.log('[Game构造] 使用游戏模式:', this.modeStrategy.getModeName());

    // 创建游戏控制器（传入 this，让 controller 可以调用 Game 的方法）
    this.controller = new GameController(this, {
      onScoreChange: () => {},
      onPlayerFinish: () => {},
      onGameEnd: () => {}
    });
    
    // 初始化控制器回调为空（可选，GameController 会检查回调是否存在）
    // 这样即使没有外部订阅，也不会出错
    this.controller.subscribe({});
  }

  /**
   * 设置 React 更新回调
   */
  setOnUpdate(callback: (game: Game) => void): void {
    this.onUpdateCallback = callback;
  }

  /**
   * 触发更新（内部方法，由 controller 或其他方法调用）
   */
  private triggerUpdate(): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this);
    }
  }

  // ========== 基础更新方法 ==========

  /**
   * 更新玩家
   */
  updatePlayer(playerIndex: number, updates: Partial<Player>): void {
    if (playerIndex < 0 || playerIndex >= this.players.length) {
      return;
    }
    
    const previousHandCount = this.players[playerIndex].hand.length;
    const previousScore = this.players[playerIndex].score;
    
    // 创建新的 players 数组，确保引用变化，让 React 能检测到更新
    this.players = [
      ...this.players.slice(0, playerIndex),
      { ...this.players[playerIndex], ...updates },
      ...this.players.slice(playerIndex + 1)
    ];
    
    const newHandCount = this.players[playerIndex].hand.length;
    const newScore = this.players[playerIndex].score;
    
    // 如果手牌数量或分数发生变化，触发UI更新
    if (previousHandCount !== newHandCount || previousScore !== newScore) {
      this.triggerUpdate();
    }
  }

  /**
   * 更新完成顺序（由 controller 调用）
   */
  updateFinishOrder(newFinishOrder: number[]): void {
    this.finishOrder = newFinishOrder;
  }

  /**
   * 更新最终排名（由 controller 调用）
   */
  updateFinalRankings(rankings: PlayerRanking[]): void {
    this.finalRankings = rankings;
  }

  /**
   * 更新团队排名（由 controller 调用，团队模式下使用）
   */
  updateTeamRankings(rankings: TeamRanking[]): void {
    this.teamRankings = rankings;
  }

  /**
   * 更新轮次
   */
  updateRound(roundIndex: number, round: Round): void {
    if (roundIndex < 0 || roundIndex >= this.rounds.length) {
      return;
    }
    this.rounds[roundIndex] = round;
  }

  /**
   * 添加新轮次
   */
  addRound(round: Round): void {
    this.rounds.push(round);
    this.currentRoundIndex = this.rounds.length - 1;
  }

  /**
   * 更新状态
   */
  updateStatus(status: GameStatus): void {
    this.status = status;
  }

  /**
   * 更新当前玩家索引
   */
  updateCurrentPlayerIndex(index: number, skipAutoPlay: boolean = false): void {
    this.currentPlayerIndex = index;
    this.triggerUpdate();
    // 注意：自动出牌现在由RoundScheduler通过playNextTurn统一处理，不再在这里处理
  }

  /**
   * 设置获胜者
   */
  setWinner(winnerIndex: number | null): void {
    this.winner = winnerIndex;
  }

  // ========== 业务方法 ==========

  /**
   * 获取当前轮次
   */
  getCurrentRound(): Round | undefined {
    return this.rounds[this.currentRoundIndex];
  }

  /**
   * 添加玩家到完成顺序（内部调用 controller）
   * 玩家出完牌后，立即调用此方法
   * 控制器会根据算法确定玩家的争上游名次，并更新玩家状态
   * React 会自动检测到状态变化并更新 UI
   */
  addToFinishOrder(playerIndex: number): void {
    // 调用控制器的更新方法
    // 控制器会：
    // 1. 根据 finishOrder 计算争上游名次（finishedRank）
    // 2. 通过 Game 的方法更新玩家的 finishedRank
    // 3. 更新 finishOrder
    // 4. 触发 onUpdateCallback，让 React 自动更新 UI
    this.controller.recordPlayerFinished(playerIndex, this.players);
  }

  /**
   * 计算最终排名（内部调用 controller）
   */
  calculateFinalRankings(): void {
    // 调用 controller 的方法
    this.controller.calculateFinalScoresAndRankings(this.players);
    
    // controller 已经通过 Game 的方法更新了 players 和 finalRankings
    // 这里只需要触发更新
    this.triggerUpdate();
  }

  /**
   * 初始化游戏
   */
  initialize(players: Player[], initialHands: Card[][]): void {
    // 先设置玩家数组（确保 controller 能访问到）
    this.players = [...players]; // 创建副本，避免引用问题
    this.playerCount = players.length;
    this.initialHands = initialHands;
    this.status = GameStatus.WAITING; // 先设为 WAITING，由外部设置为 PLAYING
    this.currentPlayerIndex = 0;
    this.winner = null;
    this.winningTeamId = null;
    this.finishOrder = [];
    this.finalRankings = undefined;
    this.rounds = [];
    this.currentRoundIndex = -1;
    
    // 初始化累积积分相关
    this.gameStartTime = 0;
    this.gameId = '';

    // 初始化 controller（此时 players 已经设置好了）
    // controller 会通过 game.updatePlayer 更新玩家的 score、wonRounds、finishedRank
    this.controller.initializeGame(players, 0); // 初始分数为0（实时显示手牌分，游戏结束时才扣除基础分100）
  }

  /**
   * 创建并开始新游戏（完整的游戏初始化逻辑）
   * 这个方法处理所有游戏初始化逻辑，包括创建玩家、创建第一轮等
   * @param config 游戏配置
   * @param hands 玩家手牌
   * @param previousAutoPlayState 之前的托管状态（用于保持托管状态）
   * @returns 新的 Game 实例
   */
  static createAndStartNewGame(
    config: Game['config'],
    hands: Card[][],
    previousAutoPlayState: boolean = false
  ): Game {
    // 创建新的 Game 实例
    const newGame = new Game(config);
    
    // 设置托管状态（在开始游戏前设置，这样 Game 类可以正确初始化调度器）
    newGame.setAutoPlay(previousAutoPlayState);
    
    // 调用 Game 类的方法开始游戏（所有游戏逻辑都在 Game 类中处理，包括自动出牌）
    newGame.startNewGame(hands);
    
    // 初始化追踪模块（如果启用）
    newGame.initializeTracking(hands);
    
    return newGame;
  }

  /**
   * 处理发牌完成（从发牌动画回调）
   * 使用指定的手牌创建并开始新游戏
   * @param config 游戏配置
   * @param hands 玩家手牌（从发牌动画获得）
   * @param previousAutoPlayState 之前的托管状态（用于保持托管状态）
   * @returns 新的 Game 实例
   */
  static handleDealingComplete(
    config: Game['config'],
    hands: Card[][],
    previousAutoPlayState: boolean = false
  ): Game {
    // 使用 Game 类的静态方法创建并开始新游戏
    return Game.createAndStartNewGame(config, hands, previousAutoPlayState);
  }

  /**
   * 处理发牌取消（从发牌动画回调）
   * 这是一个占位方法，实际的 React 状态管理需要在 hook 中处理
   * 此方法主要用于保持 API 一致性
   */
  static handleDealingCancel(): void {
    // 发牌取消不需要游戏逻辑，只需要清空 UI 状态
    // React 状态管理（setPendingGameConfig, setIsDealing）在 hook 中处理
  }

  /**
   * 开始新游戏（自动发牌）
   * 这个方法会自动发牌，然后创建并开始新游戏
   * @param config 游戏配置
   * @param previousAutoPlayState 之前的托管状态（用于保持托管状态）
   * @returns 新的 Game 实例
   */
  static startGameWithDealing(
    config: Game['config'],
    previousAutoPlayState: boolean = false
  ): Game {
    // 自动发牌
    const hands = dealCards(config.playerCount);
    
    // 创建并开始新游戏
    return Game.createAndStartNewGame(config, hands, previousAutoPlayState);
  }

  /**
   * 开始新游戏（完整的游戏初始化逻辑）
   * 这个方法处理所有游戏初始化逻辑，包括创建玩家、创建第一轮等
   */
  startNewGame(hands: Card[][]): number {
    // 使用工厂方法判断是否团队模式
    const isTeamMode = isTeamModeConfig(this.config);
    
    console.log('[startNewGame] 游戏模式:', this.modeStrategy.getModeName());
    console.log('[startNewGame] config.teamMode:', this.config.teamMode);
    console.log('[startNewGame] config.playerCount:', this.config.playerCount);
    console.log('[startNewGame] isTeamMode:', isTeamMode);
    
    // 创建团队配置（如果启用团队模式）
    if (isTeamMode) {
      this.teamConfig = createTeamConfig(
        this.config.playerCount as 4 | 6,
        this.config.humanPlayerIndex
      );
      console.log('[startNewGame] 创建团队配置:', this.teamConfig);
    } else {
      this.teamConfig = null;
      console.log('[startNewGame] 个人模式，teamConfig = null');
    }
    
    // 创建玩家数组
    const players: Player[] = hands.map((hand, index) => {
      const teamId = isTeamMode && this.teamConfig 
        ? getPlayerTeamId(index, this.teamConfig)
        : null;
      
      return {
        id: index,
        name: index === this.config.humanPlayerIndex ? '你' : `玩家${index + 1}`,
        type: index === this.config.humanPlayerIndex ? PlayerType.HUMAN : PlayerType.AI,
        hand: hand,
        score: 0, // 初始分数为0（实时显示手牌分，游戏结束时才扣除基础分100）
        dunCount: 0, // 初始化墩数为0
        isHuman: index === this.config.humanPlayerIndex,
        teamId: teamId, // 设置团队ID
        aiConfig: index === this.config.humanPlayerIndex ? undefined : {
          apiKey: '',
          strategy: this.config.aiConfigs[index]?.strategy || 'balanced',
          algorithm: this.config.aiConfigs[index]?.algorithm || 'mcts',
          mctsIterations: this.config.aiConfigs[index]?.mctsIterations || 100
        },
        voiceConfig: generateRandomVoiceConfig(index)
      };
    });

    // 选择第一个玩家：如果有上一局，让上一局头游先出牌；否则随机选择
    let firstPlayer: number;
    const lastGameWinner = cumulativeScoreService.getLastGameWinner();
    if (lastGameWinner !== null && lastGameWinner < this.config.playerCount) {
      // 上一局头游先出牌
      firstPlayer = lastGameWinner;
    } else {
      // 第一局或找不到上一局头游，随机选择
      firstPlayer = Math.floor(Math.random() * this.config.playerCount);
    }
    
    // 开始新一局游戏（累积积分系统）
    const gameNumber = cumulativeScoreService.startNewGame(this.gameId || `game-${Date.now()}`);
    this.gameId = `game-${Date.now()}-${gameNumber}`;
    this.gameStartTime = Date.now();

    // 获取游戏配置并创建第一轮
    const latestGameConfig = getGameConfig();
    const firstRound = Round.createNew(1, Date.now(), latestGameConfig.timingConfig || undefined);

    // 初始化游戏
    this.initialize(players, hands);
    
    // 更新状态为 PLAYING
    this.updateStatus(GameStatus.PLAYING);
    
    // 设置第一个玩家
    this.updateCurrentPlayerIndex(firstPlayer);
    
    // 添加第一轮
    this.addRound(firstRound);

    // 更新游戏配置
    this.setGameConfig({
      timingConfig: latestGameConfig.timingConfig,
      cardTrackerEnabled: this.config.cardTrackerEnabled,
      announcementDelay: latestGameConfig.announcementDelay
    });

    // 初始化调度器
    this.initializeScheduler();

    // 开始第一个玩家的轮次（无论是什么类型）
    if (firstPlayer !== null) {
      this.playNextTurn(firstPlayer).catch(() => {});
    }

    return firstPlayer;
  }

  /**
   * 初始化追踪模块
   * @param hands 玩家手牌
   */
  private initializeTracking(hands: Card[][]): void {
    // 从配置或 localStorage 读取计分器开关配置（默认关闭）
    const cardTrackerEnabled = this.config?.cardTrackerEnabled ?? (() => {
      const saved = localStorage.getItem('cardTrackerEnabled');
      return saved !== null ? saved === 'true' : false;
    })();
    
    if (cardTrackerEnabled) {
      try {
        cardTracker.initialize(hands, Date.now());
        cardTracker.startRound(1, this.players);
      } catch (error) {
      }
    }
  }

  /**
   * 重置游戏
   * 清空所有游戏状态，包括聊天消息
   */
  reset(): void {
    // 清空聊天消息
    clearChatMessages();
    
    // 重置游戏状态
    this.status = GameStatus.WAITING;
    this.players = [];
    this.currentPlayerIndex = 0;
    this.winner = null;
    this.winningTeamId = null;
    this.playerCount = 0;
    this.finishOrder = [];
    this.finalRankings = undefined;
    this.rounds = [];
    this.currentRoundIndex = -1;
    this.gameRecord = undefined;
    this.initialHands = undefined;
    
    // 重置累积积分相关（但不清空累积积分服务，因为那是跨游戏的）
    this.gameStartTime = 0;
    this.gameId = '';
    
    this.controller.reset();
    
    // 触发更新回调
    this.triggerUpdate();
  }

  /**
   * 订阅控制器回调
   */
  subscribeControllerCallbacks(callbacks: GameControllerCallbacks): void {
    this.controller.subscribe(callbacks);
  }


  /**
   * 设置轮次调度器（已废弃，现在由 Game 类内部管理）
   * @deprecated 使用 initializeScheduler 代替
   */
  setScheduler(scheduler: RoundScheduler): void {
    this.scheduler = scheduler;
  }

  /**
   * 初始化轮次调度器（内部方法）
   */
  private initializeScheduler(): void {
    if (!this.scheduler) {
      const humanPlayerIndex = this.players.findIndex(p => p.isHuman);
      this.scheduler = new RoundScheduler({
        isAutoPlay: this.isAutoPlay,
        humanPlayerIndex: humanPlayerIndex >= 0 ? humanPlayerIndex : 0,
        getGameState: () => {
          const currentRound = this.getCurrentRound();
          return {
            status: this.status === GameStatus.PLAYING ? 'playing' : this.status,
            currentPlayerIndex: this.currentPlayerIndex,
            rounds: this.rounds,
            currentRoundIndex: this.currentRoundIndex,
            players: this.players,
            playerCount: this.playerCount,
            roundNumber: currentRound ? currentRound.roundNumber : 0
          };
        }
      });

      // 设置调度器的回调
      this.scheduler.onNextTurnCallback = async (playerIndex: number, state?: any) => {
        await this.playNextTurn(playerIndex);
      };
    } else {
      // 更新现有调度器的配置
      const humanPlayerIndex = this.players.findIndex(p => p.isHuman);
      this.scheduler.updateConfig({
        isAutoPlay: this.isAutoPlay,
        humanPlayerIndex: humanPlayerIndex >= 0 ? humanPlayerIndex : 0
      });
    }

    // 更新轮次号
    if (this.scheduler && this.status === GameStatus.PLAYING) {
      const currentRound = this.getCurrentRound();
      const currentRoundNumber = currentRound ? currentRound.roundNumber : 0;
      if (currentRoundNumber > 0) {
        this.scheduler.updateRoundNumber(currentRoundNumber);
      }
    }
  }

  /**
   * 设置托管状态
   */
  setAutoPlay(isAutoPlay: boolean): void {
    this.isAutoPlay = isAutoPlay;
    // 更新调度器配置
    if (this.scheduler) {
      const humanPlayerIndex = this.players.findIndex(p => p.isHuman);
      this.scheduler.updateConfig({
        isAutoPlay: this.isAutoPlay,
        humanPlayerIndex: humanPlayerIndex >= 0 ? humanPlayerIndex : 0
      });
    } else {
    }
  }

  /**
   * 获取托管状态
   */
  getAutoPlay(): boolean {
    return this.isAutoPlay;
  }

  /**
   * 找到下一个开始新轮次的玩家（使用策略模式）
   * @param winnerIndex 当前轮次的赢家（接风玩家）
   * @returns 下一个玩家的索引，如果所有人都出完则返回null
   */
  private findNextPlayerForNewRound(winnerIndex: number | null): number | null {
    // 使用策略模式处理接风逻辑
    console.log('[findNextPlayerForNewRound] 使用策略:', this.modeStrategy.getModeName());
    
    return this.modeStrategy.findNextPlayerForNewRound(
      winnerIndex,
      this.players,
      this.playerCount,
      this.teamConfig
    );
  }

  /**
   * 检查游戏是否应该结束（使用策略模式）
   */
  public shouldGameEnd(): boolean {
    const result = this.modeStrategy.shouldGameEnd(
      this.players,
      this.finishOrder,
      this.teamConfig
    );
    
    if (result.shouldEnd) {
      console.log('[Game] 游戏结束，原因:', result.reason);
    }
    
    return result.shouldEnd;
  }

  /**
   * 获取游戏模式策略（供 GameController 使用）
   */
  public getModeStrategy(): IGameModeStrategy {
    return this.modeStrategy;
  }

  // ===== 保留旧方法作为兼容性，但内部使用策略 =====
  
  /**
   * @deprecated 保留用于兼容，实际使用 shouldGameEnd()
   */
  private findNextPlayerForNewRoundOld(winnerIndex: number | null): number | null {
    // 临时保留，避免破坏现有代码
    if (this.teamConfig) {
      // 团队模式：优先找队友
      const winnerTeamId = winner?.teamId;
      
      if (winnerTeamId !== null && winnerTeamId !== undefined) {
        // 找队友中还有牌的玩家
        for (let i = 0; i < this.players.length; i++) {
          const player = this.players[i];
          if (player.teamId === winnerTeamId && player.hand.length > 0) {
            return i;
          }
        }
        
        // 【决策6】队友都出完了，检查整个团队是否都出完
        const team = this.teamConfig.teams.find(t => t.id === winnerTeamId);
        if (team) {
          const teamAllFinished = team.players.every(
            pid => this.players[pid].hand.length === 0
          );
          
          if (teamAllFinished) {
            // 整个团队出完，返回null表示游戏应该结束
            return null;
          }
        }
      }
      
      // 队友都出完了（但团队未全部出完），顺时针找对手
      return findNextActivePlayer(winnerIndex, this.players, this.playerCount);
    } else {
      // 个人模式：顺时针找下一个有牌的玩家
      return findNextActivePlayer(winnerIndex, this.players, this.playerCount);
    }
  }

  /**
   * 切换托管状态
   * @returns 新的托管状态
   */
  toggleAutoPlay(): boolean {
    const newValue = !this.isAutoPlay;
    this.setAutoPlay(newValue);
    
    // 如果开启托管，且当前轮到人类玩家，立即触发自动出牌
    if (newValue && this.status === GameStatus.PLAYING) {
      const currentPlayer = this.players[this.currentPlayerIndex];
      if (currentPlayer && currentPlayer.isHuman) {
        // 直接触发自动出牌
        this.triggerAutoPlay();
      }
    }
    
    return newValue;
  }

  /**
   * 触发当前玩家自动出牌（用于托管模式）
   */
  triggerAutoPlay(): void {
    if (this.status !== GameStatus.PLAYING) {
      return;
    }

    const currentPlayer = this.players[this.currentPlayerIndex];
    if (!currentPlayer) {
      return;
    }

    const shouldAutoPlay = currentPlayer.type === PlayerType.AI || 
                          (currentPlayer.isHuman && this.isAutoPlay);

    if (!shouldAutoPlay) {
      return;
    }

    // 直接调用 playNextTurn，不再通过调度器队列
    this.playNextTurn(this.currentPlayerIndex).catch(() => {});
  }

  /**
   * 设置外部模块回调（已废弃，现在直接使用服务）
   * @deprecated 不再需要，所有服务都已直接导入
   */
  setModuleCallbacks(_callbacks: {
    recordTrackingPlay?: (roundNumber: number, playRecord: RoundPlayRecord) => void;
    announcePlayAudio?: (play: Play, voiceConfig?: any) => Promise<void>;
  }): void {
    // 不再需要，所有服务都已直接导入
  }

  /**
   * 设置游戏配置
   */
  setGameConfig(config: {
    timingConfig?: any;
    cardTrackerEnabled?: boolean;
    announcementDelay?: number;
  }): void {
    this.gameConfig = config;
  }

  /**
   * 处理下一个玩家出牌（AI自动出牌逻辑）
   * 由 RoundScheduler 的回调调用
   */
  async playNextTurn(targetPlayerIndex?: number): Promise<void> {
    
    if (this.status !== GameStatus.PLAYING) {
      return;
    }

    const playerIndex = targetPlayerIndex !== undefined ? targetPlayerIndex : this.currentPlayerIndex;
    const currentPlayer = this.players[playerIndex];
    
    
    if (!currentPlayer) {
      return;
    }
    
    // 先更新 currentPlayerIndex（无论是否为自动出牌）
    const wasPlayerIndexChanged = playerIndex !== this.currentPlayerIndex;
    if (wasPlayerIndexChanged) {
      this.currentPlayerIndex = playerIndex;
    }
    
    // 检查是否应该自动出牌：只有AI玩家或托管模式下的人类玩家才自动出牌
    const shouldAutoPlay = currentPlayer.type === PlayerType.AI || 
                          (currentPlayer.isHuman && this.isAutoPlay);
    
    
    if (!shouldAutoPlay) {
      // 真实玩家（非托管）：无论是否改变，都触发React更新，确保UI响应
      this.triggerUpdate();
      return;
    }
    
    // AI玩家或托管模式：在playerIndex改变时触发更新
    // 注意：自动出牌逻辑本身不依赖UI更新，所以这里只在实际需要时更新
    if (wasPlayerIndexChanged) {
      this.triggerUpdate();
    }

    // 检查是否正在播放报牌语音（只检查报牌通道，不检查聊天通道）
    // 报牌和聊天使用不同的通道，应该独立检查，聊天不应该阻塞游戏流程
    // 【优化】托管模式下跳过等待，加快游戏速度
    if (!this.isAutoPlay) {
      try {
        const isAnnouncementSpeaking = voiceService.isAnnouncementSpeaking();
        if (isAnnouncementSpeaking) {
          const initialPlayerIndex = this.currentPlayerIndex;
          // 添加超时保护，避免无限等待
          await Promise.race([
            new Promise<void>((resolve) => {
              const checkInterval = setInterval(() => {
                // 只检查报牌通道，不检查聊天通道
                if (!voiceService.isAnnouncementSpeaking() || this.currentPlayerIndex !== initialPlayerIndex) {
                  clearInterval(checkInterval);
                  resolve();
                }
              }, 100);
            }),
            new Promise(resolve => setTimeout(resolve, 5000)) // 5秒超时
          ]);
        }
      } catch (error) {
        // 忽略错误，继续执行
      }
    }

    const currentRound = this.getCurrentRound();
    
    if (!currentRound) {
      return;
    }
    
    const lastPlay = currentRound.getLastPlay();
    const hasPlayable = lastPlay ? hasPlayableCards(currentPlayer.hand, lastPlay) : true;
    
            
    if (hasPlayable) {
      // 有能打过的牌，使用AI出牌
      const aiConfig: AIConfig = { 
        strategy: 'balanced' as const, 
        algorithm: 'mcts' as const,
        teamMode: this.config.teamMode || false
      };
      try {
        const selectedCards = await aiChoosePlay(currentPlayer.hand, lastPlay, aiConfig, playerIndex);
        if (selectedCards && selectedCards.length > 0) {
          const playResult = await this.playCards(playerIndex, selectedCards);
          if (!playResult) {
            await this.passCards(playerIndex);
          }
        } else {
          await this.passCards(playerIndex);
        }
      } catch (error) {
        await this.passCards(playerIndex);
      }
    } else {
      // 没有能打过的牌，自动要不起
      await this.passCards(playerIndex);
    }
  }

  /**
   * 玩家出牌（核心逻辑）
   */
  async playCards(playerIndex: number, selectedCards: Card[]): Promise<boolean> {
    // 防重复调用检查
    const now = Date.now();
    const currentRound = this.getCurrentRound();
    const currentRoundNum = currentRound ? currentRound.roundNumber : 0;
    const lastProcessTime = this.isProcessingPlayMap.get(playerIndex);
    
    if (lastProcessTime && now - lastProcessTime < 500) {
      const latestRound = this.getCurrentRound();
      const latestRoundNum = latestRound ? latestRound.roundNumber : 0;
      if (latestRoundNum === currentRoundNum) {
        return false;
      }
    }
    this.isProcessingPlayMap.set(playerIndex, now);
    
    // 清理旧的记录
    for (const [pid, timestamp] of this.isProcessingPlayMap.entries()) {
      if (now - timestamp > 5000) {
        this.isProcessingPlayMap.delete(pid);
      }
    }

    const round = this.getCurrentRound();
    if (!round) {
      this.isProcessingPlayMap.delete(playerIndex);
      return false;
    }

    try {
      // 检查轮次号是否匹配
      if (round.roundNumber !== currentRoundNum) {
        this.isProcessingPlayMap.delete(playerIndex);
        return false;
      }
      
      // 检查轮次是否已结束
      if (round.isEnded()) {
        this.isProcessingPlayMap.delete(playerIndex);
        return false;
      }
      
      // 处理出牌
      // 准备 onAnnouncementComplete 回调
      const onAnnouncementComplete = () => {
        // 报牌完成后，交给 RoundScheduler 处理出牌完成后的调度逻辑
        this.initializeScheduler(); // 确保调度器已初始化
        if (this.scheduler) {
          const updatedRound = this.getCurrentRound();
          if (updatedRound) {
            this.scheduler.onPlayCompleted(
              playerIndex,
              updatedRound,
              this.players,
              this.playerCount,
              (updater) => {
                const updated = updater({
                  rounds: this.rounds,
                  players: this.players,
                  currentRoundIndex: this.currentRoundIndex,
                  currentPlayerIndex: this.currentPlayerIndex
                } as any);
                
                // 更新状态
                if (updated.rounds) {
                  updated.rounds.forEach((r: Round, i: number) => {
                    if (i < this.rounds.length) {
                      this.updateRound(i, r);
                    }
                  });
                }
                
                // 注意：不在这里更新currentPlayerIndex，由playNextTurn统一处理
                // 不在这里调用triggerUpdate()，由playNextTurn统一触发React更新
              }
            ).catch((error) => {
            });
          }
        }
      };

      const result = await processPlayAsync(
        round,
        playerIndex,
        selectedCards,
        this.players,
        this.playerCount,
        this.config.humanPlayerIndex,
        this.gameConfig || {},
        (updater) => {
          // processPlayAsync 内部会更新 Round 和玩家手牌，这里需要同步更新
          const updated = updater({
            rounds: this.rounds,
            players: this.players,
            currentRoundIndex: this.currentRoundIndex
          } as any);
          
          if (updated.rounds) {
            updated.rounds.forEach((r: Round, i: number) => {
              if (i < this.rounds.length) {
                this.updateRound(i, r);
              }
            });
          }
          
          // 重要：同步更新玩家手牌（processPlayAsync 中已经更新了手牌）
          if (updated.players) {
            updated.players.forEach((p: Player, i: number) => {
              if (i < this.players.length) {
                // 使用 updatePlayer 确保正确更新手牌、分数和墩数
                this.updatePlayer(i, {
                  hand: p.hand,
                  score: p.score,
                  ...((p as any).dunCount !== undefined ? { dunCount: (p as any).dunCount } : {})
                } as Partial<Player>);
              }
            });
          }
          
          this.triggerUpdate();
        },
        () => ({
          rounds: this.rounds,
          players: this.players,
          currentRoundIndex: this.currentRoundIndex,
          status: this.status
        } as any),
        onAnnouncementComplete
      );

      if (result.status === 'completed') {
        const updatedPlayer = this.players[playerIndex];
        const updatedRound = this.getCurrentRound();
        
        if (!updatedRound) {
          return false;
        }
        
        // 检查是否出完牌
        if (updatedPlayer.hand.length === 0) {
          this.addToFinishOrder(playerIndex);
          
          // 使用策略模式检查游戏是否应该结束
          const shouldEndGame = this.shouldGameEnd();
          
          if (shouldEndGame) {
            // 游戏结束，处理未完成的玩家
            const unfinishedPlayers = this.players.filter(
              p => p.hand.length > 0
            );
            
            // 按手牌数量排序
            unfinishedPlayers.sort((a, b) => {
              if (a.hand.length !== b.hand.length) {
                return a.hand.length - b.hand.length;
              }
              return a.id - b.id;
            });
            
            // 添加到finishOrder
            unfinishedPlayers.forEach(p => {
              if (!this.finishOrder.includes(p.id)) {
                this.addToFinishOrder(p.id);
              }
            });
            
            // 统一的游戏结束处理
            
            // 结束当前轮次（如果还没结束）
            if (!updatedRound.isEnded()) {
              const lastPlayPlayerIndex = updatedRound.getLastPlayPlayerIndex();
              const winnerIndex = lastPlayPlayerIndex !== null ? lastPlayPlayerIndex : lastPlayerIndex;
              const endResult = updatedRound.end(this.players, this.playerCount, winnerIndex);
              
              // 调试日志：检查轮次分数
              
              // 分配轮次分数（重要：必须调用 controller 分配分数）
              // 注意：即使 roundScore 为 0，也要分配（这一轮没有分牌，但赢家仍然"捡分"）
              if (endResult.winnerIndex !== null) {
                this.controller.allocateRoundScore(
                  updatedRound.roundNumber,
                  endResult.roundScore,
                  endResult.winnerIndex,
                  this.players,
                  updatedRound.toRecord()
                );
              } else {
              }
              
              // 注意：不要更新 endResult.updatedPlayers，因为：
              // 1. 分数已经由 allocateRoundScore 更新了
              // 2. endResult.updatedPlayers 不包含分数更新，会覆盖刚刚分配的分数
              // 3. 手牌等状态已经在出牌时更新了，不需要再次更新
              // endResult.updatedPlayers.forEach((p, i) => {
              //   if (i < this.players.length) {
              //     this.updatePlayer(i, p);
              //   }
              // });
              this.updateRound(this.currentRoundIndex, updatedRound);
            }
            
            // 结束游戏：计算最终分数和排名
            this.updateStatus(GameStatus.FINISHED);
            this.calculateFinalRankings();
            this.setWinner(this.finishOrder[0]); // 第一个出完的是获胜者
            
            // 【决策5】设置获胜团队
            if (this.teamConfig) {
              const winnerPlayer = this.players[this.finishOrder[0]];
              this.winningTeamId = winnerPlayer.teamId ?? null;
            } else {
              this.winningTeamId = null;
            }
            
            // 记录本局分数到累积积分系统
            if (this.finalRankings && this.finishOrder.length > 0) {
              const gameEndTime = Date.now();
              cumulativeScoreService.recordGameScore(
                this.gameId,
                this.gameStartTime,
                gameEndTime,
                this.players,
                this.finalRankings,
                this.finishOrder,
                this.finishOrder[0] // 头游是获胜者
              );
            }
            
            // 触发更新
            this.triggerUpdate();
            
            this.isProcessingPlayMap.delete(playerIndex);
            return true;
          } // end of if (shouldEndGame)
        } // end of if (updatedPlayer.hand.length === 0)
        
        // 注意：调度逻辑现在由 onAnnouncementComplete 回调处理
        // 报牌完成后会自动调用 onPlayCompleted
      }

      this.isProcessingPlayMap.delete(playerIndex);
      return result.status === 'completed';
    } catch (error) {
      this.isProcessingPlayMap.delete(playerIndex);
      return false;
    }
  }

  /**
   * 玩家要不起（核心逻辑）
   */
  async passCards(playerIndex: number): Promise<void> {
    const round = this.getCurrentRound();
    
    if (!round) {
      return;
    }

    // 先记录要不起到 Round（清除出牌计时器等）
    try {
      round.recordPass(playerIndex);
    } catch (error) {
      // 继续执行，不中断流程
    }

    // 播放"要不起"语音
    const player = this.players[playerIndex];
    if (player) {
      try {
        await announcePass(player.voiceConfig);
      } catch (error) {
        // 语音播放失败不应该阻止游戏继续
      }
    }

    // 交给 RoundScheduler 处理要不起后的调度逻辑
    this.initializeScheduler(); // 确保调度器已初始化
    if (this.scheduler) {
      await this.scheduler.onPassCompleted(
        playerIndex,
        round,
        this.players,
        this.playerCount,
            (updater) => {
              const updated = updater({
                rounds: this.rounds,
                players: this.players, // 这里传入的是已经更新过的 this.players（手牌已减少）
                currentRoundIndex: this.currentRoundIndex,
                currentPlayerIndex: this.currentPlayerIndex
              } as any);
              
              // 更新状态
              if (updated.rounds) {
                updated.rounds.forEach((r: Round, i: number) => {
                  if (i < this.rounds.length) {
                    this.updateRound(i, r);
                  }
                });
              }
              
              // 注意：onPlayCompleted 的 onStateUpdate 回调不返回 players
              // 因为 players 已经在 processPlayAsync 的 updateState 回调中更新了
              // RoundScheduler 的 onStateUpdate 只返回 rounds 和 currentPlayerIndex
              // 所以这里不应该再次更新 players
              
              if (updated.currentPlayerIndex !== undefined) {
                // 跳过自动出牌，因为调度器会处理
                this.updateCurrentPlayerIndex(updated.currentPlayerIndex, true);
              }
              
              // 触发UI更新，确保手牌变化被反映到UI
              this.triggerUpdate();
            },
        // 轮次结束回调（处理接风后的轮次结束和新轮次创建）
        async (endedRound: Round, players: Player[], nextPlayerIndex: number | null, savedWinnerIndex?: number | null) => {
          
          // 临时日志：onRoundEnd被调用
          console.log('[onRoundEnd] 被调用');
          console.log('[onRoundEnd] 接收参数 nextPlayerIndex:', nextPlayerIndex);
          console.log('[onRoundEnd] 接收参数 savedWinnerIndex:', savedWinnerIndex);
          
          // 结束当前轮次（分配分数等）
          if (!endedRound.isEnded()) {
            const winnerIndex = savedWinnerIndex !== null && savedWinnerIndex !== undefined 
              ? savedWinnerIndex 
              : (endedRound.getLastPlayPlayerIndex() ?? nextPlayerIndex ?? 0);
            
            console.log('[onRoundEnd] 计算的 winnerIndex:', winnerIndex);
            
            const endResult = endedRound.end(players, this.playerCount, winnerIndex);
            
            console.log('[onRoundEnd] endResult.winnerIndex:', endResult.winnerIndex);
            
            // 分配轮次分数（重要：必须调用 controller 分配分数）
            if (endResult.winnerIndex !== null) {
              this.controller.allocateRoundScore(
                endedRound.roundNumber,
                endResult.roundScore,
                endResult.winnerIndex,
                this.players,
                endedRound.toRecord()
              );
            }
            
            this.updateRound(this.currentRoundIndex, endedRound);
            
            // Game 自己决定下一个玩家（团队模式下优先队友接风）
            console.log('[队友接风] 调用 findNextPlayerForNewRound，输入 winnerIndex:', endResult.winnerIndex);
            console.log('[队友接风] 团队配置:', this.teamConfig);
            const actualNextPlayerIndex = this.findNextPlayerForNewRound(endResult.winnerIndex);
            console.log('[队友接风] 计算结果 actualNextPlayerIndex:', actualNextPlayerIndex);
            
            // 使用actualNextPlayerIndex而不是endResult.nextPlayerIndex
            nextPlayerIndex = actualNextPlayerIndex;
            
            // 调用记牌器结束轮次（重要：确保记牌器中的轮次状态正确更新）
            const roundRecord = endedRound.toRecord();
            const cardTrackerEnabled = this.config?.cardTrackerEnabled ?? (() => {
              const saved = localStorage.getItem('cardTrackerEnabled');
              return saved !== null ? saved === 'true' : false;
            })();
            
            if (cardTrackerEnabled && endResult.winnerIndex !== null) {
              try {
                const winner = this.players[endResult.winnerIndex];
                cardTracker.endRound(
                  endedRound.roundNumber,
                  winner?.id ?? endResult.winnerIndex,
                  winner?.name ?? roundRecord.winnerName ?? '未知',
                  endResult.roundScore,
                  this.players
                );
              } catch (error) {
              }
            }
          }
          
          // 如果还有下一个玩家，创建新轮次
          if (nextPlayerIndex !== null) {
            const latestGameConfig = getGameConfig();
            const newRoundNumber = this.rounds.length + 1;
            const newRound = Round.createNew(newRoundNumber, Date.now(), latestGameConfig.timingConfig || undefined);
            
            this.addRound(newRound);
            // 更新调度器的轮次号
            if (this.scheduler) {
              this.scheduler.updateRoundNumber(newRoundNumber);
            }
            
            // 记牌器：开始新轮次
            const cardTrackerEnabled = this.config?.cardTrackerEnabled ?? (() => {
              const saved = localStorage.getItem('cardTrackerEnabled');
              return saved !== null ? saved === 'true' : false;
            })();
            
            if (cardTrackerEnabled) {
              try {
                cardTracker.startRound(newRoundNumber, this.players);
              } catch (error) {
              }
            }
            
            // 重要：先触发一次更新，确保新轮次状态被React感知
            // 这样 playNextTurn 中的 getCurrentRound() 能获取到新轮次
            this.triggerUpdate();
            
            // 通知RoundScheduler处理下一个玩家（无论是什么类型）
            console.log('[新轮次] 准备调用 playNextTurn，下一个玩家索引:', nextPlayerIndex);
            if (nextPlayerIndex !== null) {
              await this.playNextTurn(nextPlayerIndex);
            } else {
              console.log('[新轮次] nextPlayerIndex为null，不调用playNextTurn');
            }
          } else {
            // 【决策6】nextPlayerIndex为null → 游戏应该结束
            // 这种情况发生在：队友接风时，整个团队都出完了
            
            // 检查游戏是否已经结束
            if (this.status !== GameStatus.FINISHED) {
              // 处理被关的玩家
              if (this.teamConfig) {
                const unfinishedPlayers = this.players.filter(p => p.hand.length > 0);
                
                // 按手牌数量排序
                unfinishedPlayers.sort((a, b) => {
                  if (a.hand.length !== b.hand.length) {
                    return a.hand.length - b.hand.length;
                  }
                  return a.id - b.id;
                });
                
                unfinishedPlayers.forEach(p => {
                  if (!this.finishOrder.includes(p.id)) {
                    this.addToFinishOrder(p.id);
                  }
                });
              }
              
              // 结束游戏
              this.updateStatus(GameStatus.FINISHED);
              this.calculateFinalRankings();
              this.setWinner(this.finishOrder[0]);
              
              // 设置获胜团队
              if (this.teamConfig) {
                const winnerPlayer = this.players[this.finishOrder[0]];
                this.winningTeamId = winnerPlayer.teamId ?? null;
              }
              
              // 记录累积分数
              if (this.finalRankings && this.finishOrder.length > 0) {
                const gameEndTime = Date.now();
                cumulativeScoreService.recordGameScore(
                  this.gameId,
                  this.gameStartTime,
                  gameEndTime,
                  this.players,
                  this.finalRankings,
                  this.finishOrder,
                  this.finishOrder[0]
                );
              }
            }
            
            // 触发更新
            this.triggerUpdate();
          }
        }
      );
    }
  }
}

