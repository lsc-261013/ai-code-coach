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
exports.setupSchedule = setupSchedule;
// src/scheduler.ts
const child_process_1 = require("child_process");
const os = __importStar(require("os"));
const path = __importStar(require("path"));
async function setupSchedule(config) {
    const platform = os.platform();
    const absPath = path.resolve(config.projectPath);
    // Build the full command to execute
    // Find node and the dist/index.js
    const nodeCmd = process.execPath;
    const scriptPath = path.join(__dirname, 'index.js');
    const command = `"${nodeCmd}" "${scriptPath}" "${absPath}" --model ${config.model}`;
    if (platform === 'win32') {
        // Windows Task Scheduler
        const taskName = `ai-coach-${config.schedule}-${path.basename(absPath)}`
            .replace(/[^a-zA-Z0-9_-]/g, '_');
        // Remove existing task with same name
        try {
            (0, child_process_1.execSync)(`schtasks /delete /tn "${taskName}" /f`, { stdio: 'ignore' });
        }
        catch { /* ok */ }
        const scheduleMap = {
            daily: 'DAILY',
            weekly: 'WEEKLY',
        };
        const scheduleType = scheduleMap[config.schedule || 'daily'];
        (0, child_process_1.execSync)(`schtasks /create /tn "${taskName}" /tr "${command}" /sc ${scheduleType} /f`, { stdio: 'pipe' });
        console.log(`Task created: ${taskName}`);
        console.log(`View in Task Scheduler or run: schtasks /query /tn "${taskName}"`);
    }
    else {
        // Linux/macOS crontab
        const cronTime = config.schedule === 'weekly' ? '0 9 * * 1' : '0 9 * * *'; // 9am
        const cronEntry = `${cronTime} cd ${absPath} && ${command} >> ${absPath}/reports/ai-coach.log 2>&1`;
        // Read existing crontab
        let existing = '';
        try {
            existing = (0, child_process_1.execSync)('crontab -l', { encoding: 'utf-8' });
        }
        catch { /* no crontab */ }
        // Remove any existing ai-coach entries
        const filtered = existing.split('\n')
            .filter(line => !line.includes('ai-coach'))
            .filter(line => line.trim().length > 0)
            .join('\n');
        const newCron = (filtered ? filtered + '\n' : '') + cronEntry + '\n';
        // Write new crontab
        const escaped = newCron.replace(/"/g, '\\"');
        // Use a temp file to avoid shell escaping issues
        const tmpFile = path.join(os.tmpdir(), 'ai-coach-crontab.tmp');
        require('fs').writeFileSync(tmpFile, newCron, 'utf-8');
        (0, child_process_1.execSync)(`crontab "${tmpFile}"`, { stdio: 'pipe' });
        require('fs').unlinkSync(tmpFile);
        console.log(`Cron entry added: ${cronEntry}`);
        console.log('View/edit with: crontab -e');
    }
}
//# sourceMappingURL=scheduler.js.map