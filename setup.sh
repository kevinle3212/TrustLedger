#!/usr/bin/env bash
#
# setup.sh — TrustLedger one-shot development environment bootstrapper.
# =============================================================================
#
# WHAT THIS DOES
#   Interactively detects, verifies, and (with your consent) installs every
#   toolchain TrustLedger needs, then installs project dependencies and runs a
#   smoke check. It is safe to re-run at any time (idempotent): anything already
#   present and correct is skipped.
#
# SUPPORTED PLATFORMS
#   • macOS            (Intel + Apple Silicon)        — fully supported
#   • Linux            (Debian/Ubuntu, Fedora, Arch)  — fully supported
#   • Windows          via WSL2 (recommended) or Git Bash/MSYS2 (partial)
#   • Other UNIX-likes (best effort; manual steps reported at the end)
#
# USAGE
#   bash setup.sh                 # interactive (asks before each install)
#   bash setup.sh --yes           # assume "yes" to every install prompt
#   bash setup.sh --non-interactive   # never prompt; only verify + report
#   bash setup.sh --skip-install      # verify tools + report, install nothing
#   bash setup.sh --no-color          # disable ANSI colors (CI/log files)
#   bash setup.sh --help              # show this help
#
# EXIT CODES
#   0  everything required is present (installs may have happened)
#   1  one or more REQUIRED steps failed — see the failure report at the end
#
# DESIGN
#   Every check is its own function. Failures never abort the script; they are
#   recorded with a human-readable fix and surfaced together at the end so you
#   get the full picture in one run instead of fixing one error at a time.
# =============================================================================

# `set -u` (error on unset vars) + a clean pipefail. We deliberately do NOT use
# `set -e`: we want to keep going after a failed step and report everything.
set -uo pipefail

# -----------------------------------------------------------------------------
# Configuration — required tool versions (single source of truth).
# -----------------------------------------------------------------------------
readonly REQUIRED_NODE_MAJOR=22          # package.json engines.node = ">=22.0.0"
readonly REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# -----------------------------------------------------------------------------
# Global state — populated as the script runs, printed in the final report.
# -----------------------------------------------------------------------------
FAILURES=()        # required steps that failed: "title :: how to fix"
WARNINGS=()        # optional steps that were skipped/failed (non-fatal)
MANUAL_STEPS=()    # things the user MUST do by hand afterward
ASSUME_YES=0
INTERACTIVE=1
SKIP_INSTALL=0
USE_COLOR=1

# -----------------------------------------------------------------------------
# Pretty output helpers.
# -----------------------------------------------------------------------------
setup_colors() {
    if [[ "$USE_COLOR" -eq 1 && -t 1 ]]; then
        C_RESET=$'\033[0m'; C_BOLD=$'\033[1m'; C_DIM=$'\033[2m'
        C_RED=$'\033[31m'; C_GREEN=$'\033[32m'; C_YELLOW=$'\033[33m'
        C_BLUE=$'\033[34m'; C_CYAN=$'\033[36m'
    else
        C_RESET=""; C_BOLD=""; C_DIM=""; C_RED=""; C_GREEN=""
        C_YELLOW=""; C_BLUE=""; C_CYAN=""
    fi
}
log()      { printf '%s\n' "$*"; }
info()     { printf '%s•%s %s\n' "$C_BLUE" "$C_RESET" "$*"; }
ok()       { printf '%s✓%s %s\n' "$C_GREEN" "$C_RESET" "$*"; }
warn()     { printf '%s!%s %s\n' "$C_YELLOW" "$C_RESET" "$*"; }
err()      { printf '%s✗%s %s\n' "$C_RED" "$C_RESET" "$*"; }
heading()  { printf '\n%s%s== %s ==%s\n' "$C_BOLD" "$C_CYAN" "$*" "$C_RESET"; }

# Record a failed REQUIRED step (does not abort the run).
fail_step()  { err "$1"; FAILURES+=("$1 :: $2"); }
# Record a skipped/failed OPTIONAL step.
warn_step()  { warn "$1"; WARNINGS+=("$1 :: $2"); }
# Record a manual follow-up the user must perform.
manual_step(){ MANUAL_STEPS+=("$1"); }

