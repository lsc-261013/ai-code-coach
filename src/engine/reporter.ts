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

export function saveHtmlReport(report: CoachReport, reportsDir: string): string {
  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }
  const filePath = path.join(reportsDir, `${report.meta.reportId}.html`);
  const html = buildStandaloneHtml(report);
  fs.writeFileSync(filePath, html, 'utf-8');
  return filePath;
}

function buildStandaloneHtml(report: CoachReport): string {
  const json = JSON.stringify(report);
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Code Coach — ${escapeHtml(report.meta.project)}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"><\/script>
<style>
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap');
:root {
  --bg: #090a0f; --surface: #111318; --border: #1e2130;
  --text: #e8e9f0; --text-secondary: #7c7f94; --accent: #818cf8;
  --accent-glow: rgba(129,140,248,.15); --green: #34d399; --red: #f87171;
  --yellow: #fbbf24; --orange: #fb923c; --pink: #f472b6; --radius: 10px;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Space Grotesk',-apple-system,BlinkMacSystemFont,sans-serif;background:var(--bg);background-image:radial-gradient(ellipse at 50% 0%,rgba(129,140,248,.06) 0%,transparent 70%);color:var(--text);line-height:1.6}
.container{max-width:1100px;margin:0 auto;padding:40px 24px}
.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:28px;border-bottom:1px solid var(--border);margin-bottom:36px;flex-wrap:wrap;gap:12px}
.header h1{font-size:28px;font-weight:700;letter-spacing:-.02em;background:linear-gradient(135deg,#c4b5fd,#818cf8,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}
.header-meta{display:flex;gap:8px;color:var(--text-secondary);font-size:13px;align-items:center}
.dot{color:var(--border)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:20px;margin-bottom:36px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px 24px;text-align:center;position:relative;overflow:hidden;transition:border-color .3s}
.card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,var(--accent),transparent);opacity:0;transition:opacity .3s}
.card:hover{border-color:#2a2d44}
.card:hover::before{opacity:.6}
.card-label{font-size:12px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:1px;margin-bottom:12px;font-weight:500}
.card-value{font-size:52px;font-weight:700;letter-spacing:-.03em;line-height:1}
.card-primary .card-value{color:#c4b5fd;text-shadow:0 0 40px var(--accent-glow)}
.card-unit{font-size:13px;color:var(--text-secondary);margin-top:6px}
.charts-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(420px,1fr));gap:24px;margin-bottom:36px}
.chart-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;transition:border-color .3s}
.chart-box:hover{border-color:#2a2d44}
.chart-box h2{font-size:14px;margin-bottom:20px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px;font-weight:500}
.chart-box canvas{max-height:380px}
.issues-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:28px;margin-bottom:36px}
.issues-section h2{font-size:16px;margin-bottom:20px;font-weight:600}
#issue-count{font-size:13px;color:var(--text-secondary);font-weight:400}
.issue-filters{display:flex;gap:8px;margin-bottom:24px;flex-wrap:wrap}
.filter{background:transparent;border:1px solid var(--border);color:var(--text-secondary);padding:6px 16px;border-radius:20px;cursor:pointer;font-size:12px;transition:all .2s;font-family:'Space Grotesk',sans-serif}
.filter:hover{border-color:var(--accent);color:var(--text);background:rgba(129,140,248,.05)}
.filter.active{background:rgba(129,140,248,.15);border-color:var(--accent);color:#c4b5fd}
.issue-list{display:flex;flex-direction:column;gap:10px}
.issue-item{display:flex;align-items:flex-start;gap:14px;padding:16px;background:var(--bg);border-radius:8px;border-left:3px solid var(--border);transition:border-color .2s,transform .2s}
.issue-item:hover{transform:translateX(2px)}
.issue-item.severity-critical{border-left-color:var(--red);background:rgba(248,113,113,.04)}
.issue-item.severity-high{border-left-color:var(--orange)}
.issue-item.severity-medium{border-left-color:var(--yellow)}
.issue-item.severity-low{border-left-color:var(--text-secondary)}
.issue-severity{font-size:18px;flex-shrink:0;line-height:1.4}
.issue-body{flex:1;min-width:0}
.issue-title{font-weight:600;margin-bottom:3px;font-size:14px}
.issue-file{font-size:12px;color:var(--text-secondary);font-family:'JetBrains Mono','Fira Code',monospace}
.issue-suggestion{font-size:12px;color:var(--text-secondary);margin-top:6px;font-style:italic;opacity:.85}
.hidden{display:none}
.highlights-section{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:36px}
.highlight-item{background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:10px 20px;font-size:13px}
.footer{display:flex;justify-content:center;gap:16px;align-items:center;padding-top:28px;border-top:1px solid var(--border);margin-bottom:16px}
.footer button{background:linear-gradient(135deg,#818cf8,#6366f1);color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-size:13px;transition:opacity .2s,transform .2s;font-family:'Space Grotesk',sans-serif;font-weight:500}
.footer button:hover{opacity:.9;transform:translateY(-1px)}
.version{font-size:11px;color:var(--text-secondary)}
@media(max-width:768px){.charts-row{grid-template-columns:1fr}.cards{grid-template-columns:1fr 1fr}.header{flex-direction:column;align-items:flex-start}.card-value{font-size:40px}}
</style>
</head>
<body>
<div class="container">
<header class="header">
<h1>AI Code Coach</h1>
<div class="header-meta" id="header-meta"></div>
</header>
<div class="cards">
<div class="card card-primary"><div class="card-label">综合评分</div><div class="card-value" id="overall-score">—</div><div class="card-unit">/ 10</div></div>
<div class="card card-trend"><div class="card-label">成长趋势</div><div class="card-value" id="growth-value">—</div><div class="card-unit" id="growth-unit"></div></div>
</div>
<div class="charts-row">
<div class="chart-box"><h2>五维雷达</h2><canvas id="radar-chart"></canvas></div>
<div class="chart-box"><h2>历史趋势</h2><canvas id="history-chart"></canvas></div>
</div>
<div class="issues-section">
<h2>问题清单 <span id="issue-count"></span></h2>
<div class="issue-filters">
<button class="filter active" data-filter="all">全部</button>
<button class="filter" data-filter="critical">严重</button>
<button class="filter" data-filter="high">高危</button>
<button class="filter" data-filter="medium">中危</button>
<button class="filter" data-filter="low">低危</button>
</div>
<div id="issue-list" class="issue-list"></div>
</div>
<div class="highlights-section" id="highlights"></div>
<footer class="footer">
<button onclick="window.print()">导出 PDF</button>
<span class="version" id="version-display"></span>
</footer>
</div>
<script>
var REPORT_DATA = ${json};
</script>
<script>
(function(){
'use strict';
var reportData = REPORT_DATA;
var radarChart=null, historyChart=null;

function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML}

(function renderAll(){
if(!reportData)return;
var m=reportData.meta, s=reportData.scores;
// header
var hEl=document.getElementById('header-meta');
hEl.innerHTML='<span>'+esc(m.project)+'</span><span class="dot">•</span><span>'+((function(){
var ts=new Date(m.timestamp),now=new Date(),h=Math.round((now-ts)/36e5);
return h<1?'刚刚':h<24?h+'小时前':Math.floor(h/24)+'天前';
})())+'</span><span class="dot">•</span><span>'+m.model.toUpperCase()+'</span>';

// cards
var oEl=document.getElementById('overall-score');
oEl.textContent=s.overall.toFixed(1);
oEl.style.color=s.overall>=8?'#22c55e':s.overall>=5?'#f59e0b':'#ef4444';
var gEl=document.getElementById('growth-value'),gU=document.getElementById('growth-unit');
if(s.growth.change!==0){
var arrow=s.growth.trend==='up'?'↑':'↓';
gEl.textContent=arrow+' '+Math.abs(s.growth.change).toFixed(1);
gEl.style.color=s.growth.trend==='up'?'#22c55e':'#ef4444';gU.textContent='';
}else{gEl.textContent='—';gEl.style.color='#8b8fa3';gU.textContent='稳定';}

// radar
(function(){
var ctx=document.getElementById('radar-chart').getContext('2d');
if(radarChart)radarChart.destroy();
radarChart=new Chart(ctx,{type:'radar',data:{
labels:['代码风格','代码质量','安全性','性能'],
datasets:[{label:m.project,data:[s.style,s.quality,s.security,s.performance],
backgroundColor:'rgba(99,102,241,0.2)',borderColor:'rgba(99,102,241,0.8)',
borderWidth:2,pointBackgroundColor:'#6366f1',pointBorderColor:'#fff',pointRadius:5}]},
options:{scales:{r:{beginAtZero:true,max:10,ticks:{stepSize:2,color:'#8b8fa3',backdropColor:'transparent'},
grid:{color:'#2a2d3a'},angleLines:{color:'#2a2d3a'},pointLabels:{color:'#e4e6ed',font:{size:13}}}},plugins:{legend:{display:false}}}});
})();

// history
(function(){
var ctx=document.getElementById('history-chart').getContext('2d');
var h=reportData.history||[];
if(historyChart)historyChart.destroy();
if(h.length===0){ctx.canvas.parentElement.innerHTML='<p style="color:#8b8fa3;text-align:center;padding:40px;">运行多次分析后，这里将显示趋势图</p>';return;}
historyChart=new Chart(ctx,{type:'line',data:{
labels:h.map(function(h){return h.date}),
datasets:[
{label:'综合',data:h.map(function(h){return h.overall}),borderColor:'#6366f1',backgroundColor:'rgba(99,102,241,0.05)',fill:false,tension:.3,borderWidth:2.5,pointRadius:5,pointBackgroundColor:'#6366f1'},
{label:'风格',data:h.map(function(h){return h.style}),borderColor:'#22c55e',fill:false,tension:.3,borderWidth:2,pointRadius:3,pointBackgroundColor:'#22c55e'},
{label:'质量',data:h.map(function(h){return h.quality}),borderColor:'#3b82f6',fill:false,tension:.3,borderWidth:2,pointRadius:3,pointBackgroundColor:'#3b82f6'},
{label:'安全',data:h.map(function(h){return h.security}),borderColor:'#f59e0b',fill:false,tension:.3,borderWidth:2,pointRadius:3,pointBackgroundColor:'#f59e0b'},
{label:'性能',data:h.map(function(h){return h.performance}),borderColor:'#ec4899',fill:false,tension:.3,borderWidth:2,pointRadius:3,pointBackgroundColor:'#ec4899'}]},
options:{scales:{y:{min:0,max:10,ticks:{color:'#8b8fa3'},grid:{color:'#2a2d3a'}},x:{ticks:{color:'#8b8fa3'},grid:{display:false}}},
plugins:{legend:{labels:{color:'#e4e6ed',usePointStyle:true}}},interaction:{mode:'index',intersect:false}}});
})();

// issues
var issues=reportData.issues||[],sevIcons={critical:'🔴',high:'🟠',medium:'🟡',low:'⚪'};
document.getElementById('issue-count').textContent='('+issues.length+')';
document.getElementById('issue-list').innerHTML=issues.length===0?'<p style="color:#22c55e;text-align:center;padding:20px;">未发现问题</p>'
:issues.map(function(i){return '<div class="issue-item severity-'+i.severity+'" data-severity="'+i.severity+'">'+
'<div class="issue-severity">'+(sevIcons[i.severity]||'⚪')+'</div><div class="issue-body">'+
'<div class="issue-title">'+esc(i.title)+'</div><div class="issue-file">'+esc(i.file)+(i.line?':'+i.line:'')+'</div>'+
(i.suggestion?'<div class="issue-suggestion">'+esc(i.suggestion)+'</div>':'')+'</div></div>'}).join('');
document.querySelectorAll('.filter').forEach(function(b){b.onclick=function(){
document.querySelectorAll('.filter').forEach(function(x){x.classList.remove('active')});b.classList.add('active');
var f=b.dataset.filter;
document.querySelectorAll('.issue-item').forEach(function(i){
if(f==='all'||i.dataset.severity===f)i.classList.remove('hidden');else i.classList.add('hidden');});};});

// highlights
var hl=reportData.highlights||[];
document.getElementById('highlights').innerHTML=hl.map(function(h){return '<div class="highlight-item">'+esc(h)+'</div>'}).join('');
document.getElementById('version-display').textContent='Report v'+m.version;
})();
})();
<\/script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
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
