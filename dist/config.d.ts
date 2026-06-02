import { CoachConfig } from './types';
interface CliOpts {
    projectPath?: string;
    repo?: string;
    focus?: string;
    model?: string;
    scope?: string;
    sanitize?: boolean;
    noSanitize?: boolean;
    noWeb?: boolean;
    jsonOnly?: boolean;
    schedule?: string;
    trendOnly?: boolean;
}
export declare function buildConfig(opts: CliOpts): CoachConfig;
export {};
//# sourceMappingURL=config.d.ts.map