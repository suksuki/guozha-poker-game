/**
 * DOM渲染器
 * 
 * 职责：
 * 1. 使用原生DOM渲染游戏
 * 2. 处理用户输入
 * 3. 显示动画和消息
 * 
 * 优势：
 * - 简单直接
 * - 易于调试
 * - 零依赖
 * - 性能好
 * 
 * 不依赖React！完全原生DOM操作
 */

import { IRenderer, IGameState } from '../engine/types';
import { Card } from '../types/card';
import { ChatSystem, ChatMessage } from '../features/chat';
import { AnimationSystem } from '../features/animation';
import { sortCards, SortOrder, groupCardsByRank } from '../utils/cardSorting';
import { AISuggesterService } from '../services/cardPlaying/AISuggesterService';

/**
 * DOM渲染器类
 */
export class DOMRenderer implements IRenderer {
  private container: HTMLElement;
  private selectedCards: Set<string> = new Set();
  private inputResolver: ((cards: Card[] | null) => void) | null = null;
  
  // 触摸事件相关
  private touchStartX: number = 0;
  private touchStartY: number = 0;
  private touchStartTime: number = 0;
  private longPressTimer: number | null = null;
  
  // 聊天系统
  private chatSystem: ChatSystem | null = null;
  private chatInputVisible: boolean = false;
  
  // 动画系统
  private animationSystem: AnimationSystem;
  
  // 排序设置
  private sortOrder: SortOrder = 'grouped';
  
  // 托管状态
  private autoPlay: boolean = false;
  
  // 当前玩家数据（用于AI建议等）
  private currentPlayerData: any = null;
  
  /**
   * 创建渲染器
   * @param containerId 容器元素ID
   */
  constructor(containerId: string = 'game-root') {
    const element = document.getElementById(containerId);
    if (!element) {
      throw new Error(`容器元素#${containerId}不存在`);
    }
    
    this.container = element;
    console.log('[DOMRenderer] 渲染器已创建');
    
    // 创建动画系统
    this.animationSystem = new AnimationSystem({
      enabled: true,
      duration: 300,
      easing: 'ease-out'
    });
    console.log('[DOMRenderer] 动画系统已创建');
    
    // 初始化HTML结构
    this.initializeDOM();
    
    // 初始化触摸事件
    this.initializeTouchEvents();
  }
  
  /**
   * 初始化DOM结构
   */
  private initializeDOM(): void {
    this.container.innerHTML = `
      <div class="poker-game">
        <!-- 北边（顶部）：对家 -->
        <div class="player-position player-north" id="player-2">
          <div class="player-info">
            <div class="player-name">对家</div>
            <div class="player-cards">0张牌</div>
          </div>
        </div>
        
        <!-- 西边（左侧）：玩家3 -->
        <div class="player-position player-west" id="player-3">
          <div class="player-info">
            <div class="player-name">玩家3</div>
            <div class="player-cards">0张牌</div>
          </div>
        </div>
        
        <!-- 中间：出牌区域 -->
        <div class="play-area">
          <div class="last-play" id="last-play">
            <span class="placeholder">等待出牌...</span>
          </div>
          <div class="chat-messages" id="chat-messages"></div>
        </div>
        
        <!-- 东边（右侧）：玩家1 -->
        <div class="player-position player-east" id="player-1">
          <div class="player-info">
            <div class="player-name">玩家1</div>
            <div class="player-cards">0张牌</div>
          </div>
        </div>
        
        <!-- 南边（底部）：当前玩家 -->
        <div class="player-position player-south">
          <!-- 工具栏 -->
          <div class="hand-toolbar">
            <div class="toolbar-left">
              <button id="btn-sort" class="tool-btn" title="理牌">🔄 理牌</button>
              <button id="btn-ai-suggest" class="tool-btn" title="AI建议">💡 建议</button>
              <button id="btn-auto-play" class="tool-btn" title="托管">🤖 托管</button>
            </div>
            <div class="toolbar-right">
              <button id="btn-chat" class="tool-btn" title="聊天">💬</button>
            </div>
          </div>
          
          <!-- AI建议面板 -->
          <div class="ai-suggestions" id="ai-suggestions" style="display: none;">
            <div class="suggestion-header">💡 AI建议</div>
            <div class="suggestion-list" id="suggestion-list"></div>
          </div>
          
          <!-- 手牌区域 -->
          <div class="hand-cards" id="my-hand"></div>
          
          <!-- 操作按钮 -->
          <div class="actions">
            <button id="btn-play" class="game-btn">出牌</button>
            <button id="btn-pass" class="game-btn">Pass</button>
          </div>
          
          <!-- 聊天输入 -->
          <div class="chat-input-area" id="chat-input-area" style="display: none;">
            <input type="text" id="chat-input" class="chat-input" placeholder="输入消息（回车发送）..." maxlength="50">
            <button id="btn-send-chat" class="game-btn btn-chat">发送</button>
          </div>
        </div>
        
        <!-- 提示信息 -->
        <div class="info-overlay" id="info-overlay"></div>
      </div>
    `;
    
    // 绑定按钮事件
    this.setupButtons();
    this.setupToolbar();
    
    console.log('[DOMRenderer] DOM结构初始化完成');
  }
  
