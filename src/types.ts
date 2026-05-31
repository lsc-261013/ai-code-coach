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
  commentDensity: number;
  namingScore: number;
  consistencyScore: number;
}

export interface QualityMetrics {
  cyclomaticComplexity: number;
  duplicationRate: number;
  errorHandlingScore: number;
}

export interface ScoreSet {
  overall: number;
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
  timestamp: string;
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
