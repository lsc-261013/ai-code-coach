"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewFiles = reviewFiles;
const base_1 = require("../adapters/base");
async function reviewFiles(files, opts) {
    const adapter = (0, base_1.getAdapter)(opts.model);
    const allIssues = [];
    for (const file of files) {
        const chunkSize = opts.scope === 'function' ? 3 : 10;
        const codeChunks = chunkCode(file.content, chunkSize);
        for (const chunk of codeChunks) {
            try {
                const response = await adapter.review({
                    codeSnippet: chunk,
                    filename: file.path,
                    dimensions: opts.dimensions,
                    scope: opts.scope,
                });
                const issues = response.issues.map(issue => ({
                    severity: issue.severity,
                    dimension: issue.dimension,
                    title: issue.title,
                    file: file.path,
                    line: issue.line,
                    suggestion: issue.suggestion,
                }));
                allIssues.push(...issues);
            }
            catch (err) {
                console.error(`Review failed for ${file.path}: ${err.message}`);
            }
        }
    }
    return allIssues;
}
function chunkCode(content, maxFunctions) {
    const lines = content.split('\n');
    const chunks = [];
    let currentChunk = [];
    let funcCount = 0;
    let braceDepth = 0;
    let inFunc = false;
    for (const line of lines) {
        currentChunk.push(line);
        const opens = (line.match(/\{/g) || []).length;
        const closes = (line.match(/\}/g) || []).length;
        braceDepth += opens - closes;
        if (/^(export\s+)?(async\s+)?function\s/.test(line.trim()) ||
            /^(export\s+)?class\s/.test(line.trim()) ||
            /^\s*(public|private|protected)\s+\w+\s*\(/.test(line.trim())) {
            inFunc = true;
        }
        if (inFunc && braceDepth === 0 && closes > 0) {
            funcCount++;
            inFunc = false;
            if (funcCount >= maxFunctions) {
                chunks.push(currentChunk.join('\n'));
                currentChunk = [];
                funcCount = 0;
            }
        }
    }
    if (currentChunk.length > 0 && currentChunk.join('\n').trim().length > 0) {
        chunks.push(currentChunk.join('\n'));
    }
    return chunks.length > 0 ? chunks : [content];
}
//# sourceMappingURL=reviewer.js.map