import { describe, it, expect } from 'vitest';
import { LLMServiceWrapper } from '../../../src/central-brain/services/LLMServiceWrapper';

describe('LLMServiceWrapper', () => {
  
  it('应该成功调用LLM', async () => {
    const llm = new LLMServiceWrapper('test-key');
    const response = await llm.generateText({ prompt: 'Hello' });
    
    expect(response.text).toBeDefined();
    expect(response.tokens).toBeGreaterThan(0);
  });
  
  it('应该记录指标', async () => {
    const llm = new LLMServiceWrapper('test-key');
    await llm.generateText({ prompt: 'Test' });
    
    const metrics = llm.getMetrics();
    expect(metrics).toBeDefined();
  });
});

