# AI Code Coach Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build AI Code Coach — a CLI + Web dashboard tool that analyzes code (style, quality, security, performance), tracks growth via history, and supports multi-model LLM backends.

**Architecture:** CLI engine (TypeScript/Commander) runs the pipeline: collect → sanitize → analyze → LLM review → JSON report. Web dashboard is pure static HTML/JS that reads the JSON and renders charts via Chart.js.

**Tech Stack:** TypeScript, Node.js, Commander, Anthropic SDK, OpenAI SDK (for DeepSeek/Kimi), Octokit, Chart.js, OS crontab/schtasks.

---

## File Map

| File | Responsibility |
|------|---------------|
| `src/index.ts` | CLI entry — Commander setup, subcommands, interactive model picker |
| `src/config.ts` | Read .env, CLI args → typed config object |
| `src/adapters/base.ts` | LLM adapter interface + factory (model → adapter) |
| `src/adapters/deepseek.ts` | DeepSeek API adapter (OpenAI-compatible) |
| `src/adapters/claude.ts` | Claude API adapter (Anthropic SDK) |
| `src/adapters/kimi.ts` | Kimi API adapter (OpenAI-compatible) |
| `src/engine/collector.ts` | Read local filesystem + GitHub API → file list with content |
| `src/engine/sanitizer.ts` | Redact secrets, apply .ai-coach-ignore, scope limit |
| `src/engine/analyzer.ts` | Static analysis: style metrics, complexity, duplication detection |
| `src/engine/reviewer.ts` | Call LLM adapter with code snippets → structured issues |
| `src/engine/reporter.ts` | Assemble scores + issues + history → JSON report, terminal summary |
| `src/scheduler.ts` | Write/remove OS task scheduler entries |
| `src/web/dashboard.html` | Static dashboard page |
| `src/web/dashboard.js` | Read JSON → Chart.js radar + line charts + issue table |
| `src/web/style.css` | Dashboard styles |
| `tests/config.test.ts` | Config unit tests |
| `tests/adapters/base.test.ts` | Adapter factory tests |
| `tests/engine/collector.test.ts` | Collector tests |
| `tests/engine/sanitizer.test.ts` | Sanitizer tests |
| `tests/engine/analyzer.test.ts` | Analyzer tests |
| `tests/engine/reporter.test.ts` | Reporter tests |

---

## Phase 0: Project Scaffold

