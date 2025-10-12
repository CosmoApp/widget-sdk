export const CosmoWidget = {
  pendingSwiftCallbacks: {},

  // Internal helper to unify callbackId generation and posting to native
  // Optional payload is merged with the callbackId
  _requestWithCallbackId: function (handlerName, payload) {
    return new Promise((resolve) => {
      const callbackId = Math.random().toString(36).substring(2, 11);
      this.pendingSwiftCallbacks[callbackId] = resolve;
      const handler = window?.webkit?.messageHandlers?.[handlerName];
      if (!handler) {
        delete this.pendingSwiftCallbacks[callbackId];
        throw new Error(`Native handler not found: ${handlerName}`);
      }
      if (payload && typeof payload === 'object') {
        handler.postMessage({ callbackId, ...payload });
      } else {
        handler.postMessage(callbackId);
      }
    });
  },

  // TODO: explore how we store this so it gets built
  swiftCallback: function (callbackId, result) {
    const cb = this.pendingSwiftCallbacks[callbackId];
    if (cb) cb(result);
    delete this.pendingSwiftCallbacks[callbackId];
  },

  // functions
  getWidgetId: async function () {
    return this._requestWithCallbackId('getWidgetId');
  },

  setWidgetData: (data) => {
    if (typeof data === 'object') {
      data = JSON.stringify(data);
    }
    window.webkit.messageHandlers.saveWidgetData.postMessage(data);
  },

  getUserId: async function () {
    return this._requestWithCallbackId('getUserId');
  },

  getSystemMemory: async function () {
    return this._requestWithCallbackId('getSystemMemory');
  },

  getSystemCpu: async function () {
    return this._requestWithCallbackId('getSystemCpu');
  },

  getSystemBattery: async function () {
    return this._requestWithCallbackId('getSystemBattery');
  },

  openUrl: function (url) {
    window.webkit.messageHandlers.openUrl.postMessage(url);
  },

  // Open an app-relative route. Native decides the origin/base URL.
  openCosmoUrl: function (path) {
    window.webkit.messageHandlers.openCosmoUrl.postMessage(path);
  },

  getCosmoUrl: async function (path) {
    return this._requestWithCallbackId('getCosmoUrl', { path });
  },

}
