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

/**
 * DOM渲染器类
 */
export class DOMRenderer implements IRenderer {
  private container: HTMLElement;
  private selectedCards: Set<string> = new Set();
  private inputResolver: ((cards: Card[] | null) => void) | null = null;
  
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
    
    // 初始化HTML结构
    this.initializeDOM();
  }
  
  /**
   * 初始化DOM结构
   */
  private initializeDOM(): void {
    this.container.innerHTML = `
      <div class="poker-game">
        <!-- 顶部：对手区域 -->
        <div class="opponents-area">
          <div class="player-slot" id="player-1"></div>
          <div class="player-slot" id="player-2"></div>
          <div class="player-slot" id="player-3"></div>
        </div>
        
        <!-- 中间：出牌区域 -->
        <div class="play-area">
          <div class="last-play" id="last-play">
            <span class="placeholder">等待出牌...</span>
          </div>
          <div class="chat-messages" id="chat-messages"></div>
        </div>
        
        <!-- 底部：当前玩家手牌 -->
        <div class="my-hand-area">
          <div class="hand-cards" id="my-hand"></div>
          <div class="actions">
            <button id="btn-play" class="game-btn">出牌</button>
            <button id="btn-pass" class="game-btn">Pass</button>
          </div>
        </div>
        
        <!-- 提示信息 -->
        <div class="info-overlay" id="info-overlay"></div>
      </div>
    `;
    
    // 绑定按钮事件
    this.setupButtons();
    
    console.log('[DOMRenderer] DOM结构初始化完成');
  }
  
  /**
   * 设置按钮事件
   */
  private setupButtons(): void {
    // 出牌按钮
    document.getElementById('btn-play')?.addEventListener('click', () => {
      if (this.inputResolver) {
        const cards = this.getSelectedCards();
        this.inputResolver(cards);
        this.inputResolver = null;
        this.clearSelection();
      }
    });
    
    // Pass按钮
    document.getElementById('btn-pass')?.addEventListener('click', () => {
      if (this.inputResolver) {
        this.inputResolver(null);
        this.inputResolver = null;
        this.clearSelection();
      }
    });
  }
  
  // ==================== IRenderer接口实现 ====================
  
  /**
   * 渲染游戏状态
   */
  render(state: IGameState): void {
    console.log(`[DOMRenderer] 渲染 Round ${state.roundNumber}`);
    
    // 渲染对手区域
    this.renderOpponents(state);
    
    // 渲染我的手牌（假设玩家0是当前玩家）
    this.renderMyHand(state.players[0]);
    
    // 渲染上次出牌
    this.renderLastPlay(state);
    
    // 更新回合信息
    this.updateInfo(state);
  }
  
  /**
   * 显示AI思考状态
   */
  showAIThinking(playerId: number): void {
    this.showInfo(`AI玩家${playerId}思考中...`);
  }
  
  /**
   * 显示聊天消息
   */
  showMessage(playerId: number, message: string): void {
    const messagesDiv = document.getElementById('chat-messages');
    if (!messagesDiv) return;
    
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-bubble';
    msgDiv.textContent = `玩家${playerId}: ${message}`;
    
    messagesDiv.appendChild(msgDiv);
    
    // 自动滚动
    messagesDiv.scrollTop = messagesDiv.scrollHeight;
    
    // 3秒后淡出
    setTimeout(() => {
      msgDiv.style.opacity = '0';
      setTimeout(() => msgDiv.remove(), 500);
    }, 3000);
    
    console.log(`[DOMRenderer] 显示消息: ${message}`);
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
    for (let i = 1; i < state.players.length; i++) {
      const player = state.players[i];
      const slot = document.getElementById(`player-${i}`);
      if (!slot) continue;
      
      slot.innerHTML = `
        <div class="player-info">
          <div class="player-name">${player.name}</div>
          <div class="player-cards">${player.hand.length}张牌</div>
          <div class="player-type">${player.type === 'ai' ? '🤖AI' : '👤'}</div>
        </div>
      `;
    }
  }
  
  /**
   * 渲染我的手牌
   */
  private renderMyHand(player: any): void {
    const handDiv = document.getElementById('my-hand');
    if (!handDiv) return;
    
    handDiv.innerHTML = player.hand.map((card: Card) => `
      <div class="card ${this.selectedCards.has(card.id) ? 'selected' : ''}"
           data-card-id="${card.id}"
           onclick="window.toggleCard('${card.id}')">
        ${this.renderCard(card)}
      </div>
    `).join('');
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

// 暴露到全局（供内联事件使用）
(window as any).toggleCard = function(cardId: string) {
  // TODO: 需要获取renderer实例
  console.log('Toggle card:', cardId);
};

