
import { describe, it, expect } from 'vitest';
import { SimulatedTrainingEnv, GameConfig } from '@/core/ai/training/SimulatedTrainingEnv';
import { AIConfigStore } from '@/core/ai/config/AIConfigStore';

describe('AI Training Simulation', () => {
    it('should run a batch of 3v3 games and report stats', async () => {
        // Setup Config for 3v3
        const gameConfig: GameConfig = {
            playerCount: 6,
            humanPlayerIndex: -1, // All AI
            teamMode: true,
            gameMode: 'team'
        };

        // Tune AI for 3v3 (Example: Optimize for team play)
        AIConfigStore.saveConfig({
            teamScoreWeight: 3.0,
            cooperationWeight: 2.0
        }, true, 6);

        const env = new SimulatedTrainingEnv();
        await env.initialize();

        console.log('Starting 3v3 Training Batch...');
        const GAME_COUNT = 1; // Small batch for test
        const results = await env.runBatch(GAME_COUNT, gameConfig);

        const winRateTeamA = results.filter(r => r.winnerTeam === 0).length / GAME_COUNT;
        const winRateTeamB = results.filter(r => r.winnerTeam === 1).length / GAME_COUNT;

        console.log(`Training Complete.`);
        console.log(`Games: ${GAME_COUNT}`);
        console.log(`Team A Win Rate: ${(winRateTeamA * 100).toFixed(1)}%`);
        console.log(`Team B Win Rate: ${(winRateTeamB * 100).toFixed(1)}%`);
        console.log(`Avg Rounds: ${results.reduce((s, r) => s + r.roundCount, 0) / GAME_COUNT}`);
        console.log(`Total Mistakes: ${results.reduce((s, r) => s + r.mistakes, 0)}`);

        expect(results.length).toBe(GAME_COUNT);

        // Cleanup
        await env.shutdown();
    }, 60000); // 60s timeout
});
