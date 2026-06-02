export interface ReviewRequest {
    codeSnippet: string;
    filename: string;
    dimensions: string[];
    scope: 'function' | 'file' | 'project';
}
export interface LlmReviewResponse {
    issues: Array<{
        severity: 'critical' | 'high' | 'medium' | 'low';
        dimension: string;
        title: string;
        line?: number;
        suggestion: string;
    }>;
}
export interface LlmAdapter {
    name: string;
    review(request: ReviewRequest): Promise<LlmReviewResponse>;
}
export declare function getAdapter(model: string): LlmAdapter;
//# sourceMappingURL=base.d.ts.map