# -----------------------------------------------------------------------------
# ask <prompt> — yes/no prompt honoring --yes / --non-interactive.
# Returns 0 for "yes", 1 for "no".
# -----------------------------------------------------------------------------
ask() {
    local prompt="$1"
    if [[ "$ASSUME_YES" -eq 1 ]]; then return 0; fi
    if [[ "$INTERACTIVE" -eq 0 ]]; then return 1; fi
    local reply
    printf '%s? %s [y/N] ' "$C_YELLOW" "${prompt}${C_RESET}"
    read -r reply || return 1
    [[ "$reply" =~ ^[Yy]([Ee][Ss])?$ ]]
}

# has <cmd> — true if a command exists on PATH.
has() { command -v "$1" >/dev/null 2>&1; }

# -----------------------------------------------------------------------------
# Argument parsing.
# -----------------------------------------------------------------------------
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            --yes|-y)          ASSUME_YES=1 ;;
            --non-interactive) INTERACTIVE=0 ;;
            --skip-install)    SKIP_INSTALL=1 ;;
            --no-color)        USE_COLOR=0 ;;
            --help|-h)         sed -n '2,40p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0 ;;
            *) printf 'Unknown option: %s (use --help)\n' "$1" >&2; exit 2 ;;
        esac
        shift
    done
}

# -----------------------------------------------------------------------------
# Platform detection. Sets OS, DISTRO, ARCH, PKG (package manager), IS_WSL.
# -----------------------------------------------------------------------------
detect_platform() {
    heading "Platform detection"
    ARCH="$(uname -m 2>/dev/null || echo unknown)"
    IS_WSL=0
    case "$(uname -s 2>/dev/null)" in
        Darwin) OS="macos"; PKG="brew" ;;
        Linux)
            OS="linux"
            if grep -qiE 'microsoft|wsl' /proc/version 2>/dev/null; then IS_WSL=1; fi
            if   has apt-get; then PKG="apt"
            elif has dnf;     then PKG="dnf"
            elif has pacman;  then PKG="pacman"
            elif has zypper;  then PKG="zypper"
            else PKG="unknown"; fi
            ;;
        MINGW*|MSYS*|CYGWIN*) OS="windows"; PKG="choco" ;;
        *) OS="other"; PKG="unknown" ;;
    esac

    info "OS:           ${C_BOLD}${OS}${C_RESET}$([[ $IS_WSL -eq 1 ]] && echo ' (WSL)')"
    info "Architecture: ${ARCH}"
    info "Pkg manager:  ${PKG}"
    info "Repo root:    ${REPO_ROOT}"

    if [[ "$OS" == "windows" ]]; then
        warn "Native Windows shells (Git Bash/MSYS2) cannot run Foundry reliably."
        warn "Strongly recommended: install WSL2 (Ubuntu) and re-run this script there."
        manual_step "Windows: install WSL2 — run in PowerShell (admin): 'wsl --install -d Ubuntu', reboot, then re-run setup.sh inside Ubuntu."
    elif [[ "$OS" == "other" ]]; then
        warn "Unrecognized OS — tool installation will be skipped; you'll get manual instructions."
    fi
}

# =============================================================================
# Individual tool checks. Each: verify → (optionally) install → re-verify.
# =============================================================================

# --- git ---------------------------------------------------------------------
check_git() {
    heading "git"
    if has git; then ok "git $(git --version | awk '{print $3}')"; return; fi
    err "git is not installed."
    if [[ "$SKIP_INSTALL" -eq 0 ]] && ask "Install git via ${PKG}?"; then
        case "$PKG" in
            brew)   brew install git ;;
            apt)    sudo apt-get update && sudo apt-get install -y git ;;
            dnf)    sudo dnf install -y git ;;
            pacman) sudo pacman -S --noconfirm git ;;
            zypper) sudo zypper install -y git ;;
            *)      fail_step "git missing" "Install git from https://git-scm.com/downloads"; return ;;
        esac
    fi
    has git && ok "git installed" || \
        fail_step "git missing" "Install git from https://git-scm.com/downloads"
}

