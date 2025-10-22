const observers = {};
const observerHandlers = {};

export function registerObserver(handlerName, callback, payload) {
  if (typeof callback !== 'function') {
    throw new Error(`${handlerName} requires a function callback`);
  }

  const observerId = Math.random().toString(36).substring(2, 11);
  observers[observerId] = callback;
  observerHandlers[observerId] = handlerName;

  const handler = window?.webkit?.messageHandlers?.[handlerName];
  if (handler) {
    if (payload && typeof payload === 'object') {
      handler.postMessage({ observerId, ...payload });
    } else {
      handler.postMessage({ observerId });
    }
  } else {
    console.warn(`${handlerName} handler not available`);
  }

  return () => unregisterObserver(observerId);
}

export function swiftObserverCallback(observerId, data) {
  const fn = observers[observerId];
  if (fn) {
    try {
      fn(data);
    } catch (e) {
      console.error(`Error in observer ${observerId}:`, e);
    }
  }
}

export function unregisterObserver(observerId) {
  const handlerName = observerHandlers[observerId];
  delete observers[observerId];
  delete observerHandlers[observerId];

  if (handlerName) {
    const unregisterHandlerName = handlerName.replace('register', 'unregister');
    const handler = window?.webkit?.messageHandlers?.[unregisterHandlerName];
    handler?.postMessage(observerId);
  }
}
