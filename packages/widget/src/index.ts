export * from './core/index.js';
export * as eventManager from './eventManager/index.js';
export * from './systemResources/index.js';
export * from './window/index.js';
export * as systemSettings from './systemSettings/index.js';
export * as errors from './errors/index.js';
export * from './widgetConfigSchema.js';

import { swiftCallback } from './core/request.js';
import { swiftObserverCallback } from './core/observers.js';

// Expose internal callbacks for native app
(window as any).CosmoWidget = {
  swiftCallback,
  swiftObserverCallback
};

export * from './config.js';