# --- Node.js (via nvm when possible) -----------------------------------------
# Strategy: prefer nvm so the version is project-local and switchable. Fall back
# to a system package manager. Verify the major version meets engines.node.
check_node() {
    heading "Node.js (>= ${REQUIRED_NODE_MAJOR})"
    local current_major=0
    if has node; then
        current_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    fi
    if [[ "$current_major" -ge "$REQUIRED_NODE_MAJOR" ]]; then
        ok "node $(node --version) (>= ${REQUIRED_NODE_MAJOR})"; return
    fi

    if [[ "$current_major" -gt 0 ]]; then
        warn "node $(node --version) is older than required v${REQUIRED_NODE_MAJOR}."
    else
        err "Node.js is not installed."
    fi
    [[ "$SKIP_INSTALL" -eq 1 ]] && { fail_step "Node.js < ${REQUIRED_NODE_MAJOR}" "Install Node ${REQUIRED_NODE_MAJOR}+ from https://nodejs.org or via nvm."; return; }

    # Load nvm if it exists but isn't on PATH in this shell.
    if [[ -s "${NVM_DIR:-$HOME/.nvm}/nvm.sh" ]]; then
        # shellcheck disable=SC1091
        . "${NVM_DIR:-$HOME/.nvm}/nvm.sh"
    fi

    if ! has nvm && [[ "$OS" != "windows" ]]; then
        if ask "Install nvm (Node Version Manager)?"; then
            curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
            export NVM_DIR="$HOME/.nvm"
            # shellcheck disable=SC1091
            [[ -s "$NVM_DIR/nvm.sh" ]] && . "$NVM_DIR/nvm.sh"
        fi
    fi

    if has nvm; then
        info "Installing Node ${REQUIRED_NODE_MAJOR} via nvm…"
        nvm install "${REQUIRED_NODE_MAJOR}" && nvm use "${REQUIRED_NODE_MAJOR}" && nvm alias default "${REQUIRED_NODE_MAJOR}"
    elif [[ "$OS" == "windows" ]]; then
        fail_step "Node.js < ${REQUIRED_NODE_MAJOR}" "Install nvm-windows from https://github.com/coreybutler/nvm-windows, then 'nvm install ${REQUIRED_NODE_MAJOR}'."
        return
    else
        case "$PKG" in
            brew) brew install "node@${REQUIRED_NODE_MAJOR}" 2>/dev/null || brew install node ;;
            *)    fail_step "Node.js < ${REQUIRED_NODE_MAJOR}" "Install Node ${REQUIRED_NODE_MAJOR}+ from https://nodejs.org/en/download/package-manager"; return ;;
        esac
    fi

    current_major="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
    if [[ "$current_major" -ge "$REQUIRED_NODE_MAJOR" ]]; then
        ok "node $(node --version)"
    else
        fail_step "Node.js < ${REQUIRED_NODE_MAJOR}" "Install Node ${REQUIRED_NODE_MAJOR}+ from https://nodejs.org or via nvm ('nvm install ${REQUIRED_NODE_MAJOR}')."
    fi
}

# --- Foundry (forge / cast / anvil) ------------------------------------------
check_foundry() {
    heading "Foundry (forge, cast, anvil)"
    if has forge; then ok "forge $(forge --version | head -1)"; return; fi
    err "Foundry is not installed."
    if [[ "$OS" == "windows" && "$IS_WSL" -eq 0 ]]; then
        fail_step "Foundry missing" "Foundry needs WSL2 on Windows. Install WSL2, then inside it run: curl -L https://foundry.paradigm.xyz | bash && foundryup"
        return
    fi
    [[ "$SKIP_INSTALL" -eq 1 ]] && { fail_step "Foundry missing" "Install with: curl -L https://foundry.paradigm.xyz | bash && foundryup"; return; }

    if ask "Install Foundry via the official foundryup installer?"; then
        curl -L https://foundry.paradigm.xyz | bash
        # foundryup is installed to ~/.foundry/bin; add it to PATH for this run.
        export PATH="$HOME/.foundry/bin:$PATH"
        if has foundryup; then foundryup; fi
    fi
    if has forge; then
        ok "forge $(forge --version | head -1)"
    else
        fail_step "Foundry missing" "Run: curl -L https://foundry.paradigm.xyz | bash ; then restart your shell and run 'foundryup'."
        manual_step "Add Foundry to PATH permanently: ensure 'export PATH=\"\$HOME/.foundry/bin:\$PATH\"' is in your shell profile (~/.bashrc or ~/.zshrc)."
    fi
}

