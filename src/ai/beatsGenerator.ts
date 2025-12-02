/**
 * Beats 生成器
 * 根据 style_packlongxing.md 生成吵架节拍结构
 */

export interface Beat {
  type: string;  // 节拍类型：反讽开场、抓对方上一句话反击、夸张比喻升级、短狠收尾
  length: string;  // 长度：1-2句、1句等
  tone: string;  // 语调：挑衅、反击、升级、绝杀
}

export interface BeatsStructure {
  beats: Beat[];
  segments?: Array<{
    beat_index: number;
    text: string;
  }>;
}

export interface BeatsGenerationContext {
  scene: string;  // 场景：card_game, quarrel, chat
  opponentLastUtterance?: string;  // 对手上一句话
  targetLength?: number;  // 目标长度（字）
  civility: number;  // 文明等级 0-4
  gameState?: any;  // 游戏状态
}

/**
 * Beats 生成器类
 */
export class BeatsGenerator {
  /**
   * 生成 Beats 结构
   * @param context 生成上下文
   * @returns Beats 结构
   */
  async generateBeats(context: BeatsGenerationContext): Promise<BeatsStructure> {
    const { targetLength = 60, scene, opponentLastUtterance, civility } = context;

    // 根据目标长度确定节拍数量
    const beatCount = this.determineBeatCount(targetLength);

    // 生成节拍结构
    const beats: Beat[] = [];
    
    // 第一个节拍：反讽开场
    beats.push({
      type: '反讽开场',
      length: '1-2句',
      tone: '挑衅',
    });

    // 如果有对手的话，添加反击节拍
    if (opponentLastUtterance) {
      beats.push({
        type: '抓对方上一句话反击',
        length: '1-2句',
        tone: '反击',
      });
    }

    // 中间节拍：夸张比喻升级（根据长度添加多个）
    const middleBeatsCount = Math.max(0, beatCount - (opponentLastUtterance ? 3 : 2));
    for (let i = 0; i < middleBeatsCount; i++) {
      beats.push({
        type: '夸张比喻升级',
        length: '1-2句',
        tone: '升级',
      });
    }

    // 最后一个节拍：短狠收尾
    beats.push({
      type: '短狠收尾',
      length: '1句',
      tone: '绝杀',
    });

    return { beats };
  }

  /**
   * 根据目标长度确定节拍数量
   */
  private determineBeatCount(targetLength: number): number {
    // 每个节拍约 15-20 字
    const avgBeatLength = 18;
    const count = Math.ceil(targetLength / avgBeatLength);
    // 最少 2 个节拍，最多 6 个节拍
    return Math.max(2, Math.min(6, count));
  }

  /**
   * 生成 Beats Prompt（用于 LLM 调用）
   */
  generateBeatsPrompt(context: BeatsGenerationContext): string {
    const { scene, opponentLastUtterance, targetLength = 60, civility } = context;

    const systemPrompt = this.getSystemPrompt(civility);
    const userPrompt = this.getUserPrompt(scene, opponentLastUtterance, targetLength);

    return `${systemPrompt}

${userPrompt}`;
  }

  /**
   * 获取 System Prompt
   */
  private getSystemPrompt(civility: number): string {
    return `你是一个包龙星式的"吵架王"AI，在牌桌上与对手互怼。

角色特征：
- 市井智慧，懂人情世故
- 机智反击，节奏短促有力
- 夸张比喻，制造笑点
- 强反击性，不示弱

输出要求：
- 短句为主（1-3句，总长度不超过40字）
- 每句话不超过15字，使用标点符号断句（句号、问号、感叹号、逗号）
- 必须有 punchline（绝杀尾句）
- 节奏短促，反击性强

当前文明等级：${civility}
- Level 0：文明（无粗口）
- Level 1：轻微讽刺
- Level 2：允许口头粗话（非侮辱性）
- Level 3：强烈粗口（仍禁止歧视/仇恨）
- Level 4：极限测试档（仍禁仇恨/群体攻击）

禁止项（所有等级）：
- 受保护群体歧视
- 仇恨言论
- 恶意人身攻击
- 政治敏感内容`;
  }

