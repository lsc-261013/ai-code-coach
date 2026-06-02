"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAdapter = getAdapter;
function getAdapter(model) {
    switch (model) {
        case 'deepseek':
            return require('./deepseek').deepseekAdapter;
        case 'claude':
            return require('./claude').claudeAdapter;
        case 'kimi':
            return require('./kimi').kimiAdapter;
        default:
            throw new Error(`Unsupported model: ${model}`);
    }
}
//# sourceMappingURL=base.js.map