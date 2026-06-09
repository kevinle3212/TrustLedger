"""Namespace package marker for the hand-written ``azure`` type stubs.

The Azure SDK distributions used by this repository ship no ``py.typed`` marker
and no bundled stubs, so the strict mypy config in ``mypy.ini`` cannot resolve
their types. This ``stubs/`` tree provides minimal, hand-written stubs covering
only the surface that ``scripts/models/github_models.py`` actually exercises -
just enough to type-check our own code without an ``ignore_missing_imports``
escape hatch.

This file contains no declarations; it only marks ``azure`` as a stub package
so the subpackages below it (``azure.core``, ``azure.ai``) are discoverable.
"""
