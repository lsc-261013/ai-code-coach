import * as fs from 'fs';
import * as path from 'path';
import { FileEntry } from '../types';

const CODE_EXTENSIONS: Record<string, string> = {
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.py': 'python',
  '.go': 'go',
  '.rs': 'rust',
  '.java': 'java',
  '.cs': 'csharp',
  '.rb': 'ruby',
  '.php': 'php',
  '.vue': 'vue',
  '.svelte': 'svelte',
};

function readIgnorePatterns(rootDir: string): string[] {
  const ignoreFile = path.join(rootDir, '.ai-coach-ignore');
  if (!fs.existsSync(ignoreFile)) return [];
  return fs.readFileSync(ignoreFile, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l && !l.startsWith('#'));
}

function matchesIgnore(filePath: string, rootDir: string, patterns: string[]): boolean {
  const relative = path.relative(rootDir, filePath).replace(/\\/g, '/');
  return patterns.some(pattern => {
    if (pattern.endsWith('/')) {
      return relative.startsWith(pattern);
    }
    return relative === pattern || relative.endsWith('/' + pattern);
  });
}

export async function collectLocal(rootDir: string): Promise<FileEntry[]> {
  const patterns = readIgnorePatterns(rootDir);
  const files: FileEntry[] = [];

  function walk(dir: string) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.name.startsWith('.') && entry.name !== '.ai-coach-ignore') continue;
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;

      if (matchesIgnore(fullPath, rootDir, patterns)) continue;

      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (CODE_EXTENSIONS[ext]) {
          files.push({
            path: path.relative(rootDir, fullPath),
            content: fs.readFileSync(fullPath, 'utf-8'),
            language: CODE_EXTENSIONS[ext],
          });
        }
      }
    }
  }

  walk(rootDir);
  return files;
}
