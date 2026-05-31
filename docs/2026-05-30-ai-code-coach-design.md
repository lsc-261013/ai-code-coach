# AI Code Coach — 个人 AI 编程教练

## 概述

AI Code Coach 是一个面向开发者的个人编程教练工具。它能分析用户的代码风格、代码质量、安全漏洞和性能问题，结合 GitHub 提交历史追踪成长轨迹，输出可视化评分报告。

开源产品，CLI 工具 + Web 仪表盘双层架构。

## 目标用户

- 想提升编码水平的开发者
- 希望看到自己成长轨迹的程序员
- 面试前想系统审查自己代码的求职者

## 核心功能

### 1. 代码分析引擎

**数据采集**

| 数据源 | 说明 |
|--------|------|
| 本地文件系统 | 读取指定目录下的源代码文件 |
| GitHub API | 拉取仓库 commit 历史、diff、PR 记录 |

三种模式可选：本地模式 / GitHub 模式 / 双源模式。

**分析维度**

| 维度 | 检测内容 | 实现方式 |
|------|---------|---------|
| style | 命名规范、注释密度、函数长度、代码一致性 | 静态分析 |
| quality | 潜在 bug、代码复杂度、重复逻辑、错误处理 | 静态分析 + LLM |
| security | 硬编码密钥、注入风险、不安全依赖 | LLM 深度审查 |
| performance | N+1 查询、不必要循环、内存浪费 | 静态分析 + LLM |
| growth | 对比历史报告，展示各维度变化曲线 | 纯数据对比 |

`--focus` 参数可选择部分维度，默认全跑。

### 2. LLM 审查层

**多模型后端切换**

| 模型 | API | 国内网络 |
|------|-----|---------|
| DeepSeek（默认） | DeepSeek API | 直连 |
| Claude | Anthropic API | 需 VPN |
| Kimi | Moonshot API | 直连 |
| 通义千问 | DashScope API | 直连 |

交互式选择器：不传 `--model` 时弹出菜单，用户上下选。

**API Key 管理**：通过 `.env` 文件或环境变量配置，工具自动读取对应 Key。

### 3. 报告系统

**双重输出**

- CLI 终端摘要：关键分数 + 严重问题列表 + 单行建议
- Web 仪表盘：雷达图 + 问题清单 + 历史趋势折线图

**中间格式**：JSON（`reports/rpt_YYYYMMDD_序号.json`），CLI 引擎生成，终端和 Web 面板各自消费。

**历史追踪**：每次分析保留 JSON 报告，growth 维度自动对比历史。

### 4. 灵活性

**手动 / 定时**

```bash
ai-coach ./src                    # 手动
ai-coach ./src --schedule weekly  # 每周自动跑
ai-coach ./src --schedule daily   # 每天自动跑
```

**趋势报告**

```bash
ai-coach --trend                  # 不跑分析，直接读历史出成长报告
```

## 架构设计

```
┌─────────────────────────────────────────────────┐
│                   用户层                          │
│   CLI 命令（ai-coach）  │  Web 仪表盘（本地打开） │
├─────────────────────────────────────────────────┤
│                 CLI 引擎层                        │
│  数据采集 → 代码分析 → LLM 审查 → JSON 报告       │
├─────────────────────────────────────────────────┤
│              数据源 & 适配器                       │
│  本地文件系统 │ GitHub API  │  多模型后端          │
│                (可配置)     │(DeepSeek/Claude/…)  │
└─────────────────────────────────────────────────┘
```

- CLI 引擎做所有业务逻辑
- Web 面板纯展示，不碰业务
- 二者通过 JSON 文件解耦
- 可以先跑通 CLI 出 JSON，再搭 Web 面板

## CLI 命令设计

```bash
# 基础分析
ai-coach ./my-project

# 数据源选择
ai-coach ./my-project --repo lsc-261013/ai-review-cli    # 双源模式

# 维度聚焦
ai-coach ./my-project --focus style,security

# 模型切换
ai-coach ./my-project --model claude
ai-coach ./my-project                                      # 弹交互式选择器

# 趋势报告（不跑 LLM）
ai-coach --trend

# 定时任务
ai-coach --schedule weekly
ai-coach --schedule daily

# 隐私控制
ai-coach ./my-project --exclude-secrets                     # 自动脱敏（默认开启）
ai-coach ./my-project --no-sanitize                         # 关闭脱敏（慎用）
ai-coach ./my-project --scope function                      # 只发函数上下文给 LLM

# 输出控制
ai-coach ./my-project --no-web                              # 只终端
ai-coach ./my-project --json-only                           # 只 JSON
```

## JSON 中间格式

