"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyzeStyle = analyzeStyle;
exports.analyzeQuality = analyzeQuality;
exports.analyzeAll = analyzeAll;
function analyzeStyle(content) {
    const lines = content.split('\n');
    const totalLines = lines.length;
    const commentLines = lines.filter(l => {
        const trimmed = l.trim();
        return trimmed.startsWith('//') || trimmed.startsWith('/*') || trimmed.startsWith('*');
    }).length;
    const commentDensity = totalLines > 0 ? commentLines / totalLines : 0;
    const functionMatches = content.match(/(?:function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(|\w+\s*\([^)]*\)\s*\{)/g);
    const functionCount = functionMatches ? functionMatches.length : 1;
    const braceBlocks = content.match(/\{[^}]*\}/g);
    let totalFuncLines = 0;
    if (braceBlocks) {
        totalFuncLines = braceBlocks.reduce((sum, block) => sum + block.split('\n').length, 0);
    }
    const avgFunctionLength = functionCount > 0 ? Math.min(totalFuncLines / functionCount, 100) : 0;
    const maxFunctionLength = braceBlocks
        ? Math.max(...braceBlocks.map(b => b.split('\n').length))
        : 0;
    const identifiers = content.match(/\b(const|let|var|function)\s+(\w+)/g) || [];
    const goodNames = identifiers.filter(id => /^[a-z][a-zA-Z0-9]*$/.test(id.split(/\s+/)[1] || ''));
    const namingScore = identifiers.length > 0
        ? Math.round((goodNames.length / identifiers.length) * 10)
        : 8;
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
function analyzeQuality(content) {
    const lines = content.split('\n');
    const decisionPoints = (content.match(/\b(if|for|while|case|catch)\b/g) || []).length +
        (content.match(/&&|\|\|/g) || []).length +
        (content.match(/\?/g) || []).length;
    const cyclomaticComplexity = Math.max(1, decisionPoints);
    const nonEmptyLines = lines.filter(l => l.trim().length > 0);
    const uniqueLines = new Set(nonEmptyLines.map(l => l.trim()));
    const duplicationRate = nonEmptyLines.length > 0
        ? 1 - uniqueLines.size / nonEmptyLines.length
        : 0;
    const hasTryCatch = /\btry\b/.test(content) && /\bcatch\b/.test(content);
    const hasErrorChecks = (content.match(/\bif\s*\(.*err(?:or)?\)/gi) || []).length > 0;
    const errorHandlingScore = (hasTryCatch ? 5 : 2) + (hasErrorChecks ? 5 : 2);
    return {
        cyclomaticComplexity,
        duplicationRate: Math.min(duplicationRate, 1),
        errorHandlingScore: Math.min(errorHandlingScore, 10),
    };
}
function styleMetricsToScore(metrics) {
    const funcScore = Math.max(0, 10 - (metrics.avgFunctionLength / 5));
    const commentScore = metrics.commentDensity * 20;
    const score = (funcScore * 0.3 + commentScore * 0.3 + metrics.namingScore * 0.2 + metrics.consistencyScore * 0.2);
    return Math.round(Math.min(Math.max(score, 1), 10) * 10) / 10;
}
function qualityMetricsToScore(metrics) {
    const complexityScore = Math.max(0, 10 - metrics.cyclomaticComplexity / 2);
    const dupScore = (1 - metrics.duplicationRate) * 10;
    const score = complexityScore * 0.5 + dupScore * 0.3 + metrics.errorHandlingScore * 0.2;
    return Math.round(Math.min(Math.max(score, 1), 10) * 10) / 10;
}
function analyzeAll(files, dimensions) {
    const result = { style: 0, quality: 0, security: 0, performance: 0 };
    if (files.length === 0)
        return result;
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
    if (filesWithStyle > 0)
        result.style = Math.round((totalStyleScore / filesWithStyle) * 10) / 10;
    if (filesWithQuality > 0)
        result.quality = Math.round((totalQualityScore / filesWithQuality) * 10) / 10;
    return result;
}
//# sourceMappingURL=analyzer.js.map