#!/usr/bin/env node
// src/index.ts
import { Command } from 'commander';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { execSync } from 'child_process';
import { buildConfig } from './config';
import { CoachConfig } from './types';
import { collectLocal } from './engine/collector';
import { sanitizeContent } from './engine/sanitizer';
import { analyzeAll } from './engine/analyzer';
import { reviewFiles } from './engine/reviewer';
import { generateReport, saveReport, saveHtmlReport, generateTerminalSummary } from './engine/reporter';

// Load .env from cwd
dotenv.config();
dotenv.config({ path: path.join(process.cwd(), '.env') });

function getApiKey(model: string): string | null {
  switch (model) {
    case 'deepseek': return process.env.DEEPSEEK_API_KEY || null;
    case 'claude': return process.env.CLAUDE_API_KEY || null;
    case 'kimi': return process.env.KIMI_API_KEY || null;
    default: return process.env.DEEPSEEK_API_KEY || null;
  }
}

function openFile(filePath: string): void {
  try {
    switch (process.platform) {
      case 'win32':
        execSync(`start "" "${filePath}"`, { stdio: 'ignore' });
        break;
      case 'darwin':
        execSync(`open "${filePath}"`, { stdio: 'ignore' });
        break;
      default:
        execSync(`xdg-open "${filePath}"`, { stdio: 'ignore' });
    }
  } catch {
    // Silent fail — don't ruin the analysis just because browser won't open
  }
}

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
  .option('--no-web', 'Skip HTML report, terminal only')
  .option('--json-only', 'Generate JSON report only, no terminal output')
  .option('--no-open', 'Do not auto-open report in browser')
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
        const { setupSchedule } = require('./scheduler');
        await setupSchedule(config);
        console.log(`Scheduled ${config.schedule} analysis for ${path.resolve(config.projectPath)}`);
        console.log('  Use your system task scheduler to view/manage.');
        return;
      }

      // Trend mode
      if (config.trendOnly) {
        const { loadHistory } = require('./engine/reporter');
        const reportsDir = path.join(process.cwd(), 'reports');
        const history = loadHistory(reportsDir, config.projectPath);
        if (history.length === 0) {
          console.log('No history found. Run an analysis first with: ai-coach ./your-project');
        } else {
          console.log('Growth Trend:');
          for (const h of history) {
            console.log(`  ${h.date}  Overall: ${h.overall.toFixed(1)}  Style: ${h.style.toFixed(1)}  Quality: ${h.quality.toFixed(1)}  Security: ${h.security.toFixed(1)}  Performance: ${h.performance.toFixed(1)}`);
          }
        }
        return;
      }

      // Normal analysis mode
      await runAnalysis(config, opts.open !== false);
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

    const question = (q: string): Promise<string> =>
      new Promise(resolve => readline.question(q, resolve));

    console.log('\nAI Code Coach Configuration\n');
    console.log('Available models:');
    console.log('  1. DeepSeek  (recommended, China direct access)');
    console.log('  2. Claude    (Anthropic, requires VPN)');
    console.log('  3. Kimi      (Moonshot, China direct access)\n');

    const choice = await question('Choose default model (1-3): ');
    const modelMap: Record<string, string> = { '1': 'deepseek', '2': 'claude', '3': 'kimi' };
    const model = modelMap[choice] || 'deepseek';

    console.log(`\nDefault model set to: ${model}`);
    console.log('Set API keys in your .env file or environment variables:');
    console.log('  DEEPSEEK_API_KEY=sk-xxx');
    console.log('  CLAUDE_API_KEY=sk-ant-xxx');
    console.log('  KIMI_API_KEY=sk-xxx');
    console.log('\nWithout an API key, ai-coach runs static analysis only (style + quality).');
    console.log('Deep review (security + performance) requires an API key.\n');

    readline.close();
  });

async function runAnalysis(config: CoachConfig, autoOpen: boolean): Promise<void> {
  const absPath = path.resolve(config.projectPath);
  const reportsDir = path.join(absPath, 'reports');
  const projectName = path.basename(absPath);

  const apiKey = getApiKey(config.model);
  const hasLLM = !!apiKey;

  if (!hasLLM && config.focus.some((f: string) => ['security', 'performance'].includes(f))) {
    console.log(`Note: No ${config.model.toUpperCase()} API key found. Skipping deep review.`);
    console.log(`  Set ${config.model === 'deepseek' ? 'DEEPSEEK_API_KEY' : config.model === 'claude' ? 'CLAUDE_API_KEY' : 'KIMI_API_KEY'} in .env for LLM-powered security & performance analysis.\n`);
  }

  console.log(`\nAnalyzing: ${absPath}`);
  console.log(`  Model: ${config.model}${!hasLLM ? ' (static only)' : ''}  |  Focus: ${config.focus.join(', ')}  |  Scope: ${config.scope}\n`);

  // 1. Collect
  console.log('Collecting files...');
  const files = await collectLocal(absPath);
  console.log(`  Found ${files.length} code files`);

  if (files.length === 0) {
    console.log('No code files found. Exiting.');
    return;
  }

  // 2. Sanitize
  if (config.sanitize) {
    console.log('Sanitizing secrets...');
    for (const file of files) {
      file.content = sanitizeContent(file.content);
    }
  }

  // 3. Static analysis
  console.log('Running static analysis...');
  const staticScores = analyzeAll(files, config.focus);

  // 4. LLM review (only if API key available)
  let llmIssues: any[] = [];
  if (hasLLM && config.focus.some((f: string) => ['security', 'performance', 'quality'].includes(f))) {
    console.log(`Calling ${config.model} API for deep review...`);
    llmIssues = await reviewFiles(files, {
      model: config.model,
      dimensions: config.focus,
      scope: config.scope,
    });
    console.log(`  Found ${llmIssues.length} issues`);
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

  // 6. Save reports
  saveReport(report, reportsDir);
  const htmlPath = saveHtmlReport(report, reportsDir);

  // 7. Terminal output
  if (config.outputMode !== 'json-only') {
    console.log(generateTerminalSummary(report));
    console.log(`Report saved: ${htmlPath}`);
  }

  // 8. Auto-open
  if (autoOpen && config.outputMode !== 'terminal-only' && config.outputMode !== 'json-only') {
    openFile(htmlPath);
  }
}

program.parse(process.argv);