  /**
   * 获取 User Prompt
   */
  private getUserPrompt(scene: string, opponentLastUtterance?: string, targetLength?: number): string {
    let prompt = `当前场景：${scene}\n`;
    
    if (opponentLastUtterance) {
      prompt += `对手上一句话：${opponentLastUtterance}\n`;
    }
    
    if (targetLength) {
      prompt += `需要生成长段吵架（约${targetLength}字）\n`;
    }
    
    prompt += `
请先生成 beats（节拍）结构，然后按 beat 分段生成台词。

输出格式（必须是有效的 JSON）：
{
  "beats": [
    {"type": "节拍类型", "length": "长度", "tone": "语调"},
    ...
  ],
  "segments": [
    {"beat_index": 0, "text": "第一段台词"},
    {"beat_index": 1, "text": "第二段台词"},
    ...
  ]
}

注意：
- beats 数组中的节拍类型应该是：反讽开场、抓对方上一句话反击、夸张比喻升级、短狠收尾
- segments 数组中的文本应该对应 beats，每段 1-3 句，每句话不超过15字
- 每段必须使用标点符号断句（句号、问号、感叹号、逗号），确保播报自然
- 总长度不超过目标长度
- 最后一段必须是 punchline（绝杀尾句）`;

    return prompt;
  }

  /**
   * 解析 LLM 返回的 JSON
   * 增强容错性：支持多种格式的响应
   */
  parseLLMResponse(response: string): BeatsStructure | null {
    try {
      // 尝试提取 JSON（可能包含 markdown 代码块）
      let jsonStr = response.trim();
      
      // 移除 markdown 代码块标记
      if (jsonStr.startsWith('```')) {
        const lines = jsonStr.split('\n');
        // 找到第一个 ``` 和最后一个 ```
        const firstIndex = lines.findIndex(line => line.trim().startsWith('```'));
        const lastIndex = lines.findIndex((line, idx) => 
          idx > firstIndex && line.trim().startsWith('```')
        );
        
        if (firstIndex >= 0 && lastIndex > firstIndex) {
          jsonStr = lines.slice(firstIndex + 1, lastIndex).join('\n').trim();
        } else if (firstIndex >= 0) {
          // 只有开始的 ```，移除它
          jsonStr = lines.slice(firstIndex + 1).join('\n').trim();
        }
      }
      
      // 移除可能的 json 标记（json, jsonc等）
      if (jsonStr.toLowerCase().startsWith('json')) {
        jsonStr = jsonStr.substring(4).trim();
        // 移除可能的冒号
        if (jsonStr.startsWith(':')) {
          jsonStr = jsonStr.substring(1).trim();
        }
      }
      
      // 尝试找到 JSON 对象的开始和结束
      const firstBrace = jsonStr.indexOf('{');
      const lastBrace = jsonStr.lastIndexOf('}');
      if (firstBrace >= 0 && lastBrace > firstBrace) {
        jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
      }
      
      const parsed = JSON.parse(jsonStr);
      
      // 验证结构
      if (!parsed.beats || !Array.isArray(parsed.beats)) {
        return null;
      }
      
      // 验证并清理 segments
      let segments: Array<{ beat_index: number; text: string }> = [];
      if (parsed.segments && Array.isArray(parsed.segments)) {
        segments = parsed.segments
          .filter((seg: any) => 
            seg && 
            typeof seg === 'object' && 
            typeof seg.text === 'string' && 
            seg.text.trim().length > 0 &&
            typeof seg.beat_index === 'number'
          )
          .map((seg: any) => ({
            beat_index: seg.beat_index,
            text: seg.text.trim()
          }));
      }
      
      return {
        beats: parsed.beats,
        segments: segments,
      };
    } catch (error) {
      
      // 尝试从文本中提取可能的segments（最后的容错）
      return this.tryExtractSegmentsFromText(response);
    }
  }

  /**
   * 从文本中尝试提取segments（容错方法）
   */
  private tryExtractSegmentsFromText(text: string): BeatsStructure | null {
    try {
      // 尝试找到类似 "第一段台词"、"第二段台词" 的模式
      const segmentPattern = /["']([^"']{5,50})["']/g;
      const matches = Array.from(text.matchAll(segmentPattern));
      
      if (matches.length >= 2) {
        const segments = matches.map((match, index) => ({
          beat_index: index,
          text: match[1]
        }));
        
        return {
          beats: [], // 无法提取beats结构
          segments: segments
        };
      }
    } catch (error) {
    }
    
    return null;
  }
}

// 单例实例
let beatsGeneratorInstance: BeatsGenerator | null = null;

/**
 * 获取 Beats 生成器单例
 */
export function getBeatsGenerator(): BeatsGenerator {
  if (!beatsGeneratorInstance) {
    beatsGeneratorInstance = new BeatsGenerator();
  }
  return beatsGeneratorInstance;
}

