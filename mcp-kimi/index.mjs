import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const API_KEY  = process.env.MOONSHOT_API_KEY;
const BASE_URL = process.env.MOONSHOT_API_BASE ?? 'https://api.moonshot.cn/v1';

if (!API_KEY) {
  console.error('MOONSHOT_API_KEY environment variable is required');
  process.exit(1);
}

const server = new McpServer({
  name: 'kimi',
  version: '1.0.0',
});

server.tool(
  'call_kimi',
  'Send a prompt to Kimi (Moonshot AI K2) and get a response. Useful for a second opinion, long-context tasks, or leveraging Kimi\'s strengths.',
  {
    prompt:        z.string().describe('The prompt / question to send to Kimi'),
    model:         z.string().optional().default('kimi-k2-0711-preview').describe('Model ID (default: kimi-k2-0711-preview)'),
    system_prompt: z.string().optional().describe('Optional system prompt'),
    temperature:   z.number().min(0).max(1).optional().describe('Sampling temperature 0–1 (default: 0.6)'),
    max_tokens:    z.number().int().positive().optional().describe('Max tokens in response (default: 8192)'),
  },
  async ({ prompt, model, system_prompt, temperature, max_tokens }) => {
    const messages = [];
    if (system_prompt) messages.push({ role: 'system', content: system_prompt });
    messages.push({ role: 'user', content: prompt });

    const body = {
      model:       model ?? 'kimi-k2-0711-preview',
      messages,
      temperature: temperature ?? 0.6,
      max_tokens:  max_tokens  ?? 8192,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);

    try {
      const res = await fetch(`${BASE_URL}/chat/completions`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${API_KEY}`,
        },
        body:   JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        const text = await res.text().catch(() => '(no body)');
        return {
          isError: true,
          content: [{ type: 'text', text: `Kimi API error ${res.status}: ${text}` }],
        };
      }

      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content ?? JSON.stringify(data);

      return {
        content: [{ type: 'text', text: reply }],
      };
    } catch (err) {
      clearTimeout(timeout);
      const msg = err.name === 'AbortError'
        ? 'Request timed out after 120 seconds'
        : `Fetch error: ${err.message}`;
      return {
        isError: true,
        content: [{ type: 'text', text: msg }],
      };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
