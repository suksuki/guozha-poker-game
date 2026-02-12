import { Game } from '../../game-engine/Game';
import { GameStatus } from '../../types/card';
import { GameBridge } from '../../ai-core/integration/GameBridge';
import { GameState as AIGameState } from '../../ai-core/types';
import { MasterBrainConfig } from '../../ai-core/master-brain/MasterAIBrain';

// Define GameConfig locally if not easily importable or to prevent circular deps
export interface GameConfig {
    playerCount: number;
    humanPlayerIndex: number;
    teamMode: boolean;
    gameMode: 'individual' | 'team';
}

export interface SimulationResult {
    winnerTeam: number | null;
    winnerId: number | null;
    roundCount: number;
    initialHands: any[];
    scores: number[];
    mistakes: number;
}

export class SimulatedTrainingEnv {
    private bridge: GameBridge;
    private game: Game | null = null;
    private decisionResolve: ((decision: any) => void) | null = null;

    constructor() {
        this.bridge = new GameBridge();
        this.bridge.onTurnComplete((event) => {
            if (this.decisionResolve) {
                this.decisionResolve(event.decision);
                this.decisionResolve = null;
            }
        });
    }

    async initialize() {
        const config: MasterBrainConfig = {
            aiPlayers: [], // will be auto-filled or we fill dummy
            llm: {
                enabled: false,
                endpoint: 'mock',
                model: 'mock'
            },
            dataCollection: {
                enabled: false,
                autoExport: false,
                exportInterval: 999999
            },
            performance: {
                enableCache: true,
                timeout: 10000
            }
        };
        // We need to provide dummy AI players config for MasterBrain to initialize players
        // Actually MasterBrain initializes players based on aiPlayers list.
        // If we want 4 or 6 players, we should provide them.
        // But MasterAIBrain usually manages generic players?
        // Let's populate 6 generic players to be safe.
        config.aiPlayers = Array.from({ length: 6 }, (_, i) => ({
            id: i,
            personality: { preset: 'balanced', chattiness: 0 },
            decisionModules: ['mcts'],
            communicationEnabled: false
        }));

        await this.bridge.getAPI().initialize(config);
    }

    async shutdown() {
        await this.bridge.getAPI().shutdown();
    }

    async runBatch(count: number, gameConfig: GameConfig): Promise<SimulationResult[]> {
        const results: SimulationResult[] = [];
        for (let i = 0; i < count; i++) {
            const result = await this.runGame(gameConfig);
            results.push(result);
            // Optional: Log progress
            if ((i + 1) % 10 === 0) {
                console.log(`[SimulatedTrainingEnv] Completed ${i + 1}/${count} games.`);
            }
        }
        return results;
    }

    /**
     * Convert Game Engine State to AI Brain GameState.
     * Copied and adapted from aiBrainIntegration.ts to ensure standalone execution.
     */
    private convertGameState(game: Game, playerId: number): AIGameState {
        const currentRound = game.currentRound;
        const player = game.players[playerId];

        if (!player) throw new Error(`Player ${playerId} not found`);

        // Calculate opponent hand sizes
        const opponentHandSizes = game.players
            .filter((_, idx) => idx !== playerId)
            .map(p => p.hand?.length || 0);

        // Determine phase
        const remainingCards = player.hand.length;
        let phase: 'early' | 'middle' | 'late' | 'critical';
        if (remainingCards <= 3) phase = 'critical';
        else if (remainingCards <= 8) phase = 'late';
        else if (remainingCards <= 15) phase = 'middle';
        else phase = 'early';

        // Current round score
        const currentRoundScore = currentRound?.roundScore || 0;

        // Cumulative scores
        const cumulativeScores = new Map<number, number>();
        game.players.forEach((p, idx) => {
            cumulativeScores.set(idx, p.score ?? 0);
        });

        // Reconstruct last play object for AI
        // We need to use canPlayCards to ensure type and value are correctly populated
        let lastPlayObj: any = null;
        if (currentRound?.lastPlay && currentRound.lastPlay.length > 0) {
            // We need to import canPlayCards. Since we are in core/ai/training, 
            // path to utils/cardUtils is ../../../utils/cardUtils
            // But wait, the file imports need to be added too.
            // For now, let's assume valid play structure is enough or try to import it.
            lastPlayObj = require('../../utils/cardUtils').canPlayCards(currentRound.lastPlay);
        }

        return {
            myHand: player.hand,
            myPosition: playerId,
            playerCount: game.players.length,
            lastPlay: lastPlayObj,
            lastPlayerId: currentRound?.lastPlayPlayerIndex ?? null,
            currentPlayerId: game.currentPlayerIndex,
            playHistory: (currentRound?.plays as any) || [],
            roundNumber: game.rounds.length,
            opponentHandSizes,
            teamMode: game.state?.config?.teamMode || false,
            currentRoundScore,
            cumulativeScores,
            phase
        };
    }

    async runGame(gameConfig: GameConfig): Promise<SimulationResult> {
        const config = { ...gameConfig, humanPlayerIndex: -1 };
        this.game = new Game(config);

        this.game.startGame();

        let rounds = 0;
        let mistakes = 0;

        while (this.game.status !== GameStatus.FINISHED && rounds < 200) {
            rounds++;
            const currentPlayerIndex = this.game.currentPlayerIndex;

            if (currentPlayerIndex === -1) break;

            // Wait for decision
            const decisionPromise = new Promise<any>((resolve) => {
                this.decisionResolve = resolve;
            });

            // Convert state and Trigger
            try {
                const aiState = this.convertGameState(this.game, currentPlayerIndex);
                this.bridge.getAPI().triggerAITurn(currentPlayerIndex, aiState);
            } catch (e) {
                console.error("Error converting state or triggering turn:", e);
                break;
            }

            const decision = await decisionPromise;

            if (decision.action.type === 'play') {
                const result = await this.game.playCards(currentPlayerIndex, decision.action.cards);
                if (!result.success) {
                    mistakes++;
                    this.game.pass(currentPlayerIndex);
                }
            } else {
                this.game.pass(currentPlayerIndex);
            }
        }

        // Collect stats
        const winnerTeam = this.game.state.teamRankings ? (this.game.state.teamRankings[0]?.teamId ?? null) : null;
        // This is a simplification.

        return {
            winnerTeam,
            winnerId: null, // fill if individual
            roundCount: rounds,
            initialHands: [], // could optimize to capture this
            scores: this.game.players.map(p => p.score ?? 0),
            mistakes
        };
    }
}