  /**
   * 设置按钮事件
   */
  private setupButtons(): void {
    const playBtn = document.getElementById('btn-play');
    const passBtn = document.getElementById('btn-pass');
    
    // 出牌按钮
    const playHandler = () => {
      if (this.inputResolver) {
        const cards = this.getSelectedCards();
        this.inputResolver(cards);
        this.inputResolver = null;
        this.clearSelection();
        this.vibrate(50); // 触觉反馈
      }
    };
    
    // Pass按钮
    const passHandler = () => {
      if (this.inputResolver) {
        this.inputResolver(null);
        this.inputResolver = null;
        this.clearSelection();
        this.vibrate(30); // 触觉反馈
      }
    };
    
    // 同时支持点击和触摸
    playBtn?.addEventListener('click', playHandler);
    playBtn?.addEventListener('touchend', (e) => {
      e.preventDefault(); // 防止触发click
      playHandler();
    });
    
    passBtn?.addEventListener('click', passHandler);
    passBtn?.addEventListener('touchend', (e) => {
      e.preventDefault(); // 防止触发click
      passHandler();
    });
  }
  
  /**
   * 设置工具栏事件
   */
  private setupToolbar(): void {
    // 理牌按钮
    document.getElementById('btn-sort')?.addEventListener('click', () => {
      this.cycleSortOrder();
    });
    
    // AI建议按钮
    document.getElementById('btn-ai-suggest')?.addEventListener('click', () => {
      this.toggleAISuggestions();
    });
    
    // 托管按钮
    document.getElementById('btn-auto-play')?.addEventListener('click', () => {
      this.toggleAutoPlay();
    });
    
    // 聊天按钮
    document.getElementById('btn-chat')?.addEventListener('click', () => {
      this.toggleChatInput();
    });
  }
  
  /**
   * 切换排序方式
   */
  private cycleSortOrder(): void {
    const orders: SortOrder[] = ['grouped', 'asc', 'desc'];
    const currentIndex = orders.indexOf(this.sortOrder);
    this.sortOrder = orders[(currentIndex + 1) % orders.length];
    
    const orderNames = { grouped: '分组', asc: '升序', desc: '降序' };
    this.showInfo(`理牌: ${orderNames[this.sortOrder]}`, false);
    
    // 重新渲染手牌
    if (this.currentPlayerData) {
      this.renderMyHand(this.currentPlayerData);
    }
    
    console.log(`[DOMRenderer] 理牌方式: ${this.sortOrder}`);
  }
  
  /**
   * 切换AI建议面板
   */
  private toggleAISuggestions(): void {
    const panel = document.getElementById('ai-suggestions');
    if (!panel) return;
    
    if (panel.style.display === 'none') {
      // 显示建议
      this.requestAISuggestions();
      panel.style.display = 'block';
    } else {
      panel.style.display = 'none';
    }
  }
  
  /**
   * 请求AI建议
   */
  private async requestAISuggestions(): Promise<void> {
    const suggestionList = document.getElementById('suggestion-list');
    if (!suggestionList || !this.currentPlayerData) return;
    
    suggestionList.innerHTML = '<div style="padding: 10px; color: #999;">🤔 AI正在分析...</div>';
    
    try {
      // 使用现有的AISuggesterService
      const suggester = new AISuggesterService();
      
      // 获取建议（需要游戏状态）
      // 触发事件让GameEngine提供建议
      const event = new CustomEvent('ai:request-suggestions', {
        detail: { 
          playerId: this.currentPlayerData.id,
          hand: this.currentPlayerData.hand 
        }
      });
      window.dispatchEvent(event);
      
    } catch (error) {
      suggestionList.innerHTML = '<div style="padding: 10px; color: #f44;">❌ AI建议暂时不可用</div>';
      console.error('[DOMRenderer] AI建议失败:', error);
    }
  }
  
