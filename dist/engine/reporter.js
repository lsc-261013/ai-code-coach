"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReport = generateReport;
exports.loadHistory = loadHistory;
exports.saveReport = saveReport;
exports.saveHtmlReport = saveHtmlReport;
exports.generateTerminalSummary = generateTerminalSummary;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
// Simple ANSI color helpers (no ESM dependency)
const c = {
    bold: (s) => `\x1b[1m${s}\x1b[0m`,
    cyan: (s) => `\x1b[36m${s}\x1b[0m`,
    green: (s) => `\x1b[32m${s}\x1b[0m`,
    yellow: (s) => `\x1b[33m${s}\x1b[0m`,
    red: (s) => `\x1b[31m${s}\x1b[0m`,
    gray: (s) => `\x1b[90m${s}\x1b[0m`,
    white: (s) => s,
};
const SEVERITY_WEIGHTS = {
    critical: 3,
    high: 2,
    medium: 1,
    low: 0.5,
};
function generateReport(input) {
    const { projectName, source, model, staticScores, llmIssues, dimensions, reportsDir } = input;
    let securityScore = 5;
    let performanceScore = 5;
    const securityIssues = llmIssues.filter(i => i.dimension === 'security');
    const performanceIssues = llmIssues.filter(i => i.dimension === 'performance' || i.dimension === 'quality');
    if (securityIssues.length > 0) {
        const securityPenalty = securityIssues.reduce((sum, i) => sum + (SEVERITY_WEIGHTS[i.severity] || 1), 0);
        securityScore = Math.max(1, 10 - securityPenalty);
    }
    else {
        securityScore = 8;
    }
    if (performanceIssues.length > 0) {
        const perfPenalty = performanceIssues.reduce((sum, i) => sum + (SEVERITY_WEIGHTS[i.severity] || 1), 0);
        performanceScore = Math.max(1, 10 - perfPenalty);
    }
    else {
        performanceScore = 8;
    }
    const history = loadHistory(reportsDir, projectName);
    let growthChange = 0;
    let growthTrend = 'stable';
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
    const highlights = [];
    const dimEntries = [
        ['style', staticScores.style],
        ['quality', staticScores.quality],
        ['security', securityScore],
        ['performance', performanceScore],
    ];
    const maxDim = dimEntries.sort(([, a], [, b]) => b - a)[0];
    const minDim = dimEntries.sort(([, a], [, b]) => a - b)[0];
    if (maxDim && maxDim[1] >= 8)
        highlights.push(`${maxDim[0]} 维度持续领先`);
    if (minDim && minDim[1] < 5)
        highlights.push(`${minDim[0]} 得分有待提升`);
    if (growthTrend === 'up')
        highlights.push('📈 成长趋势向好');
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
function loadHistory(reportsDir, projectName) {
    if (!fs.existsSync(reportsDir))
        return [];
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
        }
        catch {
            return null;
        }
    }).filter(Boolean);
}
function saveReport(report, reportsDir) {
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }
    const filePath = path.join(reportsDir, `${report.meta.reportId}.json`);
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2), 'utf-8');
    return filePath;
}
function saveHtmlReport(report, reportsDir) {
    if (!fs.existsSync(reportsDir)) {
        fs.mkdirSync(reportsDir, { recursive: true });
    }
    const filePath = path.join(reportsDir, `${report.meta.reportId}.html`);
    const html = buildStandaloneHtml(report);
    fs.writeFileSync(filePath, html, 'utf-8');
    return filePath;
}
function buildStandaloneHtml(report) {
    const json = JSON.stringify(report);
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AI Code Coach — ${escapeHtml(report.meta.project)}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"><\/script>
<style>
:root {
  --bg: #0f1117; --surface: #1a1d27; --border: #2a2d3a;
  --text: #e4e6ed; --text-secondary: #8b8fa3; --accent: #6366f1;
  --green: #22c55e; --red: #ef4444; --yellow: #f59e0b; --radius: 12px;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;background:var(--bg);color:var(--text);line-height:1.6}
.container{max-width:1100px;margin:0 auto;padding:32px 24px}
.header{display:flex;justify-content:space-between;align-items:center;padding-bottom:24px;border-bottom:1px solid var(--border);margin-bottom:32px;flex-wrap:wrap;gap:12px}
.header h1{font-size:28px;font-weight:700}
.header-meta{display:flex;gap:8px;color:var(--text-secondary);font-size:14px;align-items:center}
.dot{color:var(--border)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:32px}
.card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;text-align:center}
.card-label{font-size:14px;color:var(--text-secondary);text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.card-value{font-size:48px;font-weight:700;color:var(--accent)}
.card-trend .card-value{color:var(--accent)}
.card-unit{font-size:14px;color:var(--text-secondary)}
.charts-row{display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:24px;margin-bottom:32px}
.chart-box{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px}
.chart-box h2{font-size:16px;margin-bottom:16px;color:var(--text-secondary)}
.chart-box canvas{max-height:350px}
.issues-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:24px;margin-bottom:32px}
.issues-section h2{font-size:18px;margin-bottom:16px}
#issue-count{font-size:14px;color:var(--text-secondary);font-weight:normal}
.issue-filters{display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap}
.filter{background:transparent;border:1px solid var(--border);color:var(--text-secondary);padding:6px 14px;border-radius:20px;cursor:pointer;font-size:13px;transition:all .2s}
.filter:hover{border-color:var(--accent);color:var(--text)}
.filter.active{background:var(--accent);border-color:var(--accent);color:white}
.issue-list{display:flex;flex-direction:column;gap:12px}
.issue-item{display:flex;align-items:flex-start;gap:12px;padding:14px;background:var(--bg);border-radius:8px;border-left:3px solid var(--border)}
.issue-item.severity-critical{border-left-color:var(--red)}
.issue-item.severity-high{border-left-color:#f97316}
.issue-item.severity-medium{border-left-color:var(--yellow)}
.issue-item.severity-low{border-left-color:var(--text-secondary)}
.issue-severity{font-size:20px;flex-shrink:0}
.issue-body{flex:1}
.issue-title{font-weight:600;margin-bottom:4px}
.issue-file{font-size:13px;color:var(--text-secondary);font-family:'JetBrains Mono','Fira Code',monospace}
.issue-suggestion{font-size:13px;color:var(--text-secondary);margin-top:6px;font-style:italic}
.hidden{display:none}
.highlights-section{display:flex;gap:12px;flex-wrap:wrap;margin-bottom:32px}
.highlight-item{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:12px 20px;font-size:14px}
.footer{display:flex;justify-content:center;gap:16px;align-items:center;padding-top:24px;border-top:1px solid var(--border);margin-bottom:16px}
.footer button{background:var(--accent);color:white;border:none;padding:10px 20px;border-radius:8px;cursor:pointer;font-size:14px;transition:opacity .2s}
.footer button:hover{opacity:.85}
.version{font-size:12px;color:var(--text-secondary)}
@media(max-width:768px){.charts-row{grid-template-columns:1fr}.cards{grid-template-columns:1fr 1fr}.header{flex-direction:column;align-items:flex-start}}
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
{label:'综合',data:h.map(function(h){return h.overall}),borderColor:'#6366f1',tension:.3,borderWidth:2,pointRadius:4},
{label:'风格',data:h.map(function(h){return h.style}),borderColor:'#22c55e',tension:.3,borderWidth:1,hidden:true},
{label:'质量',data:h.map(function(h){return h.quality}),borderColor:'#3b82f6',tension:.3,borderWidth:1,hidden:true},
{label:'安全',data:h.map(function(h){return h.security}),borderColor:'#f59e0b',tension:.3,borderWidth:1,hidden:true},
{label:'性能',data:h.map(function(h){return h.performance}),borderColor:'#ec4899',tension:.3,borderWidth:1,hidden:true}]},
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
function escapeHtml(str) {
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
function generateTerminalSummary(report) {
    const lines = [];
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
        const severityIcon = {
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
    }
    else {
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
//# sourceMappingURL=reporter.js.map