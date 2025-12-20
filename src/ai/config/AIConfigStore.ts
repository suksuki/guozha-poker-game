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
     * 加载配置（根据游戏模式）
     * @param teamMode 是否为团队模式，默认true（向后兼容）
     */
    static loadConfig(teamMode: boolean = true): Partial<MCTSTeamConfig> {
        if (typeof window === 'undefined') {
            return { ...DEFAULT_AI_CONFIG };
        }

        const storageKey = teamMode ? STORAGE_KEY_TEAM : STORAGE_KEY_INDIVIDUAL;

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
     * 保存配置（根据游戏模式）
     * @param config 要保存的配置
     * @param teamMode 是否为团队模式，默认true（向后兼容）
     */
    static saveConfig(config: Partial<MCTSTeamConfig>, teamMode: boolean = true) {
        if (typeof window === 'undefined') return;
        
        const storageKey = teamMode ? STORAGE_KEY_TEAM : STORAGE_KEY_INDIVIDUAL;
        
        try {
            const current = this.loadConfig(teamMode);
            const newConfig = { ...current, ...config };
            localStorage.setItem(storageKey, JSON.stringify(newConfig));
        } catch (e) {
            // 保存失败，忽略
        }
    }

    /**
     * 重置配置（根据游戏模式）
     * @param teamMode 是否为团队模式，默认true（向后兼容）
     */
    static resetConfig(teamMode: boolean = true) {
        this.saveConfig({ ...DEFAULT_AI_CONFIG }, teamMode);
    }
}
