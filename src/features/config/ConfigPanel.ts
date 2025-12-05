/**
 * 配置面板
 * 
 * 职责：
 * 1. 显示/隐藏配置界面
 * 2. 保存/加载配置
 * 3. 配置验证
 */

export interface GameConfig {
  // 音效配置
  soundEnabled: boolean;
  soundVolume: number;
  
  // 动画配置
  animationEnabled: boolean;
  
  // AI配置
  enableLLM: boolean;
  llmEndpoint: string;
  llmModel: string;
  
  // TTS配置
  enableTTS: boolean;
  ttsProvider: 'browser' | 'edge' | 'piper' | 'ollama';
  ttsVoice: string;
}

const DEFAULT_CONFIG: GameConfig = {
  soundEnabled: true,
  soundVolume: 0.7,
  animationEnabled: true,
  enableLLM: false,
  llmEndpoint: 'http://localhost:11434/api/chat',
  llmModel: 'qwen2.5:3b',
  enableTTS: false,
  ttsProvider: 'browser',
  ttsVoice: 'zh-CN'
};

export class ConfigPanel {
  private config: GameConfig;
  private panelElement: HTMLElement | null = null;
  private visible: boolean = false;
  private onConfigChange?: (config: GameConfig) => void;
  
  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.loadConfig();
    this.createPanel();
  }
  
  /**
   * 创建配置面板
   */
  private createPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'config-panel';
    panel.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      padding: 30px;
      width: 90%;
      max-width: 500px;
      max-height: 80vh;
      overflow-y: auto;
      z-index: 9999;
      display: none;
    `;
    
    panel.innerHTML = `
      <h2 style="margin: 0 0 20px 0; color: #333; font-size: 24px;">⚙️ 游戏设置</h2>
      
      <!-- 音效设置 -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #667eea; font-size: 18px;">🔊 音效设置</h3>
        <label style="display: flex; align-items: center; margin-bottom: 10px;">
          <input type="checkbox" id="config-sound-enabled" ${this.config.soundEnabled ? 'checked' : ''}>
          <span style="margin-left: 8px;">启用音效</span>
        </label>
        <label style="display: block; margin-bottom: 10px;">
          <span style="display: block; margin-bottom: 5px;">音量: <span id="config-volume-value">${Math.round(this.config.soundVolume * 100)}%</span></span>
          <input type="range" id="config-sound-volume" min="0" max="100" value="${Math.round(this.config.soundVolume * 100)}" style="width: 100%;">
        </label>
      </div>
      
      <!-- 动画设置 -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #667eea; font-size: 18px;">✨ 动画设置</h3>
        <label style="display: flex; align-items: center;">
          <input type="checkbox" id="config-animation-enabled" ${this.config.animationEnabled ? 'checked' : ''}>
          <span style="margin-left: 8px;">启用动画</span>
        </label>
      </div>
      
      <!-- AI设置 -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #667eea; font-size: 18px;">🤖 AI设置（Ollama）</h3>
        <label style="display: flex; align-items: center; margin-bottom: 10px;">
          <input type="checkbox" id="config-llm-enabled" ${this.config.enableLLM ? 'checked' : ''}>
          <span style="margin-left: 8px;">启用LLM智能决策</span>
        </label>
        <label style="display: block; margin-bottom: 10px;">
          <span style="display: block; margin-bottom: 5px;">Ollama地址:</span>
          <input type="text" id="config-llm-endpoint" value="${this.config.llmEndpoint}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </label>
        <label style="display: block; margin-bottom: 10px;">
          <span style="display: block; margin-bottom: 5px;">模型名称:</span>
          <input type="text" id="config-llm-model" value="${this.config.llmModel}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
        </label>
        <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">
          💡 提示: 确保Ollama服务正在运行<br>
          命令: <code>ollama serve</code>
        </p>
      </div>
      
      <!-- TTS设置 -->
      <div style="margin-bottom: 20px;">
        <h3 style="margin: 0 0 10px 0; color: #667eea; font-size: 18px;">🗣️ 语音设置（TTS）</h3>
        <label style="display: flex; align-items: center; margin-bottom: 10px;">
          <input type="checkbox" id="config-tts-enabled" ${this.config.enableTTS ? 'checked' : ''}>
          <span style="margin-left: 8px;">启用语音播报</span>
        </label>
        <label style="display: block; margin-bottom: 10px;">
          <span style="display: block; margin-bottom: 5px;">语音提供商:</span>
          <select id="config-tts-provider" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
            <option value="browser" ${this.config.ttsProvider === 'browser' ? 'selected' : ''}>浏览器内置</option>
            <option value="edge" ${this.config.ttsProvider === 'edge' ? 'selected' : ''}>Edge TTS</option>
            <option value="piper" ${this.config.ttsProvider === 'piper' ? 'selected' : ''}>Piper TTS</option>
            <option value="ollama" ${this.config.ttsProvider === 'ollama' ? 'selected' : ''}>Ollama TTS</option>
          </select>
        </label>
        <p style="font-size: 12px; color: #999; margin: 5px 0 0 0;">
          💡 提示: 浏览器内置最简单，其他需要额外配置
        </p>
      </div>
      
      <!-- 按钮 -->
      <div style="display: flex; gap: 10px; margin-top: 20px;">
        <button id="config-save" style="flex: 1; padding: 12px; background: #667eea; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
          保存设置
        </button>
        <button id="config-cancel" style="flex: 1; padding: 12px; background: #999; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer;">
          取消
        </button>
      </div>
    `;
    
    document.body.appendChild(panel);
    this.panelElement = panel;
    
    // 绑定事件
    this.bindEvents();
  }
  
  /**
   * 绑定事件
   */
  private bindEvents(): void {
    if (!this.panelElement) return;
    
    // 音量滑块
    const volumeSlider = document.getElementById('config-sound-volume') as HTMLInputElement;
    const volumeValue = document.getElementById('config-volume-value');
    volumeSlider?.addEventListener('input', () => {
      if (volumeValue) {
        volumeValue.textContent = `${volumeSlider.value}%`;
      }
    });
    
    // 保存按钮
    document.getElementById('config-save')?.addEventListener('click', () => {
      this.saveConfig();
      this.hide();
    });
    
    // 取消按钮
    document.getElementById('config-cancel')?.addEventListener('click', () => {
      this.hide();
    });
  }
  
  /**
   * 显示面板
   */
  show(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'block';
      this.visible = true;
    }
  }
  
  /**
   * 隐藏面板
   */
  hide(): void {
    if (this.panelElement) {
      this.panelElement.style.display = 'none';
      this.visible = false;
    }
  }
  
  /**
   * 切换显示
   */
  toggle(): void {
    if (this.visible) {
      this.hide();
    } else {
      this.show();
    }
  }
  
  /**
   * 保存配置
   */
  private saveConfig(): void {
    this.config = {
      soundEnabled: (document.getElementById('config-sound-enabled') as HTMLInputElement)?.checked || false,
      soundVolume: parseInt((document.getElementById('config-sound-volume') as HTMLInputElement)?.value || '70') / 100,
      animationEnabled: (document.getElementById('config-animation-enabled') as HTMLInputElement)?.checked || false,
      enableLLM: (document.getElementById('config-llm-enabled') as HTMLInputElement)?.checked || false,
      llmEndpoint: (document.getElementById('config-llm-endpoint') as HTMLInputElement)?.value || '',
      llmModel: (document.getElementById('config-llm-model') as HTMLInputElement)?.value || '',
      enableTTS: (document.getElementById('config-tts-enabled') as HTMLInputElement)?.checked || false,
      ttsProvider: (document.getElementById('config-tts-provider') as HTMLSelectElement)?.value as any || 'browser',
      ttsVoice: 'zh-CN'
    };
    
    // 保存到localStorage
    localStorage.setItem('game-config', JSON.stringify(this.config));
    
    // 触发回调
    if (this.onConfigChange) {
      this.onConfigChange(this.config);
    }
    
    console.log('[ConfigPanel] 配置已保存:', this.config);
  }
  
  /**
   * 加载配置
   */
  private loadConfig(): void {
    try {
      const saved = localStorage.getItem('game-config');
      if (saved) {
        this.config = { ...DEFAULT_CONFIG, ...JSON.parse(saved) };
        console.log('[ConfigPanel] 配置已加载:', this.config);
      }
    } catch (error) {
      console.warn('[ConfigPanel] 加载配置失败:', error);
    }
  }
  
  /**
   * 获取配置
   */
  getConfig(): GameConfig {
    return { ...this.config };
  }
  
  /**
   * 设置配置变更回调
   */
  onchange(callback: (config: GameConfig) => void): void {
    this.onConfigChange = callback;
  }
}

