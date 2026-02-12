var P=Object.defineProperty;var I=(g,n,a)=>n in g?P(g,n,{enumerable:!0,configurable:!0,writable:!0,value:a}):g[n]=a;var $=(g,n,a)=>I(g,typeof n!="symbol"?n+"":n,a);import{A as L,t as b,c as T}from"./index-BHgdI4VG.js";class k{constructor(n){$(this,"name","hybrid");$(this,"description","MCTS(算力) + LLM(人性) 混合驱动");$(this,"llmService");this.llmService=n}async choosePlay(n,a,h,d){var l;if(!d)return null;const{state:m,teamConfig:y,personality:S,activeIntents:p}=d,C=m.teamConfig!==void 0,f=L.loadConfig(C),r={...y,...f};if(y.teamMode&&p){const e=m.currentPlayerIndex,c=(l=p.find(([s,u])=>s!==e&&s%2===e%2))==null?void 0:l[1];if(c&&c.length>0){const s=c[c.length-1];s.action==="wait_for_me"?r.strategicPassWeight=(r.strategicPassWeight||1)*2.5:s.action==="protect_teammate"?r.teammateSupportBonus=(r.teammateSupportBonus||30)+50:s.action==="i_have_strength"&&(r.strategicPassWeight=(r.strategicPassWeight||1)*1.5)}}let t;try{t=b(n,m,{...r,iterations:100},3)}catch{return null}if(t.length===0)return null;if(t.length===1)return t[0].action.type==="play"?t[0].action.cards:null;if(t.length>=2){const e=t[0].score,c=t[1].score;if((e>0?(e-c)/e:0)>.3)return t[0].action.type==="play"?t[0].action.cards:null}if(!(r.enableLLMDecision??!1)){const e=t[0].action;if(e.type==="play"){const c=T(e.cards);e.cards.map(u=>`${u.suit}${u.rank}`).join(","),c&&`${c.type}${c.value}`;const s=new Map;return n.forEach(u=>{s.set(u.rank,(s.get(u.rank)||0)+1)}),e.cards.forEach(u=>{s.get(u.rank),e.cards.filter(M=>M.rank===u.rank).length}),e.cards}return null}try{const e=await Promise.race([this.askLLM(n,a,t,S,m,p),new Promise((c,s)=>setTimeout(()=>s(new Error("LLM timeout (10s)")),1e4))]);if(e)return e}catch{}const o=t[0].action;return o.type==="play"?o.cards:null}async askLLM(n,a,h,d,m,y){var r;const S=h.map((t,i)=>{const o=t.action.type==="play"?`Play [${t.action.cards.map(l=>`${l.suit}${l.rank}`).join(",")}]`:"Pass";return`${i+1}. ${o} (Win Rate Score: ${t.score.toFixed(1)}) - AI Analysis: ${t.explanation}`}).join(`
`);let p="";if(y&&y.length>0){const t=m.currentPlayerIndex,i=(r=y.find(([o,l])=>o!==t&&o%2===t%2))==null?void 0:r[1];if(i&&i.length>0){const o=i[i.length-1];p=`
TACTICAL SIGNAL FROM TEAMMATE: ${o.originalText} (Estimated Intent: ${o.action})`}}const C=`
You are a Poker AI with personality: ${d.preset} (Chattiness: ${d.chattiness}).
Game State:
- Your Hand: ${n.length} cards
- Last Play: ${a?"Some cards":"None (You go first)"}
- Phase: ${m.allHands.length<5?"Endgame":"Midgame"}
${p}

My "Left Brain" (MCTS Engine) has calculated the top ${h.length} strategically best moves:
${S}

TASK:
Select one of these moves that best fits your personality and coordinates with your teammate.
- If you are 'aggressive', you might choose risky but high-reward moves or smash high cards.
- If you are 'conservative', you might choose the safe bet with highest win rate.
- If you are 'balanced', you trust the win rate score most.

Explain your reasoning briefly in character, then execute the tool.
IMPORTANT: If you cannot use tools, just state which one you choose by saying "I choose Option X" where X is the number (1-${h.length}).
`,f=await this.llmService.call({purpose:"decision",prompt:C,priority:10,options:{temperature:.2,maxTokens:150}});if(f.tool_calls&&f.tool_calls.length>0){const t=f.tool_calls[0],i=typeof t.function.arguments=="string"?JSON.parse(t.function.arguments):t.function.arguments;if(t.function.name==="play_card")return this.matchCandidate(i.cards,h,n);if(t.function.name==="pass_turn")return null}if(f.content){const t=[/[Oo]ption\s*(\d+)/,/[Cc]hoice\s*(\d+)/,/选项\s*(\d+)/,/选择\s*(\d+)/,/^(\d+)[\.\s]/,/I\s*choose\s*(\d+)/];for(const i of t){const o=f.content.match(i);if(o&&o[1]){const l=parseInt(o[1])-1;if(l>=0&&l<h.length){const e=h[l].action;return e.type==="play"?e.cards:null}}}}return null}matchCandidate(n,a,h){return a[0].action.type==="play"?a[0].action.cards:null}}export{k as HybridStrategy};
