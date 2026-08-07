import readline from 'node:readline/promises';
import process from 'node:process';
import { c } from './colors.js';
import { APP_NAME, APP_VERSION, MODELS } from './config.js';

export function logo() {
  return `${c.boldCyan('CRAFTPICK')} ${c.boldMagenta('CODE')} ${c.gray(`v${APP_VERSION}`)}`;
}

export function printWelcome(model, cwd) {
  console.log();
  console.log(`  ${logo()}`);
  console.log(c.gray('  Agent de développement IA pour ton terminal'));
  console.log();
  console.log(`  ${c.gray('Projet')}  ${cwd}`);
  console.log(`  ${c.gray('Modèle')}  ${model}`);
  console.log(`  ${c.gray('Aide')}    /help`);
  console.log();
}

export function printHelp() {
  console.log(`\n${c.bold('Commandes Craftpick Code')}`);
  console.log(`  ${c.cyan('/help')}               afficher l’aide`);
  console.log(`  ${c.cyan('/model')}              choisir un modèle`);
  console.log(`  ${c.cyan('/model <nom>')}        gemma | gpt | minimax`);
  console.log(`  ${c.cyan('/clear')}              vider le contexte de conversation`);
  console.log(`  ${c.cyan('/status')}             afficher le projet et le modèle`);
  console.log(`  ${c.cyan('/auto on|off')}        auto-approuver les actions fichiers/commandes`);
  console.log(`  ${c.cyan('/exit')}               quitter\n`);
}

export async function chooseModel(current) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  try {
    console.log();
    MODELS.forEach((m, i) => console.log(`  ${c.cyan(String(i + 1))}. ${m.name}${m.id === current ? c.gray(' (actuel)') : ''}`));
    const answer = (await rl.question('\nChoix: ')).trim();
    const idx = Number(answer) - 1;
    return MODELS[idx] || null;
  } finally {
    rl.close();
  }
}

export function toolStart(name, args) {
  const details = name === 'run_command' ? args.command : args.path || args.query || '';
  console.log(c.gray(`  ↳ ${name}${details ? ` · ${String(details).slice(0, 120)}` : ''}`));
}

export function toolDone(ok, text = '') {
  if (!ok) console.log(c.red(`    erreur: ${text}`));
}

export function error(message) {
  console.error(`\n${c.red('Erreur:')} ${message}\n`);
}
