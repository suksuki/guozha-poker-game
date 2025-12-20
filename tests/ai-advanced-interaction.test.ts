import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MasterAIBrain } from '../src/ai-core/master-brain/MasterAIBrain';
import { GameBridge } from '../src/ai-core/integration/GameBridge';
import { StrategicAction } from '../src/ai-core/cognitive/IntentAnalyzer';

describe('AI Advanced Interaction', () => {
    let bridge: GameBridge;
    let masterBrain: MasterAIBrain;

    beforeEach(async () => {
        bridge = new GameBridge();
        const config = {
            aiPlayers: [
                { id: 1, personality: { preset: 'balanced' }, decisionModules: ['hybrid'], communicationEnabled: true },
                { id: 2, personality: { preset: 'aggressive' }, decisionModules: ['hybrid'], communicationEnabled: true },
                { id: 3, personality: { preset: 'balanced' }, decisionModules: ['hybrid'], communicationEnabled: true }
            ],
            llm: { enabled: false, endpoint: '', model: '' },
            dataCollection: { enabled: false, autoExport: false, exportInterval: 0 },
            performance: { enableCache: false, timeout: 5000 }
        };

        await bridge.getAPI().initialize(config as any);
        masterBrain = (bridge as any).masterBrain;
    });

    it('should capture user message and update shared cognitive intents', async () => {
        const userMessage = "等我出"; // "Wait for me"
        const playerId = 0; // Human player

        await bridge.getAPI().sendUserMessage(playerId, userMessage);

        // Check SharedCognitiveLayer
        const cognitive = masterBrain['sharedCognitive'];
        const intents = cognitive.getActiveIntents();

        expect(intents.has(playerId)).toBe(true);
        const playerIntents = intents.get(playerId);
        expect(playerIntents[0].action).toBe(StrategicAction.WAIT_FOR_ME);
    });

    it('should recognize "protect me" intent', async () => {
        await bridge.getAPI().sendUserMessage(0, "保我一下");

        const intents = masterBrain['sharedCognitive'].getActiveIntents();
        expect(intents.get(0)[0].action).toBe(StrategicAction.PROTECT_TEAMMATE);
    });

    it('should maintain history of messages in CommunicationScheduler', async () => {
        await bridge.getAPI().sendUserMessage(0, "加油");

        const scheduler = masterBrain['commScheduler'];
        const history = (scheduler as any).sessionHistories.get(1); // AI player 1

        expect(history.length).toBeGreaterThan(0);
        expect(history[history.length - 1].content).toContain("加油");
    });
});
