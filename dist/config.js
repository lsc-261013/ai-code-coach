"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildConfig = buildConfig;
const ALL_DIMENSIONS = ['style', 'quality', 'security', 'performance'];
const VALID_MODELS = ['deepseek', 'claude', 'kimi', 'qwen'];
const VALID_SCOPES = ['function', 'file', 'project'];
function buildConfig(opts) {
    const focus = opts.focus
        ? opts.focus.split(',').map((f) => f.trim())
        : [...ALL_DIMENSIONS];
    const model = opts.model && VALID_MODELS.includes(opts.model)
        ? opts.model
        : 'deepseek';
    const scope = opts.scope && VALID_SCOPES.includes(opts.scope)
        ? opts.scope
        : 'function';
    const sanitize = opts.noSanitize ? false : true;
    let outputMode = 'full';
    if (opts.jsonOnly)
        outputMode = 'json-only';
    else if (opts.noWeb)
        outputMode = 'terminal-only';
    let source = 'local';
    if (opts.repo && opts.projectPath)
        source = 'both';
    else if (opts.repo && !opts.projectPath)
        source = 'github';
    let schedule;
    if (opts.schedule === 'daily' || opts.schedule === 'weekly') {
        schedule = opts.schedule;
    }
    return {
        projectPath: opts.projectPath || '.',
        repoName: opts.repo,
        source,
        focus,
        model,
        scope,
        sanitize,
        outputMode,
        schedule,
        trendOnly: opts.trendOnly || false,
    };
}
//# sourceMappingURL=config.js.map