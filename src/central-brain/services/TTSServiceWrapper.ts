/**
 * TTS服务封装
 * 使用AsyncTaskManager处理超时/重试/降级
 */

import { AsyncTaskManager } from '../infrastructure/async/AsyncTaskManager';

export interface TTSRequest {
  text: string;
  voice?: string;
  speed?: number;
}

export interface TTSResponse {
  audioUrl: string;
  duration: number;
}

export class TTSServiceWrapper {
  private asyncManager: AsyncTaskManager;
  private serviceUrl: string;
  
  constructor(serviceUrl: string = 'http://localhost:5000') {
    this.serviceUrl = serviceUrl;
    this.asyncManager = new AsyncTaskManager();
  }
  
  async synthesize(request: TTSRequest): Promise<TTSResponse> {
    const result = await this.asyncManager.execute(
      () => this.callTTSAPI(request),
      {
        timeout: 5000,
        retryCount: 1,
        retryDelay: 500,
        fallback: () => this.getFallbackResponse(),
        enableMetrics: true
      }
    );
    
    if (result.success && result.data) {
      return result.data;
    }
    
    throw new Error(result.error?.message || 'TTS call failed');
  }
  
  private async callTTSAPI(request: TTSRequest): Promise<TTSResponse> {
    // 实际TTS API调用
    return {
      audioUrl: `/audio/${Date.now()}.mp3`,
      duration: request.text.length * 100
    };
  }
  
  private getFallbackResponse(): TTSResponse {
    return {
      audioUrl: '',
      duration: 0
    };
  }
  
  getMetrics() {
    return this.asyncManager.getMetrics();
  }
}

