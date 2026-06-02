import { FileEntry, Issue, FocusDimension, ScopeLevel } from '../types';
interface ReviewOptions {
    model: string;
    dimensions: FocusDimension[];
    scope: ScopeLevel;
}
export declare function reviewFiles(files: FileEntry[], opts: ReviewOptions): Promise<Issue[]>;
export {};
//# sourceMappingURL=reviewer.d.ts.map