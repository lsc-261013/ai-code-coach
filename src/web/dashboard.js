// src/web/dashboard.js
(function () {
  'use strict';

  var COMPATIBLE_VERSIONS = ['1.0'];

  var reportData = null;
  var radarChart = null;
  var historyChart = null;

  // Try to load report from drop or file input
  document.addEventListener('DOMContentLoaded', function () {
    console.log('AI Code Coach Dashboard ready.');
    console.log('Drag a report JSON file onto this page, or click "加载报告" to load.');
  });

  // Drag and drop support
  document.addEventListener('dragover', function (e) { e.preventDefault(); });
  document.addEventListener('drop', function (e) {
    e.preventDefault();
    var file = e.dataTransfer.files[0];
    if (file) readAndRender(file);
  });

  window.loadReportFile = function (event) {
    var file = event.target.files[0];
    if (file) readAndRender(file);
  };

  function readAndRender(file) {
    var reader = new FileReader();
    reader.onload = function (e) {
      try {
        var data = JSON.parse(e.target.result);
        if (COMPATIBLE_VERSIONS.indexOf(data.meta && data.meta.version) === -1) {
          alert('Unsupported report version: ' + (data.meta && data.meta.version || 'unknown') + '. Expected: ' + COMPATIBLE_VERSIONS.join(' or '));
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
    var meta = reportData.meta;
    document.getElementById('project-name').textContent = meta.project;
    document.getElementById('model-used').textContent = meta.model.toUpperCase();

    var ts = new Date(meta.timestamp);
    var now = new Date();
    var hoursAgo = Math.round((now - ts) / (1000 * 60 * 60));
    var timeStr = hoursAgo < 1 ? '刚刚' : hoursAgo < 24 ? hoursAgo + '小时前' : Math.floor(hoursAgo / 24) + '天前';
    document.getElementById('last-analysis').textContent = '上次分析: ' + timeStr;
  }

  function renderCards() {
    var s = reportData.scores;
    var overallEl = document.getElementById('overall-score');
    overallEl.textContent = s.overall.toFixed(1);
    overallEl.style.color = s.overall >= 8 ? '#22c55e' : s.overall >= 5 ? '#f59e0b' : '#ef4444';

    var growthEl = document.getElementById('growth-value');
    var growthUnit = document.getElementById('growth-unit');
    if (s.growth.change !== 0) {
      var arrow = s.growth.trend === 'up' ? '↑' : '↓';
      growthEl.textContent = arrow + ' ' + Math.abs(s.growth.change).toFixed(1);
      growthEl.style.color = s.growth.trend === 'up' ? '#22c55e' : '#ef4444';
      growthUnit.textContent = '';
    } else {
      growthEl.textContent = '—';
      growthEl.style.color = '#8b8fa3';
      growthUnit.textContent = '稳定'; // 稳定
    }
  }

  function renderRadar() {
    var ctx = document.getElementById('radar-chart').getContext('2d');
    var s = reportData.scores;

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
    var ctx = document.getElementById('history-chart').getContext('2d');
    var history = reportData.history || [];

    if (historyChart) historyChart.destroy();

    if (history.length === 0) {
      ctx.canvas.parentElement.innerHTML = '<p style="color:#8b8fa3;text-align:center;padding:40px;">运行多次分析后，这里将显示趋势图</p>';
      return;
    }

    historyChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: history.map(function (h) { return h.date; }),
        datasets: [
          { label: '综合', data: history.map(function (h) { return h.overall; }), borderColor: '#6366f1', tension: 0.3, borderWidth: 2 },
          { label: '风格', data: history.map(function (h) { return h.style; }), borderColor: '#22c55e', tension: 0.3, borderWidth: 1, hidden: true },
          { label: '质量', data: history.map(function (h) { return h.quality; }), borderColor: '#3b82f6', tension: 0.3, borderWidth: 1, hidden: true },
          { label: '安全', data: history.map(function (h) { return h.security; }), borderColor: '#f59e0b', tension: 0.3, borderWidth: 1, hidden: true },
          { label: '性能', data: history.map(function (h) { return h.performance; }), borderColor: '#ec4899', tension: 0.3, borderWidth: 1, hidden: true },
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
    var issues = reportData.issues || [];
    document.getElementById('issue-count').textContent = '(' + issues.length + ')';

    var severityIcon = { critical: '🔴', high: '🟠', medium: '🟡', low: '⚪' };
    var list = document.getElementById('issue-list');
    list.innerHTML = issues.map(function (issue) {
      return '<div class="issue-item severity-' + issue.severity + '" data-severity="' + issue.severity + '">' +
        '<div class="issue-severity">' + (severityIcon[issue.severity] || '⚪') + '</div>' +
        '<div class="issue-body">' +
        '<div class="issue-title">' + escapeHtml(issue.title) + '</div>' +
        '<div class="issue-file">' + escapeHtml(issue.file) + (issue.line ? ':' + issue.line : '') + '</div>' +
        (issue.suggestion ? '<div class="issue-suggestion">' + escapeHtml(issue.suggestion) + '</div>' : '') +
        '</div>' +
        '</div>';
    }).join('');

    if (issues.length === 0) {
      list.innerHTML = '<p style="color:#22c55e;text-align:center;padding:20px;">未发现问题</p>';
    }

    // Filter buttons
    document.querySelectorAll('.filter').forEach(function (btn) {
      btn.addEventListener('click', function () {
        document.querySelectorAll('.filter').forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        var filter = btn.dataset.filter;
        document.querySelectorAll('.issue-item').forEach(function (item) {
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
    var highlights = reportData.highlights || [];
    var container = document.getElementById('highlights');
    container.innerHTML = highlights.map(function (h) {
      return '<div class="highlight-item">' + escapeHtml(h) + '</div>';
    }).join('');
  }

  function renderVersion() {
    document.getElementById('version-display').textContent = 'Report v' + reportData.meta.version;
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
})();
