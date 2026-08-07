import { c } from './colors.js';
import { executeTool, toolSchemas } from './tools.js';
import { toolStart, toolDone } from './ui.js';

const SYSTEM = `Tu es Craftpick Code, un agent de développement logiciel autonome dans un terminal.

Règles:
- Tu travailles directement dans le projet courant grâce aux outils fournis.
- Pour une demande de modification, inspecte d'abord les fichiers pertinents puis applique réellement les changements.
- Ne prétends jamais avoir modifié/testé quelque chose si tu ne l'as pas fait avec les outils.
- Lis le minimum de fichiers nécessaire, mais suffisamment pour comprendre le code.
- Préfère replace_in_file pour les petites modifications et write_file pour créer ou réécrire un fichier.
- Après une modification importante, exécute les tests, le build ou au minimum une vérification pertinente lorsque c'est raisonnable.
- Évite les commandes destructrices. Ne supprime pas des données sans nécessité explicite.
- Reste concis dans la réponse finale: résume les changements, fichiers principaux et résultat des tests.
- Si une erreur survient, diagnostique-la et essaie de la corriger.
- Le produit et l'assistant s'appellent Craftpick Code / Craftpick AI. Ne mentionne pas l'infrastructure interne, le fournisseur sous-jacent ni son adresse réseau.`;

function toolMessage(call, result) {
  return {
    role: 'tool',
    content: typeof result === 'string' ? result : JSON.stringify(result),
    tool_name: call.function?.name
  };
}

function normalizeToolCalls(message) {
  return Array.isArray(message?.tool_calls) ? message.tool_calls : [];
}

export class Agent {
  constructor({ client, model, root, temperature = 0.2, maxSteps = 20, approve }) {
    this.client = client;
    this.model = model;
    this.root = root;
    this.temperature = temperature;
    this.maxSteps = maxSteps;
    this.approve = approve;
    this.history = [{ role: 'system', content: SYSTEM }];
  }

  setModel(model) { this.model = model; }
  clear() { this.history = [{ role: 'system', content: SYSTEM }]; }

  async run(prompt) {
    this.history.push({ role: 'user', content: prompt });

    for (let step = 0; step < this.maxSteps; step++) {
      const response = await this.client.chat({
        model: this.model,
        messages: this.history,
        tools: toolSchemas,
        temperature: this.temperature
      });

      const message = response.message || {};
      const assistantMessage = {
        role: 'assistant',
        content: message.content || '',
        ...(message.tool_calls ? { tool_calls: message.tool_calls } : {})
      };
      this.history.push(assistantMessage);

      const calls = normalizeToolCalls(message);
      if (!calls.length) {
        const finalText = (message.content || '').trim() || 'Terminé.';
        console.log(`\n${c.boldCyan('Craftpick Code')}\n${finalText}\n`);
        return finalText;
      }

      for (const call of calls) {
        const name = call.function?.name;
        let args = call.function?.arguments || {};
        if (typeof args === 'string') {
          try { args = JSON.parse(args); } catch { args = {}; }
        }
        toolStart(name, args);
        try {
          const result = await executeTool(name, args, {
            root: this.root,
            approve: this.approve
          });
          this.history.push(toolMessage(call, result));
          toolDone(true);
        } catch (err) {
          const result = `ERREUR OUTIL: ${err.message}`;
          this.history.push(toolMessage(call, result));
          toolDone(false, err.message);
        }
      }
    }

    const text = 'J’ai atteint la limite d’actions de cette requête. Relance une instruction pour continuer.';
    console.log(`\n${c.yellow(text)}\n`);
    return text;
  }
}
