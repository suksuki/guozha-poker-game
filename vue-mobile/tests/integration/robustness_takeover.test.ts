import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '@/core/game-engine/GameEngine';
import { GameState } from '@/core/game-engine/state/GameState';
import { RoundData } from '@/core/game-engine/round/RoundData';
import { Card, Suit, Rank } from '@/core/types/card';

// 辅助函数：创建模拟卡牌
function createMockCard(id: string, rank: Rank = Rank.THREE, suit: Suit = Suit.SPADES): Card {
    return { id, rank, suit };
}

describe('GameEngine 鲁棒性集成测试 - 接风与流转', () => {
    let initialState: GameState;

    beforeEach(() => {
        initialState = new GameState({
            playerCount: 4,
            humanPlayerIndex: 0,
            teamMode: false
        });

        // 初始化玩家
        const players = [0, 1, 2, 3].map(id => ({
            id,
            name: `Player ${id}`,
            type: id === 0 ? 'human' : 'ai',
            hand: [createMockCard(`c-${id}-1`), createMockCard(`c-${id}-2`)],
            score: 0,
            isHuman: id === 0,
            finishedRank: null,
            dunCount: 0
        }));

        initialState = initialState.initializePlayers(players as any);
        initialState = initialState.addRound(new RoundData({ roundNumber: 1 }));
        initialState = initialState.updateStatus('playing' as any);
        initialState = initialState.updateCurrentPlayer(1); // 从玩家1开始
    });

    it('正常流转：玩家1出牌，玩家2不要，应该正确流向下一家', () => {
        // 玩家1出牌
        const card1 = initialState.players[1].hand[0];
        const res1 = GameEngine.playCards(initialState, 1, [card1]);
        expect(res1.success).toBe(true);
        let state = res1.newState;

        // 应该轮到玩家2
        expect(state.currentPlayerIndex).toBe(2);

        // 玩家2不要（Pass）
        const res2 = GameEngine.pass(state, 2);
        expect(res2.success).toBe(true);
        state = res2.newState;

        // 应该轮到玩家3
        expect(state.currentPlayerIndex).toBe(3);
    });

    it('回环判定：三家不要，回到出牌人，触发本轮结算', () => {
        // 1. 玩家 1 出牌 (ID: c-1-1)
        const card = initialState.players[1].hand[0];
        let state = GameEngine.playCards(initialState, 1, [card]).newState;

        // 2. 玩家 2 不要
        state = GameEngine.pass(state, 2).newState;
        // 3. 玩家 3 不要
        state = GameEngine.pass(state, 3).newState;
        // 4. 玩家 0 不要
        state = GameEngine.pass(state, 0).newState;

        // 此时应该检测到回环，触发 handleTakeover
        expect(state.rounds.length).toBe(2);
        expect(state.currentPlayerIndex).toBe(1);
        expect(state.rounds[0].isFinished).toBe(true);
        expect(state.rounds[0].winnerId).toBe(1);
    });

    it('接风逻辑（个人模式）：赢家走掉后，权力正确继承给下一位有牌玩家', () => {
        // 模拟玩家1只剩一张牌，出完跑路
        const p1hand = initialState.players[1].hand;
        let state = GameEngine.playCards(initialState, 1, p1hand).newState;

        expect(state.players[1].hand.length).toBe(0);

        // 玩家2, 3, 0都不要
        state = GameEngine.pass(state, 2).newState;
        state = GameEngine.pass(state, 3).newState;
        state = GameEngine.pass(state, 0).newState;

        // 此时玩家1赢了本轮，但已跑路
        // 预期：接风发生，逆时针找到玩家2
        expect(state.rounds.length).toBe(2);
        expect(state.currentPlayerIndex).toBe(2);
    });

    it('团队模式：赢家跑路，权力严格继承给队友，无队友则平局/结束', () => {
        // 开启团队模式 (0,2 vs 1,3)
        let teamState = new GameState({
            playerCount: 4,
            humanPlayerIndex: 0,
            teamMode: true
        });

        const mockTeamConfig = {
            playerCount: 4,
            teams: [
                { id: 0, name: 'Team A', players: [0, 2], teamScore: 0, roundScore: 0, roundsWon: 0, totalScoreEarned: 0 },
                { id: 1, name: 'Team B', players: [1, 3], teamScore: 0, roundScore: 0, roundsWon: 0, totalScoreEarned: 0 }
            ],
            humanPlayerTeam: 0
        };
        teamState = teamState.updateTeamConfig(mockTeamConfig as any);

        // 为玩家分配队伍 ID
        const players = [0, 1, 2, 3].map(id => ({
            id,
            name: `Player ${id}`,
            type: id === 0 ? 'human' : 'ai',
            hand: [createMockCard(`t-${id}-1`)],
            score: 0,
            isHuman: id === 0,
            teamId: id % 2, // 0,2 为队0; 1,3 为队1
            finishedRank: null,
            dunCount: 0
        }));

        teamState = teamState.initializePlayers(players as any);
        teamState = teamState.addRound(new RoundData({ roundNumber: 1 }));
        teamState = teamState.updateStatus('playing' as any);
        teamState = teamState.updateCurrentPlayer(1);

        // 1. 玩家 1 出完所有牌 (队1)
        teamState = GameEngine.playCards(teamState, 1, teamState.players[1].hand).newState;

        // 2. 及其下家 2, 3, 0 都不要
        teamState = GameEngine.pass(teamState, 2).newState;
        teamState = GameEngine.pass(teamState, 3).newState;
        teamState = GameEngine.pass(teamState, 0).newState;

        // 玩家 1 赢了本轮，但没牌了。队友是 3 号。
        expect(teamState.rounds.length).toBe(2);
        expect(teamState.currentPlayerIndex).toBe(3);
    });

    it('游戏结束判定：当队友全部撤离，接风判定应触发游戏结束', () => {
        // 开启团队模式
        let teamState = new GameState({
            playerCount: 4,
            humanPlayerIndex: 0,
            teamMode: true
        });

        const mockTeamConfig = {
            playerCount: 4,
            teams: [
                { id: 0, name: 'Team A', players: [0, 2], teamScore: 0, roundScore: 0, roundsWon: 0, totalScoreEarned: 0 },
                { id: 1, name: 'Team B', players: [1, 3], teamScore: 0, roundScore: 0, roundsWon: 0, totalScoreEarned: 0 }
            ],
            humanPlayerTeam: 0
        };
        teamState = teamState.updateTeamConfig(mockTeamConfig as any);

        // 模拟队1 (1,3) 已经全部没牌了
        const players = [0, 1, 2, 3].map(id => ({
            id,
            name: `Player ${id}`,
            type: 'ai',
            hand: [1, 3].includes(id) ? [] : [createMockCard(`e-${id}-1`)],
            score: 0,
            isHuman: id === 0,
            teamId: id % 2,
            finishedRank: [1, 3].includes(id) ? 1 : null,
            dunCount: 0
        }));

        teamState = teamState.initializePlayers(players as any);
        // 假设本轮是玩家1赢了，且他是最后一个出的
        const round = new RoundData({
            roundNumber: 5,
            lastPlay: [createMockCard('any')],
            lastPlayPlayerIndex: 1
        });
        teamState = teamState.addRound(round);
        teamState = teamState.updateStatus('playing' as any);
        teamState = teamState.updateCurrentPlayer(2); // 下一个是玩家2

        // 此时执行玩家2 pass，会检测到回环回到1
        let state = GameEngine.pass(teamState, 2).newState;
        state = GameEngine.pass(state, 0).newState;

        expect(state.status).toBe('finished');
    });
});
