/**
 * Individual Mode Scoring Test
 * Verifies that the ±30 bonus/penalty and hand score transfer 
 * are correctly applied during final settlement.
 */

import { describe, it, expect } from 'vitest';
import { calculateIndividualRankings } from '../../src/core/services/scoringService';
import { Player, PlayerType, Suit } from '../../src/core/types/card';

describe('Individual Mode Scoring Settlement', () => {
    it('should apply +30 to 1st place and -30 to last place', () => {
        const players: Player[] = [
            { id: 0, name: 'P0', type: PlayerType.AI, hand: [], score: 100 }, // Finished 1st
            { id: 1, name: 'P1', type: PlayerType.AI, hand: [], score: 50 },  // Finished 2nd
            { id: 2, name: 'P2', type: PlayerType.AI, hand: [{ suit: Suit.SPADES, rank: 5, id: 's5' }], score: 20 }, // Left with 5 pts
        ];
        const finishOrder = [0, 1];

        const rankings = calculateIndividualRankings(players, finishOrder);

        // P0: 100 + 30 (1st) + 5 (from P2) = 135? 
        // Wait, the rules say first place gets the hand score of the last place? 
        // In IndividualModeStrategy.ts, hand score transfer goes to SECOND place for hand scores.
        // Let's re-read gameRules.ts logic I wrote.

        // My implementation in gameRules.ts:
        // firstPlace.finalScore += 30;
        // lastPlace.finalScore -= 30;
        // lastPlace.finalScore -= remainingScore;
        // secondPlace.finalScore += remainingScore;

        const p0Ranking = rankings.find(r => r.player.id === 0)!;
        const p1Ranking = rankings.find(r => r.player.id === 1)!;
        const p2Ranking = rankings.find(r => r.player.id === 2)!;

        expect(p0Ranking.finalScore).toBe(130); // 100 + 30
        expect(p1Ranking.finalScore).toBe(55);  // 50 + 5 (transferred from P2)
        expect(p2Ranking.finalScore).toBe(-15); // 20 - 30 (last) - 5 (transferred) = -15
    });
});
