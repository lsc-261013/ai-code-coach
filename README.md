# AI Code Coach

> AI-powered personal programming coach — analyzes your code and tracks your growth

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)](https://www.typescriptlang.org/)

AI Code Coach is an open-source CLI tool that reviews your code across five dimensions (style, quality, security, performance, growth) and produces visual dashboard reports. Built for developers who want to improve their craft and track their progress over time.

## Features

- **Five-Dimensional Scoring** — Style, Quality, Security, Performance, Growth
- **AI Deep Review** — LLM-powered analysis catches issues static tools miss
- **Growth Tracking** — Every analysis is archived; watch your trajectory improve
- **Privacy First** — Auto-redacts secrets before sending to LLM, sends only function-level context
- **Multi-Model** — DeepSeek (default, China direct access), Claude, Kimi
- **Web Dashboard** — Radar chart, trend lines, interactive issue filter — drag a JSON, see everything
- **Zero Daemon Scheduling** — Writes to OS Task Scheduler (Windows) or crontab (macOS/Linux)

## Quick Start

```bash
# 1. Clone and install
git clone https://github.com/lsc-261013/ai-code-coach.git
cd ai-code-coach
npm install --registry https://registry.npmmirror.com
npm run build

# 2. Configure API key
cp .env.example .env
# Edit .env — add your DeepSeek, Claude, or Kimi API key

# 3. Global link (optional)
npm link

# 4. Analyze your project
ai-coach ./my-project
```

## Usage

```bash
# Basic analysis
ai-coach ./my-project

# Focus on specific dimensions
ai-coach ./my-project --focus security,performance

# Switch model
ai-coach ./my-project --model claude

# Interactive config
ai-coach config

# Growth trend (no API call)
ai-coach --trend

# Scheduled analysis
ai-coach ./my-project --schedule weekly

# See all options
ai-coach --help
```

## Dashboard

Open `src/web/dashboard.html` in your browser, then drag a JSON report from `reports/` onto the page.

Charts powered by [Chart.js](https://www.chartjs.org/).

## Tech Stack

- TypeScript + Node.js
- Commander CLI framework
- Anthropic SDK / OpenAI SDK
- Chart.js
- Octokit (GitHub API)

## License

MIT — free and open source.