### Task 0.1: Initialize project

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\package.json`
- Create: `C:\Users\27835\Desktop\ai-code-coach\tsconfig.json`
- Create: `C:\Users\27835\Desktop\ai-code-coach\.gitignore`
- Create: `C:\Users\27835\Desktop\ai-code-coach\.env.example`

- [ ] **Step 1: Write package.json**

```json
{
  "name": "ai-code-coach",
  "version": "1.0.0",
  "description": "AI-powered personal programming coach — analyzes your code and tracks your growth",
  "main": "dist/index.js",
  "bin": {
    "ai-coach": "./dist/index.js"
  },
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "jest --verbose",
    "test:watch": "jest --watch"
  },
  "dependencies": {
    "commander": "^12.1.0",
    "@anthropic-ai/sdk": "^0.32.1",
    "openai": "^4.73.0",
    "octokit": "^4.0.2",
    "dotenv": "^16.4.5",
    "chalk": "^5.3.0",
    "chart.js": "^4.4.7"
  },
  "devDependencies": {
    "typescript": "^5.6.3",
    "@types/node": "^22.9.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.2.5",
    "@jest/globals": "^29.7.0"
  }
}
```

- [ ] **Step 2: Write tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

- [ ] **Step 3: Write .gitignore**

```
node_modules/
dist/
.env
reports/*.json
!reports/.gitkeep
*.js.map
.DS_Store
```

- [ ] **Step 4: Write .env.example**

```
# AI Code Coach — API Keys
# Uncomment the model(s) you want to use

# DeepSeek (default, China direct access)
# Get key: https://platform.deepseek.com
DEEPSEEK_API_KEY=sk-your-key-here

# Anthropic Claude (requires VPN)
# Get key: https://console.anthropic.com
CLAUDE_API_KEY=sk-ant-your-key-here

# Kimi (China direct access)
# Get key: https://platform.moonshot.cn
KIMI_API_KEY=sk-your-key-here

# GitHub Personal Access Token (for --repo mode)
# Get token: https://github.com/settings/tokens
GITHUB_TOKEN=ghp_your-token-here
```

- [ ] **Step 5: Create directories**

```bash
mkdir -p "C:/Users/27835/Desktop/ai-code-coach/src/engine"
mkdir -p "C:/Users/27835/Desktop/ai-code-coach/src/adapters"
mkdir -p "C:/Users/27835/Desktop/ai-code-coach/src/web"
mkdir -p "C:/Users/27835/Desktop/ai-code-coach/tests/engine"
mkdir -p "C:/Users/27835/Desktop/ai-code-coach/tests/adapters"
mkdir -p "C:/Users/27835/Desktop/ai-code-coach/reports"
```

- [ ] **Step 6: Install dependencies**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npm install --registry https://registry.npmmirror.com
```

- [ ] **Step 7: Create jest config in package.json** — add to package.json after "scripts":

```json
"jest": {
  "preset": "ts-jest",
  "testEnvironment": "node",
  "roots": ["<rootDir>/tests"],
  "moduleNameMapper": {
    "^@/(.*)$": "<rootDir>/src/$1"
  }
}
```

- [ ] **Step 8: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git init
git add -A
git commit -m "chore: scaffold project with TypeScript + Jest"
```

---

## Phase 1: Config & Types

### Task 1.1: Write types

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\types.ts`

- [ ] **Step 1: Write source/model type definitions**

```typescript
// src/types.ts

export type ModelName = 'deepseek' | 'claude' | 'kimi' | 'qwen';

export type FocusDimension = 'style' | 'quality' | 'security' | 'performance';

export type SourceMode = 'local' | 'github' | 'both';

export type ScopeLevel = 'function' | 'file' | 'project';

export type ScheduleFrequency = 'daily' | 'weekly';

export type Severity = 'critical' | 'high' | 'medium' | 'low';

export interface CoachConfig {
  projectPath: string;
  repoName?: string;
  source: SourceMode;
  focus: FocusDimension[];
  model: ModelName;
  scope: ScopeLevel;
  sanitize: boolean;
  outputMode: 'full' | 'terminal-only' | 'json-only';
  schedule?: ScheduleFrequency;
  trendOnly: boolean;
}

export interface FileEntry {
  path: string;
  content: string;
  language: string;
}

export interface StyleMetrics {
  avgFunctionLength: number;
  maxFunctionLength: number;
  commentDensity: number;        // 0-1, comments / total lines
  namingScore: number;           // 0-10
  consistencyScore: number;      // 0-10
}

export interface QualityMetrics {
  cyclomaticComplexity: number;  // average
  duplicationRate: number;       // 0-1
  errorHandlingScore: number;    // 0-10
}

export interface ScoreSet {
  overall: number;               // 0-10
  style: number;
  quality: number;
  security: number;
  performance: number;
}

export interface Issue {
  severity: Severity;
  dimension: FocusDimension | 'general';
  title: string;
  file: string;
  line?: number;
  codeSnippet?: string;
  suggestion: string;
}

export interface ReportMeta {
  project: string;
  source: string;
  model: string;
  timestamp: string;             // ISO 8601
  reportId: string;
  version: string;
}

export interface GrowthInfo {
  change: number;
  trend: 'up' | 'down' | 'stable';
}

export interface HistoryPoint {
  date: string;
  overall: number;
  style: number;
  quality: number;
  security: number;
  performance: number;
}

export interface CoachReport {
  meta: ReportMeta;
  scores: ScoreSet & { growth: GrowthInfo };
  issues: Issue[];
  history: HistoryPoint[];
  highlights: string[];
}
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add src/types.ts
git commit -m "feat: define core types"
```

### Task 1.2: Write config module

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\config.ts`
- Create: `C:\Users\27835\Desktop\ai-code-coach\tests\config.test.ts`

- [ ] **Step 1: Write failing test for config**

```typescript
// tests/config.test.ts
import { describe, it, expect, beforeEach } from '@jest/globals';

// We'll test the config builder by mocking process.argv
// The actual Commander parsing is tested via CLI integration
// Here we test the config assembler function

// Mock commander parsed opts -> CoachConfig
describe('Config assembly', () => {
  it('should set deepseek as default model', () => {
    // When no --model passed, config.model should default to 'deepseek'
    // We test this by importing the config builder
    const { buildConfig } = require('../src/config');
    const config = buildConfig({
      projectPath: './test',
    });
    expect(config.model).toBe('deepseek');
  });

  it('should default sanitize to true', () => {
    const { buildConfig } = require('../src/config');
    const config = buildConfig({
      projectPath: './test',
    });
    expect(config.sanitize).toBe(true);
  });

  it('should default source to local when no --repo', () => {
    const { buildConfig } = require('../src/config');
    const config = buildConfig({
      projectPath: './test',
    });
    expect(config.source).toBe('local');
  });

  it('should set source to both when --repo is provided', () => {
    const { buildConfig } = require('../src/config');
    const config = buildConfig({
      projectPath: './test',
      repo: 'user/repo',
    });
    expect(config.source).toBe('both');
  });

  it('should parse focus dimensions', () => {
    const { buildConfig } = require('../src/config');
    const config = buildConfig({
      projectPath: './test',
      focus: 'style,security',
    });
    expect(config.focus).toEqual(['style', 'security']);
  });

  it('should default scope to function', () => {
    const { buildConfig } = require('../src/config');
    const config = buildConfig({
      projectPath: './test',
    });
    expect(config.scope).toBe('function');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx jest tests/config.test.ts
```

- [ ] **Step 3: Write config.ts**

```typescript
// src/config.ts
import { CoachConfig, FocusDimension, ModelName, SourceMode, ScopeLevel, ScheduleFrequency } from './types';

interface CliOpts {
  projectPath?: string;
  repo?: string;
  focus?: string;
  model?: string;
  scope?: string;
  sanitize?: boolean;
  noSanitize?: boolean;
  noWeb?: boolean;
  jsonOnly?: boolean;
  schedule?: string;
  trendOnly?: boolean;
}

const ALL_DIMENSIONS: FocusDimension[] = ['style', 'quality', 'security', 'performance'];

const VALID_MODELS: ModelName[] = ['deepseek', 'claude', 'kimi', 'qwen'];
const VALID_SCOPES: ScopeLevel[] = ['function', 'file', 'project'];

export function buildConfig(opts: CliOpts): CoachConfig {
  const focus = opts.focus
    ? (opts.focus.split(',').map((f: string) => f.trim()) as FocusDimension[])
    : [...ALL_DIMENSIONS];

  const model: ModelName = opts.model && VALID_MODELS.includes(opts.model as ModelName)
    ? (opts.model as ModelName)
    : 'deepseek';

  const scope: ScopeLevel = opts.scope && VALID_SCOPES.includes(opts.scope as ScopeLevel)
    ? (opts.scope as ScopeLevel)
    : 'function';

  const sanitize = opts.noSanitize ? false : true;

  let outputMode: 'full' | 'terminal-only' | 'json-only' = 'full';
  if (opts.jsonOnly) outputMode = 'json-only';
  else if (opts.noWeb) outputMode = 'terminal-only';

  let source: SourceMode = 'local';
  if (opts.repo && opts.projectPath) source = 'both';
  else if (opts.repo && !opts.projectPath) source = 'github';

  let schedule: ScheduleFrequency | undefined;
  if (opts.schedule === 'daily' || opts.schedule === 'weekly') {
    schedule = opts.schedule as ScheduleFrequency;
  }

  return {
    projectPath: opts.projectPath || '.',
    repoName: opts.repo,
    source,
    focus,
    model,
    scope,
    sanitize,
    outputMode,
    schedule,
    trendOnly: opts.trendOnly || false,
  };
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx jest tests/config.test.ts
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add src/config.ts tests/config.test.ts
git commit -m "feat: config module with defaults and env reading"
```

---

## Phase 2: LLM Adapters

### Task 2.1: Write adapter interface & factory

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\adapters\base.ts`
- Create: `C:\Users\27835\Desktop\ai-code-coach\tests\adapters\base.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/adapters/base.test.ts
import { describe, it, expect } from '@jest/globals';

describe('LlmAdapter factory', () => {
  it('should return a DeepSeek adapter for model="deepseek"', () => {
    const { getAdapter } = require('../../src/adapters/base');
    const adapter = getAdapter('deepseek');
    expect(adapter.name).toBe('deepseek');
  });

  it('should return a Claude adapter for model="claude"', () => {
    const { getAdapter } = require('../../src/adapters/base');
    const adapter = getAdapter('claude');
    expect(adapter.name).toBe('claude');
  });

  it('should return a Kimi adapter for model="kimi"', () => {
    const { getAdapter } = require('../../src/adapters/base');
    const adapter = getAdapter('kimi');
    expect(adapter.name).toBe('kimi');
  });

  it('should throw for unsupported model', () => {
    const { getAdapter } = require('../../src/adapters/base');
    expect(() => getAdapter('unknown')).toThrow('Unsupported model: unknown');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx jest tests/adapters/base.test.ts
```

- [ ] **Step 3: Write adapter interface & factory**

```typescript
// src/adapters/base.ts
export interface ReviewRequest {
  codeSnippet: string;
  filename: string;
  dimensions: string[];
  scope: 'function' | 'file' | 'project';
}

export interface LlmReviewResponse {
  issues: Array<{
    severity: 'critical' | 'high' | 'medium' | 'low';
    dimension: string;
    title: string;
    line?: number;
    suggestion: string;
  }>;
}

export interface LlmAdapter {
  name: string;
  review(request: ReviewRequest): Promise<LlmReviewResponse>;
}

export function getAdapter(model: string): LlmAdapter {
  switch (model) {
    case 'deepseek':
      return require('./deepseek').deepseekAdapter;
    case 'claude':
      return require('./claude').claudeAdapter;
    case 'kimi':
      return require('./kimi').kimiAdapter;
    default:
      throw new Error(`Unsupported model: ${model}`);
  }
}
```

- [ ] **Step 4: Run test — expect FAIL (adapters not yet implemented)**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx jest tests/adapters/base.test.ts
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add src/adapters/base.ts tests/adapters/base.test.ts
git commit -m "feat: LLM adapter interface and factory"
```

### Task 2.2: Write DeepSeek adapter

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\adapters\deepseek.ts`

- [ ] **Step 1: Write DeepSeek adapter**

```typescript
// src/adapters/deepseek.ts
import OpenAI from 'openai';
import { LlmAdapter, ReviewRequest, LlmReviewResponse } from './base';

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || '',
  baseURL: 'https://api.deepseek.com',
});

const SYSTEM_PROMPT = `You are an expert code reviewer. Analyze the code snippet and return a JSON response with discovered issues.

Dimensions to check: security, quality, performance, style.

Return ONLY valid JSON, no markdown, no explanation:
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "dimension": "security|quality|performance|style",
      "title": "short issue title",
      "line": null,
      "suggestion": "specific fix recommendation in Chinese"
    }
  ]
}

If no issues found, return { "issues": [] }.
Focus on real, actionable problems. Do not flag trivial or stylistic preferences.`;

export const deepseekAdapter: LlmAdapter = {
  name: 'deepseek',

  async review(request: ReviewRequest): Promise<LlmReviewResponse> {
    const dimensions = request.dimensions.join(', ');
    const userMessage = `Review this code file "${request.filename}" focusing on: ${dimensions}.

Code:
\`\`\`
${request.codeSnippet}
\`\`\`

Find issues. Remember: output ONLY JSON.`;

    const response = await client.chat.completions.create({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '{"issues":[]}';
    // Strip markdown code fences if present
    const json = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
      const parsed = JSON.parse(json);
      return { issues: parsed.issues || [] };
    } catch {
      return { issues: [] };
    }
  },
};
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add src/adapters/deepseek.ts
git commit -m "feat: DeepSeek adapter"
```

### Task 2.3: Write Claude adapter

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\adapters\claude.ts`

- [ ] **Step 1: Write Claude adapter**

```typescript
// src/adapters/claude.ts
import Anthropic from '@anthropic-ai/sdk';
import { LlmAdapter, ReviewRequest, LlmReviewResponse } from './base';

const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY || '',
});

const SYSTEM_PROMPT = `You are an expert code reviewer. Analyze the code snippet and return a JSON response with discovered issues.

Dimensions to check: security, quality, performance, style.

Return ONLY valid JSON, no markdown, no explanation:
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "dimension": "security|quality|performance|style",
      "title": "short issue title",
      "line": null,
      "suggestion": "specific fix recommendation in Chinese"
    }
  ]
}

If no issues found, return { "issues": [] }.
Focus on real, actionable problems. Do not flag trivial or stylistic preferences.`;

export const claudeAdapter: LlmAdapter = {
  name: 'claude',

  async review(request: ReviewRequest): Promise<LlmReviewResponse> {
    const dimensions = request.dimensions.join(', ');
    const userMessage = `Review this code file "${request.filename}" focusing on: ${dimensions}.

Code:
\`\`\`
${request.codeSnippet}
\`\`\`

Find issues. Remember: output ONLY JSON.`;

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const content = (response.content[0] as { text: string })?.text || '{"issues":[]}';
    const json = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
      const parsed = JSON.parse(json);
      return { issues: parsed.issues || [] };
    } catch {
      return { issues: [] };
    }
  },
};
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add src/adapters/claude.ts
git commit -m "feat: Claude adapter"
```

### Task 2.4: Write Kimi adapter

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\adapters\kimi.ts`

- [ ] **Step 1: Write Kimi adapter**

```typescript
// src/adapters/kimi.ts
import OpenAI from 'openai';
import { LlmAdapter, ReviewRequest, LlmReviewResponse } from './base';

const client = new OpenAI({
  apiKey: process.env.KIMI_API_KEY || '',
  baseURL: 'https://api.moonshot.cn/v1',
});

const SYSTEM_PROMPT = `You are an expert code reviewer. Analyze the code snippet and return a JSON response with discovered issues.

Dimensions to check: security, quality, performance, style.

Return ONLY valid JSON, no markdown, no explanation:
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "dimension": "security|quality|performance|style",
      "title": "short issue title",
      "line": null,
      "suggestion": "specific fix recommendation in Chinese"
    }
  ]
}

If no issues found, return { "issues": [] }.
Focus on real, actionable problems. Do not flag trivial or stylistic preferences.`;

export const kimiAdapter: LlmAdapter = {
  name: 'kimi',

  async review(request: ReviewRequest): Promise<LlmReviewResponse> {
    const dimensions = request.dimensions.join(', ');
    const userMessage = `Review this code file "${request.filename}" focusing on: ${dimensions}.

Code:
\`\`\`
${request.codeSnippet}
\`\`\`

Find issues. Remember: output ONLY JSON.`;

    const response = await client.chat.completions.create({
      model: 'moonshot-v1-32k',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '{"issues":[]}';
    const json = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
      const parsed = JSON.parse(json);
      return { issues: parsed.issues || [] };
    } catch {
      return { issues: [] };
    }
  },
};
```

- [ ] **Step 2: Verify factory test passes**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx jest tests/adapters/base.test.ts
```

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add src/adapters/kimi.ts
git commit -m "feat: Kimi adapter"
```

---

## Phase 3: Data Collection

### Task 3.1: Write collector module

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\engine\collector.ts`
- Create: `C:\Users\27835\Desktop\ai-code-coach\tests\engine\collector.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/engine/collector.test.ts
import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

describe('collectLocal', () => {
  const testDir = path.join(__dirname, '..', 'fixtures', 'test-project');
  const { collectLocal } = require('../../src/engine/collector');

  beforeAll(() => {
    // Create a small test project on disk
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
    expect(files).toHaveLength(2); // .ts files only, not .md
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
    const indexFile = files.find(f => f.path.includes('index.ts'))!;
    expect(indexFile.content).toContain('function hello()');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx jest tests/engine/collector.test.ts
```

- [ ] **Step 3: Write collector.ts**

```typescript
// src/engine/collector.ts
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
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx jest tests/engine/collector.test.ts
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add src/engine/collector.ts tests/engine/collector.test.ts
git commit -m "feat: local file collector with .ai-coach-ignore support"
```

---

## Phase 4: Privacy Sanitizer

### Task 4.1: Write sanitizer module

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\engine\sanitizer.ts`
- Create: `C:\Users\27835\Desktop\ai-code-coach\tests\engine\sanitizer.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/engine/sanitizer.test.ts
import { describe, it, expect } from '@jest/globals';

const { sanitizeFile, extractFunctionContext } = require('../../src/engine/sanitizer');

describe('sanitizeFile', () => {
  it('should redact API keys', () => {
    const code = 'const apiKey = "sk-abc123def456";';
    const result = sanitizeFile(code);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('sk-abc123def456');
  });

  it('should redact passwords in assignment', () => {
    const code = 'const password = "superSecret123!";';
    const result = sanitizeFile(code);
    expect(result).toContain('[REDACTED]');
    expect(result).not.toContain('superSecret123!');
  });

  it('should redact JWT tokens', () => {
    const code = 'const token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN";';
    const result = sanitizeFile(code);
    expect(result).toContain('[REDACTED]');
  });

  it('should redact private keys', () => {
    const code = 'const privateKey = "-----BEGIN RSA PRIVATE KEY-----\\nMIIEpAI...";';
    const result = sanitizeFile(code);
    expect(result).toContain('[REDACTED]');
  });

  it('should NOT redact non-secret strings', () => {
    const code = 'const name = "hello world";';
    const result = sanitizeFile(code);
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
    const result = extractFunctionContext(code, 3); // line 3 is the function
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
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx jest tests/engine/sanitizer.test.ts
```

- [ ] **Step 3: Write sanitizer.ts**

```typescript
// src/engine/sanitizer.ts
import { FileEntry } from '../types';

// Patterns to detect secrets
const SECRET_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /(?:api[_-]?key|apikey|API_KEY)\s*[:=]\s*["'][^"']+["']/gi, label: 'API Key' },
  { pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']+["']/gi, label: 'Password' },
  { pattern: /(?:secret|SECRET)\s*[:=]\s*["'][^"']+["']/gi, label: 'Secret' },
  { pattern: /(?:token|TOKEN|access[_-]?token)\s*[:=]\s*["'][^"']+["']/gi, label: 'Token' },
  { pattern: /sk-[a-zA-Z0-9]{20,}/g, label: 'API Key' },
  { pattern: /sk-ant-[a-zA-Z0-9_-]{20,}/g, label: 'Anthropic Key' },
  { pattern: /ghp_[a-zA-Z0-9]{36,}/g, label: 'GitHub Token' },
  { pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g, label: 'JWT' },
  { pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA )?PRIVATE KEY-----/g, label: 'Private Key' },
  { pattern: /(?:mongodb|mysql|postgres|redis):\/\/[^:\s]+:[^@\s]+@/g, label: 'DB Connection String' },
];

export function sanitizeContent(content: string): string {
  let sanitized = content;
  for (const { pattern } of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, (_match) => '[REDACTED]');
  }
  return sanitized;
}

export function sanitizeFiles(files: FileEntry[]): FileEntry[] {
  return files.map(file => ({
    ...file,
    content: sanitizeContent(file.content),
  }));
}

export function extractFunctionContext(content: string, targetLine: number, contextLines: number = 10): string {
  const lines = content.split('\n');
  if (targetLine < 1 || targetLine > lines.length) return content;

  // Find function start: look backward from targetLine for function/class/method declaration
  let start = Math.max(0, targetLine - contextLines);
  for (let i = targetLine - 1; i >= Math.max(0, targetLine - 30); i--) {
    const line = lines[i].trim();
    if (/^(export\s+)?(async\s+)?function\s/.test(line) ||
        /^(export\s+)?class\s/.test(line) ||
        /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/.test(line) ||
        /^\s*(public|private|protected)\s+(async\s+)?\w+\s*\(/.test(line)) {
      start = i;
      break;
    }
  }

  // Find function end: look forward for closing brace or next top-level declaration
  let end = Math.min(lines.length, targetLine + contextLines);
  let braceDepth = 0;
  let started = false;
  for (let i = start; i < lines.length && i < start + 100; i++) {
    const line = lines[i];
    braceDepth += (line.match(/\{/g) || []).length;
    braceDepth -= (line.match(/\}/g) || []).length;
    if (braceDepth > 0) started = true;
    if (started && braceDepth === 0) {
      end = i + 1;
      break;
    }
  }

  return lines.slice(start, end).join('\n');
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx jest tests/engine/sanitizer.test.ts
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add src/engine/sanitizer.ts tests/engine/sanitizer.test.ts
git commit -m "feat: privacy sanitizer with secret redaction and context extraction"
```

---

## Phase 5: Static Analyzer

### Task 5.1: Write analyzer module

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\engine\analyzer.ts`
- Create: `C:\Users\27835\Desktop\ai-code-coach\tests\engine\analyzer.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/engine/analyzer.test.ts
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
      { path: 'test.ts', content: 'function hello() { return "world"; }', language: 'typescript' }
    ];
    const result = analyzeAll(files, ['style', 'quality']);
    expect(result.style).toBeGreaterThanOrEqual(0);
    expect(result.quality).toBeGreaterThanOrEqual(0);
    expect(result.style).toBeLessThanOrEqual(10);
    expect(result.quality).toBeLessThanOrEqual(10);
    // Security and performance are 0 since we didn't ask for them
    expect(result.security).toBe(0);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx jest tests/engine/analyzer.test.ts
```

- [ ] **Step 3: Write analyzer.ts**

```typescript
// src/engine/analyzer.ts
import { FileEntry, StyleMetrics, QualityMetrics, FocusDimension } from '../types';

interface DimensionScores {
  style: number;
  quality: number;
  security: number;
  performance: number;
}

export function analyzeStyle(content: string): StyleMetrics {
  const lines = content.split('\n');
  const totalLines = lines.length;

  // Comment density
  const commentLines = lines.filter(l => {
    const trimmed = l.trim();
    return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
  }).length;
  const commentDensity = totalLines > 0 ? commentLines / totalLines : 0;

  // Function detection and length calculation
  const functionMatches = content.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(|\w+\s*\([^)]*\)\s*\{)/g);
  const functionCount = functionMatches ? functionMatches.length : 1;

  // Estimate average function length by finding brace blocks
  const braceBlocks = content.match(/\{[^}]*\}/g);
  let totalFuncLines = 0;
  if (braceBlocks) {
    totalFuncLines = braceBlocks.reduce((sum, block) => sum + block.split('\n').length, 0);
  }
  const avgFunctionLength = functionCount > 0 ? Math.min(totalFuncLines / functionCount, 100) : 0;
  const maxFunctionLength = braceBlocks
    ? Math.max(...braceBlocks.map(b => b.split('\n').length))
    : 0;

  // Naming score: check camelCase patterns in identifiers
  const identifiers = content.match(/\b(const|let|var|function)\s+(\w+)/g) || [];
  const goodNames = identifiers.filter(id => /^[a-z][a-zA-Z0-9]*$/.test(id.split(/\s+/)[1] || ''));
  const namingScore = identifiers.length > 0
    ? Math.round((goodNames.length / identifiers.length) * 10)
    : 8;

  // Consistency: check for mixed quote styles, mixed indentation
  const singleQuotes = (content.match(/'/g) || []).length;
  const doubleQuotes = (content.match(/"/g) || []).length;
  const totalQuotes = singleQuotes + doubleQuotes;
  const consistencyScore = totalQuotes > 0
    ? Math.round((1 - Math.abs(singleQuotes - doubleQuotes) / totalQuotes) * 10)
    : 8;

  return {
    avgFunctionLength,
    maxFunctionLength,
    commentDensity: Math.min(commentDensity, 1),
    namingScore: Math.min(namingScore, 10),
    consistencyScore: Math.min(consistencyScore, 10),
  };
}

export function analyzeQuality(content: string): QualityMetrics {
  const lines = content.split('\n');

  // Cyclomatic complexity: count decision points (if, for, while, case, &&, ||, ?)
  const decisionPoints = (content.match(/\b(if|for|while|case|catch)\b/g) || []).length +
    (content.match(/&&|\|\|/g) || []).length +
    (content.match(/\?/g) || []).length;
  const cyclomaticComplexity = Math.max(1, decisionPoints);

  // Duplication detection (simple): check for repeated lines
  const nonEmptyLines = lines.filter(l => l.trim().length > 0);
  const uniqueLines = new Set(nonEmptyLines.map(l => l.trim()));
  const duplicationRate = nonEmptyLines.length > 0
    ? 1 - uniqueLines.size / nonEmptyLines.length
    : 0;

  // Error handling: check for try/catch, error checks
  const hasTryCatch = /\btry\b/.test(content) && /\bcatch\b/.test(content);
  const hasErrorChecks = (content.match(/\bif\s*\(.*err(?:or)?\)/gi) || []).length > 0;
  const errorHandlingScore = (hasTryCatch ? 5 : 2) + (hasErrorChecks ? 5 : 2);

  return {
    cyclomaticComplexity,
    duplicationRate: Math.min(duplicationRate, 1),
    errorHandlingScore: Math.min(errorHandlingScore, 10),
  };
}

function styleMetricsToScore(metrics: StyleMetrics): number {
  // Longer functions = lower score
  const funcScore = Math.max(0, 10 - (metrics.avgFunctionLength / 5));
  const commentScore = metrics.commentDensity * 20; // 20% comment density = perfect 10
  const score = (funcScore * 0.3 + commentScore * 0.3 + metrics.namingScore * 0.2 + metrics.consistencyScore * 0.2);
  return Math.round(Math.min(Math.max(score, 1), 10) * 10) / 10;
}

function qualityMetricsToScore(metrics: QualityMetrics): number {
  const complexityScore = Math.max(0, 10 - metrics.cyclomaticComplexity / 2);
  const dupScore = (1 - metrics.duplicationRate) * 10;
  const score = complexityScore * 0.5 + dupScore * 0.3 + metrics.errorHandlingScore * 0.2;
  return Math.round(Math.min(Math.max(score, 1), 10) * 10) / 10;
}

export function analyzeAll(files: FileEntry[], dimensions: FocusDimension[]): DimensionScores {
  const result: DimensionScores = { style: 0, quality: 0, security: 0, performance: 0 };

  if (files.length === 0) return result;

  let totalStyleScore = 0;
  let totalQualityScore = 0;
  let filesWithStyle = 0;
  let filesWithQuality = 0;

  for (const file of files) {
    if (dimensions.includes('style')) {
      const styleMetrics = analyzeStyle(file.content);
      totalStyleScore += styleMetricsToScore(styleMetrics);
      filesWithStyle++;
    }
    if (dimensions.includes('quality')) {
      const qualityMetrics = analyzeQuality(file.content);
      totalQualityScore += qualityMetricsToScore(qualityMetrics);
      filesWithQuality++;
    }
  }

  if (filesWithStyle > 0) result.style = Math.round((totalStyleScore / filesWithStyle) * 10) / 10;
  if (filesWithQuality > 0) result.quality = Math.round((totalQualityScore / filesWithQuality) * 10) / 10;

  return result;
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx jest tests/engine/analyzer.test.ts
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add src/engine/analyzer.ts tests/engine/analyzer.test.ts
git commit -m "feat: static code analyzer for style and quality metrics"
```

---

## Phase 6: LLM Reviewer

### Task 6.1: Write reviewer module

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\engine\reviewer.ts`

- [ ] **Step 1: Write reviewer.ts**

```typescript
// src/engine/reviewer.ts
import { FileEntry, Issue, FocusDimension, ScopeLevel } from '../types';
import { getAdapter, LlmAdapter } from '../adapters/base';

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

        const issues = response.issues.map(issue => ({
          severity: issue.severity,
          dimension: issue.dimension as FocusDimension | 'general',
          title: issue.title,
          file: file.path,
          line: issue.line,
          suggestion: issue.suggestion,
        }));

        allIssues.push(...issues);
      } catch (err) {
        // Log but don't fail the entire review for one chunk
        console.error(`Review failed for ${file.path}: ${(err as Error).message}`);
      }
    }
  }

  return allIssues;
}

function chunkCode(content: string, maxFunctions: number): string[] {
  // Split by function/class boundaries
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

    // Detect function start
    if (/^(export\s+)?(async\s+)?function\s/.test(line.trim()) ||
        /^(export\s+)?class\s/.test(line.trim()) ||
        /^\s*(public|private|protected)\s+\w+\s*\(/.test(line.trim())) {
      inFunc = true;
    }

    // Function end
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

  // Don't forget the last chunk
  if (currentChunk.length > 0 && currentChunk.join('\n').trim().length > 0) {
    chunks.push(currentChunk.join('\n'));
  }

  return chunks.length > 0 ? chunks : [content];
}
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add src/engine/reviewer.ts
git commit -m "feat: LLM reviewer with function-level chunking"
```

---

## Phase 7: Reporter

### Task 7.1: Write reporter module

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\engine\reporter.ts`
- Create: `C:\Users\27835\Desktop\ai-code-coach\tests\engine\reporter.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/engine/reporter.test.ts
import { describe, it, expect } from '@jest/globals';
import * as fs from 'fs';
import * as path from 'path';

const { generateReport, loadHistory, generateTerminalSummary } = require('../../src/engine/reporter');

describe('generateReport', () => {
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
      reportsDir: path.join(__dirname, '..', 'fixtures', 'reports'),
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
      reportsDir: path.join(__dirname, '..', 'fixtures', 'reports'),
    });

    // With 2 critical security issues, security score should be low
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
    expect(summary).toContain('high');
    expect(summary).toContain('Test issue');
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx jest tests/engine/reporter.test.ts
```

- [ ] **Step 3: Write reporter.ts**

```typescript
// src/engine/reporter.ts
import * as fs from 'fs';
import * as path from 'path';
import { CoachReport, Issue, FocusDimension, Severity, ScoreSet, HistoryPoint } from '../types';
import chalk from 'chalk';

interface ReportInput {
  projectName: string;
  source: string;
  model: string;
  staticScores: { style: number; quality: number; security: number; performance: number };
  llmIssues: Issue[];
  dimensions: FocusDimension[];
  reportsDir: string;
}

const SEVERITY_WEIGHTS: Record<Severity, number> = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0.5,
};

export function generateReport(input: ReportInput): CoachReport {
  const { projectName, source, model, staticScores, llmIssues, dimensions, reportsDir } = input;

  // Calculate LLM-derived scores (security, performance)
  let securityScore = 5; // baseline
  let performanceScore = 5;

  const securityIssues = llmIssues.filter(i => i.dimension === 'security');
  const performanceIssues = llmIssues.filter(i => i.dimension === 'performance' || i.dimension === 'quality');

  if (securityIssues.length > 0) {
    const securityPenalty = securityIssues.reduce((sum, i) => sum + (SEVERITY_WEIGHTS[i.severity] || 1), 0);
    securityScore = Math.max(1, 10 - securityPenalty);
  } else {
    securityScore = 8; // No issues = good score
  }

  if (performanceIssues.length > 0) {
    const perfPenalty = performanceIssues.reduce((sum, i) => sum + (SEVERITY_WEIGHTS[i.severity] || 1), 0);
    performanceScore = Math.max(1, 10 - perfPenalty);
  } else {
    performanceScore = 8;
  }

  // Load history for growth
  const history = loadHistory(reportsDir, projectName);
  let growthChange = 0;
  let growthTrend: 'up' | 'down' | 'stable' = 'stable';
  if (history.length > 0) {
    growthChange = Math.round((staticScores.style + staticScores.quality + securityScore + performanceScore) / 4 * 10) / 10
      - history[history.length - 1].overall;
    growthTrend = growthChange > 0.2 ? 'up' : growthChange < -0.2 ? 'down' : 'stable';
  }

  // Overall score
  const overallScores = [
    staticScores.style,
    staticScores.quality,
    securityScore,
    performanceScore,
  ].filter(Boolean);
  const overall = overallScores.length > 0
    ? Math.round((overallScores.reduce((a, b) => a + b, 0) / overallScores.length) * 10) / 10
    : 0;

  // Generate highlights
  const highlights: string[] = [];
  const maxDim = Object.entries({ style: staticScores.style, quality: staticScores.quality, security: securityScore, performance: performanceScore })
    .sort(([, a], [, b]) => b - a)[0];
  const minDim = Object.entries({ style: staticScores.style, quality: staticScores.quality, security: securityScore, performance: performanceScore })
    .sort(([, a], [, b]) => a - b)[0];
  if (maxDim) highlights.push(`${maxDim[0]} 维度持续领先`);
  if (minDim && minDim[1] < 5) highlights.push(`${minDim[0]} 得分有待提升`);
  if (growthTrend === 'up') highlights.push('📈 成长趋势向好');

  const now = new Date();
  const dateStr = now.toISOString().split('T')[0].replace(/-/g, '');
  const existingCount = fs.existsSync(reportsDir)
    ? fs.readdirSync(reportsDir).filter(f => f.startsWith(`rpt_${dateStr}`)).length
    : 0;
  const reportId = `rpt_${dateStr}_${String(existingCount + 1).padStart(3, '0')}`;

  return {
    meta: {
      project: projectName,
      source,
      model,
      timestamp: now.toISOString(),
      reportId,
      version: '1.0',
    },
    scores: {
      overall,
      style: staticScores.style,
      quality: staticScores.quality,
      security: securityScore,
      performance: performanceScore,
      growth: { change: growthChange, trend: growthTrend },
    },
    issues: llmIssues,
    history: [...history, {
      date: now.toISOString().split('T')[0],
      overall,
      style: staticScores.style,
      quality: staticScores.quality,
      security: securityScore,
      performance: performanceScore,
    }].slice(-8),
    highlights,
  };
}

export function loadHistory(reportsDir: string, projectName: string): HistoryPoint[] {
  if (!fs.existsSync(reportsDir)) return [];
  const files = fs.readdirSync(reportsDir)
    .filter(f => f.endsWith('.json'))
    .sort()
    .slice(-8);

  return files.map(f => {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(reportsDir, f), 'utf-8'));
      return {
        date: data.meta?.timestamp?.split('T')[0] || f,
        overall: data.scores?.overall || 0,
        style: data.scores?.style || 0,
        quality: data.scores?.quality || 0,
        security: data.scores?.security || 0,
        performance: data.scores?.performance || 0,
      };
    } catch {
      return null;
    }
  }).filter(Boolean) as HistoryPoint[];
}

export function saveReport(report: CoachReport, reportsDir: string): string {
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const filePath = path.join(reportsDir, `${report.meta.reportId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
  return filePath;
}

export function generateTerminalSummary(report: CoachReport): string {
  const lines: string[] = [];
  lines.push('');
  lines.push(chalk.bold.cyan('═══ AI Code Coach Report ═══'));
  lines.push('');
  lines.push(`  Project: ${chalk.white(report.meta.project)}`);
  lines.push(`  Model:   ${chalk.white(report.meta.model)}`);
  lines.push(`  Report:  ${chalk.gray(report.meta.reportId)}`);
  lines.push('');

  // Scores
  lines.push(chalk.bold('  Scores:'));
  const overallColor = report.scores.overall >= 8 ? chalk.green : report.scores.overall >= 5 ? chalk.yellow : chalk.red;
  lines.push(`    Overall:     ${overallColor(report.scores.overall.toFixed(1))} / 10`);
  lines.push(`    Style:       ${chalk.white(report.scores.style.toFixed(1))}`);
  lines.push(`    Quality:     ${chalk.white(report.scores.quality.toFixed(1))}`);
  lines.push(`    Security:    ${chalk.white(report.scores.security.toFixed(1))}`);
  lines.push(`    Performance: ${chalk.white(report.scores.performance.toFixed(1))}`);

  if (report.scores.growth.change !== 0) {
    const arrow = report.scores.growth.trend === 'up' ? '↑' : '↓';
    const color = report.scores.growth.trend === 'up' ? chalk.green : chalk.red;
    lines.push(`    Growth:      ${color(arrow + ' ' + report.scores.growth.change.toFixed(1))}`);
  }

  lines.push('');

  // Issues
  if (report.issues.length > 0) {
    lines.push(chalk.bold(`  Issues (${report.issues.length}):`));
    const severityIcon: Record<string, string> = {
      critical: chalk.red('🔴'),
      high: chalk.red('🟠'),
      medium: chalk.yellow('🟡'),
      low: chalk.gray('⚪'),
    };
    for (const issue of report.issues.slice(0, 10)) {
      const icon = severityIcon[issue.severity] || '  ';
      lines.push(`    ${icon} ${chalk.bold(issue.title)}  ${chalk.gray(issue.file + (issue.line ? `:${issue.line}` : ''))}`);
    }
    if (report.issues.length > 10) {
      lines.push(`    ... and ${report.issues.length - 10} more`);
    }
  } else {
    lines.push(chalk.green('  ✅ No issues found!'));
  }

  lines.push('');

  // Highlights
  if (report.highlights.length > 0) {
    lines.push(chalk.bold('  Highlights:'));
    for (const h of report.highlights) {
      lines.push(`    ✨ ${h}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx jest tests/engine/reporter.test.ts
```

- [ ] **Step 5: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add src/engine/reporter.ts tests/engine/reporter.test.ts
git commit -m "feat: report generator with JSON output, terminal summary, and versioning"
```

---

## Phase 8: CLI Entry Point

### Task 8.1: Write CLI index.ts

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\index.ts`

- [ ] **Step 1: Write CLI entry**

```typescript
#!/usr/bin/env node
// src/index.ts
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { buildConfig } from './config';
import { CoachConfig, ModelName } from './types';
import { collectLocal } from './engine/collector';
import { sanitizeContent } from './engine/sanitizer';
import { analyzeAll } from './engine/analyzer';
import { reviewFiles } from './engine/reviewer';
import { generateReport, saveReport, generateTerminalSummary } from './engine/reporter';
import { setupSchedule } from './scheduler';

// Load .env from cwd
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env') });

const program = new Command();

program
  .name('ai-coach')
  .description('AI-powered personal programming coach')
  .version('1.0.0');

program
  .argument('[project-path]', 'Path to the project to analyze', '.')
  .option('--repo <repo>', 'GitHub repository (owner/repo) for dual-source analysis')
  .option('--focus <dimensions>', 'Focus dimensions: style,quality,security,performance (comma-separated)')
  .option('--model <model>', 'LLM model: deepseek, claude, kimi')
  .option('--scope <scope>', 'Upload scope: function, file, project', 'function')
  .option('--no-sanitize', 'Disable secret sanitization (use with caution)')
  .option('--schedule <frequency>', 'Set up scheduled analysis: daily, weekly')
  .option('--trend', 'Show growth trend from history (no LLM call)')
  .option('--no-web', 'Skip web dashboard JSON, terminal only')
  .option('--json-only', 'Generate JSON report only, no terminal output')
  .action(async (projectPath: string, opts: any) => {
    try {
      const config = buildConfig({
        projectPath,
        repo: opts.repo,
        focus: opts.focus,
        model: opts.model,
        scope: opts.scope,
        noSanitize: !opts.sanitize,
        noWeb: !opts.web,
        jsonOnly: opts.jsonOnly,
        schedule: opts.schedule,
        trendOnly: opts.trend,
      });

      // Schedule mode
      if (config.schedule) {
        await setupSchedule(config);
        console.log(`✅ Scheduled ${config.schedule} analysis for ${path.resolve(config.projectPath)}`);
        console.log('   Use your system task scheduler to view/manage.');
        return;
      }

      // Trend mode
      if (config.trendOnly) {
        const { loadHistory, generateTerminalSummary } = require('./engine/reporter');
        const reportsDir = path.join(process.cwd(), 'reports');
        const history = loadHistory(reportsDir, config.projectPath);
        if (history.length === 0) {
          console.log('No history found. Run an analysis first.');
        } else {
          console.log('📈 Growth Trend:');
          for (const h of history) {
            console.log(`  ${h.date}  Overall: ${h.overall.toFixed(1)}  Style: ${h.style.toFixed(1)}  Quality: ${h.quality.toFixed(1)}  Security: ${h.security.toFixed(1)}  Performance: ${h.performance.toFixed(1)}`);
          }
        }
        return;
      }

      // Normal analysis mode
      await runAnalysis(config);
    } catch (err) {
      console.error('Error:', (err as Error).message);
      process.exit(1);
    }
  });

// Interactive model selector
program
  .command('config')
  .description('Interactive configuration: choose model, set API keys')
  .action(async () => {
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    const question = (q: string): Promise<string> => new Promise(resolve => readline.question(q, resolve));

    console.log('\n🔧 AI Code Coach Configuration\n');
    console.log('Available models:');
    console.log('  1. DeepSeek  (recommended, China direct access)');
    console.log('  2. Claude    (Anthropic, requires VPN)');
    console.log('  3. Kimi      (Moonshot, China direct access)\n');

    const choice = await question('Choose default model (1-3): ');
    const modelMap: Record<string, string> = { '1': 'deepseek', '2': 'claude', '3': 'kimi' };
    const model = modelMap[choice] || 'deepseek';

    console.log(`\nDefault model set to: ${model}`);
    console.log('Set API keys in your .env file:');
    console.log('  DEEPSEEK_API_KEY=sk-xxx');
    console.log('  CLAUDE_API_KEY=sk-ant-xxx');
    console.log('  KIMI_API_KEY=sk-xxx\n');

    readline.close();
  });

async function runAnalysis(config: CoachConfig): Promise<void> {
  const absPath = path.resolve(config.projectPath);
  const reportsDir = path.join(absPath, 'reports');
  const projectName = path.basename(absPath);

  console.log(`\n🔍 Analyzing: ${absPath}`);
  console.log(`   Model: ${config.model}  |  Focus: ${config.focus.join(', ')}  |  Scope: ${config.scope}\n`);

  // 1. Collect
  console.log('📂 Collecting files...');
  const files = await collectLocal(absPath);
  console.log(`   Found ${files.length} code files`);

  if (files.length === 0) {
    console.log('No code files found. Exiting.');
    return;
  }

  // 2. Sanitize
  if (config.sanitize) {
    console.log('🔒 Sanitizing secrets...');
    for (const file of files) {
      file.content = sanitizeContent(file.content);
    }
  }

  // 3. Static analysis (no LLM)
  console.log('📊 Running static analysis...');
  const staticScores = analyzeAll(files, config.focus);

  // 4. LLM review
  let llmIssues: any[] = [];
  if (config.focus.some(f => ['security', 'performance', 'quality'].includes(f))) {
    console.log(`🤖 Calling ${config.model} API for deep review...`);
    llmIssues = await reviewFiles(files, {
      model: config.model,
      dimensions: config.focus,
      scope: config.scope,
    });
    console.log(`   Found ${llmIssues.length} issues`);
  }

  // 5. Generate report
  const report = generateReport({
    projectName,
    source: config.source,
    model: config.model,
    staticScores,
    llmIssues,
    dimensions: config.focus,
    reportsDir,
  });

  // 6. Save JSON
  const reportPath = saveReport(report, reportsDir);

  // 7. Terminal output
  if (config.outputMode !== 'json-only') {
    console.log(generateTerminalSummary(report));
    console.log(`📄 Full report saved to: ${reportPath}`);
  }

  if (config.outputMode !== 'terminal-only') {
    console.log(`🌐 Open dashboard: drag ${reportPath} into your browser`);
  }
}

program.parse(process.argv);
```

- [ ] **Step 2: Build and verify help text**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx tsc
node dist/index.js --help
```

Expected: Commander help output with all options.

- [ ] **Step 3: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add src/index.ts
git commit -m "feat: CLI entry point with all commands and analysis pipeline"
```

---

## Phase 9: Scheduler

### Task 9.1: Write scheduler module

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\scheduler.ts`

- [ ] **Step 1: Write scheduler.ts**

```typescript
// src/scheduler.ts
import { execSync } from 'child_process';
import * as os from 'os';
import { CoachConfig } from './types';

export async function setupSchedule(config: CoachConfig): Promise<void> {
  const platform = os.platform();
  const absPath = require('path').resolve(config.projectPath);
  const command = `node ${require('path').join(__dirname, '..', 'dist', 'index.js')} "${absPath}"`;

  if (platform === 'win32') {
    // Windows Task Scheduler
    const taskName = `ai-coach-${config.schedule}-${require('path').basename(absPath)}`.replace(/[^a-zA-Z0-9_-]/g, '_');

    // Remove existing task with same name
    try { execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: 'ignore' }); } catch {}

    const scheduleMap: Record<string, string> = {
      daily: 'DAILY',
      weekly: 'WEEKLY',
    };

    const scheduleType = scheduleMap[config.schedule || 'daily'];
    execSync(
      `schtasks /create /tn "${taskName}" /tr "${command}" /sc ${scheduleType} /f`,
      { stdio: 'pipe' }
    );

    console.log(`   Task created: ${taskName}`);
    console.log(`   View in Task Scheduler or run: schtasks /query /tn "${taskName}"`);
  } else {
    // Linux/macOS crontab
    const cronTime = config.schedule === 'weekly' ? '0 9 * * 1' : '0 9 * * *'; // 9am
    const cronEntry = `${cronTime} cd ${absPath} && ${command} >> ${absPath}/reports/ai-coach.log 2>&1`;

    // Read existing crontab
    let existing = '';
    try { existing = execSync('crontab -l', { encoding: 'utf-8' }); } catch {}

    // Remove any existing ai-coach entries
    const filtered = existing.split('\n')
      .filter(line => !line.includes('ai-coach'))
      .join('\n');

    const newCron = filtered.trim() + '\n' + cronEntry + '\n';
    execSync(`echo "${newCron.replace(/"/g, '\\"')}" | crontab -`, { stdio: 'pipe' });

    console.log(`   Cron entry added: ${cronEntry}`);
    console.log('   View/edit with: crontab -e');
  }
}
```

- [ ] **Step 2: Commit**

```bash
cd "C:/Users\27835\Desktop\ai-code-coach"
git add src/scheduler.ts
git commit -m "feat: OS-level scheduler (Task Scheduler / crontab)"
```

---

## Phase 10: Web Dashboard

### Task 10.1: Write dashboard HTML

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\web\dashboard.html`
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\web\style.css`
- Create: `C:\Users\27835\Desktop\ai-code-coach\src\web\dashboard.js`

- [ ] **Step 1: Write dashboard.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Code Coach — Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <div class="container">
    <header class="header">
      <h1>🤖 AI Code Coach</h1>
      <div class="header-meta">
        <span id="project-name">—</span>
        <span class="dot">•</span>
        <span id="last-analysis">—</span>
        <span class="dot">•</span>
        <span id="model-used">—</span>
      </div>
    </header>

    <div class="cards">
      <div class="card card-primary">
        <div class="card-label">综合评分</div>
        <div class="card-value" id="overall-score">—</div>
        <div class="card-unit">/ 10</div>
      </div>
      <div class="card card-trend">
        <div class="card-label">成长趋势</div>
        <div class="card-value" id="growth-value">—</div>
        <div class="card-unit" id="growth-unit"></div>
      </div>
    </div>

    <div class="charts-row">
      <div class="chart-box">
        <h2>五维雷达</h2>
        <canvas id="radar-chart"></canvas>
      </div>
      <div class="chart-box">
        <h2>历史趋势</h2>
        <canvas id="history-chart"></canvas>
      </div>
    </div>

    <div class="issues-section">
      <h2>问题清单 <span id="issue-count"></span></h2>
      <div class="issue-filters">
        <button class="filter active" data-filter="all">全部</button>
        <button class="filter" data-filter="critical">🔴 严重</button>
        <button class="filter" data-filter="high">🟠 高危</button>
        <button class="filter" data-filter="medium">🟡 中危</button>
        <button class="filter" data-filter="low">⚪ 低危</button>
      </div>
      <div id="issue-list" class="issue-list"></div>
    </div>

    <div class="highlights-section" id="highlights"></div>

    <footer class="footer">
      <button onclick="document.getElementById('file-input').click()">📂 加载报告</button>
      <input type="file" id="file-input" accept=".json" hidden onchange="loadReportFile(event)">
      <button onclick="window.print()">🖨️ 导出 PDF</button>
      <span class="version" id="version-display"></span>
    </footer>
  </div>

  <script src="dashboard.js"></script>
</body>
</html>
```

- [ ] **Step 2: Write style.css**

```css
/* src/web/style.css */
:root {
  --bg: #0f1117;
  --surface: #1a1d27;
  --border: #2a2d3a;
  --text: #e4e6ed;
  --text-secondary: #8b8fa3;
  --accent: #6366f1;
  --green: #22c55e;
  --red: #ef4444;
  --yellow: #f59e0b;
  --radius: 12px;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  line-height: 1.6;
}

