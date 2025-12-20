var c=Object.defineProperty;var u=(o,t,e)=>t in o?c(o,t,{enumerable:!0,configurable:!0,writable:!0,value:e}):o[t]=e;var l=(o,t,e)=>u(o,typeof t!="symbol"?t+"":t,e);class p{constructor(t){l(this,"config");l(this,"history",[]);l(this,"maxHistory",100);this.config={...t},this.config.autoEvaluation===void 0&&(this.config.autoEvaluation=!0)}async evaluate(t){var s;const e={relevance:0,diversity:0,engagement:0,appropriateness:0,overall:0};if(this.config.autoEvaluation){const n=this.autoEvaluate(t);Object.assign(e,n)}if((s=this.config.llmEvaluation)!=null&&s.enabled)try{const n=await this.llmEvaluate(t);e.relevance=(e.relevance+(n.relevance??e.relevance))/2,e.engagement=(e.engagement+(n.engagement??e.engagement))/2,e.appropriateness=(e.appropriateness+(n.appropriateness??e.appropriateness))/2}catch{}return e.overall=e.relevance*.3+e.diversity*.2+e.engagement*.3+e.appropriateness*.2,this.history.push(t.llmResponse.processed),this.history.length>this.maxHistory&&this.history.shift(),e}async evaluateBatch(t){const e=[];for(const s of t){const n=await this.evaluate(s);e.push(n)}return e}autoEvaluate(t){const e=t.llmResponse.processed,s=this.calculateRelevance(t),n=this.calculateDiversity(e),a=this.calculateEngagement(e),r=this.calculateAppropriateness(t);return{relevance:s,diversity:n,engagement:a,appropriateness:r,overall:0}}calculateRelevance(t){const e=t.llmResponse.processed.toLowerCase(),n=["牌","出","要","炸","墩","分","赢","输","好","差","pass","play","card","bomb","win","lose"].filter(i=>e.includes(i)).length,a=Math.min(1,n/3),r=this.checkStateRelevance(t);return a*.6+r*.4}checkStateRelevance(t){const{gameState:e,trigger:s}=t,n=t.llmResponse.processed.toLowerCase();if(s==="after_play"){if(n.includes("牌")||n.includes("出")||n.includes("好"))return .8}else if(s==="after_pass"){if(n.includes("要")||n.includes("不")||n.includes("等"))return .8}else if(s==="game_event")return .7;return .5}calculateDiversity(t){if(this.history.length===0)return 1;const e=this.history.map(n=>this.calculateSimilarity(t,n)),s=e.reduce((n,a)=>n+a,0)/e.length;return Math.max(0,1-s)}calculateSimilarity(t,e){const s=t.split(""),n=e.split(""),a=s.filter(i=>n.includes(i)).length,r=Math.max(s.length,n.length);return r>0?a/r:0}calculateEngagement(t){let e=.5;const s=t.length;return s>=5&&s<=20&&(e+=.2),["哈","啊","哦","哇","嘿","哈","！","?","!"].some(a=>t.includes(a))&&(e+=.2),(t.includes("！")||t.includes("!"))&&(e+=.1),Math.min(1,e)}calculateAppropriateness(t){let e=.5;const s=t.llmResponse.processed,n=s.length;return n>=3&&n<=25?e+=.3:n>25&&(e-=.2),["好的，","我觉得","其实","对吧","是吧"].some(r=>s.includes(r))||(e+=.2),Math.min(1,Math.max(0,e))}async llmEvaluate(t){var r,i;if(!((r=this.config.llmEvaluation)!=null&&r.endpoint))throw new Error("LLM endpoint未配置");const e=this.buildEvaluationPrompt(t),s=await fetch(this.config.llmEvaluation.endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:this.config.llmEvaluation.model||"qwen2.5:3b",messages:[{role:"system",content:"你是一个聊天质量评估专家。请用JSON格式返回评估结果。"},{role:"user",content:e}],temperature:.3,stream:!1}),signal:AbortSignal.timeout(this.config.llmEvaluation.timeout||3e4)});if(!s.ok)throw new Error(`LLM请求失败: ${s.statusText}`);const n=await s.json(),a=((i=n.message)==null?void 0:i.content)||n.content||JSON.stringify(n);return this.parseLLMResponse(a)}buildEvaluationPrompt(t){const{gameState:e,trigger:s,llmResponse:n}=t;return`评估以下聊天消息的质量：

## 游戏场景
- 当前轮次：${e.round}
- 游戏阶段：${e.phase}
- 触发类型：${s}

## 聊天消息
"${n.processed}"

## 任务
请从以下维度评估（0-1分）：
1. 相关性：是否贴合游戏场景
2. 趣味性：是否有趣、生动
3. 合适性：时机和内容是否合适

请用JSON格式返回：
{
  "relevance": 0.9,
  "engagement": 0.8,
  "appropriateness": 0.85,
  "reasoning": "这个聊天..."
}`}parseLLMResponse(t){try{const e=t.match(/\{[\s\S]*\}/);if(e){const s=JSON.parse(e[0]);return{relevance:Math.max(0,Math.min(1,s.relevance||.5)),engagement:Math.max(0,Math.min(1,s.engagement||.5)),appropriateness:Math.max(0,Math.min(1,s.appropriateness||.5))}}}catch{}return{relevance:.5,engagement:.5,appropriateness:.5}}clearHistory(){this.history=[]}}export{p as ChatQualityEvaluator};
