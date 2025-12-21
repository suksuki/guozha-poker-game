/**
 * Takeover Turn Order Test
 * Verifies that in Team Mode, the next player for a new round (Takeover) 
 * follows the clockwise turn order, not array index order.
 */

import { describe, it, expect } from 'vitest';
import { TeamModeStrategy } from '../../src/core/utils/gameMode/TeamModeStrategy';
import { Player, PlayerType } from '../../src/core/types/card';
import { TeamConfig } from '../../src/core/types/team';

describe('TeamModeStrategy - Takeover Turn Order', () => {
    const strategy = new TeamModeStrategy();

    it('should select the next teammate in clockwise order', () => {
        // 0 -> 1 -> 2 -> 3 -> 4 -> 5 (Assuming clockwise is decrementing index in this project's logic)
        // Actually, findNextActivePlayer uses (startIndex - 1 + playerCount) % playerCount
        // So order is: 2 -> 1 -> 0 -> 5 -> 4 -> 3

        const players: Player[] = [
            { id: 0, name: 'P0', type: PlayerType.AI, hand: [{ suit: Suit.SPADES, rank: 3, id: '1' }], teamId: 0 },
            { id: 1, name: 'P1', type: PlayerType.AI, hand: [{ suit: Suit.SPADES, rank: 4, id: '2' }], teamId: 1 },
            { id: 2, name: 'P2', type: PlayerType.AI, hand: [], teamId: 0 }, // Winner (just finished)
            { id: 3, name: 'P3', type: PlayerType.AI, hand: [{ suit: Suit.SPADES, rank: 6, id: '4' }], teamId: 1 },
            { id: 4, name: 'P4', type: PlayerType.AI, hand: [{ suit: Suit.SPADES, rank: 7, id: '5' }], teamId: 0 }, // Teammate 1
            { id: 5, name: 'P5', type: PlayerType.AI, hand: [{ suit: Suit.SPADES, rank: 8, id: '6' }], teamId: 1 },
        ];

        const teamConfig: TeamConfig = {
            teams: [
                { id: 0, name: 'Team A', players: [0, 2, 4], teamScore: 0, roundScore: 0, roundsWon: 0 },
                { id: 1, name: 'Team B', players: [1, 3, 5], teamScore: 0, roundScore: 0, roundsWon: 0 }
            ]
        };

        // Winner is P2 (Index 2). 
        // Turn order from 2 is: 1 -> 0 -> 5 -> 4 -> 3
        // Teammates are 0 and 4.
        // In turn order, P0 (Index 0) comes BEFORE P4 (Index 4).

        const nextPlayer = strategy.findNextPlayerForNewRound(2, players, 6, teamConfig);

        // In old logic (array search), it might pick 0 if it starts from 0, but if it was for-loop i=0...
        // The previous implementation was:
        // for (let i = 0; i < players.length; i++) { if (player.teamId === winnerTeamId && player.hand.length > 0) return i; }
        // So it would have picked 0.

        // With my fix, it starts from (2-1)=1, then 0. 
        // Oh wait, if turn order is 2 -> 1 -> 0 -> 5 -> 4, then 0 is indeed the FIRST teammate in turn order.

        // Let's swap them to make the test meaningful.
        // Order: 2 -> 1 -> 0 -> 5 -> 4
        // If P0 has no cards but P4 has:
        players[0].hand = [];

        const nextPlayerModified = strategy.findNextPlayerForNewRound(2, players, 6, teamConfig);
        expect(nextPlayerModified).toBe(4);

        // Now both have cards:
        players[0].hand = [{ suit: Suit.SPADES, rank: 3, id: '1' }];
        const nextPlayerBoth = strategy.findNextPlayerForNewRound(2, players, 6, teamConfig);
        expect(nextPlayerBoth).toBe(0); // 0 is closer to 2 in turn order (2 -> 1 -> 0) than 4 is (2 -> 1 -> 0 -> 5 -> 4)
    });

    it('should pick teammate at index 4 if turn order is 2->1->0->5->4 and only 4 has cards', () => {
        const players: Player[] = [
            { id: 0, name: 'P0', type: PlayerType.AI, hand: [], teamId: 0 },
            { id: 1, name: 'P1', type: PlayerType.AI, hand: [{ suit: Suit.SPADES, rank: 4, id: '2' }], teamId: 1 },
            { id: 2, name: 'P2', type: PlayerType.AI, hand: [], teamId: 0 }, // Winner
            { id: 3, name: 'P3', type: PlayerType.AI, hand: [{ suit: Suit.SPADES, rank: 6, id: '4' }], teamId: 1 },
            { id: 4, name: 'P4', type: PlayerType.AI, hand: [{ suit: Suit.SPADES, rank: 7, id: '5' }], teamId: 0 }, // Teammate
            { id: 5, name: 'P5', type: PlayerType.AI, hand: [{ suit: Suit.SPADES, rank: 8, id: '6' }], teamId: 1 },
        ];

        const teamConfig: TeamConfig = {
            teams: [
                { id: 0, name: 'Team A', players: [0, 2, 4], teamScore: 0, roundScore: 0, roundsWon: 0 },
                { id: 1, name: 'Team B', players: [1, 3, 5], teamScore: 0, roundScore: 0, roundsWon: 0 }
            ]
        };

        const nextPlayer = strategy.findNextPlayerForNewRound(2, players, 6, teamConfig);
        expect(nextPlayer).toBe(4);
    });
});