.container {
  max-width: 1100px;
  margin: 0 auto;
  padding: 32px 24px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);
  margin-bottom: 32px;
  flex-wrap: wrap;
  gap: 12px;
}

.header h1 { font-size: 28px; font-weight: 700; }

.header-meta {
  display: flex;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  align-items: center;
}

.dot { color: var(--border); }

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
}

.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  text-align: center;
}

.card-label {
  font-size: 14px;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}

.card-value {
  font-size: 48px;
  font-weight: 700;
}

.card-unit {
  font-size: 14px;
  color: var(--text-secondary);
}

.card-primary .card-value { color: var(--accent); }

.charts-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 32px;
}

.chart-box {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
}

.chart-box h2 {
  font-size: 16px;
  margin-bottom: 16px;
  color: var(--text-secondary);
}

.chart-box canvas {
  max-height: 350px;
}

.issues-section {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 24px;
  margin-bottom: 32px;
}

.issues-section h2 {
  font-size: 18px;
  margin-bottom: 16px;
}

#issue-count {
  font-size: 14px;
  color: var(--text-secondary);
  font-weight: normal;
}

.issue-filters {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 6px 14px;
  border-radius: 20px;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.filter:hover { border-color: var(--accent); color: var(--text); }
.filter.active { background: var(--accent); border-color: var(--accent); color: white; }

.issue-list { display: flex; flex-direction: column; gap: 12px; }

.issue-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: var(--bg);
  border-radius: 8px;
  border-left: 3px solid var(--border);
}

