import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Agent } from '../src/agent.js';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'craftpick-code-test-'));
let n = 0;
const fakeClient = {
  async chat() {
    n++;
    if (n === 1) {
      return { message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'write_file', arguments: { path: 'hello.txt', content: 'bonjour' } } }] } };
    }
    if (n === 2) {
      return { message: { role: 'assistant', content: '', tool_calls: [{ function: { name: 'read_file', arguments: '{"path":"hello.txt"}' } }] } };
    }
    return { message: { role: 'assistant', content: 'Fichier créé et vérifié.' } };
  }
};

const agent = new Agent({ client: fakeClient, model: 'test', root, approve: async () => true });
await agent.run('crée hello.txt');
const content = await fs.readFile(path.join(root, 'hello.txt'), 'utf8');
if (content !== 'bonjour') throw new Error('write_file failed');
console.log('smoke_test=ok');
