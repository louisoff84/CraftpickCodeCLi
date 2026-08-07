#!/usr/bin/env bash
set -euo pipefail

APP="Craftpick Code"
REPO="https://github.com/louisoff84/CraftpickCodeCLi.git"
ARCHIVE="https://github.com/louisoff84/CraftpickCodeCLi/archive/refs/heads/main.tar.gz"
INSTALL_DIR="${CRAFTPICK_CODE_INSTALL_DIR:-$HOME/.local/share/craftpick-code}"
BIN_DIR="${CRAFTPICK_CODE_BIN_DIR:-$HOME/.local/bin}"

say() { printf '\033[1;36m%s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m%s\033[0m\n' "$*"; }
die() { printf '\033[1;31mErreur: %s\033[0m\n' "$*" >&2; exit 1; }
has() { command -v "$1" >/dev/null 2>&1; }

has node || die "Node.js 20+ est requis."
NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
[ "$NODE_MAJOR" -ge 20 ] || die "Node.js 20+ est requis. Version actuelle: $(node -v)"

say "Installation de $APP..."
mkdir -p "$(dirname "$INSTALL_DIR")" "$BIN_DIR"

if has git; then
  if [ -d "$INSTALL_DIR/.git" ]; then
    say "Mise à jour de $APP..."
    git -C "$INSTALL_DIR" fetch --quiet origin main
    git -C "$INSTALL_DIR" reset --quiet --hard origin/main
  else
    rm -rf "$INSTALL_DIR"
    git clone --quiet --depth 1 --branch main "$REPO" "$INSTALL_DIR"
  fi
else
  has curl || die "git ou curl est requis."
  TMP="$(mktemp -d)"
  trap 'rm -rf "$TMP"' EXIT
  curl -fsSL "$ARCHIVE" -o "$TMP/app.tar.gz"
  rm -rf "$INSTALL_DIR"
  mkdir -p "$INSTALL_DIR"
  tar -xzf "$TMP/app.tar.gz" --strip-components=1 -C "$INSTALL_DIR"
fi

chmod +x "$INSTALL_DIR/bin/craftpickcode.js"
ln -sfn "$INSTALL_DIR/bin/craftpickcode.js" "$BIN_DIR/craftpickcode"
ln -sfn "$INSTALL_DIR/bin/craftpickcode.js" "$BIN_DIR/craftpick-code"

case ":$PATH:" in
  *":$BIN_DIR:"*) ;;
  *)
    case "${SHELL:-}" in
      */zsh) RC="$HOME/.zshrc" ;;
      */bash) RC="$HOME/.bashrc" ;;
      *) RC="$HOME/.profile" ;;
    esac
    LINE="export PATH=\"$BIN_DIR:\$PATH\""
    if [ ! -f "$RC" ] || ! grep -Fq "$LINE" "$RC"; then
      printf '\n# Craftpick Code\n%s\n' "$LINE" >> "$RC"
    fi
    export PATH="$BIN_DIR:$PATH"
    ;;
esac

if [ -f "$INSTALL_DIR/test/smoke.mjs" ]; then
  node "$INSTALL_DIR/test/smoke.mjs" >/dev/null
fi

ok "$APP est installé."
printf 'Commande: craftpickcode\n'
