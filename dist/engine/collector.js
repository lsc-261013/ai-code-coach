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
exports.collectLocal = collectLocal;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const CODE_EXTENSIONS = {
    '.ts': 'typescript',
    '.tsx': 'typescript',
    '.js': 'javascript',
    '.jsx': 'javascript',
    '.py': 'python',
    '.go': 'go',
    '.rs': 'rust',
    '.java': 'java',
    '.cs': 'csharp',
    '.rb': 'ruby',
    '.php': 'php',
    '.vue': 'vue',
    '.svelte': 'svelte',
};
function readIgnorePatterns(rootDir) {
    const ignoreFile = path.join(rootDir, '.ai-coach-ignore');
    if (!fs.existsSync(ignoreFile))
        return [];
    return fs.readFileSync(ignoreFile, 'utf-8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l && !l.startsWith('#'));
}
function matchesIgnore(filePath, rootDir, patterns) {
    const relative = path.relative(rootDir, filePath).replace(/\\/g, '/');
    return patterns.some(pattern => {
        if (pattern.endsWith('/')) {
            return relative.startsWith(pattern);
        }
        return relative === pattern || relative.endsWith('/' + pattern);
    });
}
async function collectLocal(rootDir) {
    const patterns = readIgnorePatterns(rootDir);
    const files = [];
    function walk(dir) {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            if (entry.name.startsWith('.') && entry.name !== '.ai-coach-ignore')
                continue;
            if (entry.name === 'node_modules' || entry.name === 'dist')
                continue;
            if (matchesIgnore(fullPath, rootDir, patterns))
                continue;
            if (entry.isDirectory()) {
                walk(fullPath);
            }
            else if (entry.isFile()) {
                const ext = path.extname(entry.name).toLowerCase();
                if (CODE_EXTENSIONS[ext]) {
                    files.push({
                        path: path.relative(rootDir, fullPath),
                        content: fs.readFileSync(fullPath, 'utf-8'),
                        language: CODE_EXTENSIONS[ext],
                    });
                }
            }
        }
    }
    walk(rootDir);
    return files;
}
//# sourceMappingURL=collector.js.map