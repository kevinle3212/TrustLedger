#!/usr/bin/env python3
"""Verify project-owned Python modules, classes, and functions have docstrings."""

from __future__ import annotations

import ast
import pathlib
import sys
from collections.abc import Iterable

ROOT = pathlib.Path(__file__).resolve().parent.parent
SCAN_PATHS = (
    pathlib.Path("scripts/analytics/generate_wallet_analytics.py"),
    pathlib.Path("scripts/models/github_models.py"),
    pathlib.Path("tools/check-python-docstrings.py"),
    pathlib.Path("tools/mkdocs_hooks.py"),
    pathlib.Path("utils/generate_contract.py"),
)


def iter_python_files() -> Iterable[pathlib.Path]:
    """Yield the explicitly supported project Python files."""

    for relative_path in SCAN_PATHS:
        path = ROOT / relative_path
        if path.exists():
            yield path


def qualified_name(parents: list[str], node_name: str) -> str:
    """Return a readable dotted name for a Python AST node."""

    return ".".join([*parents, node_name])


def collect_missing_docstrings(
    tree: ast.AST,
    *,
    relative_path: pathlib.Path,
) -> list[str]:
    """Return every missing module, class, function, and method docstring."""

    missing: list[str] = []

    if ast.get_docstring(tree) is None:
        missing.append(f"{relative_path}: module docstring missing")

    def visit(node: ast.AST, parents: list[str]) -> None:
        """Recursively inspect documentable AST nodes."""

        for child in ast.iter_child_nodes(node):
            if isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)):
                name = qualified_name(parents, child.name)
                if ast.get_docstring(child) is None:
                    missing.append(f"{relative_path}:{child.lineno}: {name} docstring missing")
                visit(child, [*parents, child.name])
            else:
                visit(child, parents)

    visit(tree, [])
    return missing


def check_file(path: pathlib.Path) -> list[str]:
    """Parse one Python file and return docstring violations."""

    relative_path = path.relative_to(ROOT)
    tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(relative_path))
    return collect_missing_docstrings(tree, relative_path=relative_path)


def main() -> int:
    """Run the docstring checker and print a compact report."""

    missing: list[str] = []
    for path in iter_python_files():
        missing.extend(check_file(path))

    if missing:
        print("Python docstring check failed:", file=sys.stderr)
        for item in missing:
            print(f"- {item}", file=sys.stderr)
        return 1

    print("Python docstring check passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
