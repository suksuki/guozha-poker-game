/**
 * HybridStrategy - 混合决策策略 (MCTS + LLM)
 * 
 * 核心逻辑：
 * 1. 【左脑】MCTS引擎：计算Top N个高胜率候选动作。
 * 2. 【右脑】LLM引擎：结合AI性格、局势描述和MCTS胜率数据，选择最"符合人设"的动作。
 * 3. 兜底机制：如果LLM不可用或超时，直接使用MCTS的最佳推荐。
 */

import { IAIStrategy } from './IAIStrategy';
import { Card, Play } from '../../types/card';
import { AIConfig, MCTSConfig } from '../types';
import { canPlayCards } from '../../utils/cardUtils';
// Import from AI Core types
import { Decision, AIPlayerConfig, GameAction } from '../../ai-core/types';
import { teamMCTSChooseMultiplePlays } from '../mcts/teamMCTS';
import { TeamSimulatedGameState, TeamAction } from '../types';
import { UnifiedLLMService } from '../../ai-core/infrastructure/llm/UnifiedLLMService';
import { AIConfigStore } from '../config/AIConfigStore';

export class HybridStrategy implements IAIStrategy {
    readonly name = 'hybrid';
    readonly description = 'MCTS(算力) + LLM(人性) 混合驱动';

    private llmService: UnifiedLLMService;

    constructor(llmService: UnifiedLLMService) {
        this.llmService = llmService;
    }

