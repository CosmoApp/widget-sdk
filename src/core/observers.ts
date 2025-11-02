type ObserverCallback = (data: any) => void;

const observers: Record<string, ObserverCallback> = {};
const observerHandlers: Record<string, string> = {};

export function registerObserver(
  handlerName: string,
  callback: ObserverCallback,
  payload?: Record<string, any>
): () => void {
  if (typeof callback !== 'function') {
    throw new Error(`${handlerName} requires a function callback`);
  }

  const observerId = Math.random().toString(36).substring(2, 11);
  observers[observerId] = callback;
  observerHandlers[observerId] = handlerName;

  const handler = (window as any)?.webkit?.messageHandlers?.[handlerName];
  if (!handler) {
    console.warn(`${handlerName} handler not available`);
    return () => unregisterObserver(observerId);
  }

  if (payload && typeof payload === 'object') {
    handler.postMessage({ observerId, ...payload });
  } else {
    handler.postMessage({ observerId });
  }

  return () => unregisterObserver(observerId);
}

export function swiftObserverCallback(observerId: string, data?: any) {
  const observer = observers[observerId];
  if (observer && typeof observer === 'function') {
    try {
      observer(data);
    } catch (e) {
      console.error(`Error in observer ${observerId}:`, e);
    }
  }
}

export function unregisterObserver(observerId: string) {
  const handlerName = observerHandlers[observerId];

  delete observers[observerId];
  delete observerHandlers[observerId];

  if (handlerName) {
    const unregisterHandlerName = handlerName.replace('register', 'unregister');
    const handler = (window as any)?.webkit?.messageHandlers?.[unregisterHandlerName];
    if (handler) handler.postMessage(observerId);
  }
}
