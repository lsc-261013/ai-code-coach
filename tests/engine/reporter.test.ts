import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const { generateReport, loadHistory, generateTerminalSummary } = require('../../src/engine/reporter');

describe('generateReport', () => {
  const reportsDir = path.join(__dirname, '..', 'fixtures', 'reports');

  beforeAll(() => {
    fs.mkdirSync(reportsDir, { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(path.join(__dirname, '..', 'fixtures'), { recursive: true, force: true });
  });

  it('should produce a valid CoachReport with version 1.0', () => {
    const result = generateReport({
      projectName: 'test-project',
      source: 'local',
      model: 'deepseek',
      staticScores: { style: 7.0, quality: 8.0, security: 0, performance: 0 },
      llmIssues: [
        { severity: 'high', dimension: 'security', title: 'SQL injection', file: 'db.ts', line: 42, suggestion: 'Use parameterized queries' },
      ],
      dimensions: ['style', 'quality', 'security'],
      reportsDir,
    });

    expect(result.meta.version).toBe('1.0');
    expect(result.scores.style).toBe(7.0);
    expect(result.scores.quality).toBe(8.0);
    expect(result.issues).toHaveLength(1);
    expect(result.scores.overall).toBeGreaterThan(0);
    expect(result.scores.overall).toBeLessThanOrEqual(10);
  });

  it('should set security score from LLM issues', () => {
    const result = generateReport({
      projectName: 'test',
      source: 'local',
      model: 'deepseek',
      staticScores: { style: 5, quality: 5, security: 0, performance: 0 },
      llmIssues: [
        { severity: 'critical', dimension: 'security', title: 'Hardcoded key', file: 'a.ts', suggestion: 'Use env var' },
        { severity: 'critical', dimension: 'security', title: 'XSS', file: 'b.ts', suggestion: 'Sanitize' },
      ],
      dimensions: ['security'],
      reportsDir,
    });

    expect(result.scores.security).toBeLessThan(5);
  });
});

describe('generateTerminalSummary', () => {
  it('should return a string with scores and issues', () => {
    const report = {
      meta: { project: 'test', source: 'local', model: 'deepseek', timestamp: '2026-05-30T00:00:00Z', reportId: 'rpt_1', version: '1.0' },
      scores: { overall: 7.5, style: 7, quality: 8, security: 6, performance: 8, growth: { change: 0, trend: 'stable' as const } },
      issues: [
        { severity: 'high' as const, dimension: 'security' as const, title: 'Test issue', file: 'a.ts', suggestion: 'Fix it' },
      ],
      history: [],
      highlights: ['Good quality score'],
    };
    const summary = generateTerminalSummary(report);
    expect(summary).toContain('7.5');
    expect(summary).toContain('Test issue');
  });
});
