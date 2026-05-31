import { describe, it, expect } from '@jest/globals';

describe('LlmAdapter factory', () => {
  const { getAdapter } = require('../../src/adapters/base');

  it('should return a DeepSeek adapter for model="deepseek"', () => {
    const adapter = getAdapter('deepseek');
    expect(adapter.name).toBe('deepseek');
  });

  it('should return a Claude adapter for model="claude"', () => {
    const adapter = getAdapter('claude');
    expect(adapter.name).toBe('claude');
  });

  it('should return a Kimi adapter for model="kimi"', () => {
    const adapter = getAdapter('kimi');
    expect(adapter.name).toBe('kimi');
  });

  it('should throw for unsupported model', () => {
    expect(() => getAdapter('unknown')).toThrow('Unsupported model: unknown');
  });
});
