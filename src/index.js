import process from 'node:process';
import path from 'node:path';
import readline from 'node:readline/promises';
import { c } from './colors.js';
import { CraftpickAIClient } from './client.js';
import { Agent } from './agent.js';
import { APP_NAME, MODELS, loadConfig, saveConfig, resolveModel } from './config.js';
import { printWelcome, printHelp, chooseModel, error } from './ui.js';

function parseArgs(argv) {
  const out = { positional: [], model: null, yolo: false, debug: false, help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-m' || arg === '--model') out.model = argv[++i];
    else if (arg === '-y' || arg === '--yolo' || arg === '--auto-approve') out.yolo = true;
    else if (arg === '--debug') out.debug = true;
    else if (arg === '-h' || arg === '--help') out.help = true;
    else if (arg === '-v' || arg === '--version') out.version = true;
    else out.positional.push(arg);
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));
const config = loadConfig();

if (args.help) {
  console.log(`${APP_NAME}\n\nUsage: craftpickcode [options] [prompt]\n\nOptions:\n  -m, --model <model>     gemma | gpt | minimax\n  -y, --yolo              auto-approuver les actions\n  -v, --version           version\n  -h, --help              aide`);
  process.exit(0);
}
if (args.version) {
  console.log('0.1.0');
  process.exit(0);
}

let model = resolveModel(args.model)?.id || config.model;
if (!MODELS.some(m => m.id === model)) model = MODELS[0].id;
let autoApprove = Boolean(args.yolo || config.autoApprove);
const root = path.resolve(process.cwd());
const client = new CraftpickAIClient({ debug: args.debug });
let activeRl = null;

async function approveAction(action) {
  if (autoApprove) return true;
  if (!process.stdin.isTTY) return false;

  let ownsRl = false;
  let rl = activeRl;
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    ownsRl = true;
  }

  try {
    const answer = (await rl.question(`${c.yellow('Autoriser')} ${action} ? ${c.gray('[y/N]')} `)).trim().toLowerCase();
    return ['y', 'yes', 'o', 'oui'].includes(answer);
  } finally {
    if (ownsRl) rl.close();
  }
}

const agent = new Agent({
  client,
  model,
  root,
  temperature: config.temperature,
  maxSteps: config.maxAgentSteps,
  approve: approveAction
});

async function handleSlash(input) {
  const [cmd, ...rest] = input.trim().split(/\s+/);
  const value = rest.join(' ');
  switch (cmd.toLowerCase()) {
    case '/help': printHelp(); return true;
    case '/clear': agent.clear(); console.log(c.gray('Contexte vidé.')); return true;
    case '/status':
      console.log(`\nProjet: ${root}\nModèle: ${model}\nAuto-approve: ${autoApprove ? 'on' : 'off'}\n`);
      return true;
    case '/model': {
      let selected = value ? resolveModel(value) : await chooseModel(model);
      if (!selected) { console.log(c.red('Modèle inconnu.')); return true; }
      model = selected.id;
      agent.setModel(model);
      config.model = model;
      saveConfig(config);
      console.log(c.green(`Modèle: ${selected.name}`));
      return true;
    }
    case '/auto': {
      const v = value.toLowerCase();
      if (!['on', 'off'].includes(v)) { console.log('Utilise /auto on ou /auto off'); return true; }
      autoApprove = v === 'on';
      config.autoApprove = autoApprove;
      saveConfig(config);
      console.log(`Auto-approve: ${autoApprove ? 'on' : 'off'}`);
      return true;
    }
    case '/exit': case '/quit': process.exit(0);
    default: return false;
  }
}

async function main() {
  if (args.positional.length) {
    try { await agent.run(args.positional.join(' ')); }
    catch (err) { error(err.message); process.exitCode = 1; }
    return;
  }

  printWelcome(model, root);
  const healthy = await client.health();
  if (!healthy) console.log(c.yellow('  Craftpick AI ne répond pas actuellement. Les commandes locales restent disponibles.\n'));

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  activeRl = rl;
  process.on('SIGINT', () => { console.log('\nAu revoir.'); process.exit(0); });

  while (true) {
    const input = (await rl.question(c.bold('› '))).trim();
    if (!input) continue;
    try {
      if (input.startsWith('/') && await handleSlash(input)) continue;
      await agent.run(input);
    } catch (err) {
      error(err.message);
    }
  }
}

main().catch(err => {
  error(err.message);
  process.exit(1);
});
