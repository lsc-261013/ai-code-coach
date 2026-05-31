import OpenAI from 'openai';
import { LlmAdapter, ReviewRequest, LlmReviewResponse } from './base';

const SYSTEM_PROMPT = `You are an expert code reviewer. Analyze the code snippet and return a JSON response with discovered issues.

Dimensions to check: security, quality, performance, style.

Return ONLY valid JSON, no markdown, no explanation:
{
  "issues": [
    {
      "severity": "critical|high|medium|low",
      "dimension": "security|quality|performance|style",
      "title": "short issue title",
      "line": null,
      "suggestion": "specific fix recommendation in Chinese"
    }
  ]
}

If no issues found, return { "issues": [] }.
Focus on real, actionable problems. Do not flag trivial or stylistic preferences.`;

export const kimiAdapter: LlmAdapter = {
  name: 'kimi',

  async review(request: ReviewRequest): Promise<LlmReviewResponse> {
    const client = new OpenAI({
      apiKey: process.env.KIMI_API_KEY || '',
      baseURL: 'https://api.moonshot.cn/v1',
    });

    const dimensions = request.dimensions.join(', ');
    const userMessage = `Review this code file "${request.filename}" focusing on: ${dimensions}.

Code:
\`\`\`
${request.codeSnippet}
\`\`\`

Find issues. Remember: output ONLY JSON.`;

    const response = await client.chat.completions.create({
      model: 'moonshot-v1-32k',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 4096,
      temperature: 0.1,
    });

    const content = response.choices[0]?.message?.content || '{"issues":[]}';
    const json = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    try {
      const parsed = JSON.parse(json);
      return { issues: parsed.issues || [] };
    } catch {
      return { issues: [] };
    }
  },
};