# --- Python 3 (optional: docs site + GitHub Models examples) -----------------
check_python() {
    heading "Python 3 (optional — docs & models)"
    if has python3; then
        ok "python3 $(python3 --version 2>&1 | awk '{print $2}')"
    else
        warn_step "python3 missing (optional)" "Only needed for 'npm run models:*' and the mkdocs site. Install from https://www.python.org/downloads or your package manager."
    fi
}

# =============================================================================
# Project dependency installation.
# =============================================================================

# Run a command, recording a required failure if it errors. Args: <title> <cmd...>
run_required() {
    local title="$1"; shift
    info "${title}…"
    if "$@"; then ok "${title}"; else
        fail_step "${title} failed" "Re-run manually: ( $* ) and read the error output above."
    fi
}

install_npm_deps() {
    heading "JavaScript/TypeScript dependencies"
    [[ "$SKIP_INSTALL" -eq 1 ]] && { warn "Skipping npm install (--skip-install)."; return; }
    has npm || { fail_step "npm missing" "npm ships with Node.js — fix the Node.js step first."; return; }

    # Root workspace (Hardhat, ESLint, solhint, prettier, husky…).
    ( cd "$REPO_ROOT" && run_required "Root npm install" npm install )
    # Frontend workspace (Next.js, wagmi, viem, tailwind…).
    if [[ -f "$REPO_ROOT/src/package.json" ]]; then
        ( cd "$REPO_ROOT/src" && run_required "Frontend npm install" npm install )
    fi
}

install_contracts() {
    heading "Smart-contract dependencies (git submodules + build)"
    [[ "$SKIP_INSTALL" -eq 1 ]] && { warn "Skipping contract build (--skip-install)."; return; }
    has git || { warn_step "Cannot fetch submodules" "git is required for forge-std / openzeppelin submodules."; return; }

    # forge-std and openzeppelin-contracts are git submodules (see .gitmodules).
    ( cd "$REPO_ROOT" && run_required "Fetch git submodules" git submodule update --init --recursive )

    if has forge; then
        ( cd "$REPO_ROOT/contracts" && run_required "forge build" forge build )
    else
        warn_step "Skipped 'forge build'" "Foundry is not installed — see the Foundry step above."
    fi
}

setup_env_files() {
    heading "Environment files"
    # Never overwrite an existing .env — only seed from the example.
    local pairs=(".env.example:.env" ".env.local.example:src/.env.local")
    for pair in "${pairs[@]}"; do
        local example="${REPO_ROOT}/${pair%%:*}"
        local target="${REPO_ROOT}/${pair##*:}"
        [[ -f "$example" ]] || continue
        if [[ -f "$target" ]]; then
            ok "$(basename "$target") already exists (left untouched)."
        elif [[ "$SKIP_INSTALL" -eq 0 ]] && ask "Create $(basename "$target") from $(basename "$example")?"; then
            cp "$example" "$target"
            ok "Created $(basename "$target")."
            manual_step "Fill in real values in '${target#"$REPO_ROOT"/}' (RPC URLs, private keys, API keys) before deploying. NEVER commit it."
        else
            warn "$(basename "$target") not created."
            manual_step "Copy '${pair%%:*}' to '${pair##*:}' and fill in your secrets."
        fi
    done
}

