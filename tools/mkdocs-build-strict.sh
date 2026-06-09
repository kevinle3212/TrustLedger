#!/usr/bin/env bash
set -euo pipefail

VENV_DIR="${MKDOCS_VENV:-.venv-docs}"
REQUIREMENTS_FILE="requirements-docs.txt"
STAMP_FILE="${VENV_DIR}/.requirements.sha256"
CURRENT_HASH="$(shasum -a 256 "${REQUIREMENTS_FILE}" | awk '{print $1}')"

if [[ ! -x "${VENV_DIR}/bin/mkdocs" ]] || [[ "$(cat "${STAMP_FILE}" 2>/dev/null || true)" != "${CURRENT_HASH}" ]]; then
	python3 -m venv "${VENV_DIR}"
	"${VENV_DIR}/bin/python" -m pip install --upgrade pip
	"${VENV_DIR}/bin/python" -m pip install -r "${REQUIREMENTS_FILE}"
	printf "%s" "${CURRENT_HASH}" > "${STAMP_FILE}"
fi

exec "${VENV_DIR}/bin/python" -m mkdocs build --strict "$@"
