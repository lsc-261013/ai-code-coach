import { describe, it, expect } from '@jest/globals';

const { sanitizeContent, extractFunctionContext } = require('../../src/engine/sanitizer');

describe('sanitizeContent', () => {
  it('should redact API keys', () => {
    const code = 'const apiKey = "sk-abc123def456";';
    const result = sanitizeContent(code);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('sk-abc123def456');
  });

  it('should redact passwords in assignment', () => {
    const code = 'const password = "superSecret123!";';
    const result = sanitizeContent(code);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('superSecret123!');
  });

  it('should redact JWT tokens', () => {
    const code = 'const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN";';
    const result = sanitizeContent(code);
    expect(result).toContain('[REDACTED]');
  });

  it('should redact private keys', () => {
    const code = `const privateKey = \`-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
-----END RSA PRIVATE KEY-----\`;`;
    const result = sanitizeContent(code);
    expect(result).toContain('[REDACTED]');
  });

  it('should NOT redact non-secret strings', () => {
    const code = 'const name = "hello world";';
    const result = sanitizeContent(code);
    expect(result).toBe(code);
    expect(result).not.toContain('[REDACTED]');
  });
});

describe('extractFunctionContext', () => {
  it('should extract a function with surrounding context', () => {
    const code = `import foo from 'bar';

function myFunc(a: number, b: number): number {
  return a + b;
}

export default myFunc;`;
    const result = extractFunctionContext(code, 3);
    expect(result).toContain('function myFunc');
    expect(result).toContain('return a + b');
  });

  it('should return the full file when no function boundaries found', () => {
    const code = `const x = 1;
const y = 2;`;
    const result = extractFunctionContext(code, 1);
    expect(result).toBe(code);
  });
});
