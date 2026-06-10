"""MkDocs hooks for publishing root-level static assets.

The documentation source lives in docs/, while reusable project imagery lives in
root assets/. MkDocs only copies files from docs/ by default, so this hook copies
the centralized public assets needed by the theme into the generated site.
"""

from __future__ import annotations

import shutil
from pathlib import Path


def on_post_build(config: dict[str, object], **_: object) -> None:
    """Copy root assets required by the docs theme after MkDocs builds pages."""

    repo_root = Path(config["config_file_path"]).resolve().parent
    site_dir = Path(str(config["site_dir"])).resolve()

    for directory in ("icons", "logos"):
        source = repo_root / "assets" / directory
        destination = site_dir / "assets" / directory
        if source.exists():
            shutil.copytree(source, destination, dirs_exist_ok=True)
