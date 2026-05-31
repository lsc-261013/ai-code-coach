import { describe, it, expect } from '@jest/globals';

const { analyzeStyle, analyzeQuality, analyzeAll } = require('../../src/engine/analyzer');

describe('analyzeStyle', () => {
  it('should calculate average function length', () => {
    const code = `function short() { return 1; }
function longer() {
  const a = 1;
  const b = 2;
  const c = 3;
  return a + b + c;
}`;
    const result = analyzeStyle(code);
    expect(result.avgFunctionLength).toBeGreaterThan(0);
    expect(result.commentDensity).toBeGreaterThanOrEqual(0);
    expect(result.namingScore).toBeGreaterThanOrEqual(0);
    expect(result.namingScore).toBeLessThanOrEqual(10);
  });

  it('should give good score for well-commented code', () => {
    const code = `// This function adds two numbers
// It takes a and b as parameters
function add(a: number, b: number): number {
  // Return the sum
  return a + b;
}`;
    const result = analyzeStyle(code);
    expect(result.commentDensity).toBeGreaterThan(0.1);
  });

  it('should detect long functions', () => {
    const lines = ['function veryLong() {'];
    for (let i = 0; i < 60; i++) {
      lines.push(`  console.log(${i});`);
    }
    lines.push('}');
    const result = analyzeStyle(lines.join('\n'));
    expect(result.avgFunctionLength).toBeGreaterThan(50);
  });
});

describe('analyzeQuality', () => {
  it('should detect high cyclomatic complexity', () => {
    const code = `function complex(x: number): string {
  if (x > 0) {
    if (x > 10) {
      if (x > 20) {
        return 'huge';
      }
      return 'big';
    }
    return 'small';
  }
  return 'negative';
}`;
    const result = analyzeQuality(code);
    expect(result.cyclomaticComplexity).toBeGreaterThanOrEqual(3);
  });

  it('should score simple code higher', () => {
    const code = `function simple(x: number): number {
  return x * 2;
}`;
    const result = analyzeQuality(code);
    expect(result.cyclomaticComplexity).toBeLessThanOrEqual(2);
  });
});

describe('analyzeAll', () => {
  it('should produce scores for all dimensions', () => {
    const files = [
      { path: 'test.ts', content: 'function hello() { return "world"; }', language: 'typescript' },
    ];
    const result = analyzeAll(files, ['style', 'quality']);
    expect(result.style).toBeGreaterThanOrEqual(0);
    expect(result.quality).toBeGreaterThanOrEqual(0);
    expect(result.style).toBeLessThanOrEqual(10);
    expect(result.quality).toBeLessThanOrEqual(10);
    expect(result.security).toBe(0);
  });
});
