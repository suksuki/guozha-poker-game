import { MCTSTeamConfig } from '../types';

export const DEFAULT_AI_CONFIG: Partial<MCTSTeamConfig> = {
    iterations: 100,
    explorationConstant: 1.414,
    teamScoreWeight: 2.0,
    cooperationWeight: 1.0,
    strategicPassWeight: 1.0,
    bigCardPreservationBonus: 20,
    teammateSupportBonus: 30,
    roleWeight: 1.0,
    strategicPassEnabled: true,
    enableLLMDecision: false // 默认禁用LLM打牌决策，直接使用MCTS（不影响聊天等其他LLM功能）
};

const STORAGE_KEY_TEAM = 'guozha_ai_config_team_v1';
const STORAGE_KEY_INDIVIDUAL = 'guozha_ai_config_individual_v1';

export class AIConfigStore {
    /**
     * 加载配置（根据游戏模式和人数）
     * @param teamMode 是否为团队模式
     * @param playerCount 玩家数量 (4 or 6)
     */
    static loadConfig(teamMode: boolean = true, playerCount: number = 4): Partial<MCTSTeamConfig> {
        if (typeof window === 'undefined') {
            return { ...DEFAULT_AI_CONFIG };
        }

        let storageKey = STORAGE_KEY_INDIVIDUAL;
        if (teamMode) {
            storageKey = playerCount === 6 ? 'guozha_ai_config_team_6p_v1' : STORAGE_KEY_TEAM;
        }

        try {
            const stored = localStorage.getItem(storageKey);
            if (stored) {
                return { ...DEFAULT_AI_CONFIG, ...JSON.parse(stored) };
            }
        } catch (e) {
            // 加载失败，忽略
        }
        return { ...DEFAULT_AI_CONFIG };
    }

    /**
     * 保存配置（根据游戏模式和人数）
     * @param config 要保存的配置
     * @param teamMode 是否为团队模式
     * @param playerCount 玩家数量
     */
    static saveConfig(config: Partial<MCTSTeamConfig>, teamMode: boolean = true, playerCount: number = 4) {
        if (typeof window === 'undefined') return;

        let storageKey = STORAGE_KEY_INDIVIDUAL;
        if (teamMode) {
            storageKey = playerCount === 6 ? 'guozha_ai_config_team_6p_v1' : STORAGE_KEY_TEAM;
        }

        try {
            const current = this.loadConfig(teamMode, playerCount);
            const newConfig = { ...current, ...config };
            localStorage.setItem(storageKey, JSON.stringify(newConfig));
        } catch (e) {
            // 保存失败，忽略
        }
    }

    /**
     * 重置配置
     */
    static resetConfig(teamMode: boolean = true, playerCount: number = 4) {
        this.saveConfig({ ...DEFAULT_AI_CONFIG }, teamMode, playerCount);
    }
}
