/**
 * Game - 游戏类（包装器）
 * 
 * 职责：
 * - 包装GameState，提供便捷的访问接口
 * - 调用GameEngine处理游戏逻辑
 * - 对外暴露简单易用的API
 * 
 * 设计原则：
 * - 持有GameState（内部状态）
 * - 通过GameEngine更新状态（保持不可变性）
 * - 只被Vue Store使用，不被其他模块依赖
 */

import { GameState } from './state/GameState';
import { GameEngine } from './GameEngine';
import { DealingModule } from './modules/DealingModule';
import { RoundData } from './round/RoundData';
import type { Card, Player, PlayerType } from '@/core/types/card';
import { TeamConfig, Team, PlayerDirection } from '../types/team';

/**
 * 游戏配置
 */
export interface GameConfig {
  playerCount: number;
  humanPlayerIndex: number;
  teamMode: boolean;
  gameMode?: 'individual' | 'team';
}

/**
 * 游戏类
 */
export class Game {
  private _state: GameState;

  constructor(config: GameConfig) {
    this._state = new GameState({
      playerCount: config.playerCount,
      humanPlayerIndex: config.humanPlayerIndex,
      teamMode: config.teamMode
    });
  }

  // ========== 状态访问（便捷getter）==========

  /**
   * 获取内部状态（用于序列化、调试等）
   */
  get state(): GameState {
    return this._state;
  }

  /**
   * 玩家列表
   */
  get players(): readonly Player[] {
    return this._state.players;
  }

  /**
   * 当前玩家索引
   */
  get currentPlayerIndex(): number {
    return this._state.currentPlayerIndex;
  }

  /**
   * 当前玩家
   */
  get currentPlayer(): Player | null {
    return this._state.players[this._state.currentPlayerIndex] || null;
  }

  /**
   * 人类玩家
   */
  get humanPlayer(): Player | null {
    return this._state.players.find(p => p.isHuman) || null;
  }

  /**
   * 当前回合
   */
  get currentRound(): RoundData | null {
    if (this._state.currentRoundIndex < 0 || this._state.currentRoundIndex >= this._state.rounds.length) {
      return null;
    }
    return this._state.rounds[this._state.currentRoundIndex];
  }

  /**
   * 所有回合
   */
  get rounds(): readonly RoundData[] {
    return this._state.rounds;
  }

  /**
   * 游戏状态
   */
  get status(): string {
    return this._state.status;
  }

  /**
   * 完成顺序
   */
  get finishOrder(): readonly number[] {
    return this._state.finishOrder;
  }

  /**
   * 当前回合分数
   */
  get roundScore(): number {
    return GameEngine.getRoundScore(this._state);
  }

  // ========== 游戏操作（调用GameEngine）==========

  /**
   * 开始游戏
   */
  startGame(): void {

    // 生成游戏ID
    const gameId = `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let state = this._state.initializeGame(gameId, Date.now());

    // 初始化玩家
    const newPlayers = [0, 1, 2, 3].map(id => ({
      id,
      name: id === 0 ? '你' : `AI玩家${id}`,
      type: (id === 0 ? 'human' : 'ai') as PlayerType,
      hand: [],
      score: 0,
      isHuman: id === 0,
      finishedRank: null,
      dunCount: 0
    }));

    state = state.initializePlayers(newPlayers);

    // 如果是团队模式，初始化队伍配置和玩家TeamID
    if (state.config.teamMode) {
      const teamA: Team = {
        id: 0,
        name: '以绪塔尔', // 0, 2 (South, North)
        players: [0, 2],
        teamScore: 0,
        roundScore: 0,
        roundsWon: 0,
        totalScoreEarned: 0
      };

      const teamB: Team = {
        id: 1,
        name: '皮尔特沃夫', // 1, 3 (East, West)
        players: [1, 3],
        teamScore: 0,
        roundScore: 0,
        roundsWon: 0,
        totalScoreEarned: 0
      };

      const teamConfig: TeamConfig = {
        playerCount: 4,
        teams: [teamA, teamB],
        humanPlayerTeam: 0,
        humanPlayerDirection: PlayerDirection.SOUTH
      };

      state = state.updateTeamConfig(teamConfig);

      // 更新玩家TeamID
      const playersWithTeam = state.players.map(p => ({
        ...p,
        teamId: p.id % 2 // 0,2 -> 0; 1,3 -> 1
      }));

      state = state.initializePlayers(playersWithTeam);
    }

    // 发牌
    const { updatedState, hands } = DealingModule.dealAndUpdateState(state);
    state = updatedState;

    // 开始游戏
    state = state.updateStatus('playing' as any);

    // 创建第一回合
    state = state.addRound(new RoundData({ roundNumber: 1 }));

    this._state = state;

  }

  /**
   * 出牌
   */
  playCards(playerIndex: number, cards: Card[]): { success: boolean; message: string } {
    // console.log(`[TEAM_DEBUG] Game.playCards: 开始, playerIndex=${playerIndex}, currentPlayerIndex=${this._state.currentPlayerIndex}, cards=${cards.length}`);
    const result = GameEngine.playCards(this._state, playerIndex, cards);

    if (result.success) {
      const oldCurrentPlayer = this._state.currentPlayerIndex;
      this._state = result.newState;
      const newCurrentPlayer = this._state.currentPlayerIndex;
      // console.log(`[TEAM_DEBUG] Game.playCards: 状态更新成功, oldCurrentPlayer=${oldCurrentPlayer}, newCurrentPlayer=${newCurrentPlayer}`);
      // 触发更新回调
      this.triggerUpdate();
    } else {
      // console.error(`[TEAM_DEBUG] Game.playCards: 出牌失败, error=${result.error}`);
    }

    return {
      success: result.success,
      message: result.message || result.error || ''
    };
  }

  /**
   * 不要
   */
  pass(playerIndex: number): { success: boolean; message: string } {
    const result = GameEngine.pass(this._state, playerIndex);

    if (result.success) {
      this._state = result.newState;
      // 触发更新回调
      this.triggerUpdate();
    }

    return {
      success: result.success,
      message: result.message || result.error || ''
    };
  }

  /**
   * 检查玩家是否有牌可出
   */
  hasPlayableCards(playerIndex: number): boolean {
    return GameEngine.hasPlayableCards(this._state, playerIndex);
  }

  /**
   * 重置游戏
   */
  reset(): void {
    // 创建全新的Game实例
    const config = this._state.config;
    this._state = new GameState(config);

    // 初始化新的gameId
    this._state = this._state.initializeGame(
      `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      Date.now()
    );
  }

  // ========== Vue 更新回调 ==========
  private onUpdateCallback?: (game: Game) => void;

  /**
   * 设置 Vue 更新回调
   */
  setOnUpdate(callback: (game: Game) => void): void {
    this.onUpdateCallback = callback;
  }

  /**
   * 触发更新（内部方法）
   */
  private triggerUpdate(): void {
    if (this.onUpdateCallback) {
      this.onUpdateCallback(this);
    }
  }
}

