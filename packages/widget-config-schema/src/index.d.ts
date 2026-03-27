export declare const CURRENT_WIDGET_CONFIG_SCHEMA_VERSION: 1;
export type WidgetConfigSchemaVersion = typeof CURRENT_WIDGET_CONFIG_SCHEMA_VERSION;
type JsonSchema = Record<string, unknown>;
type WidgetConfigRecord = Record<string, unknown>;
export declare function isSupportedWidgetConfigSchemaVersion(version: number): version is WidgetConfigSchemaVersion;
export declare function resolveWidgetConfigSchemaVersion(config: unknown): WidgetConfigSchemaVersion;
export declare function normalizeWidgetConfigForValidation(config: unknown): WidgetConfigRecord;
export declare function readWidgetConfigSchema(version: WidgetConfigSchemaVersion): JsonSchema;
export declare function validateWidgetConfig(config: unknown): string[];
export {};
//# sourceMappingURL=index.d.ts.map