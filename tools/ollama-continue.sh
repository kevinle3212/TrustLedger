#!/usr/bin/env bash
set -euo pipefail

MODEL="${OLLAMA_MODEL:-qwen3:8b}"
HOST="${OLLAMA_HOST:-127.0.0.1:11434}"
API_BASE="${OLLAMA_API_BASE:-http://${HOST}}"

usage() {
  cat <<USAGE
Usage: bash tools/ollama-continue.sh <command>

Commands:
  install           Install Ollama on macOS or Linux.
  pull              Pull the configured model. Default: qwen3:8b.
  serve-local       Serve Ollama on 127.0.0.1:11434 for same-machine use.
  serve-lan         Serve Ollama on 0.0.0.0:11434 for LAN clients.
  check             Check Ollama health and whether the model is available.
  generate-test     Send a small non-streaming generation request.
  tags              List models exposed by the configured Ollama host.
  continue-snippet  Print a Continue config.yaml model snippet.

Environment:
  OLLAMA_MODEL      Model name, default qwen3:8b.
  OLLAMA_HOST       Host:port for Ollama commands, default 127.0.0.1:11434.
  OLLAMA_API_BASE   HTTP API base, default http://\$OLLAMA_HOST.

Examples:
  bash tools/ollama-continue.sh install
  bash tools/ollama-continue.sh pull
  bash tools/ollama-continue.sh serve-local
  OLLAMA_HOST=0.0.0.0:11434 bash tools/ollama-continue.sh serve-lan
  OLLAMA_API_BASE=http://192.168.12.181:11434 bash tools/ollama-continue.sh check
USAGE
}

require_ollama() {
  if ! command -v ollama >/dev/null 2>&1; then
    echo "ollama is not installed. Run: bash tools/ollama-continue.sh install" >&2
    exit 1
  fi
}

install_ollama() {
  case "$(uname -s)" in
    Darwin)
      if command -v brew >/dev/null 2>&1; then
        brew install ollama
      else
        echo "Homebrew is required for automated macOS install." >&2
        echo "Install Homebrew or download Ollama from https://ollama.com/download" >&2
        exit 1
      fi
      ;;
    Linux)
      curl -fsSL https://ollama.com/install.sh | sh
      ;;
    *)
      echo "Unsupported OS for automated install. See https://ollama.com/download" >&2
      exit 1
      ;;
  esac
}

pull_model() {
  require_ollama
  ollama pull "${MODEL}"
}

serve_local() {
  require_ollama
  OLLAMA_HOST="127.0.0.1:11434" ollama serve
}

serve_lan() {
  require_ollama
  OLLAMA_HOST="0.0.0.0:11434" ollama serve
}

tags() {
  curl -fsS "${API_BASE}/api/tags"
  printf '\n'
}

check() {
  echo "Checking Ollama API: ${API_BASE}"
  response="$(curl -fsS "${API_BASE}/api/tags")"
  echo "Ollama API is reachable."

  if printf '%s' "${response}" | python3 -c 'import json,sys; data=json.load(sys.stdin); wanted=sys.argv[1]; sys.exit(0 if any(model.get("name") == wanted for model in data.get("models", [])) else 1)' "${MODEL}"; then
    echo "Model is available from ${API_BASE}: ${MODEL}"
  else
    echo "Model is not available from ${API_BASE}: ${MODEL}"
    echo "Run: OLLAMA_MODEL=${MODEL} bash tools/ollama-continue.sh pull"
  fi
}

generate_test() {
  python3 - "${API_BASE}" "${MODEL}" <<'PY'
import json
import sys
import urllib.request

api_base = sys.argv[1].rstrip("/")
model = sys.argv[2]
payload = json.dumps(
    {
        "model": model,
        "prompt": "/no_think\nReturn exactly one word: ok",
        "stream": False,
        "options": {"num_predict": 256, "temperature": 0},
    }
).encode()
request = urllib.request.Request(
    f"{api_base}/api/generate",
    data=payload,
    headers={"Content-Type": "application/json"},
)

with urllib.request.urlopen(request, timeout=90) as response:
    data = json.load(response)

print(
    json.dumps(
        {
            "response": data.get("response", "").strip(),
            "done": data.get("done"),
            "done_reason": data.get("done_reason"),
            "model": data.get("model"),
        },
        indent=2,
    )
)
PY
}

continue_snippet() {
  cat <<YAML
models:
  - name: Qwen3 Coder 8B (Ollama)
    provider: ollama
    model: ${MODEL}
    apiBase: ${API_BASE}
YAML
}

main() {
  case "${1:-}" in
    install) install_ollama ;;
    pull) pull_model ;;
    serve-local) serve_local ;;
    serve-lan) serve_lan ;;
    check) check ;;
    generate-test) generate_test ;;
    tags) tags ;;
    continue-snippet) continue_snippet ;;
    -h|--help|help|"") usage ;;
    *)
      echo "Unknown command: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
}

main "$@"
