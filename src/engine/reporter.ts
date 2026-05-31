import * as fs from 'fs';
import * as path from 'path';
import { CoachReport, Issue, FocusDimension, Severity, HistoryPoint } from '../types';

// Simple ANSI color helpers (no ESM dependency)
const c = {
  bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s: string) => `\x1b[36m${s}\x1b[0m`,
  green: (s: string) => `\x1b[32m${s}\x1b[0m`,
  yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
  red: (s: string) => `\x1b[31m${s}\x1b[0m`,
  gray: (s: string) => `\x1b[90m${s}\x1b[0m`,
  white: (s: string) => s,
};

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

  let securityScore = 5;
  let performanceScore = 5;

  const securityIssues = llmIssues.filter(i => i.dimension === 'security');
  const performanceIssues = llmIssues.filter(i => i.dimension === 'performance' || i.dimension === 'quality');

  if (securityIssues.length > 0) {
    const securityPenalty = securityIssues.reduce((sum, i) => sum + (SEVERITY_WEIGHTS[i.severity] || 1), 0);
    securityScore = Math.max(1, 10 - securityPenalty);
  } else {
    securityScore = 8;
  }

  if (performanceIssues.length > 0) {
    const perfPenalty = performanceIssues.reduce((sum, i) => sum + (SEVERITY_WEIGHTS[i.severity] || 1), 0);
    performanceScore = Math.max(1, 10 - perfPenalty);
  } else {
    performanceScore = 8;
  }

  const history = loadHistory(reportsDir, projectName);
  let growthChange = 0;
  let growthTrend: 'up' | 'down' | 'stable' = 'stable';
  if (history.length > 0) {
    growthChange = Math.round((staticScores.style + staticScores.quality + securityScore + performanceScore) / 4 * 10) / 10
      - history[history.length - 1].overall;
    growthTrend = growthChange > 0.2 ? 'up' : growthChange < -0.2 ? 'down' : 'stable';
  }

  const overallScores = [
    staticScores.style,
    staticScores.quality,
    securityScore,
    performanceScore,
  ].filter(Boolean);
  const overall = overallScores.length > 0
    ? Math.round((overallScores.reduce((a, b) => a + b, 0) / overallScores.length) * 10) / 10
    : 0;

  const highlights: string[] = [];
  const dimEntries: Array<[string, number]> = [
    ['style', staticScores.style],
    ['quality', staticScores.quality],
    ['security', securityScore],
    ['performance', performanceScore],
  ];
  const maxDim = dimEntries.sort(([, a], [, b]) => b - a)[0];
  const minDim = dimEntries.sort(([, a], [, b]) => a - b)[0];
  if (maxDim && maxDim[1] >= 8) highlights.push(`${maxDim[0]} 维度持续领先`);
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
  lines.push(c.cyan(c.bold('═══ AI Code Coach Report ═══')));
  lines.push('');
  lines.push(`  Project: ${c.white(report.meta.project)}`);
  lines.push(`  Model:   ${c.white(report.meta.model)}`);
  lines.push(`  Report:  ${c.gray(report.meta.reportId)}`);
  lines.push('');

  lines.push(c.bold('  Scores:'));
  const overallColor = report.scores.overall >= 8 ? c.green
    : report.scores.overall >= 5 ? c.yellow : c.red;
  lines.push(`    Overall:     ${overallColor(report.scores.overall.toFixed(1))} / 10`);
  lines.push(`    Style:       ${c.white(report.scores.style.toFixed(1))}`);
  lines.push(`    Quality:     ${c.white(report.scores.quality.toFixed(1))}`);
  lines.push(`    Security:    ${c.white(report.scores.security.toFixed(1))}`);
  lines.push(`    Performance: ${c.white(report.scores.performance.toFixed(1))}`);

  if (report.scores.growth.change !== 0) {
    const arrow = report.scores.growth.trend === 'up' ? '↑' : '↓';
    const color = report.scores.growth.trend === 'up' ? c.green : c.red;
    lines.push(`    Growth:      ${color(arrow + ' ' + report.scores.growth.change.toFixed(1))}`);
  }

  lines.push('');

  if (report.issues.length > 0) {
    lines.push(c.bold(`  Issues (${report.issues.length}):`));
    const severityIcon: Record<string, string> = {
      critical: c.red('🔴'),
      high: c.red('🟠'),
      medium: c.yellow('🟡'),
      low: c.gray('⚪'),
    };
    for (const issue of report.issues.slice(0, 10)) {
      const icon = severityIcon[issue.severity] || '  ';
      lines.push(`    ${icon} ${c.bold(issue.title)}  ${c.gray(issue.file + (issue.line ? `:${issue.line}` : ''))}`);
    }
    if (report.issues.length > 10) {
      lines.push(`    ... and ${report.issues.length - 10} more`);
    }
  } else {
    lines.push(c.green('  ✅ No issues found!'));
  }

  lines.push('');
  if (report.highlights.length > 0) {
    lines.push(c.bold('  Highlights:'));
    for (const h of report.highlights) {
      lines.push(`    ✨ ${h}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
