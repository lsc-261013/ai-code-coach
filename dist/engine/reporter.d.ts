import { CoachReport, Issue, FocusDimension, HistoryPoint } from '../types';
interface ReportInput {
    projectName: string;
    source: string;
    model: string;
    staticScores: {
        style: number;
        quality: number;
        security: number;
        performance: number;
    };
    llmIssues: Issue[];
    dimensions: FocusDimension[];
    reportsDir: string;
}
export declare function generateReport(input: ReportInput): CoachReport;
export declare function loadHistory(reportsDir: string, projectName: string): HistoryPoint[];
export declare function saveReport(report: CoachReport, reportsDir: string): string;
export declare function saveHtmlReport(report: CoachReport, reportsDir: string): string;
export declare function generateTerminalSummary(report: CoachReport): string;
export {};
//# sourceMappingURL=reporter.d.ts.map