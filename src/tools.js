import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const IGNORE_NAMES = new Set([
  '.git', 'node_modules', '.next', 'dist', 'build', '.cache', '.idea', '.vscode',
  'vendor', 'coverage', '.gradle', 'target', '__pycache__'
]);

function safePath(root, requested = '.') {
  const target = path.resolve(root, requested);
  const normalizedRoot = path.resolve(root) + path.sep;
  if (target !== path.resolve(root) && !target.startsWith(normalizedRoot)) {
    throw new Error('Chemin refusé: accès hors du projet.');
  }
  return target;
}

function relative(root, target) {
  return path.relative(root, target).replaceAll('\\', '/') || '.';
}

async function walk(root, current, maxDepth, depth = 0, out = []) {
  if (depth > maxDepth) return out;
  const entries = await fs.readdir(current, { withFileTypes: true });
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    if (IGNORE_NAMES.has(entry.name)) continue;
    const full = path.join(current, entry.name);
    out.push({ path: relative(root, full), type: entry.isDirectory() ? 'dir' : 'file' });
    if (entry.isDirectory()) await walk(root, full, maxDepth, depth + 1, out);
    if (out.length >= 1500) break;
  }
  return out;
}

export const toolSchemas = [
  {
    type: 'function',
    function: {
      name: 'list_files',
      description: 'Liste les fichiers et dossiers du projet. Utilise ceci pour comprendre la structure avant de modifier le code.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string', description: 'Dossier relatif, par défaut .' },
          depth: { type: 'integer', minimum: 0, maximum: 6, description: 'Profondeur maximale' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'read_file',
      description: 'Lit un fichier texte du projet.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          start_line: { type: 'integer', minimum: 1 },
          end_line: { type: 'integer', minimum: 1 }
        },
        required: ['path']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'write_file',
      description: 'Crée ou remplace entièrement un fichier texte dans le projet.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          content: { type: 'string' }
        },
        required: ['path', 'content']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'replace_in_file',
      description: 'Remplace une occurrence exacte dans un fichier. Préférable à write_file pour une petite modification.',
      parameters: {
        type: 'object',
        properties: {
          path: { type: 'string' },
          search: { type: 'string' },
          replace: { type: 'string' },
          all: { type: 'boolean' }
        },
        required: ['path', 'search', 'replace']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'grep_project',
      description: 'Recherche du texte dans les fichiers du projet.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string' },
          path: { type: 'string' },
          max_results: { type: 'integer', minimum: 1, maximum: 200 }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'run_command',
      description: 'Exécute une commande shell dans le projet pour installer, tester, compiler, lancer un linter ou inspecter Git.',
      parameters: {
        type: 'object',
        properties: {
          command: { type: 'string' },
          timeout_ms: { type: 'integer', minimum: 1000, maximum: 120000 }
        },
        required: ['command']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'make_directory',
      description: 'Crée un dossier dans le projet.',
      parameters: {
        type: 'object',
        properties: { path: { type: 'string' } },
        required: ['path']
      }
    }
  }
];

function isProbablyBinary(buffer) {
  const sample = buffer.subarray(0, Math.min(buffer.length, 8000));
  let suspicious = 0;
  for (const byte of sample) {
    if (byte === 0) return true;
    if (byte < 7 || (byte > 13 && byte < 32)) suspicious++;
  }
  return sample.length > 0 && suspicious / sample.length > 0.15;
}

async function grepFile(file, query, root, results, maxResults) {
  if (results.length >= maxResults) return;
  let buffer;
  try {
    buffer = await fs.readFile(file);
  } catch { return; }
  if (buffer.length > 2_000_000 || isProbablyBinary(buffer)) return;
  const lines = buffer.toString('utf8').split(/\r?\n/);
  const q = query.toLowerCase();
  for (let i = 0; i < lines.length && results.length < maxResults; i++) {
    if (lines[i].toLowerCase().includes(q)) {
      results.push(`${relative(root, file)}:${i + 1}: ${lines[i].trim().slice(0, 300)}`);
    }
  }
}

async function grepWalk(root, current, query, results, maxResults) {
  const entries = await fs.readdir(current, { withFileTypes: true }).catch(() => []);
  for (const entry of entries) {
    if (results.length >= maxResults) return;
    if (IGNORE_NAMES.has(entry.name)) continue;
    const full = path.join(current, entry.name);
    if (entry.isDirectory()) await grepWalk(root, full, query, results, maxResults);
    else await grepFile(full, query, root, results, maxResults);
  }
}