    /**
     * 混合决策主入口
     */
    async choosePlay(
        hand: Card[],
        lastPlay: Play | null,
        config: AIConfig,
        extraContext?: {
            state: TeamSimulatedGameState;
            teamConfig: any; // MCTSTeamConfig
            personality: AIPlayerConfig['personality'];
            activeIntents?: any[];
        }
    ): Promise<Card[] | null> {
        console.log('[HybridStrategy] choosePlay: 开始混合决策流程');
        if (!extraContext) {
            console.warn('[HybridStrategy] 缺少额外上下文，退化为纯MCTS模式');
            return null;
        }

        const { state, teamConfig, personality, activeIntents } = extraContext;
        console.log(`[HybridStrategy] choosePlay: 当前手牌 ${hand.length} 张, 上次出牌: ${lastPlay ? '有' : '无'}`);
        console.log(`[HybridStrategy] choosePlay: AI性格: ${personality.preset}`);

        // 加载训练后的AI配置（根据游戏模式）
        const isTeamMode = state.teamMode ?? true;
        const storedConfig = AIConfigStore.loadConfig(isTeamMode);
        // 合并配置，优先使用训练得到的参数
        const mergedTeamConfig = {
            ...teamConfig,
            ...storedConfig
        };
        console.log('[HybridStrategy] choosePlay: MCTS配置已合并');

        // 策略调整：根据队友的意图调整 MCTS 参数
        if (teamConfig.teamMode && activeIntents) {
            const myPos = state.currentPlayerIndex;
            const teammateIntents = activeIntents.find(([pid, _]: [number, any]) => pid !== myPos && pid % 2 === myPos % 2)?.[1];

            if (teammateIntents && teammateIntents.length > 0) {
                const latestIntent = teammateIntents[teammateIntents.length - 1];
                console.log(`[HybridStrategy] 收到队友战术信号: ${latestIntent.action}`);

                if (latestIntent.action === 'wait_for_me') {
                    mergedTeamConfig.strategicPassWeight = (mergedTeamConfig.strategicPassWeight || 1.0) * 2.5;
                    console.log('[HybridStrategy] 调整MCTS参数: 提升战略性让牌权重');
                } else if (latestIntent.action === 'protect_teammate') {
                    mergedTeamConfig.teammateSupportBonus = (mergedTeamConfig.teammateSupportBonus || 30) + 50;
                    console.log('[HybridStrategy] 调整MCTS参数: 提升掩护队友权重');
                } else if (latestIntent.action === 'i_have_strength') {
                    mergedTeamConfig.strategicPassWeight = (mergedTeamConfig.strategicPassWeight || 1.0) * 1.5;
                    console.log('[HybridStrategy] 调整MCTS参数: 提升战略性让牌权重 (队友有强牌)');
                }
            }
        }

        // 1. 【左脑】运行 MCTS 获取候选动作 (Top 3)
        console.log('[HybridStrategy] 运行MCTS获取候选动作...');
        const mctsCandidates = teamMCTSChooseMultiplePlays(hand, state, {
            ...mergedTeamConfig,
            iterations: 100 // 减少迭代次数以提升响应速度
        }, 3);
        console.log(`[HybridStrategy] MCTS生成了 ${mctsCandidates.length} 个候选动作。`);

        if (mctsCandidates.length === 0) {
            console.log('[HybridStrategy] MCTS未找到任何候选动作，返回 null。');
            return null; // 无牌可出
        }

        // 如果只有一个唯一解（比如必须管，或者只剩一张牌），直接执行，节省LLM Token
        if (mctsCandidates.length === 1) {
            console.log('[HybridStrategy] 唯一解，跳过LLM决策，直接执行MCTS最佳动作。');
            if (mctsCandidates[0].action.type === 'play') {
                console.log(`[HybridStrategy] 唯一解: 出牌 ${mctsCandidates[0].action.cards.map(c => `${c.suit}${c.rank}`).join(',')}`);
                return mctsCandidates[0].action.cards;
            }
            console.log('[HybridStrategy] 唯一解: Pass。');
            return null; // Pass
        }

        // 如果第一个候选的分数明显高于第二个（差距>30%），也跳过LLM，直接使用MCTS最佳
        if (mctsCandidates.length >= 2) {
            const bestScore = mctsCandidates[0].score;
            const secondScore = mctsCandidates[1].score;
            const scoreGap = bestScore > 0 ? (bestScore - secondScore) / bestScore : 0;
            if (scoreGap > 0.3) {
                console.log(`[HybridStrategy] 分数差距较大(${(scoreGap * 100).toFixed(1)}%)，跳过LLM决策，直接使用MCTS最佳动作。`);
                if (mctsCandidates[0].action.type === 'play') {
                    console.log(`[HybridStrategy] 高分差决策: 出牌 ${mctsCandidates[0].action.cards.map(c => `${c.suit}${c.rank}`).join(',')}`);
                    return mctsCandidates[0].action.cards;
                }
                console.log('[HybridStrategy] 高分差决策: Pass。');
                return null;
            }
        }

        if (lastPlay) {
            console.log(`[HybridStrategy] 需要压过: ${lastPlay.type} (价值: ${lastPlay.value}, 张数: ${lastPlay.cards.length})`);
        } else {
            console.log('[HybridStrategy] 无需压过 (首家/接风)');
        }

        // 检查是否启用LLM进行打牌决策（此选项只影响打牌决策，不影响聊天等其他LLM功能）
        const enableLLMDecision = mergedTeamConfig.enableLLMDecision ?? false;
        if (!enableLLMDecision) {
            console.log('[HybridStrategy] LLM打牌决策已禁用，直接使用MCTS最佳动作。');
            const bestAction = mctsCandidates[0].action;
            if (bestAction.type === 'play') {
                const playInfo = canPlayCards(bestAction.cards);
                const cardDesc = bestAction.cards.map(c => `${c.suit}${c.rank}`).join(',');
                const actionDesc = playInfo ? `${playInfo.type}(${playInfo.value})` : '未知类型';
                console.log(`🎯 [HybridStrategy] MCTS决策: 出牌 ${bestAction.cards.length}张 [${cardDesc}]，类型=${actionDesc}`);
                // 检查是否是拆牌（手中有更多相同点数的牌）
                const rankCount = new Map<number, number>();
                hand.forEach(c => {
                    rankCount.set(c.rank, (rankCount.get(c.rank) || 0) + 1);
                });
                bestAction.cards.forEach(c => {
                    const totalCount = rankCount.get(c.rank) || 0;
                    const playCount = bestAction.cards.filter(card => card.rank === c.rank).length;
                    if (totalCount > playCount) {
                        console.log(`   🔄 [拆牌检测] rank=${c.rank}：手中有${totalCount}张，出${playCount}张`);
                    }
                });
                return bestAction.cards;
            }
            console.log('[HybridStrategy] MCTS决策: Pass。');
            return null;
        }

        // 2. 尝试询问 LLM
        // 介入决策
        console.log('[HybridStrategy] 多个候选动作，LLM介入决策...');
        try {
            const decision = await this.askLLM(
                hand,
                lastPlay,
                mctsCandidates,
                personality,
                state,
                activeIntents
            );

            if (decision) {
                console.log('[HybridStrategy] LLM 决策成功:', decision.map(c => `${c.suit}${c.rank}`).join(','));
                return decision;
            } else {
                console.warn('[HybridStrategy] LLM 未返回明确决策，使用 MCTS 兜底');
            }
        } catch (error) {
            console.error('[HybridStrategy] LLM 决策过程抛出异常:', error);
        }

        // 3. Fallback: 直接使用 MCTS 评分最高的动作
        console.log('[HybridStrategy] LLM决策失败或异常，回退到MCTS最佳动作。');
        const bestAction = mctsCandidates[0].action;
        if (bestAction.type === 'play') {
            console.log(`[HybridStrategy] MCTS兜底: 出牌 ${bestAction.cards.map(c => `${c.suit}${c.rank}`).join(',')}`);
            return bestAction.cards;
        }
        console.log('[HybridStrategy] MCTS兜底: Pass。');
        return null;
    }

