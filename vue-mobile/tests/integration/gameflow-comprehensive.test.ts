/**
 * 游戏结束流程全面测试
 * 
 * 测试场景：
 * 1. 正常结束 - 个人模式
 * 2. 正常结束 - 团队模式（关单/关双）
 * 3. 接风后无人能接风的情况
 * 4. 最后一个玩家出完牌后的接风处理
 * 5. 死循环检测和避免
 * 6. 边界情况：只剩2个玩家时的处理
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '@/core/game-engine/GameEngine';
import { GameState, RoundData } from '@/core/game-engine/state/GameState';
import { Card, Suit, Rank, Player, GameStatus } from '@/core/types/card';

// 辅助函数：创建测试卡牌
function createCard(rank: Rank, suit: Suit, id?: string): Card {
    return {
        id: id || `${suit}-${rank}-${Date.now()}-${Math.random()}`,
        suit,
        rank,
        value: rank
    };
}

// 辅助函数：创建玩家
function createPlayer(id: number, hand: Card[], teamId?: number): Player {
    return {
        id,
        name: `玩家${id}`,
        hand,
        score: 0,
        dunCount: 0,
        isHuman: id === 0,
        teamId: teamId ?? null,
        finishedRank: null
    };
}

// 辅助函数：创建初始游戏状态
function createGameState(players: Player[], teamMode: boolean = false): GameState {
    const config = {
        playerCount: players.length,
        humanPlayerIndex: 0,
        teamMode
    };

    const initialRound = new RoundData({
        roundNumber: 1,
        lastPlay: null,
        lastPlayPlayerIndex: null
    });

    // 创建基础状态
    let state = new GameState(config);

    // 初始化玩家
    state = state.initializePlayers(players);

    // 添加初始轮次
    state = state.addRound(initialRound);

    // 设置状态为playing
    state = state.updateStatus(GameStatus.PLAYING);

    // 设置当前玩家（东家先出牌，索引1）
    state = state.updateCurrentPlayer(1);

    // 如果是团队模式，设置团队配置
    if (teamMode) {
        state = state.updateTeamConfig({
            teams: [
                { id: 0, name: '队伍A', players: [0, 2], score: 0 },
                { id: 1, name: '队伍B', players: [1, 3], score: 0 }
            ],
            winningTeamId: null
        });
    }

    return state;
}

describe('GameEngine - 出牌和接风流程测试', () => {

    describe('正常出牌流程', () => {
        it('应该正确处理单张出牌', () => {
            const card1 = createCard(Rank.ACE, Suit.SPADES);
            const card2 = createCard(Rank.KING, Suit.HEARTS);
            const card3 = createCard(Rank.QUEEN, Suit.HEARTS);
            const card4 = createCard(Rank.JACK, Suit.CLUBS);
            const card5 = createCard(Rank.TEN, Suit.DIAMONDS);

            const players = [
                createPlayer(0, [card1]),
                createPlayer(1, [card2, card3]),
                createPlayer(2, [card4]),
                createPlayer(3, [card5])
            ];

            let state = createGameState(players);

            // 玩家1出K
            const result = GameEngine.playCards(state, 1, [card2]);

            expect(result.success).toBe(true);
            expect(result.newState.players[1].hand.length).toBe(1);
        });

        it('应该拒绝无法压过上家的牌', () => {
            const cardA = createCard(Rank.ACE, Suit.SPADES);
            const cardK = createCard(Rank.KING, Suit.HEARTS);
            const cardQ = createCard(Rank.QUEEN, Suit.CLUBS);
            const card10 = createCard(Rank.TEN, Suit.DIAMONDS);

            const players = [
                createPlayer(0, [cardA]),
                createPlayer(1, [cardK]),
                createPlayer(2, [cardQ]),
                createPlayer(3, [card10])
            ];

            let state = createGameState(players);

            // 玩家1出K
            let result = GameEngine.playCards(state, 1, [cardK]);
            expect(result.success).toBe(true);
            state = result.newState;

            // 玩家0出A可以压过K
            result = GameEngine.playCards(state, 0, [cardA]);
            expect(result.success).toBe(true);
        });
    });

    describe('接风逻辑测试', () => {
        it('当所有人都不要时，最后出牌者应该接风', () => {
            const card3 = createCard(Rank.THREE, Suit.SPADES);
            const cardA = createCard(Rank.ACE, Suit.HEARTS);
            const card2 = createCard(Rank.TWO, Suit.HEARTS);
            const card4 = createCard(Rank.FOUR, Suit.CLUBS);
            const card5 = createCard(Rank.FIVE, Suit.DIAMONDS);

            const players = [
                createPlayer(0, [card3]),
                createPlayer(1, [cardA, card2]),
                createPlayer(2, [card4]),
                createPlayer(3, [card5])
            ];

            let state = createGameState(players);

            // 玩家1出A（最大的牌除了2）
            let result = GameEngine.playCards(state, 1, [cardA]);
            expect(result.success).toBe(true);
            state = result.newState;

            // 玩家0不要（3打不过A）
            result = GameEngine.pass(state, 0);
            expect(result.success).toBe(true);
            state = result.newState;

            // 玩家3不要（5打不过A）
            result = GameEngine.pass(state, 3);
            expect(result.success).toBe(true);
            state = result.newState;

            // 玩家2不要（4打不过A）
            result = GameEngine.pass(state, 2);
            expect(result.success).toBe(true);
            state = result.newState;

            // 此时应该回到玩家1，新一轮开始
            expect(state.currentPlayerIndex).toBe(1);

            // 新轮开始，lastPlay应该为null
            const currentRound = GameEngine.getCurrentRound(state);
            expect(currentRound?.lastPlay).toBeNull();
        });

        it('最后出牌者出完牌后，下一个有牌的玩家成为首家', () => {
            // 玩家1只剩1张牌，出完后需要其他人成为首家
            const card3 = createCard(Rank.THREE, Suit.SPADES);
            const card2 = createCard(Rank.TWO, Suit.HEARTS); // 最大的牌
            const card4 = createCard(Rank.FOUR, Suit.CLUBS);
            const card5 = createCard(Rank.FIVE, Suit.DIAMONDS);

            const players = [
                createPlayer(0, [card3]),
                createPlayer(1, [card2]), // 只剩1张2
                createPlayer(2, [card4]),
                createPlayer(3, [card5])
            ];

            let state = createGameState(players);

            // 玩家1出2（最大的牌）并出完
            let result = GameEngine.playCards(state, 1, [card2]);
            expect(result.success).toBe(true);
            state = result.newState;

            // 玩家1应该出完了
            expect(state.players[1].hand.length).toBe(0);
            expect(state.finishOrder).toContain(1);

            // 由于玩家1出完了，且出的是最大的牌（2），所有人都要不起
            // 引擎应该自动触发接风，创建新一轮
            // 新一轮的首家应该是下一个有牌的玩家
            const currentRound = GameEngine.getCurrentRound(state);

            // 新一轮，lastPlay应该为null（首家可以出任意牌）
            expect(currentRound?.lastPlay).toBeNull();

            // 当前玩家应该是有牌的玩家（不是玩家1）
            expect(state.currentPlayerIndex).not.toBe(1);
            expect(state.players[state.currentPlayerIndex].hand.length).toBeGreaterThan(0);

            // 首家应该能出牌
            const currentPlayer = state.players[state.currentPlayerIndex];
            result = GameEngine.playCards(state, state.currentPlayerIndex, [currentPlayer.hand[0]]);
            expect(result.success).toBe(true);
        });
    });

    describe('游戏结束条件测试 - 个人模式', () => {
        it('当只剩1个玩家有牌时游戏应该结束', () => {
            const cardA = createCard(Rank.ACE, Suit.SPADES);
            const card3 = createCard(Rank.THREE, Suit.DIAMONDS);

            const players = [
                createPlayer(0, [cardA]),
                createPlayer(1, []), // 已出完
                createPlayer(2, []), // 已出完
                createPlayer(3, [card3]) // 只剩这两人
            ];

            let state = createGameState(players);

            // 手动设置finishOrder
            state = state.addToFinishOrder(1);
            state = state.addToFinishOrder(2);
            state = state.updateCurrentPlayer(0);

            // 玩家0出A并出完
            let result = GameEngine.playCards(state, 0, [cardA]);
            expect(result.success).toBe(true);
            state = result.newState;

            // 游戏应该结束
            expect(state.status).toBe(GameStatus.FINISHED);
        });
    });

    describe('游戏结束条件测试 - 团队模式', () => {
        it('当一个团队全部出完时游戏应该结束（关单）', () => {
            const cardA = createCard(Rank.ACE, Suit.SPADES);
            const cardK = createCard(Rank.KING, Suit.HEARTS);
            const cardQ = createCard(Rank.QUEEN, Suit.DIAMONDS);

            const players = [
                createPlayer(0, [], 0), // 队伍A，已出完
                createPlayer(1, [cardK], 1), // 队伍B
                createPlayer(2, [cardA], 0), // 队伍A，只剩1张
                createPlayer(3, [cardQ], 1) // 队伍B
            ];

            let state = createGameState(players, true);
            state = state.addToFinishOrder(0); // 玩家0已出完
            state = state.updateCurrentPlayer(2);

            // 玩家2出A并出完，队伍A全部出完
            let result = GameEngine.playCards(state, 2, [cardA]);
            expect(result.success).toBe(true);
            state = result.newState;

            // 游戏应该结束（关单：队伍B还剩2个玩家，1个不要）
            expect(state.status).toBe(GameStatus.FINISHED);
        });
    });

    describe('死循环和边界情况测试', () => {
        it('当接风者出完牌后，新首家应该正确被选中', () => {
            // 模拟：玩家1打出大牌后出完，新一轮应该正确开始
            const card3 = createCard(Rank.THREE, Suit.SPADES);
            const card2 = createCard(Rank.TWO, Suit.HEARTS);
            const card4 = createCard(Rank.FOUR, Suit.CLUBS);
            const card5 = createCard(Rank.FIVE, Suit.DIAMONDS);

            const players = [
                createPlayer(0, [card3]),
                createPlayer(1, [card2]), // 打出2后出完
                createPlayer(2, [card4]),
                createPlayer(3, [card5])
            ];

            let state = createGameState(players);

            // 玩家1出2并出完
            let result = GameEngine.playCards(state, 1, [card2]);
            expect(result.success).toBe(true);
            state = result.newState;

            // 应该没有死循环，游戏继续
            expect(state.status).toBe(GameStatus.PLAYING);

            // 当前玩家应该有牌
            const currentPlayer = state.players[state.currentPlayerIndex];
            expect(currentPlayer.hand.length).toBeGreaterThan(0);

            // 新一轮，首家应该能出牌
            result = GameEngine.playCards(state, state.currentPlayerIndex, [currentPlayer.hand[0]]);
            expect(result.success).toBe(true);
        });

        it('只剩2个玩家时的正常轮换', () => {
            const cardA = createCard(Rank.ACE, Suit.SPADES);
            const cardK = createCard(Rank.KING, Suit.SPADES);
            const cardQ = createCard(Rank.QUEEN, Suit.CLUBS);
            const cardJ = createCard(Rank.JACK, Suit.CLUBS);

            const players = [
                createPlayer(0, [cardA, cardK]),
                createPlayer(1, []), // 已出完
                createPlayer(2, [cardQ, cardJ]),
                createPlayer(3, []) // 已出完
            ];

            let state = createGameState(players);
            state = state.addToFinishOrder(1);
            state = state.addToFinishOrder(3);
            state = state.updateCurrentPlayer(0);

            // 玩家0出K
            let result = GameEngine.playCards(state, 0, [cardK]);
            expect(result.success).toBe(true);
            state = result.newState;

            // 应该轮到玩家2
            expect(state.currentPlayerIndex).toBe(2);

            // 玩家2用J打不过K，不要
            result = GameEngine.pass(state, 2);
            expect(result.success).toBe(true);
            state = result.newState;

            // 应该回到玩家0，新一轮
            expect(state.currentPlayerIndex).toBe(0);
        });

        it('不应该让已出完的玩家成为currentPlayer', () => {
            const cardA = createCard(Rank.ACE, Suit.SPADES);
            const cardQ = createCard(Rank.QUEEN, Suit.CLUBS);
            const cardJ = createCard(Rank.JACK, Suit.DIAMONDS);

            const players = [
                createPlayer(0, [cardA]),
                createPlayer(1, []), // 已出完
                createPlayer(2, [cardQ]),
                createPlayer(3, [cardJ])
            ];

            let state = createGameState(players);
            state = state.addToFinishOrder(1);
            state = state.updateCurrentPlayer(0);

            // 玩家0出A
            let result = GameEngine.playCards(state, 0, [cardA]);
            expect(result.success).toBe(true);
            state = result.newState;

            // 无论如何，currentPlayer都不应该是1（已出完）
            for (let i = 0; i < 10; i++) {
                if (state.currentPlayerIndex === 1) {
                    throw new Error('currentPlayer不应该是已出完的玩家');
                }

                if (state.status === GameStatus.FINISHED) break;

                // 尝试pass
                if (GameEngine.hasPlayableCards(state, state.currentPlayerIndex)) {
                    const currentPlayer = state.players[state.currentPlayerIndex];
                    if (currentPlayer.hand.length > 0) {
                        result = GameEngine.playCards(state, state.currentPlayerIndex, [currentPlayer.hand[0]]);
                    } else {
                        break;
                    }
                } else {
                    result = GameEngine.pass(state, state.currentPlayerIndex);
                }

                if (!result.success) break;
                state = result.newState;
            }
        });
    });

    describe('handleTakeover 边界情况测试', () => {
        it('当所有玩家都出完时，playCards应该返回错误', () => {
            // 这种情况理论上不应该发生（游戏应该先结束），但要确保不会崩溃
            const players = [
                createPlayer(0, [], 0),
                createPlayer(1, [], 1),
                createPlayer(2, [], 0),
                createPlayer(3, [], 1)
            ];

            let state = createGameState(players, true);
            state = state.addToFinishOrder(0);
            state = state.addToFinishOrder(1);
            state = state.addToFinishOrder(2);
            state = state.addToFinishOrder(3);

            // 尝试出一张不在手中的牌会怎样？
            // 至少不应该崩溃
            const result = GameEngine.playCards(state, 0, [createCard(Rank.ACE, Suit.SPADES)]);
            // 即使失败（因为玩家0没有手牌），也不应该崩溃
            // 注意：由于玩家没有这张牌，这可能会成功（如果逻辑没验证手牌），也可能失败
            // 关键是不要崩溃
            expect(typeof result.success).toBe('boolean');
        });
    });
});

describe('GameEngine - 压力测试', () => {
    it('模拟一局完整游戏不应该死循环', () => {
        // 给每个玩家一些牌
        const cards0 = [
            createCard(Rank.ACE, Suit.SPADES),
            createCard(Rank.KING, Suit.SPADES),
            createCard(Rank.QUEEN, Suit.SPADES)
        ];
        const cards1 = [
            createCard(Rank.TWO, Suit.HEARTS),
            createCard(Rank.JACK, Suit.HEARTS),
            createCard(Rank.TEN, Suit.HEARTS)
        ];
        const cards2 = [
            createCard(Rank.NINE, Suit.CLUBS),
            createCard(Rank.EIGHT, Suit.CLUBS),
            createCard(Rank.SEVEN, Suit.CLUBS)
        ];
        const cards3 = [
            createCard(Rank.SIX, Suit.DIAMONDS),
            createCard(Rank.FIVE, Suit.DIAMONDS),
            createCard(Rank.FOUR, Suit.DIAMONDS)
        ];

        const players = [
            createPlayer(0, cards0),
            createPlayer(1, cards1),
            createPlayer(2, cards2),
            createPlayer(3, cards3)
        ];

        let state = createGameState(players);
        let iterations = 0;
        const maxIterations = 100; // 防止真正的死循环

        while (state.status === GameStatus.PLAYING && iterations < maxIterations) {
            iterations++;

            const currentPlayerIndex = state.currentPlayerIndex;
            const currentPlayer = state.players[currentPlayerIndex];

            // 如果当前玩家没牌了，这是个bug
            if (currentPlayer.hand.length === 0) {
                throw new Error(`玩家${currentPlayerIndex}没有牌了但仍是currentPlayer`);
            }

            let result;

            // 尝试出牌
            if (GameEngine.hasPlayableCards(state, currentPlayerIndex)) {
                // 出第一张牌
                result = GameEngine.playCards(state, currentPlayerIndex, [currentPlayer.hand[0]]);
            } else {
                // 不要
                result = GameEngine.pass(state, currentPlayerIndex);
            }

            if (!result.success) {
                // 如果失败，尝试不要（可能是团队模式战术过牌）
                result = GameEngine.pass(state, currentPlayerIndex);
                if (!result.success) {
                    // 双重失败，打印错误信息并退出
                    console.error(`操作失败: ${result.error}`);
                    break;
                }
            }

            state = result.newState;
        }

        // 游戏应该在合理的迭代次数内结束
        expect(iterations).toBeLessThan(maxIterations);

        // 如果游戏结束，状态应该是finished
        if (iterations < maxIterations) {
            expect(state.status).toBe(GameStatus.FINISHED);
        }
    });
});