  /**
   * 显示AI建议
   */
  showAISuggestions(suggestions: any[]): void {
    const suggestionList = document.getElementById('suggestion-list');
    if (!suggestionList) return;
    
    if (!suggestions || suggestions.length === 0) {
      suggestionList.innerHTML = '<div style="padding: 10px; color: #999;">暂无建议</div>';
      return;
    }
    
    suggestionList.innerHTML = suggestions.map((sug, idx) => `
      <div class="suggestion-item" onclick="window.adoptSuggestion(${idx})">
        <div class="suggestion-cards">${this.formatCards(sug.cards)}</div>
        <div class="suggestion-reason">${sug.reason || '推荐出牌'}</div>
      </div>
    `).join('');
    
    // 保存建议供后续采用
    (window as any).currentSuggestions = suggestions;
  }
  
  /**
   * 格式化卡牌显示
   */
  private formatCards(cards: Card[]): string {
    return cards.map(c => this.renderCard(c)).join(' ');
  }
  
  /**
   * 切换托管
   */
  private toggleAutoPlay(): void {
    this.autoPlay = !this.autoPlay;
    
    const btn = document.getElementById('btn-auto-play');
    if (btn) {
      btn.textContent = this.autoPlay ? '🤖 托管中' : '🤖 托管';
      btn.style.background = this.autoPlay ? '#28a745' : '';
    }
    
    this.showInfo(this.autoPlay ? '已开启托管' : '已关闭托管', false);
    
    // 触发托管事件
    const event = new CustomEvent('autoplay:toggle', {
      detail: { enabled: this.autoPlay }
    });
    window.dispatchEvent(event);
    
    console.log(`[DOMRenderer] 托管: ${this.autoPlay ? '开启' : '关闭'}`);
  }
  