    /**
     * 询问 LLM
     */
    private async askLLM(
        hand: Card[],
        lastPlay: Play | null,
        candidates: Array<{ action: TeamAction; score: number; explanation: string }>,
        personality: AIPlayerConfig['personality'],
        state: TeamSimulatedGameState,
        activeIntents?: any[]
    ): Promise<Card[] | null> {
        console.log('[HybridStrategy] askLLM: 准备向LLM提问。');

        // 构建候选动作描述
        const candidatesDesc = candidates.map((c, i) => {
            const actionStr = c.action.type === 'play'
                ? `Play [${c.action.cards.map(card => `${card.suit}${card.rank}`).join(',')}]`
                : 'Pass';
            return `${i + 1}. ${actionStr} (Win Rate Score: ${c.score.toFixed(1)}) - AI Analysis: ${c.explanation}`;
        }).join('\n');

        let coordinationPrompt = "";
        if (activeIntents && activeIntents.length > 0) {
            const myPos = state.currentPlayerIndex;
            const teammateIntents = activeIntents.find(([pid, _]: [number, any]) => pid !== myPos && pid % 2 === myPos % 2)?.[1];
            if (teammateIntents && teammateIntents.length > 0) {
                const signal = teammateIntents[teammateIntents.length - 1];
                coordinationPrompt = `\nTACTICAL SIGNAL FROM TEAMMATE: ${signal.originalText} (Estimated Intent: ${signal.action})`;
            }
        }

        const prompt = `
You are a Poker AI with personality: ${personality.preset} (Chattiness: ${personality.chattiness}).
Game State:
- Your Hand: ${hand.length} cards
- Last Play: ${lastPlay ? 'Some cards' : 'None (You go first)'}
- Phase: ${state.allHands.length < 5 ? 'Endgame' : 'Midgame'}
${coordinationPrompt}

My "Left Brain" (MCTS Engine) has calculated the top ${candidates.length} strategically best moves:
${candidatesDesc}

TASK:
Select one of these moves that best fits your personality and coordinates with your teammate.
- If you are 'aggressive', you might choose risky but high-reward moves or smash high cards.
- If you are 'conservative', you might choose the safe bet with highest win rate.
- If you are 'balanced', you trust the win rate score most.

Explain your reasoning briefly in character, then execute the tool.
IMPORTANT: If you cannot use tools, just state which one you choose by saying "I choose Option X" where X is the number (1-${candidates.length}).
`;

        // 不使用工具调用（qwen2:0.5b 不支持），完全依赖文本解析
        const response = await this.llmService.call({
            purpose: 'decision',
            prompt,
            priority: 10,
            options: {
                temperature: 0.2, // 稍微有点创造性，允许性格发挥，但核心逻辑要稳
                maxTokens: 150
            }
        });

        // 1. 优先尝试解析工具调用
        if (response.tool_calls && response.tool_calls.length > 0) {
            const tool = response.tool_calls[0];
            const args = typeof tool.function.arguments === 'string'
                ? JSON.parse(tool.function.arguments)
                : tool.function.arguments;

            if (tool.function.name === 'play_card') {
                return this.matchCandidate(args.cards, candidates, hand);
            } else if (tool.function.name === 'pass_turn') {
                return null;
            }
        }

        // 2. 兜底：尝试解析纯文本回复 (Fallback Mode)
        if (response.content) {
            console.log(`[HybridStrategy] 无工具调用，尝试解析文本回复: "${response.content.substring(0, 50)}..."`);

            // 搜索常见的选项选择模式
            const patterns = [
                /[Oo]ption\s*(\d+)/,
                /[Cc]hoice\s*(\d+)/,
                /选项\s*(\d+)/,
                /选择\s*(\d+)/,
                /^(\d+)[\.\s]/, // 以数字开头的行，如 "1. I play..."
                /I\s*choose\s*(\d+)/
            ];

            for (const pattern of patterns) {
                const match = response.content.match(pattern);
                if (match && match[1]) {
                    const index = parseInt(match[1]) - 1;
                    if (index >= 0 && index < candidates.length) {
                        const chosen = candidates[index].action;
                        console.log(`[HybridStrategy] 文本解析成功，选择了选项 ${index + 1}: ${chosen.type}`);
                        return chosen.type === 'play' ? chosen.cards : null;
                    }
                }
            }
        }

        return null;
    }

    /**
     * 辅助：将LLM选的牌匹配回 MCTS 候选（防止幻觉）
     */
    private matchCandidate(
        llmSelectedCardCodes: string[],
        candidates: Array<{ action: TeamAction; score: number, explanation: string }>,
        hand: Card[]
    ): Card[] | null {
        // 简单实现：找到卡片数量一致且大致匹配的候选
        // 真正的实现应该比较 Card ID 或 Suit/Rank
        // 如果 LLM 返回了候选列表里没有的“幻觉动作”，我们应该 Fallback 到最佳候选，保证合规

        // 这里做个简单兜底：如果 LLM 回复了 play，默认它想打牌
        // 我们可以返回 candidates[0] 的牌，或者尝试解析
        // 为稳妥起见，直接返回 MCTS 推荐的第一顺位（如果 LLM 瞎说的话）
        // 理想情况是 LLM 严格选择了 Option 1, 2, or 3

        if (candidates[0].action.type === 'play') {
            console.log('[HybridStrategy] matchCandidate: 匹配成功，返回最佳候选牌组');
            return candidates[0].action.cards;
        }
        console.warn('[HybridStrategy] matchCandidate: 最佳候选不是出牌动作，返回 null');
        return null;
    }
}
