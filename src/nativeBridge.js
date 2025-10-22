import { CosmoError } from './errors.js';

const pendingSwiftCallbacks = {};

/**
 * Send a request to native with auto-generated callbackId
 */
export function requestWithCallbackId(handlerName, payload) {
  return new Promise((resolve, reject) => {
    const callbackId = Math.random().toString(36).substring(2, 11);
    pendingSwiftCallbacks[callbackId] = { resolve, reject };

    const handler = window?.webkit?.messageHandlers?.[handlerName];
    if (!handler) {
      delete pendingSwiftCallbacks[callbackId];
      throw new Error(`Native handler not found: ${handlerName}`);
    }

    if (payload && typeof payload === 'object') {
      handler.postMessage({ callbackId, ...payload });
    } else {
      handler.postMessage(callbackId);
    }
  });
}

/**
 * Native calls this when async result is ready
 */
export function swiftCallback(callbackId, result, error) {
  const cb = pendingSwiftCallbacks[callbackId];
  if (cb) {
    if (error) {
      let errorObj;
      try {
        errorObj = typeof error === 'string' ? JSON.parse(error) : error;
      } catch {
        cb.reject(new CosmoError('unknown', 'UNKNOWN_ERROR', error));
        delete pendingSwiftCallbacks[callbackId];
        return;
      }
      cb.reject(new CosmoError(errorObj.type, errorObj.code, errorObj.message));
    } else {
      cb.resolve(result);
    }
  }
  delete pendingSwiftCallbacks[callbackId];
}
