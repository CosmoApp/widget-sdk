import Ajv, { type ErrorObject, type ValidateFunction } from "ajv";
import { readFileSync } from "node:fs";

export const CURRENT_WIDGET_CONFIG_SCHEMA_VERSION = 1 as const;
export type WidgetConfigSchemaVersion = typeof CURRENT_WIDGET_CONFIG_SCHEMA_VERSION;

const FALLBACK_WIDGET_CONFIG_SCHEMA_VERSION = CURRENT_WIDGET_CONFIG_SCHEMA_VERSION;
const SUPPORTED_WIDGET_CONFIG_SCHEMA_VERSIONS = [
  CURRENT_WIDGET_CONFIG_SCHEMA_VERSION,
] as const;

type JsonSchema = Record<string, unknown>;
type WidgetConfigRecord = Record<string, unknown>;

const ajv = new Ajv({
  allErrors: true,
  strict: false,
  $data: true,
});

const validatorCache = new Map<number, ValidateFunction>();

export function isSupportedWidgetConfigSchemaVersion(
  version: number,
): version is WidgetConfigSchemaVersion {
  return (
    Number.isInteger(version) &&
    SUPPORTED_WIDGET_CONFIG_SCHEMA_VERSIONS.includes(version as WidgetConfigSchemaVersion)
  );
}

export function resolveWidgetConfigSchemaVersion(config: unknown): WidgetConfigSchemaVersion {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    return FALLBACK_WIDGET_CONFIG_SCHEMA_VERSION;
  }

  const version = (config as WidgetConfigRecord).configSchemaVersion;
  if (typeof version !== "number") {
    return FALLBACK_WIDGET_CONFIG_SCHEMA_VERSION;
  }

  if (!isSupportedWidgetConfigSchemaVersion(version)) {
    throw new Error(
      `Unsupported widget.config.json configSchemaVersion: ${String(version)}`,
    );
  }

  return version;
}

export function normalizeWidgetConfigForValidation(config: unknown): WidgetConfigRecord {
  if (!config || typeof config !== "object" || Array.isArray(config)) {
    throw new Error("widget.config.json must be a JSON object");
  }

  const resolvedVersion = resolveWidgetConfigSchemaVersion(config);
  return {
    ...(config as WidgetConfigRecord),
    configSchemaVersion: resolvedVersion,
  };
}

export function readWidgetConfigSchema(version: WidgetConfigSchemaVersion): JsonSchema {
  const schemaUrl = new URL(`../schemas/v${version}.json`, import.meta.url);
  return JSON.parse(readFileSync(schemaUrl, "utf8")) as JsonSchema;
}

export function validateWidgetConfig(config: unknown): string[] {
  let normalizedConfig: WidgetConfigRecord;

  try {
    normalizedConfig = normalizeWidgetConfigForValidation(config);
  } catch (error) {
    return [error instanceof Error ? error.message : "widget.config.json is invalid"];
  }

  const schemaVersion = normalizedConfig
    .configSchemaVersion as WidgetConfigSchemaVersion;
  const validator = getValidator(schemaVersion);

  const valid = validator(normalizedConfig);
  if (valid) {
    return [];
  }

  return (validator.errors ?? []).map(formatValidationError);
}

function getValidator(version: WidgetConfigSchemaVersion): ValidateFunction {
  const cachedValidator = validatorCache.get(version);
  if (cachedValidator) {
    return cachedValidator;
  }

  const schema = readWidgetConfigSchema(version);
  const validator = ajv.compile(schema);
  validatorCache.set(version, validator);
  return validator;
}

function formatValidationError(error: ErrorObject): string {
  if (error.keyword === "required" && typeof error.params.missingProperty === "string") {
    return `${error.params.missingProperty} is required`;
  }

  if (error.keyword === "additionalProperties" && typeof error.params.additionalProperty === "string") {
    return `Unexpected property: ${error.params.additionalProperty}`;
  }

  const path = error.instancePath ? error.instancePath.slice(1).replace(/\//g, ".") : "";
  if (path && error.message) {
    return `${path} ${error.message}`;
  }

  return error.message ?? "widget.config.json is invalid";
}
