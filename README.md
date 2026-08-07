# Craftpick Code CLI

CLI de développement assisté par **Craftpick AI**.

## Modèles

- Gemma 4 31B
- GPT OSS 120B
- MiniMax M3

## Installation

Node.js 20+ est requis.

Installation directe :

```bash
curl -fsSL https://raw.githubusercontent.com/louisoff84/CraftpickCodeCLi/main/install.sh | bash
```

Puis :

```bash
craftpickcode
```

Le script installe Craftpick Code dans `~/.local/share/craftpick-code`, crée les commandes `craftpickcode` et `craftpick-code`, et ajoute `~/.local/bin` au `PATH` si nécessaire.

Depuis un clone du dépôt :

```bash
chmod +x install.sh
./install.sh
```

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