```json
{
  "meta": {
    "project": "ai-review-cli",
    "source": "local+github",
    "model": "deepseek",
    "timestamp": "2026-05-30T14:30:00Z",
    "reportId": "rpt_20260530_001",
    "version": "1.0"
  },
  "scores": {
    "overall": 8.2,
    "style": 7.5,
    "quality": 9.0,
    "security": 6.5,
    "performance": 8.0,
    "growth": { "change": 0.5, "trend": "up" }
  },
  "issues": [
    {
      "severity": "high",
      "dimension": "security",
      "title": "SQL 注入风险",
      "file": "src/db.ts",
      "line": 42,
      "suggestion": "使用参数化查询替代字符串拼接"
    }
  ],
  "history": [
    { "date": "2026-05-23", "overall": 7.7 },
    { "date": "2026-05-30", "overall": 8.2 }
  ],
  "highlights": ["质量维度持续领先", "安全得分有待提升"]
}
```

## Web 仪表盘

```
┌─────────────────────────────────────────┐
│  AI Code Coach        上次分析: 2小时前  │
├─────────────────────────────────────────┤
│                                         │
│  ┌──────────┐  ┌──────────┐            │
│  │ 综合评分  │  │ 成长趋势  │    ← 顶部卡片
│  │  8.2/10  │  │  ↑ 0.5   │            │
│  └──────────┘  └──────────┘            │
│                                         │
│  ┌─ 雷达图 ──────────────────────┐      │
│  │    style ★★★★☆                │      │
│  │  quality ★★★★★                │      │
│  │ security ★★★☆☆    ← 五维雷达  │      │
│  │  perform ★★★★☆                │      │
│  │   growth  ↑                    │      │
│  └────────────────────────────────┘      │
│                                         │
│  ┌─ 问题清单 ──────────────────────┐     │
│  │ 🔴 SQL注入风险    src/db.ts:42  │     │
│  │ 🟠 重复逻辑       utils/format  │     │
│  │ 🟡 变量命名不规范  api/user.ts  │     │
│  │ ⚪ 建议使用缓存    store/query   │     │
│  └────────────────────────────────┘     │
│                                         │
│  ┌─ 历史趋势 ──────────────────────┐     │
│  │  折线图: 最近8次分析各维度变化     │     │
│  └────────────────────────────────┘     │
│                                         │
│  [ 导出报告 ] [ 重新分析 ] [ 设置 ]     │
└─────────────────────────────────────────┘
```

- 纯静态 HTML + Chart.js
- JSON 文件拖入浏览器即可渲染
- 无后台依赖

## 项目目录

```
ai-code-coach/
├── src/
│   ├── index.ts              # CLI 入口 (commander)
│   ├── engine/
│   │   ├── collector.ts      # 数据采集（本地 / GitHub）
│   │   ├── sanitizer.ts      # 隐私脱敏 + 上下文裁剪
│   │   ├── analyzer.ts       # 代码静态分析（不用 LLM）
│   │   ├── reviewer.ts       # LLM 审查（调 API，只发代码块）
│   │   └── reporter.ts       # 组装 JSON 报告（含 version 字段）
│   ├── adapters/
│   │   ├── deepseek.ts       # DeepSeek API
│   │   ├── claude.ts         # Anthropic API
│   │   └── kimi.ts           # Moonshot API
│   ├── web/
│   │   ├── dashboard.html    # 仪表盘页面
│   │   ├── dashboard.js      # 读 JSON 渲染图表
│   │   └── style.css
│   ├── scheduler.ts          # 定时任务（写系统 cron / Task Scheduler）
│   └── config.ts             # 配置管理（.env / 参数）
├── reports/                  # 生成的 JSON 报告
├── package.json
├── tsconfig.json
└── README.md
```

## 技术栈

- TypeScript + Node.js
- Commander（CLI 框架）
- Anthropic SDK / OpenAI SDK（多模型适配）
- Chart.js（Web 图表）
- Octokit（GitHub API）
- OS Task Scheduler / crontab（定时触发，无常驻进程）

## 隐私脱敏

### 自动脱敏

- `.ai-coach-ignore` 文件：定义忽略的文件/目录 pattern（类似 .gitignore）
- `--exclude-secrets` 参数：开启自动密钥脱敏，匹配到密钥/密码/Token 模式的内容自动替换为 `[REDACTED]` 后再发给 LLM
- 默认开启；`--no-sanitize` 可关闭

### 上下文裁剪

- LLM 只发送问题所在的函数/代码块上下文，不全量上传文件
- 用户可通过 `--scope function|file|project` 控制上传范围

## 报告版本管理

- JSON meta 中包含 `"version": "1.0"` 字段
- Web 面板读取时按 version 做兼容处理，后续迭代不改坏历史报告
- 终端和 Web 面板各自做版本检查，不兼容时给出明确提示

## 定时任务

- `--schedule` 不启动常驻进程，直接写入系统任务调度器：
  - Linux/macOS：写入 crontab
  - Windows：写入 Task Scheduler（`schtasks`）
- 用户可用系统命令查看/管理/删除，不依赖工具进程保活

## 非目标（本阶段不做）

- VSCode / IDE 插件集成
- 实时代码监控（A 模式）
- 多用户系统 / 数据库存储
- 远程服务器部署
