import { CosmoError } from '../errors/CosmoError';

type PendingCallback = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

const pendingSwiftCallbacks: Record<string, PendingCallback> = {};

export function requestWithCallbackId(
  handlerName: string,
  payload?: Record<string, any>
): Promise<any> {
  return new Promise((resolve, reject) => {
    const callbackId = Math.random().toString(36).substring(2, 11);
    pendingSwiftCallbacks[callbackId] = { resolve, reject };

    const handler = (window as any)?.webkit?.messageHandlers?.[handlerName];

    if (!handler) {
      delete pendingSwiftCallbacks[callbackId];
      reject(new Error(`Native handler not found: ${handlerName}`));
      return;
    }

    if (payload && typeof payload === 'object') {
      handler.postMessage({ callbackId, ...payload });
    } else {
      handler.postMessage(callbackId);
    }
  });
}

// Called from Swift
export function swiftCallback(callbackId: string, result?: any, error?: any) {
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
    delete pendingSwiftCallbacks[callbackId];
  }
}
