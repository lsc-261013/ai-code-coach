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
