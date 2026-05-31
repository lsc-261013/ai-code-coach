// src/scheduler.ts
import { execSync } from 'child_process';
import * as os from 'os';
import * as path from 'path';
import { CoachConfig } from './types';

export async function setupSchedule(config: CoachConfig): Promise<void> {
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
    try { execSync(`schtasks /delete /tn "${taskName}" /f`, { stdio: 'ignore' }); } catch { /* ok */ }

    const scheduleMap: Record<string, string> = {
      daily: 'DAILY',
      weekly: 'WEEKLY',
    };

    const scheduleType = scheduleMap[config.schedule || 'daily'];
    execSync(
      `schtasks /create /tn "${taskName}" /tr "${command}" /sc ${scheduleType} /f`,
      { stdio: 'pipe' }
    );

    console.log(`Task created: ${taskName}`);
    console.log(`View in Task Scheduler or run: schtasks /query /tn "${taskName}"`);
  } else {
    // Linux/macOS crontab
    const cronTime = config.schedule === 'weekly' ? '0 9 * * 1' : '0 9 * * *'; // 9am
    const cronEntry = `${cronTime} cd ${absPath} && ${command} >> ${absPath}/reports/ai-coach.log 2>&1`;

    // Read existing crontab
    let existing = '';
    try { existing = execSync('crontab -l', { encoding: 'utf-8' }); } catch { /* no crontab */ }

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
    execSync(`crontab "${tmpFile}"`, { stdio: 'pipe' });
    require('fs').unlinkSync(tmpFile);

    console.log(`Cron entry added: ${cronEntry}`);
    console.log('View/edit with: crontab -e');
  }
}
