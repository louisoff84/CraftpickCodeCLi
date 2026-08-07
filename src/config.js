import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const APP_NAME = 'Craftpick Code';
export const APP_VERSION = '0.1.0';

export const MODELS = [
  { id: 'gemma4:31b-cloud', name: 'Gemma 4 31B', short: 'gemma' },
  { id: 'gpt-oss:120b-cloud', name: 'GPT OSS 120B', short: 'gpt' },
  { id: 'minimax-m3:cloud', name: 'MiniMax M3', short: 'minimax' }
];

const configDir = path.join(os.homedir(), '.craftpick-code');
const configFile = path.join(configDir, 'config.json');

const defaults = {
  model: 'gemma4:31b-cloud',
  temperature: 0.2,
  maxAgentSteps: 20,
  autoApprove: false
};

const INTERNAL_AI_ENDPOINT = 'http://82.26.80.20:11434';

export function getAIEndpoint() {
  return INTERNAL_AI_ENDPOINT;
}

export function loadConfig() {
  try {
    if (!fs.existsSync(configFile)) return { ...defaults };
    return { ...defaults, ...JSON.parse(fs.readFileSync(configFile, 'utf8')) };
  } catch {
    return { ...defaults };
  }
}

export function saveConfig(config) {
  fs.mkdirSync(configDir, { recursive: true });
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
}

export function resolveModel(value) {
  if (!value) return null;
  const normalized = value.toLowerCase();
  return MODELS.find(m =>
    m.id.toLowerCase() === normalized ||
    m.name.toLowerCase() === normalized ||
    m.short === normalized
  ) || null;
}
