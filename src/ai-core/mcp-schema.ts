/**
 * MCP (Model Context Protocol) Standard Schema Definition
 * for Guozha Poker Game
 */

import { Card } from '../types/card';

// ==================== Resource Definitions ====================

/**
 * Standardized Game State Resource
 * URI: game://state/current
 */
export interface MCPGameState {
    // Metadata
    gameId: string;
    timestamp: number;

    // Public Information (Observable by everyone)
    publicState: {
        round: number;
        phase: 'early' | 'middle' | 'late' | 'critical';
        scores: Record<string, number>; // playerId -> score
        playerCount: number;
        currentPlayerId: number;
        lastEvent: GameEvent | null;
        playHistory: GameEvent[]; // Full or truncated history
        tableCards: {
            playerId: number;
            cards: string[]; // Card codes e.g. "3H", "AS"
        }[];
    };

    // Private Information (Specific to the observer Agent)
    privateState: {
        myPlayerId: number;
        hand: string[];
        role?: string;
    };
}

export type GameEvent =
    | { type: 'play'; playerId: number; cards: string[]; combination: string }
    | { type: 'pass'; playerId: number }
    | { type: 'game_start'; config: any }
    | { type: 'round_end'; winnerId: number; scores: any };

// ==================== Tool Definitions ====================

/**
 * Play Card Tool Tool Definition
 */
export const PlayCardTool = {
    name: 'play_card',
    description: 'Play a set of cards from hand. Must form a valid combination (Single, Pair, Triple, Straight, Bomb, etc.) and beat the previous play if applicable.',
    parameters: {
        type: 'object',
        properties: {
            cards: {
                type: 'array',
                items: { type: 'string', description: 'Card codes to play, e.g. ["3H", "3D"]' },
                description: 'List of cards to play'
            },
            combinationType: {
                type: 'string',
                enum: ['single', 'pair', 'triple', 'straight', 'bomb', 'dun', 'mixed'],
                description: 'Type of the card combination'
            }
        },
        required: ['cards']
    }
};

/**
 * Pass Turn Tool Definition
 */
export const PassTurnTool = {
    name: 'pass_turn',
    description: 'Pass the current turn. Used when you cannot or do not want to beat the previous play.',
    parameters: {
        type: 'object',
        properties: {
            reason: {
                type: 'string',
                description: 'Optional reasoning for passing (strategic or forced)'
            }
        }
    }
};

/**
 * Chat Tool Definition
 */
export const GameChatTool = {
    name: 'game_chat',
    description: 'Send a chat message to other players.',
    parameters: {
        type: 'object',
        properties: {
            content: {
                type: 'string',
                description: 'Message content (max 15 chars)'
            },
            emotion: {
                type: 'string',
                enum: ['confident', 'cautious', 'excited', 'frustrated', 'relaxed', 'tense']
            }
        },
        required: ['content']
    }
};

export const ALL_GAME_TOOLS = [PlayCardTool, PassTurnTool, GameChatTool];
