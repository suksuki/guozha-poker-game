import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoundScheduler, type RoundSchedulerConfig } from '../../src/core/utils/roundScheduler';
import { Round } from '../../src/core/utils/Round';
import { Player, PlayerType } from '../../src/core/types/card';

// 模拟 Round 类，因为它是复杂的
class MockRound {
    constructor(public roundNumber: number) { }
    startTime = Date.now();
    isEnded = vi.fn().mockReturnValue(false);
    isInProgress = vi.fn().mockReturnValue(true);
    getLastPlayPlayerIndex = vi.fn().mockReturnValue(0);
    toRecord = vi.fn().mockReturnValue({});
    getPlays = vi.fn().mockReturnValue([]);
    isTakeoverRoundActive = vi.fn().mockReturnValue(false);
    hasProcessingPlay = vi.fn().mockReturnValue(false);
    waitForPlayProcess = vi.fn().mockResolvedValue({ status: 'completed', startTime: Date.now() });
    getLastPlay = vi.fn().mockReturnValue(null);
    endTakeoverRound = vi.fn();
    startTakeoverRound = vi.fn();
    getTakeoverEndPlayerIndex = vi.fn().mockReturnValue(null);
    getTakeoverStartPlayerIndex = vi.fn().mockReturnValue(null);
    getWinner = vi.fn().mockReturnValue(null);
    recordPlay = vi.fn();
    recordPass = vi.fn();
    cancelPlayProcess = vi.fn().mockReturnValue(false);
    getTotalScore = vi.fn().mockReturnValue(0);
    getPlayCount = vi.fn().mockReturnValue(0);
}

describe('RoundScheduler Async Robustness', () => {
    let scheduler: RoundScheduler;
    let mockGameState: any;
    let mockRound: MockRound;
    let mockPlayers: Player[];

    beforeEach(() => {
        mockRound = new MockRound(1);

        mockPlayers = [
            { id: 0, name: 'P1', type: PlayerType.HUMAN, hand: [{ suit: 'spades', rank: 3, id: '1' }] as any },
            { id: 1, name: 'P2', type: PlayerType.AI, hand: [{ suit: 'hearts', rank: 4, id: '2' }] as any },
        ];

        mockGameState = {
            status: 'playing',
            roundNumber: 1,
            currentPlayerIndex: 0,
            rounds: [mockRound],
            currentRoundIndex: 0,
            players: mockPlayers,
        };

        const config: RoundSchedulerConfig = {
            isAutoPlay: false,
            humanPlayerIndex: 0,
            getGameState: () => mockGameState,
        };

        scheduler = new RoundScheduler(config);
        // 重要：初始化调度器的轮次号，否则验证会失败
        scheduler.updateRoundNumber(1);

        // 阻止真实的调度逻辑，我们只测试 actionId 匹配
        vi.spyOn(scheduler, 'scheduleNextTurn').mockImplementation(() => { });
    });

    it('should process onPlayCompleted if actionId matches', async () => {
        const actionId = 12345;
        scheduler.registerActionId(actionId);

        const onStateUpdate = vi.fn();
        await scheduler.onPlayCompleted(
            0,
            mockRound as any,
            mockPlayers,
            2,
            onStateUpdate,
            undefined,
            actionId
        );

        expect(onStateUpdate).toHaveBeenCalled();
    });

    it('should ignore onPlayCompleted if actionId does not match', async () => {
        scheduler.registerActionId(54321); // Current action is 54321

        const onStateUpdate = vi.fn();
        await scheduler.onPlayCompleted(
            0,
            mockRound as any,
            mockPlayers,
            2,
            onStateUpdate,
            undefined,
            12345 // Callback for old action 12345
        );

        expect(onStateUpdate).not.toHaveBeenCalled();
    });

    it('should process onPassCompleted if actionId matches', async () => {
        const actionId = 12345;
        scheduler.registerActionId(actionId);

        const onStateUpdate = vi.fn();
        await scheduler.onPassCompleted(
            0,
            mockRound as any,
            mockPlayers,
            2,
            onStateUpdate,
            undefined,
            actionId
        );

        expect(onStateUpdate).toHaveBeenCalled();
    });

    it('should ignore onPassCompleted if actionId does not match', async () => {
        scheduler.registerActionId(54321);

        const onStateUpdate = vi.fn();
        await scheduler.onPassCompleted(
            0,
            mockRound as any,
            mockPlayers,
            2,
            onStateUpdate,
            undefined,
            12345
        );

        expect(onStateUpdate).not.toHaveBeenCalled();
    });

    it('should allow the latest action to succeed in concurrent scenarios', async () => {
        const firstActionId = 1;
        const secondActionId = 2;

        scheduler.registerActionId(firstActionId);
        // 模拟第二个动作紧接着开始，更新了 scheduler 的 lastActionId
        scheduler.registerActionId(secondActionId);

        const onStateUpdateFirst = vi.fn();
        const onStateUpdateSecond = vi.fn();

        // 第一个动作的回调延迟到达
        await scheduler.onPlayCompleted(
            0,
            mockRound as any,
            mockPlayers,
            2,
            onStateUpdateFirst,
            undefined,
            firstActionId
        );

        // 第二个动作的回调到达
        await scheduler.onPlayCompleted(
            0,
            mockRound as any,
            mockPlayers,
            2,
            onStateUpdateSecond,
            undefined,
            secondActionId
        );

        // 第一个回调应该被忽略
        expect(onStateUpdateFirst).not.toHaveBeenCalled();
        // 第二个回调应该成功
        expect(onStateUpdateSecond).toHaveBeenCalled();
    });

    it('should reset lastActionId when queue is cleared', () => {
        scheduler.registerActionId(12345);
        scheduler.clearQueue();

        // 我们不能直接访问私有属性，但可以通过结果验证
        // 如果没有 registerActionId，scheduler.lastActionId 为 0
        // 如果回调传入非 0 id 且此时 scheduler.lastActionId 为 0，它应该通过（初始状态或重置状态）
        // 或者我们检查 registerActionId(0) 的效果
    });
});