  /**
   * 初始化触摸事件
   */
  private initializeTouchEvents(): void {
    // 防止双击缩放
    document.addEventListener('touchstart', (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    }, { passive: false });
    
    // 防止双击缩放的另一种方式
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    }, { passive: false });
    
    console.log('[DOMRenderer] 触摸事件已初始化');
  }
  
  /**
   * 触觉反馈（振动）
   */
  private vibrate(duration: number): void {
    if ('vibrate' in navigator) {
      navigator.vibrate(duration);
    }
  }
  
  /**
   * 处理卡牌触摸开始
   */
  private handleCardTouchStart(cardId: string, e: TouchEvent): void {
    e.preventDefault();
    
    const touch = e.touches[0];
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.touchStartTime = Date.now();
    
    // 长按检测（500ms）
    this.longPressTimer = window.setTimeout(() => {
      this.handleCardLongPress(cardId);
    }, 500);
  }
  
  /**
   * 处理卡牌触摸结束
   */
  private handleCardTouchEnd(cardId: string, e: TouchEvent): void {
    e.preventDefault();
    
    // 清除长按计时器
    if (this.longPressTimer) {
      clearTimeout(this.longPressTimer);
      this.longPressTimer = null;
    }
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;
    const deltaTime = Date.now() - this.touchStartTime;
    
    // 判断是点击还是滑动
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    if (distance < 10 && deltaTime < 500) {
      // 点击
      this.toggleCard(cardId);
      this.vibrate(20); // 轻微振动反馈
    } else if (distance > 50) {
      // 滑动
      this.handleCardSwipe(cardId, deltaX, deltaY);
    }
  }
  
  /**
   * 处理卡牌触摸移动
   */
  private handleCardTouchMove(e: TouchEvent): void {
    // 如果移动了，取消长按
    if (this.longPressTimer) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - this.touchStartX;
      const deltaY = touch.clientY - this.touchStartY;
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
      
      if (distance > 10) {
        clearTimeout(this.longPressTimer);
        this.longPressTimer = null;
      }
    }
  }
  
  /**
   * 处理卡牌长按
   */
  private handleCardLongPress(cardId: string): void {
    console.log('[DOMRenderer] 长按卡牌:', cardId);
    this.vibrate([30, 50, 30]); // 振动模式
    // TODO: 显示卡牌详情或其他操作
  }
  
  /**
   * 处理卡牌滑动
   */
  private handleCardSwipe(cardId: string, deltaX: number, deltaY: number): void {
    // 向上滑动 = 选中
    if (deltaY < -30) {
      if (!this.selectedCards.has(cardId)) {
        this.toggleCard(cardId);
        this.vibrate(30);
      }
    }
    // 向下滑动 = 取消选中
    else if (deltaY > 30) {
      if (this.selectedCards.has(cardId)) {
        this.toggleCard(cardId);
        this.vibrate(20);
      }
    }
  }
  
  // ==================== IRenderer接口实现 ====================
  
  /**
   * 渲染游戏状态
   */
  render(state: IGameState): void {
    console.log(`[DOMRenderer] ===== 开始渲染 Round ${state.roundNumber} =====`);
    console.log(`[DOMRenderer] 玩家数量: ${state.players.length}`);
    console.log(`[DOMRenderer] 玩家0手牌: ${state.players[0]?.hand?.length || 0}张`);
    
    // 渲染对手区域
    this.renderOpponents(state);
    
    // 渲染我的手牌（假设玩家0是当前玩家）
    this.renderMyHand(state.players[0]);
    
    // 渲染上次出牌
    this.renderLastPlay(state);
    
    // 更新回合信息
    this.updateInfo(state);
    
    console.log(`[DOMRenderer] ===== 渲染完成 =====`);
  }
  
  /**
   * 显示AI思考状态
   */
  showAIThinking(playerId: number): void {
    this.showInfo(`AI玩家${playerId}思考中...`);
  }
  
  /**
   * 设置聊天系统
   */
  setChatSystem(chatSystem: ChatSystem): void {
    this.chatSystem = chatSystem;
    
    // 监听聊天消息显示事件
    this.chatSystem.on('message:display', (event) => {
      if (event.message) {
        this.showMessage(
          event.message.playerId,
          event.message.playerName,
          event.message.message
        );
      }
    });
    
    console.log('[DOMRenderer] 聊天系统已连接');
  }
  
  /**
   * 显示聊天消息
   */
  showMessage(playerId: number, playerName: string, message: string, displayTime: number = 5000): void {
    const messagesDiv = document.getElementById('chat-messages');
    if (!messagesDiv) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-bubble';
    msgDiv.innerHTML = `
      <div class="chat-player">${playerName}</div>
      <div class="chat-text">${message}</div>
    `;
    
    messagesDiv.appendChild(msgDiv);
    
    // 自动滚动
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // 淡出并移除
    setTimeout(() => {
      msgDiv.style.opacity = '0';
      setTimeout(() => msgDiv.remove(), 500);
    }, displayTime);
    
    console.log(`[DOMRenderer] ${playerName}: ${message}`);
  }
  
  /**
   * 清空聊天消息
   */
  clearMessages(): void {
    const messagesDiv = document.getElementById('chat-messages');
    if (messagesDiv) {
      messagesDiv.innerHTML = '';
    }
  }
  
  /**
   * 显示聊天输入框
   */
  showChatInput(onSubmit: (message: string) => void): void {
    const existingInput = document.getElementById('chat-input-container');
    if (existingInput) {
      existingInput.remove();
    }
    
    const inputContainer = document.createElement('div');
    inputContainer.id = 'chat-input-container';
    inputContainer.className = 'chat-input-container';
    inputContainer.innerHTML = `
      <input type="text" id="chat-input" class="chat-input" placeholder="输入消息..." maxlength="50" />
      <button id="chat-send" class="chat-send-btn">发送</button>
      <button id="chat-cancel" class="chat-cancel-btn">×</button>
    `;
    
    document.body.appendChild(inputContainer);
    
    const input = document.getElementById('chat-input') as HTMLInputElement;
    const sendBtn = document.getElementById('chat-send');
    const cancelBtn = document.getElementById('chat-cancel');
    
    // 自动聚焦
    setTimeout(() => input?.focus(), 100);
    
    // 发送消息
    const send = () => {
      const message = input?.value.trim();
      if (message) {
        onSubmit(message);
        inputContainer.remove();
      }
    };
    
    // 取消
    const cancel = () => {
      inputContainer.remove();
    };
    
    // 事件绑定
    sendBtn?.addEventListener('click', send);
    cancelBtn?.addEventListener('click', cancel);
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        send();
      } else if (e.key === 'Escape') {
        cancel();
      }
    });
  }
  
  /**
   * 隐藏聊天输入框
   */
  hideChatInput(): void {
    const inputContainer = document.getElementById('chat-input-container');
    if (inputContainer) {
      inputContainer.remove();
    }
  }
  
  /**
   * 等待人类玩家输入
   */
  async waitForHumanInput(): Promise<Card[] | null> {
    this.showInfo('请选择要出的牌，然后点击"出牌"或"Pass"');
    
    return new Promise((resolve) => {
      this.inputResolver = resolve;
    });
  }
  
  /**
   * 显示游戏结束
   */
  showGameEnd(winnerId: number): void {
    this.showInfo(`游戏结束！玩家${winnerId}获胜！`, true);
  }
  
  // ==================== 渲染辅助方法 ====================
  
  /**
   * 渲染对手
   */
  private renderOpponents(state: IGameState): void {
    // 东边：玩家1
    const player1 = state.players[1];
    const slot1 = document.getElementById('player-1');
    if (slot1 && player1) {
      slot1.innerHTML = `
        <div class="player-info">
          <div class="player-name">${player1.name}</div>
          <div class="player-cards">${player1.hand.length}张牌</div>
          <div class="player-type">${player1.type === 'ai' ? '🤖' : '👤'}</div>
        </div>
      `;
    }
    
    // 北边：玩家2（对家）
    const player2 = state.players[2];
    const slot2 = document.getElementById('player-2');
    if (slot2 && player2) {
      slot2.innerHTML = `
        <div class="player-info">
          <div class="player-name">${player2.name}</div>
          <div class="player-cards">${player2.hand.length}张牌</div>
          <div class="player-type">${player2.type === 'ai' ? '🤖' : '👤'}</div>
        </div>
      `;
    }
    
    // 西边：玩家3
    const player3 = state.players[3];
    const slot3 = document.getElementById('player-3');
    if (slot3 && player3) {
      slot3.innerHTML = `
        <div class="player-info">
          <div class="player-name">${player3.name}</div>
          <div class="player-cards">${player3.hand.length}张牌</div>
          <div class="player-type">${player3.type === 'ai' ? '🤖' : '👤'}</div>
        </div>
      `;
    }
  }
  
  /**
   * 渲染我的手牌
   */
  private renderMyHand(player: any): void {
    const handDiv = document.getElementById('my-hand');
    if (!handDiv) {
      console.error('[DOMRenderer] 找不到my-hand元素');
      return;
    }
    
    if (!player || !player.hand || player.hand.length === 0) {
      handDiv.innerHTML = '<div style="padding: 20px; color: #999; text-align: center;">暂无手牌</div>';
      return;
    }
    
    console.log(`[DOMRenderer] 渲染手牌: ${player.hand.length}张`);
    
    // 保存当前玩家数据
    this.currentPlayerData = player;
    
    // 排序手牌
    const sortedHand = sortCards(player.hand, this.sortOrder);
    
    // 按点数分组（用于分组显示）
    const grouped = groupCardsByRank(sortedHand);
    
    // 渲染：如果是分组模式，按组显示；否则直接显示
    if (this.sortOrder === 'grouped') {
      handDiv.innerHTML = Array.from(grouped.entries())
        .sort(([a], [b]) => a - b)
        .map(([rank, cards]) => `
          <div class="card-group" data-rank="${rank}">
            <div class="rank-label">${this.getRankDisplay(rank)} ×${cards.length}</div>
            <div class="group-cards">
              ${cards.map(card => `
                <div class="card ${this.selectedCards.has(card.id) ? 'selected' : ''}"
                     data-card-id="${card.id}">
                  ${this.renderCard(card)}
                </div>
              `).join('')}
            </div>
          </div>
        `).join('');
    } else {
      handDiv.innerHTML = sortedHand.map((card: Card) => `
        <div class="card ${this.selectedCards.has(card.id) ? 'selected' : ''}"
             data-card-id="${card.id}">
          ${this.renderCard(card)}
        </div>
      `).join('');
    }
    
    console.log('[DOMRenderer] 手牌HTML已更新');
    
    // 收集所有卡牌元素用于动画和事件绑定
    const cardElements: HTMLElement[] = [];
    
    // 为每张卡牌绑定触摸事件
    sortedHand.forEach((card: Card) => {
      const cardElement = document.querySelector(`[data-card-id="${card.id}"]`) as HTMLElement;
      if (!cardElement) return;
      
      cardElements.push(cardElement);
      
      // 点击事件（PC端）
      cardElement.addEventListener('click', (e) => {
        e.preventDefault();
        this.toggleCard(card.id);
      });
      
      // 触摸事件（移动端）
      cardElement.addEventListener('touchstart', (e) => {
        this.handleCardTouchStart(card.id, e as TouchEvent);
      }, { passive: false });
      
      cardElement.addEventListener('touchmove', (e) => {
        this.handleCardTouchMove(e as TouchEvent);
      }, { passive: false });
      
      cardElement.addEventListener('touchend', (e) => {
        this.handleCardTouchEnd(card.id, e as TouchEvent);
      }, { passive: false });
    });
    
    // 如果是分组模式，为组添加点击事件（点击组标签选择整组）
    if (this.sortOrder === 'grouped') {
      grouped.forEach((cards, rank) => {
        const groupElement = document.querySelector(`[data-rank="${rank}"]`) as HTMLElement;
        const labelElement = groupElement?.querySelector('.rank-label');
        
        labelElement?.addEventListener('click', (e) => {
          e.stopPropagation();
          // 选择/取消选择整组
          const allSelected = cards.every(card => this.selectedCards.has(card.id));
          cards.forEach(card => {
            if (allSelected) {
              this.selectedCards.delete(card.id);
            } else {
              this.selectedCards.add(card.id);
            }
          });
          this.renderMyHand(player);
        });
      });
    }
    
    // 播放发牌动画（如果有新卡牌）
    if (cardElements.length > 0 && this.animationSystem) {
      this.animationSystem.animateDeal(cardElements, 30);
    }
  }
  
  /**
   * 获取点数显示文本
   */
  private getRankDisplay(rank: number): string {
    const rankMap: { [key: number]: string } = {
      11: 'J', 12: 'Q', 13: 'K', 14: 'A', 15: '2',
      16: '小王', 17: '大王'
    };
    return rankMap[rank] || String(rank);
  }
  
  /**
   * 渲染单张卡牌
   */
  private renderCard(card: Card): string {
    const suitSymbol = {
      'hearts': '♥',
      'diamonds': '♦',
      'clubs': '♣',
      'spades': '♠',
      'joker': '🃏'
    }[card.suit] || '';
    
    const rankText = card.rank > 10 ? 
      ['', '', '', 'J', 'Q', 'K', 'A', '2', '小王', '大王'][card.rank - 10] :
      card.rank.toString();
    
    return `<span class="suit">${suitSymbol}</span><span class="rank">${rankText}</span>`;
  }
  
  /**
   * 渲染上次出牌
   */
  private renderLastPlay(state: IGameState): void {
    const lastPlayDiv = document.getElementById('last-play');
    if (!lastPlayDiv) return;
    
    if (state.lastPlay) {
      lastPlayDiv.innerHTML = `
        <div class="last-play-info">
          <div>玩家${state.lastPlayerId}出牌:</div>
          <div class="play-cards">
            ${state.lastPlay.cards.map(c => this.renderCard(c)).join(' ')}
          </div>
        </div>
      `;
    } else {
      lastPlayDiv.innerHTML = '<span class="placeholder">等待出牌...</span>';
    }
  }
  
  /**
   * 更新信息显示
   */
  private updateInfo(state: IGameState): void {
    // 可以显示回合号、分数等
    // TODO: 添加更多信息
  }
  
  /**
   * 显示提示信息
   */
  private showInfo(message: string, persistent: boolean = false): void {
    const overlay = document.getElementById('info-overlay');
    if (!overlay) return;
    
    overlay.textContent = message;
    overlay.style.display = 'block';
    
    if (!persistent) {
      setTimeout(() => {
        overlay.style.display = 'none';
      }, 2000);
    }
  }
  
  // ==================== 卡牌选择 ====================
  
  /**
   * 切换卡牌选中状态
   */
  toggleCard(cardId: string): void {
    if (this.selectedCards.has(cardId)) {
      this.selectedCards.delete(cardId);
    } else {
      this.selectedCards.add(cardId);
    }
    
    // 更新UI
    const cardElement = document.querySelector(`[data-card-id="${cardId}"]`);
    if (cardElement) {
      cardElement.classList.toggle('selected');
    }
  }
  
  /**
   * 获取选中的卡牌
   */
  private getSelectedCards(): Card[] {
    // TODO: 从选中的ID获取实际Card对象
    // 需要访问gameState或通过其他方式
    return [];
  }
  
  /**
   * 清空选择
   */
  private clearSelection(): void {
    this.selectedCards.clear();
    document.querySelectorAll('.card.selected').forEach(el => {
      el.classList.remove('selected');
    });
  }
}

// 触摸事件已完全集成到DOMRenderer中
// 不再需要全局函数

