# Craftpick Code CLI

CLI de développement assisté par **Craftpick AI**.

## Modèles

- Gemma 4 31B
- GPT OSS 120B
- MiniMax M3

## Prérequis

- Node.js 20+
- Une passerelle Craftpick Code configurée via `CRAFTPICK_CODE_ENDPOINT`

L'adresse interne de la passerelle n'est volontairement pas stockée dans le dépôt.

## Installation

```bash
chmod +x install.sh
./install.sh
```

Ou manuellement :

```bash
npm install
npm link
```

Configure ensuite l'endpoint côté machine, sans le committer :

```bash
export CRAFTPICK_CODE_ENDPOINT="https://ton-endpoint-prive"
craftpickcode
```

Tu peux placer l'export dans ton profil shell (`~/.bashrc`, `~/.zshrc`) sur les machines autorisées.

## Utilisation

Dans un projet :

```bash
cd mon-projet
craftpickcode
```

Ou en une commande :

```bash
craftpickcode "analyse ce projet et corrige les erreurs"
craftpickcode -m gpt "ajoute une page de login"
```

### Commandes

- `/help`
- `/model`
- `/model gemma`
- `/model gpt`
- `/model minimax`
- `/clear`
- `/status`
- `/auto on`
- `/auto off`
- `/exit`

## Outils de l'agent

Craftpick Code peut :

- lister les fichiers ;
- lire le code ;
- rechercher dans le projet ;
- créer et modifier des fichiers ;
- créer des dossiers ;
- lancer des commandes de build/test/lint ;
- conserver le contexte de la session.

Par défaut, les écritures de fichiers et commandes shell demandent une confirmation. `--yolo` ou `/auto on` active l'approbation automatique.

## Sécurité

Ne committe jamais l'endpoint privé dans GitHub. `.env` est ignoré par Git et seule une valeur d'exemple est fournie dans `.env.example`.