.issue-item.severity-critical { border-left-color: var(--red); }
.issue-item.severity-high { border-left-color: #f97316; }
.issue-item.severity-medium { border-left-color: var(--yellow); }
.issue-item.severity-low { border-left-color: var(--text-secondary); }

.issue-severity {
  font-size: 20px;
  flex-shrink: 0;
}

.issue-body { flex: 1; }

.issue-title {
  font-weight: 600;
  margin-bottom: 4px;
}

.issue-file {
  font-size: 13px;
  color: var(--text-secondary);
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
}

.issue-suggestion {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 6px;
  font-style: italic;
}

.hidden { display: none; }

.highlights-section {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 32px;
}

.highlight-item {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 12px 20px;
  font-size: 14px;
}

.footer {
  display: flex;
  justify-content: center;
  gap: 16px;
  align-items: center;
  padding-top: 24px;
  border-top: 1px solid var(--border);
}

.footer button {
  background: var(--accent);
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 14px;
  transition: opacity 0.2s;
}

.footer button:hover { opacity: 0.85; }

.version {
  font-size: 12px;
  color: var(--text-secondary);
}

@media (max-width: 768px) {
  .charts-row { grid-template-columns: 1fr; }
  .cards { grid-template-columns: 1fr 1fr; }
  .header { flex-direction: column; align-items: flex-start; }
}
```

- [ ] **Step 3: Write dashboard.js**

```javascript
// src/web/dashboard.js
(function () {
  'use strict';

  const COMPATIBLE_VERSIONS = ['1.0'];

  let reportData = null;
  let radarChart = null;
  let historyChart = null;

  // Try to load report from drag-and-drop or file input
  document.addEventListener('DOMContentLoaded', () => {
    console.log('AI Code Coach Dashboard ready.');
    console.log('Drag a report JSON file onto this page, or click "加载报告" to load.');
  });

  // Drag and drop support
  document.addEventListener('dragover', (e) => e.preventDefault());
  document.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) readAndRender(file);
  });

  window.loadReportFile = function (event) {
    const file = event.target.files[0];
    if (file) readAndRender(file);
  };

  function readAndRender(file) {
    const reader = new FileReader();
    reader.onload = function (e) {
      try {
        const data = JSON.parse(e.target.result);
        if (!COMPATIBLE_VERSIONS.includes(data.meta?.version)) {
          alert(`Unsupported report version: ${data.meta?.version || 'unknown'}. Expected: ${COMPATIBLE_VERSIONS.join(' or ')}`);
          return;
        }
        reportData = data;
        renderAll();
      } catch (err) {
        alert('Invalid JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function renderAll() {
    if (!reportData) return;

    renderHeader();
    renderCards();
    renderRadar();
    renderHistory();
    renderIssues();
    renderHighlights();
    renderVersion();
  }

  function renderHeader() {
    const meta = reportData.meta;
    document.getElementById('project-name').textContent = meta.project;
    document.getElementById('model-used').textContent = meta.model.toUpperCase();

    const ts = new Date(meta.timestamp);
    const now = new Date();
    const hoursAgo = Math.round((now - ts) / (1000 * 60 * 60));
    const timeStr = hoursAgo < 1 ? '刚刚' : hoursAgo < 24 ? `${hoursAgo}小时前` : `${Math.floor(hoursAgo / 24)}天前`;
    document.getElementById('last-analysis').textContent = `上次分析: ${timeStr}`;
  }

  function renderCards() {
    const s = reportData.scores;
    const overallEl = document.getElementById('overall-score');
    overallEl.textContent = s.overall.toFixed(1);
    overallEl.style.color = s.overall >= 8 ? '#22c55e' : s.overall >= 5 ? '#f59e0b' : '#ef4444';

    const growthEl = document.getElementById('growth-value');
    const growthUnit = document.getElementById('growth-unit');
    if (s.growth.change !== 0) {
      const arrow = s.growth.trend === 'up' ? '↑' : '↓';
      growthEl.textContent = `${arrow} ${Math.abs(s.growth.change).toFixed(1)}`;
      growthEl.style.color = s.growth.trend === 'up' ? '#22c55e' : '#ef4444';
      growthUnit.textContent = '';
    } else {
      growthEl.textContent = '—';
      growthEl.style.color = '#8b8fa3';
      growthUnit.textContent = '稳定';
    }
  }

  function renderRadar() {
    const ctx = document.getElementById('radar-chart').getContext('2d');
    const s = reportData.scores;

    if (radarChart) radarChart.destroy();

    radarChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels: ['代码风格', '代码质量', '安全性', '性能'],
        datasets: [{
          label: reportData.meta.project,
          data: [s.style, s.quality, s.security, s.performance],
          backgroundColor: 'rgba(99, 102, 241, 0.2)',
          borderColor: 'rgba(99, 102, 241, 0.8)',
          borderWidth: 2,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#fff',
          pointRadius: 5,
        }],
      },
      options: {
        scales: {
          r: {
            beginAtZero: true,
            max: 10,
            ticks: { stepSize: 2, color: '#8b8fa3', backdropColor: 'transparent' },
            grid: { color: '#2a2d3a' },
            angleLines: { color: '#2a2d3a' },
            pointLabels: { color: '#e4e6ed', font: { size: 13 } },
          },
        },
        plugins: { legend: { display: false } },
      },
    });
  }

  function renderHistory() {
    const ctx = document.getElementById('history-chart').getContext('2d');
    const history = reportData.history || [];

    if (historyChart) historyChart.destroy();

    if (history.length === 0) {
      ctx.canvas.parentElement.innerHTML = '<p style="color:#8b8fa3;text-align:center;padding:40px;">运行多次分析后，这里将显示趋势图</p>';
      return;
    }

    historyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: history.map(h => h.date),
        datasets: [
          { label: '综合', data: history.map(h => h.overall), borderColor: '#6366f1', tension: 0.3, borderWidth: 2 },
          { label: '风格', data: history.map(h => h.style), borderColor: '#22c55e', tension: 0.3, borderWidth: 1, hidden: true },
          { label: '质量', data: history.map(h => h.quality), borderColor: '#3b82f6', tension: 0.3, borderWidth: 1, hidden: true },
          { label: '安全', data: history.map(h => h.security), borderColor: '#f59e0b', tension: 0.3, borderWidth: 1, hidden: true },
          { label: '性能', data: history.map(h => h.performance), borderColor: '#ec4899', tension: 0.3, borderWidth: 1, hidden: true },
        ],
      },
      options: {
        scales: {
          y: { min: 0, max: 10, ticks: { color: '#8b8fa3' }, grid: { color: '#2a2d3a' } },
          x: { ticks: { color: '#8b8fa3' }, grid: { display: false } },
        },
        plugins: { legend: { labels: { color: '#e4e6ed', usePointStyle: true } } },
        interaction: { mode: 'index', intersect: false },
      },
    });
  }

  function renderIssues() {
    const issues = reportData.issues || [];
    document.getElementById('issue-count').textContent = `(${issues.length})`;

    const list = document.getElementById('issue-list');
    list.innerHTML = issues.map((issue, i) => {
      const severityIcon = { critical: '🔴', high: '🟠', medium: '🟡', low: '⚪' };
      return `
        <div class="issue-item severity-${issue.severity}" data-severity="${issue.severity}">
          <div class="issue-severity">${severityIcon[issue.severity] || '⚪'}</div>
          <div class="issue-body">
            <div class="issue-title">${escapeHtml(issue.title)}</div>
            <div class="issue-file">${escapeHtml(issue.file)}${issue.line ? ':' + issue.line : ''}</div>
            ${issue.suggestion ? `<div class="issue-suggestion">💡 ${escapeHtml(issue.suggestion)}</div>` : ''}
          </div>
        </div>
      `;
    }).join('');

    if (issues.length === 0) {
      list.innerHTML = '<p style="color:#22c55e;text-align:center;padding:20px;">✅ 未发现问题</p>';
    }

    // Filter buttons
    document.querySelectorAll('.filter').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        document.querySelectorAll('.issue-item').forEach(item => {
          if (filter === 'all' || item.dataset.severity === filter) {
            item.classList.remove('hidden');
          } else {
            item.classList.add('hidden');
          }
        });
      });
    });
  }

  function renderHighlights() {
    const highlights = reportData.highlights || [];
    const container = document.getElementById('highlights');
    container.innerHTML = highlights.map(h => `<div class="highlight-item">✨ ${escapeHtml(h)}</div>`).join('');
  }

  function renderVersion() {
    document.getElementById('version-display').textContent = `Report v${reportData.meta.version}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
```

- [ ] **Step 4: Commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add src/web/
git commit -m "feat: web dashboard with radar chart, history trend, and issue filters"
```

---

## Phase 11: README & Polish

### Task 11.1: Write README.md

**Files:**
- Create: `C:\Users\27835\Desktop\ai-code-coach\README.md`

- [ ] **Step 1: Write README.md**

```markdown
# 🤖 AI Code Coach

> AI 驱动的个人编程教练——分析你的代码，追踪你的成长

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)

