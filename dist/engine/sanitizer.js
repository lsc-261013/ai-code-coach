"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeContent = sanitizeContent;
exports.sanitizeFiles = sanitizeFiles;
exports.extractFunctionContext = extractFunctionContext;
const SECRET_PATTERNS = [
    { pattern: /(?:api[_-]?key|apikey|API_KEY)\s*[:=]\s*["'][^"']+["']/gi },
    { pattern: /(?:password|passwd|pwd)\s*[:=]\s*["'][^"']+["']/gi },
    { pattern: /(?:secret|SECRET)\s*[:=]\s*["'][^"']+["']/gi },
    { pattern: /(?:token|TOKEN|access[_-]?token)\s*[:=]\s*["'][^"']+["']/gi },
    { pattern: /sk-[a-zA-Z0-9]{20,}/g },
    { pattern: /sk-ant-[a-zA-Z0-9_-]{20,}/g },
    { pattern: /ghp_[a-zA-Z0-9]{36,}/g },
    { pattern: /eyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/g },
    { pattern: /-----BEGIN (?:RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |DSA )?PRIVATE KEY-----/g },
    { pattern: /(?:mongodb|mysql|postgres|redis):\/\/[^:\s]+:[^@\s]+@/g },
];
function sanitizeContent(content) {
    let sanitized = content;
    for (const { pattern } of SECRET_PATTERNS) {
        sanitized = sanitized.replace(pattern, () => '[REDACTED]');
    }
    return sanitized;
}
function sanitizeFiles(files) {
    return files.map(file => ({
        ...file,
        content: sanitizeContent(file.content),
    }));
}
function extractFunctionContext(content, targetLine, contextLines = 10) {
    const lines = content.split('\n');
    if (targetLine < 1 || targetLine > lines.length)
        return content;
    let start = Math.max(0, targetLine - contextLines);
    for (let i = targetLine - 1; i >= Math.max(0, targetLine - 30); i--) {
        const line = lines[i].trim();
        if (/^(export\s+)?(async\s+)?function\s/.test(line) ||
            /^(export\s+)?class\s/.test(line) ||
            /^(export\s+)?(const|let|var)\s+\w+\s*=\s*(async\s+)?\(/.test(line) ||
            /^\s*(public|private|protected)\s+(async\s+)?\w+\s*\(/.test(line)) {
            start = i;
            break;
        }
    }
    let end = Math.min(lines.length, targetLine + contextLines);
    let braceDepth = 0;
    let started = false;
    for (let i = start; i < lines.length && i < start + 100; i++) {
        const line = lines[i];
        braceDepth += (line.match(/\{/g) || []).length;
        braceDepth -= (line.match(/\}/g) || []).length;
        if (braceDepth > 0)
            started = true;
        if (started && braceDepth === 0) {
            end = i + 1;
            break;
        }
    }
    return lines.slice(start, end).join('\n');
}
//# sourceMappingURL=sanitizer.js.map