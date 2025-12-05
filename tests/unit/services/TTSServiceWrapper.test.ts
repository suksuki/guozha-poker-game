import { describe, it, expect } from 'vitest';
import { TTSServiceWrapper } from '../../../src/central-brain/services/TTSServiceWrapper';

describe('TTSServiceWrapper', () => {
  
  it('应该成功调用TTS', async () => {
    const tts = new TTSServiceWrapper();
    const response = await tts.synthesize({ text: 'Hello' });
    
    expect(response.audioUrl).toBeDefined();
    expect(response.duration).toBeGreaterThan(0);
  });
  
  it('应该记录指标', async () => {
    const tts = new TTSServiceWrapper();
    await tts.synthesize({ text: 'Test' });
    
    const metrics = tts.getMetrics();
    expect(metrics).toBeDefined();
  });
});