enable_git_hooks() {
    heading "Git hooks (husky)"
    [[ "$SKIP_INSTALL" -eq 1 ]] && { warn "Skipping husky (--skip-install)."; return; }
    if [[ -d "$REPO_ROOT/node_modules/husky" ]]; then
        ( cd "$REPO_ROOT" && npx husky >/dev/null 2>&1 ) && ok "husky hooks enabled." \
            || warn_step "husky activation failed" "Run 'npx husky' in the repo root after npm install."
    else
        warn "husky not installed yet (run after npm install)."
    fi
}

# =============================================================================
# Smoke check — confirm the toolchain actually works end-to-end.
# =============================================================================
smoke_check() {
    heading "Smoke check"
    [[ "$SKIP_INSTALL" -eq 1 ]] && { warn "Skipping smoke check (--skip-install)."; return; }
    if has forge; then
        ( cd "$REPO_ROOT/contracts" && forge build >/dev/null 2>&1 ) \
            && ok "Contracts compile." || warn_step "Contracts did not compile" "Run 'cd contracts && forge build' and inspect the error."
    fi
    if has npm && [[ -d "$REPO_ROOT/node_modules" ]]; then
        ( cd "$REPO_ROOT" && npm run lint:sol >/dev/null 2>&1 ) \
            && ok "Solidity lint passes." || warn_step "Solidity lint reported issues" "Run 'npm run lint:sol' to see them."
    fi
}

# =============================================================================
# Final report — everything the user still needs to know, in one place.
# =============================================================================
print_report() {
    heading "Summary"

    if [[ ${#FAILURES[@]} -eq 0 ]]; then
        ok "${C_BOLD}All required tooling is in place.${C_RESET}"
    else
        err "${C_BOLD}${#FAILURES[@]} required step(s) failed:${C_RESET}"
        for f in "${FAILURES[@]}"; do
            printf '  %s✗%s %s\n' "$C_RED" "$C_RESET" "${f%% :: *}"
            printf '      %sfix:%s %s\n' "$C_DIM" "$C_RESET" "${f##* :: }"
        done
    fi

    if [[ ${#WARNINGS[@]} -gt 0 ]]; then
        printf '\n%s%sOptional items skipped/failed (non-blocking):%s\n' "$C_BOLD" "$C_YELLOW" "$C_RESET"
        for w in "${WARNINGS[@]}"; do
            printf '  %s!%s %s\n' "$C_YELLOW" "$C_RESET" "${w%% :: *}"
            printf '      %s%s\n' "$C_DIM" "${w##* :: }${C_RESET}"
        done
    fi

    # Static manual steps that always apply (in addition to dynamic ones).
    manual_step "Review docs/DEPLOYMENT.md before deploying to a testnet or mainnet."
    manual_step "If you plan to deploy: install the Vercel CLI ('npm i -g vercel') and run 'vercel link' for the frontend."

    printf '\n%s%sManual steps you must complete yourself:%s\n' "$C_BOLD" "$C_CYAN" "$C_RESET"
    local i=1
    for m in "${MANUAL_STEPS[@]}"; do
        printf '  %s%d.%s %s\n' "$C_BOLD" "$i" "$C_RESET" "$m"
        ((i++))
    done

    printf '\n%sNext commands to try:%s\n' "$C_BOLD" "$C_RESET"
    printf '  %snpm run foundry:test%s   # run the Solidity test suite\n' "$C_DIM" "$C_RESET"
    printf '  %snpm run lint%s           # run all linters at max strictness\n' "$C_DIM" "$C_RESET"
    printf '  %scd src && npm run dev:frontend%s   # start the Next.js dApp\n' "$C_DIM" "$C_RESET"

    echo
    [[ ${#FAILURES[@]} -eq 0 ]] && exit 0 || exit 1
}

# =============================================================================
# Main.
# =============================================================================
main() {
    parse_args "$@"
    setup_colors
    printf '%s%sTrustLedger setup%s — %s\n' "$C_BOLD" "$C_CYAN" "$C_RESET" "$(date '+%Y-%m-%d %H:%M:%S')"

    detect_platform
    check_git
    check_node
    check_foundry
    check_python
    install_npm_deps
    install_contracts
    setup_env_files
    enable_git_hooks
    smoke_check
    print_report
}

main "$@"
