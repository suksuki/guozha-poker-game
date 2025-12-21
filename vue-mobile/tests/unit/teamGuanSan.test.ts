/**
 * Team Mode 3v3 Guan San Test
 * Verifies that when 3 players from the same team remain with cards,
 * they are correctly penalized (-10 each) and scores transfer to the 1st winner.
 */

import { describe, it, expect } from 'vitest';
import { applyTeamFinalRules } from '../../src/core/services/scoringService';
import { Player, PlayerType, Suit } from '../../src/core/types/card';
import { TeamConfig, PlayerDirection } from '../../src/core/types/team';

describe('Team Mode 3v3 Guan San Settlement', () => {
    it('should penalize 3 losers and transfer scores to the 1st winner', () => {
        // 3v3: 0, 2, 4 vs 1, 3, 5
        const players: Player[] = [
            { id: 0, name: 'P0', type: PlayerType.AI, hand: [], score: 100, teamId: 0 }, // 1st Place
            { id: 1, name: 'P1', type: PlayerType.AI, hand: [{ suit: Suit.SPADES, rank: 5, id: 's5' }], score: 10, teamId: 1 },
            { id: 2, name: 'P2', type: PlayerType.AI, hand: [], score: 50, teamId: 0 },  // 2nd Place
            { id: 3, name: 'P3', type: PlayerType.AI, hand: [{ suit: Suit.SPADES, rank: 10, id: 's10' }], score: 20, teamId: 1 },
            { id: 4, name: 'P4', type: PlayerType.AI, hand: [], score: 30, teamId: 0 },  // 3rd Place
            { id: 5, name: 'P5', type: PlayerType.AI, hand: [{ suit: Suit.HEARTS, rank: 13, id: 'h13' }], score: 30, teamId: 1 },
        ];

        // Finished Order: 0, 2, 4 (Team A swept Team B)
        const finishOrder = [0, 2, 4];

        const teams = [
            { id: 0, name: 'Team A', players: [0, 2, 4], teamScore: 0, roundScore: 0, roundsWon: 0, totalScoreEarned: 0 },
            { id: 1, name: 'Team B', players: [1, 3, 5], teamScore: 0, roundScore: 0, roundsWon: 0, totalScoreEarned: 0 }
        ];

        const teamConfig: TeamConfig = {
            teams,
            playerCount: 6,
            humanPlayerTeam: 0,
            humanPlayerDirection: PlayerDirection.SOUTH
        };

        const result = applyTeamFinalRules(teams, finishOrder, players, teamConfig);

        const p0 = result.finalPlayers.find(p => p.id === 0) as any;
        const p1 = result.finalPlayers.find(p => p.id === 1) as any;
        const p3 = result.finalPlayers.find(p => p.id === 3) as any;
        const p5 = result.finalPlayers.find(p => p.id === 5) as any;

        // P0: 100 (base) + (10+20+30) (transferred hand scores) + 30 (Guan San bonus) 
        // + (5+10+10) (remaining cards points from losers) = 190 + 25 = 215
        // Final score = 215 - 100 (base deduction) = 115
        expect(p0.finalScore).toBe(115);

        // P1: (Score becomes 0 during transfer) - 10 (Guan San penalty) - 100 (base deduction) = -110
        expect(p1.finalScore).toBe(-110);
        expect(p3.finalScore).toBe(-110);
        expect(p5.finalScore).toBe(-110);

        // Winners P2 and P4:
        // P2: 50 - 100 = -50
        // P4: 30 - 100 = -70
        const p2 = result.finalPlayers.find(p => p.id === 2) as any;
        const p4 = result.finalPlayers.find(p => p.id === 4) as any;
        expect(p2.finalScore).toBe(-50);
        expect(p4.finalScore).toBe(-70);

        // Team Total: 115 + (-50) + (-70) = -5
        // Team B Total: -110 * 3 = -330
        expect(result.teams[0].teamScore).toBe(-5);
        expect(result.teams[1].teamScore).toBe(-330);
    });
});
