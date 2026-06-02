import { FileEntry, StyleMetrics, QualityMetrics, FocusDimension } from '../types';
interface DimensionScores {
    style: number;
    quality: number;
    security: number;
    performance: number;
}
export declare function analyzeStyle(content: string): StyleMetrics;
export declare function analyzeQuality(content: string): QualityMetrics;
export declare function analyzeAll(files: FileEntry[], dimensions: FocusDimension[]): DimensionScores;
export {};
//# sourceMappingURL=analyzer.d.ts.map