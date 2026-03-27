import Ajv from "ajv";
import { readFileSync } from "node:fs";
export const CURRENT_WIDGET_CONFIG_SCHEMA_VERSION = 1;
const FALLBACK_WIDGET_CONFIG_SCHEMA_VERSION = CURRENT_WIDGET_CONFIG_SCHEMA_VERSION;
const SUPPORTED_WIDGET_CONFIG_SCHEMA_VERSIONS = [
    CURRENT_WIDGET_CONFIG_SCHEMA_VERSION,
];
const ajv = new Ajv({
    allErrors: true,
    strict: false,
    $data: true,
});
const validatorCache = new Map();
export function isSupportedWidgetConfigSchemaVersion(version) {
    return (Number.isInteger(version) &&
        SUPPORTED_WIDGET_CONFIG_SCHEMA_VERSIONS.includes(version));
}
export function resolveWidgetConfigSchemaVersion(config) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
        return FALLBACK_WIDGET_CONFIG_SCHEMA_VERSION;
    }
    const version = config.configSchemaVersion;
    if (typeof version !== "number") {
        return FALLBACK_WIDGET_CONFIG_SCHEMA_VERSION;
    }
    if (!isSupportedWidgetConfigSchemaVersion(version)) {
        throw new Error(`Unsupported widget.config.json configSchemaVersion: ${String(version)}`);
    }
    return version;
}
export function normalizeWidgetConfigForValidation(config) {
    if (!config || typeof config !== "object" || Array.isArray(config)) {
        throw new Error("widget.config.json must be a JSON object");
    }
    const resolvedVersion = resolveWidgetConfigSchemaVersion(config);
    return {
        ...config,
        configSchemaVersion: resolvedVersion,
    };
}
export function readWidgetConfigSchema(version) {
    const schemaUrl = new URL(`../schemas/v${version}.json`, import.meta.url);
    return JSON.parse(readFileSync(schemaUrl, "utf8"));
}
export function validateWidgetConfig(config) {
    let normalizedConfig;
    try {
        normalizedConfig = normalizeWidgetConfigForValidation(config);
    }
    catch (error) {
        return [error instanceof Error ? error.message : "widget.config.json is invalid"];
    }
    const schemaVersion = normalizedConfig
        .configSchemaVersion;
    const validator = getValidator(schemaVersion);
    const valid = validator(normalizedConfig);
    if (valid) {
        return [];
    }
    return (validator.errors ?? []).map(formatValidationError);
}
function getValidator(version) {
    const cachedValidator = validatorCache.get(version);
    if (cachedValidator) {
        return cachedValidator;
    }
    const schema = readWidgetConfigSchema(version);
    const validator = ajv.compile(schema);
    validatorCache.set(version, validator);
    return validator;
}
function formatValidationError(error) {
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
