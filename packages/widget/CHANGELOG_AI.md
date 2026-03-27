# Widget SDK Runtime AI Changelog

## 2026-02-27

- Added Codex context routing files and invariants for `packages/widget`.

## 2026-03-25

- Added support for a stable `widget.config.json.id` field in the runtime config type and publish CLI.
- Updated `cosmo publish` to prefer the explicit config ID and otherwise derive the same deterministic UUIDv5 used by backend widget ingestion for legacy package-name-based widgets.

## 2026-03-26

- Added `configSchemaVersion` to the widget config contract so new widget projects can declare which `widget.config.json` schema they were authored against.
- Introduced a shared `@buildcosmo/widget-config-schema` package that owns versioned widget config schemas and the canonical build-time validator used by the Vite plugin.
- Removed the old app-version floor field from the runtime config contract and shared schema in favor of schema-versioned widget configs.
