/**
 * 意图分析器
 * 解析用户或AI消息中的战术意图
 */

export enum IntentType {
    STRATEGIC_HINT = 'strategic_hint',   // 战术暗示（如：我有大牌）
    COMMAND = 'command',                 // 指令（如：保我，过）
    EMOTIONAL_CHAT = 'emotional_chat',   // 情感交流
    SOCIAL_CHAT = 'social_chat',         // 闲聊
    UNKNOWN = 'unknown'
}

export enum StrategicAction {
    PROTECT_TEAMMATE = 'protect_teammate', // 保队友
    WAIT_FOR_ME = 'wait_for_me',           // 等我出
    I_HAVE_STRENGTH = 'i_have_strength',   // 我有大牌/炸弹
    GIVE_UP_ROUND = 'give_up_round',       // 放弃这轮
    ATTACK_OPPONENT = 'attack_opponent',   // 打压对手
    NONE = 'none'
}

export interface AnalyzedIntent {
    type: IntentType;
    action: StrategicAction;
    confidence: number;
    originalText: string;
}

export class IntentAnalyzer {
    /**
     * 基于关键词的简易解析（暂代LLM高级分析）
     */
    static analyzeSimple(text: string): AnalyzedIntent {
        const t = text.toLowerCase();

        // 1. 保我/掩护
        if (t.includes('保我') || t.includes('掩护') || t.includes('帮我')) {
            return {
                type: IntentType.COMMAND,
                action: StrategicAction.PROTECT_TEAMMATE,
                confidence: 0.9,
                originalText: text
            };
        }

        // 2. 我有大牌/炸弹
        if (t.includes('炸') || t.includes('大牌') || t.includes('我来') || t.includes('交给我')) {
            return {
                type: IntentType.STRATEGIC_HINT,
                action: StrategicAction.I_HAVE_STRENGTH,
                confidence: 0.85,
                originalText: text
            };
        }

        // 3. 别出/等我
        if (t.includes('别出') || t.includes('等我') || t.includes('过') || t.includes('让')) {
            return {
                type: IntentType.COMMAND,
                action: StrategicAction.WAIT_FOR_ME,
                confidence: 0.8,
                originalText: text
            };
        }

        // 4. 打他
        if (t.includes('打他') || t.includes('压回') || t.includes('针对')) {
            return {
                type: IntentType.COMMAND,
                action: StrategicAction.ATTACK_OPPONENT,
                confidence: 0.75,
                originalText: text
            };
        }

        return {
            type: IntentType.SOCIAL_CHAT,
            action: StrategicAction.NONE,
            confidence: 0.5,
            originalText: text
        };
    }

    /**
     * TODO: 使用LLM进行深度意图解析
     */
    static async analyzeWithLLM(text: string, llmService: any): Promise<AnalyzedIntent> {
        // 未来实现
        return this.analyzeSimple(text);
    }
}
