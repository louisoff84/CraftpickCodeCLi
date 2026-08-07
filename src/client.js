import { getAIEndpoint } from './config.js';

export class CraftpickAIClient {
  constructor({ debug = false } = {}) {
    this.baseUrl = getAIEndpoint().replace(/\/$/, '');
    this.debug = debug;
  }

  async chat({ model, messages, tools = [], stream = false, temperature = 0.2, signal }) {
    const body = {
      model,
      messages,
      stream,
      options: { temperature }
    };
    if (tools.length) body.tools = tools;

    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`Craftpick AI indisponible (${response.status})${this.debug && text ? `: ${text.slice(0, 500)}` : ''}`);
    }

    if (!stream) return response.json();
    return response.body;
  }

  async health() {
    try {
      const response = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000)
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}
