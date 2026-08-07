#!/usr/bin/env bash
set -euo pipefail

APP="Craftpick Code"
REPO="https://github.com/louisoff84/CraftpickCodeCLi.git"
ARCHIVE="https://github.com/louisoff84/CraftpickCodeCLi/archive/refs/heads/main.tar.gz"
INSTALL_DIR="${CRAFTPICK_CODE_INSTALL_DIR:-$HOME/.local/share/craftpick-code}"
BIN_DIR="${CRAFTPICK_CODE_BIN_DIR:-$HOME/.local/bin}"

say() { printf '\033[1;36m%s\033[0m\n' "$*"; }
ok()  { printf '\033[1;32m%s\033[0m\n' "$*"; }
warn(){ printf '\033[1;33m%s\033[0m\n' "$*"; }
die() { printf '\033[1;31mErreur: %s\033[0m\n' "$*" >&2; exit 1; }
has() { command -v "$1" >/dev/null 2>&1; }

if [ "$(id -u)" -eq 0 ]; then
  SUDO=""
elif has sudo; then
  SUDO="sudo"
else
  SUDO=""
fi

install_system_deps() {
  local need_install=0
  for cmd in git curl tar; do
    has "$cmd" || need_install=1
  done
  has node || need_install=1
  has npm || need_install=1

  if [ "$need_install" -eq 0 ]; then
    return
  fi

  say "Installation des dépendances système..."

  if has apt-get; then
    if [ "$(id -u)" -ne 0 ] && [ -z "$SUDO" ]; then
      die "sudo est requis pour installer les dépendances système."
    fi
    $SUDO apt-get update -y
    $SUDO apt-get install -y ca-certificates curl git tar gnupg

    local node_major=0
    if has node; then
      node_major="$(node -p "Number(process.versions.node.split('.')[0])" 2>/dev/null || echo 0)"
    fi

    if ! has node || [ "$node_major" -lt 20 ]; then
      say "Installation de Node.js 22..."
      curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash -
      $SUDO apt-get install -y nodejs
    elif ! has npm; then
      $SUDO apt-get install -y npm
    fi

  elif has dnf; then
    [ "$(id -u)" -eq 0 ] || [ -n "$SUDO" ] || die "sudo est requis pour installer les dépendances système."
    $SUDO dnf install -y nodejs npm git curl tar

  elif has yum; then
    [ "$(id -u)" -eq 0 ] || [ -n "$SUDO" ] || die "sudo est requis pour installer les dépendances système."
    $SUDO yum install -y nodejs npm git curl tar

  elif has pacman; then
    [ "$(id -u)" -eq 0 ] || [ -n "$SUDO" ] || die "sudo est requis pour installer les dépendances système."
    $SUDO pacman -Sy --noconfirm nodejs npm git curl tar

  elif has apk; then
    [ "$(id -u)" -eq 0 ] || [ -n "$SUDO" ] || die "sudo est requis pour installer les dépendances système."
    $SUDO apk add --no-cache nodejs npm git curl tar

  else
    die "Gestionnaire de paquets non supporté. Installe Node.js 20+, npm, git, curl et tar."
  fi
}

install_system_deps

has node || die "Node.js n'a pas pu être installé."
has npm || die "npm n'a pas pu être installé."

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

say "Installation des dépendances Node.js..."
if [ -f "$INSTALL_DIR/package-lock.json" ]; then
  npm --prefix "$INSTALL_DIR" ci --omit=dev --no-audit --no-fund
else
  npm --prefix "$INSTALL_DIR" install --omit=dev --no-audit --no-fund
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