## 它能做什么

- 📊 **五维评分**：代码风格 / 质量 / 安全性 / 性能 / 成长趋势
- 🧠 **AI 深度审查**：LLM 发现静态分析查不到的问题
- 📈 **成长追踪**：每次分析留档，看得到自己的进步曲线
- 🔒 **隐私优先**：自动脱敏密钥/密码，按函数上下文发给 LLM
- 🎯 **多模型切换**：DeepSeek（默认，国内直连）/ Claude / Kimi
- 🌐 **Web 仪表盘**：雷达图 + 趋势折线图 + 问题清单

## 快速开始

```bash
# 1. 安装
git clone https://github.com/lsc-261013/ai-code-coach.git
cd ai-code-coach
npm install --registry https://registry.npmmirror.com
npm run build

# 2. 配置 API Key
cp .env.example .env
# 编辑 .env，填入你的 DeepSeek/Claude/Kimi API Key

# 3. 全局链接（可选）
npm link

# 4. 分析你的项目
ai-coach ./my-project
```

## 使用

```bash
# 基础分析
ai-coach ./my-project

# 只看特定维度
ai-coach ./my-project --focus security,performance

# 切换模型
ai-coach ./my-project --model claude

# 交互式配置
ai-coach config

# 趋势报告（不消耗 API）
ai-coach --trend

# 定时分析
ai-coach ./my-project --schedule weekly

# 查看所有选项
ai-coach --help
```

## 仪表盘

分析完成后，用浏览器打开 `src/web/dashboard.html`，拖入 `reports/` 下的 JSON 文件即可查看可视化报告。

## 技术栈

- TypeScript + Node.js
- Commander CLI 框架
- Anthropic SDK / OpenAI SDK
- Chart.js
- Octokit (GitHub API)

## License

MIT — 开源免费
```

- [ ] **Step 2: Final build and verification**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
npx tsc
npx jest --verbose
```

Expected: All tests pass, TypeScript compiles without errors.

- [ ] **Step 3: Final commit**

```bash
cd "C:/Users/27835/Desktop/ai-code-coach"
git add README.md
git commit -m "docs: README and final polish"
```

---

## Verification Checklist

After all tasks complete, verify:

1. `npx jest` — all tests pass ✅
2. `npx tsc` — compiles without errors ✅
3. `node dist/index.js --help` — CLI help shows all options ✅
4. `node dist/index.js config` — interactive model picker works ✅
5. Generate a report, open `dashboard.html` and drag in the JSON — charts render ✅
