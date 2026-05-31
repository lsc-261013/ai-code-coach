import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('collectLocal', () => {
  const testDir = path.join(__dirname, '..', 'fixtures', 'test-project');
  const { collectLocal } = require('../../src/engine/collector');

  beforeAll(() => {
    fs.mkdirSync(path.join(testDir, 'src'), { recursive: true });
    fs.writeFileSync(path.join(testDir, 'src', 'index.ts'), 'function hello() { return "world"; }');
    fs.writeFileSync(path.join(testDir, 'src', 'utils.ts'), 'export const add = (a: number, b: number) => a + b;');
    fs.writeFileSync(path.join(testDir, 'README.md'), '# Test');
  });

  afterAll(() => {
    fs.rmSync(testDir, { recursive: true, force: true });
  });

  it('should collect all code files from a directory', async () => {
    const files = await collectLocal(testDir);
    expect(files).toHaveLength(2);
    expect(files[0].path).toContain('index.ts');
    expect(files[0].language).toBe('typescript');
  });

  it('should respect .ai-coach-ignore patterns', async () => {
    fs.writeFileSync(path.join(testDir, '.ai-coach-ignore'), 'utils.ts');
    const files = await collectLocal(testDir);
    expect(files).toHaveLength(1);
    expect(files[0].path).toContain('index.ts');
  });

  it('should collect file content', async () => {
    const files = await collectLocal(testDir);
    const indexFile = files.find((f: { path: string }) => f.path.includes('index.ts'));
    expect(indexFile).toBeDefined();
    expect(indexFile!.content).toContain('function hello()');
  });
});
