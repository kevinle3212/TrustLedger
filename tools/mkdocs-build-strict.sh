#!/usr/bin/env bash
set -euo pipefail

VENV_DIR="${MKDOCS_VENV:-.venv-docs}"
REQUIREMENTS_FILE="requirements-docs.txt"
STAMP_FILE="${VENV_DIR}/.requirements.sha256"

hash_file() {
	if command -v shasum >/dev/null 2>&1; then
		shasum -a 256 "$1" | awk '{print $1}'
	elif command -v sha256sum >/dev/null 2>&1; then
		sha256sum "$1" | awk '{print $1}'
	elif command -v openssl >/dev/null 2>&1; then
		openssl dgst -sha256 "$1" | awk '{print $NF}'
	else
		printf 'mkdocs-build-strict: shasum, sha256sum, or openssl is required to hash %s\n' "$1" >&2
		exit 1
	fi
}

venv_python() {
	if [[ -x "${VENV_DIR}/bin/python" ]]; then
		printf '%s\n' "${VENV_DIR}/bin/python"
	elif [[ -x "${VENV_DIR}/Scripts/python.exe" ]]; then
		printf '%s\n' "${VENV_DIR}/Scripts/python.exe"
	else
		printf '%s\n' "${VENV_DIR}/bin/python"
	fi
}

create_venv() {
	if command -v python3 >/dev/null 2>&1; then
		python3 -m venv "${VENV_DIR}"
	elif command -v python >/dev/null 2>&1; then
		python -m venv "${VENV_DIR}"
	elif command -v py >/dev/null 2>&1; then
		py -3 -m venv "${VENV_DIR}"
	else
		printf 'mkdocs-build-strict: python3, python, or py is required to create %s\n' "${VENV_DIR}" >&2
		exit 1
	fi
}

CURRENT_HASH="$(hash_file "${REQUIREMENTS_FILE}")"
PYTHON_BIN="$(venv_python)"

if [[ ! -x "${PYTHON_BIN}" ]] || [[ "$(cat "${STAMP_FILE}" 2>/dev/null || true)" != "${CURRENT_HASH}" ]]; then
	create_venv
	PYTHON_BIN="$(venv_python)"
	"${PYTHON_BIN}" -m pip install --upgrade pip
	"${PYTHON_BIN}" -m pip install -r "${REQUIREMENTS_FILE}"
	printf "%s" "${CURRENT_HASH}" > "${STAMP_FILE}"
fi

exec "${PYTHON_BIN}" -m mkdocs build --strict "$@"
