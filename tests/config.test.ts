import { describe, it, expect } from '@jest/globals';

describe('Config assembly', () => {
  const { buildConfig } = require('../src/config');

  it('should set deepseek as default model', () => {
    const config = buildConfig({ projectPath: './test' });
    expect(config.model).toBe('deepseek');
  });

  it('should default sanitize to true', () => {
    const config = buildConfig({ projectPath: './test' });
    expect(config.sanitize).toBe(true);
  });

  it('should default source to local when no --repo', () => {
    const config = buildConfig({ projectPath: './test' });
    expect(config.source).toBe('local');
  });

  it('should set source to both when --repo is provided', () => {
    const config = buildConfig({
      projectPath: './test',
      repo: 'user/repo',
    });
    expect(config.source).toBe('both');
  });

  it('should parse focus dimensions', () => {
    const config = buildConfig({
      projectPath: './test',
      focus: 'style,security',
    });
    expect(config.focus).toEqual(['style', 'security']);
  });

  it('should default scope to function', () => {
    const config = buildConfig({ projectPath: './test' });
    expect(config.scope).toBe('function');
  });

  it('should disable sanitize with --no-sanitize', () => {
    const config = buildConfig({
      projectPath: './test',
      noSanitize: true,
    });
    expect(config.sanitize).toBe(false);
  });
});
