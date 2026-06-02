"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeAdapter = void 0;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
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
exports.claudeAdapter = {
    name: 'claude',
    async review(request) {
        const client = new sdk_1.default({
            apiKey: process.env.CLAUDE_API_KEY || '',
        });
        const dimensions = request.dimensions.join(', ');
        const userMessage = `Review this code file "${request.filename}" focusing on: ${dimensions}.

Code:
\`\`\`
${request.codeSnippet}
\`\`\`

Find issues. Remember: output ONLY JSON.`;
        const response = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: userMessage }],
        });
        const content = response.content[0]?.text || '{"issues":[]}';
        const json = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        try {
            const parsed = JSON.parse(json);
            return { issues: parsed.issues || [] };
        }
        catch {
            return { issues: [] };
        }
    },
};
//# sourceMappingURL=claude.js.map