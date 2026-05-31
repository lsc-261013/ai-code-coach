import { FileEntry, Issue, FocusDimension, ScopeLevel } from '../types';
import { getAdapter } from '../adapters/base';

interface ReviewOptions {
  model: string;
  dimensions: FocusDimension[];
  scope: ScopeLevel;
}

export async function reviewFiles(
  files: FileEntry[],
  opts: ReviewOptions
): Promise<Issue[]> {
  const adapter = getAdapter(opts.model);
  const allIssues: Issue[] = [];

  for (const file of files) {
    const chunkSize = opts.scope === 'function' ? 3 : 10;
    const codeChunks = chunkCode(file.content, chunkSize);

    for (const chunk of codeChunks) {
      try {
        const response = await adapter.review({
          codeSnippet: chunk,
          filename: file.path,
          dimensions: opts.dimensions,
          scope: opts.scope,
        });

        const issues: Issue[] = response.issues.map(issue => ({
          severity: issue.severity,
          dimension: issue.dimension as FocusDimension | 'general',
          title: issue.title,
          file: file.path,
          line: issue.line,
          suggestion: issue.suggestion,
        }));

        allIssues.push(...issues);
      } catch (err) {
        console.error(`Review failed for ${file.path}: ${(err as Error).message}`);
      }
    }
  }

  return allIssues;
}

function chunkCode(content: string, maxFunctions: number): string[] {
  const lines = content.split('\n');
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let funcCount = 0;
  let braceDepth = 0;
  let inFunc = false;

  for (const line of lines) {
    currentChunk.push(line);

    const opens = (line.match(/\{/g) || []).length;
    const closes = (line.match(/\}/g) || []).length;
    braceDepth += opens - closes;

    if (/^(export\s+)?(async\s+)?function\s/.test(line.trim()) ||
        /^(export\s+)?class\s/.test(line.trim()) ||
        /^\s*(public|private|protected)\s+\w+\s*\(/.test(line.trim())) {
      inFunc = true;
    }

    if (inFunc && braceDepth === 0 && closes > 0) {
      funcCount++;
      inFunc = false;

      if (funcCount >= maxFunctions) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [];
        funcCount = 0;
      }
    }
  }

  if (currentChunk.length > 0 && currentChunk.join('\n').trim().length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  return chunks.length > 0 ? chunks : [content];
}