function runShell(command, cwd, timeoutMs) {
  return new Promise(resolve => {
    const isWin = process.platform === 'win32';
    const shell = isWin ? 'cmd.exe' : '/bin/bash';
    const args = isWin ? ['/d', '/s', '/c', command] : ['-lc', command];
    const child = spawn(shell, args, { cwd, env: process.env });
    let stdout = '';
    let stderr = '';
    const max = 60_000;
    const append = (target, chunk) => (target + chunk.toString()).slice(-max);
    child.stdout.on('data', d => { stdout = append(stdout, d); });
    child.stderr.on('data', d => { stderr = append(stderr, d); });
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr });
    });
    child.on('error', err => {
      clearTimeout(timer);
      resolve({ code: -1, signal: null, stdout, stderr: `${stderr}\n${err.message}` });
    });
  });
}

export async function executeTool(name, args, ctx) {
  const { root, approve = async () => true } = ctx;

  switch (name) {
    case 'list_files': {
      const base = safePath(root, args.path || '.');
      const stat = await fs.stat(base);
      if (!stat.isDirectory()) throw new Error('Le chemin demandé n’est pas un dossier.');
      const items = await walk(root, base, Math.min(args.depth ?? 3, 6));
      return items.map(i => `${i.type === 'dir' ? 'DIR ' : 'FILE'} ${i.path}`).join('\n') || '(dossier vide)';
    }

    case 'read_file': {
      const file = safePath(root, args.path);
      const buffer = await fs.readFile(file);
      if (isProbablyBinary(buffer)) throw new Error('Fichier binaire non lisible comme texte.');
      const lines = buffer.toString('utf8').split(/\r?\n/);
      const start = Math.max(1, args.start_line || 1);
      const end = Math.min(lines.length, args.end_line || Math.min(lines.length, start + 499));
      return lines.slice(start - 1, end).map((line, i) => `${start + i}| ${line}`).join('\n');
    }

    case 'write_file': {
      const file = safePath(root, args.path);
      if (!(await approve(`écrire ${relative(root, file)}`))) return 'REFUSÉ PAR UTILISATEUR';
      await fs.mkdir(path.dirname(file), { recursive: true });
      await fs.writeFile(file, args.content, 'utf8');
      return `OK: ${relative(root, file)} (${Buffer.byteLength(args.content)} octets)`;
    }

    case 'replace_in_file': {
      const file = safePath(root, args.path);
      if (!(await approve(`modifier ${relative(root, file)}`))) return 'REFUSÉ PAR UTILISATEUR';
      const original = await fs.readFile(file, 'utf8');
      if (!original.includes(args.search)) throw new Error('Texte exact introuvable dans le fichier.');
      const updated = args.all ? original.split(args.search).join(args.replace) : original.replace(args.search, args.replace);
      await fs.writeFile(file, updated, 'utf8');
      return `OK: ${relative(root, file)}`;
    }

    case 'grep_project': {
      const base = safePath(root, args.path || '.');
      const results = [];
      const max = Math.min(args.max_results || 80, 200);
      if (fsSync.statSync(base).isDirectory()) await grepWalk(root, base, args.query, results, max);
      else await grepFile(base, args.query, root, results, max);
      return results.join('\n') || '(aucun résultat)';
    }

    case 'run_command': {
      if (!(await approve(`exécuter: ${args.command}`))) return 'REFUSÉ PAR UTILISATEUR';
      const result = await runShell(args.command, root, Math.min(args.timeout_ms || 60_000, 120_000));
      return `exit=${result.code}${result.signal ? ` signal=${result.signal}` : ''}\nSTDOUT:\n${result.stdout || '(vide)'}\nSTDERR:\n${result.stderr || '(vide)'}`;
    }

    case 'make_directory': {
      const dir = safePath(root, args.path);
      if (!(await approve(`créer le dossier ${relative(root, dir)}`))) return 'REFUSÉ PAR UTILISATEUR';
      await fs.mkdir(dir, { recursive: true });
      return `OK: ${relative(root, dir)}`;
    }

    default:
      throw new Error(`Outil inconnu: ${name}`);
  }
}
