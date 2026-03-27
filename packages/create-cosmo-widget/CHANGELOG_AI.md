# Scaffold Generator AI Changelog

## 2026-02-27

- Added Codex context routing files and invariants for scaffolding/templates.

## 2026-03-25

- Updated the scaffold generator to write a stable UUID into new `widget.config.json` files so newly created widgets have a permanent marketplace identity from day one.

## 2026-03-26

- Updated scaffolded widget configs to declare `configSchemaVersion: 1`, matching the new shared widget config schema package.
- Updated the scaffold generator to backfill `configSchemaVersion` when patching template config files during project creation.
- Removed the old app-version floor field from new scaffold templates so freshly generated widgets rely on the schema contract instead of developer-authored compatibility guesses.
