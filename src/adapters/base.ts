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

export function getAdapter(model: string): LlmAdapter {
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
