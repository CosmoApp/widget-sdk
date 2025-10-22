// Error class for native callbacks
class CosmoError extends Error {
  constructor(type, code, message) {
    super(message || `${type}: ${code}`);
    this.type = type;
    this.code = code;
  }
}

/**
 * @typedef {('on'|'off'|'mixed')} NSMenuItemState
 */

/**
 * @typedef {Object} NSMenuItemData
 * @property {string} id                   - Stable identifier for this item
 * @property {string} title                - Display title
 * @property {boolean} [enabled=true]      - Whether the item is enabled
 * @property {boolean} [isSectionHeader]   - If true, render as a non-clickable section header
 * @property {NSMenuItemState} [state='off'] - State indicator for checkable items
 * @property {string} [keyEquivalent]      - Optional keyboard shortcut character
 * @property {string[]} [keyModifiers]     - Optional modifiers: ['cmd','shift','alt','ctrl']
 * @property {NSMenuItemData[]} [submenu]  - Optional submenu items
 * @property {any} [representedObject]     - Arbitrary payload carried with the item
 */

/**
 * Lightweight class to normalize incoming menu items from native.
 */
class NSMenuItem {
  /**
   * @param {NSMenuItemData} data
   */
  constructor(data) {
    this.id = String(data?.id || '');
    this.title = String(data?.title || '');
    this.enabled = data?.enabled !== false;
    this.state = data?.state || 'off';
    this.keyEquivalent = data?.keyEquivalent || '';
    this.keyModifiers = Array.isArray(data?.keyModifiers) ? data.keyModifiers.slice(0) : [];
    this.representedObject = data?.representedObject;
    this.submenu = Array.isArray(data?.submenu) ? data.submenu.map(it => new NSMenuItem(it)) : undefined;
    Object.freeze(this);
  }
}

/**
 * @typedef {Object} CalendarSource
 * @property {string} title
 * @property {string} identifier
 */

/**
 * @typedef {Object} CalendarInfo
 * @property {string} title
 * @property {string} identifier
 * @property {CalendarSource} source
 * @property {boolean} allowsModifications
 * @property {string} colorHex
 * @property {string} type // EKCalendarType string: local, calDAV, exchange, etc.
 */

export const CosmoWidget = {
  pendingSwiftCallbacks: {},
  observers: {}, // Persistent observers for native to call multiple times
  observerHandlers: {}, // Map observerId -> handlerName for cleanup

  // Internal helper to unify callbackId generation and posting to native
  // Optional payload is merged with the callbackId
  _requestWithCallbackId: function (handlerName, payload) {
    return new Promise((resolve, reject) => {
      const callbackId = Math.random().toString(36).substring(2, 11);
      this.pendingSwiftCallbacks[callbackId] = { resolve, reject };
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

  // Normalize an array of raw items before sending to native (ensures ids)
  _normalizeMenuItems: function (items, key) {
    if (!Array.isArray(items)) return [];
    return items.map((it, idx) => {
      const ensured = { ...it };
      if (!ensured.id) ensured.id = `${key}:${(ensured.title || 'item').toString()}#${idx}`;
      if (Array.isArray(ensured.submenu)) {
        ensured.submenu = ensured.submenu.map((subIt, sIdx) => {
          const subEnsured = { ...subIt };
          if (!subEnsured.id) subEnsured.id = `${ensured.id}>${(subEnsured.title || 'item').toString()}#${sIdx}`;
          return subEnsured;
        });
      }
      return ensured;
    });
  },

  // Normalize a single item (ensures id and submenu ids)
  _normalizeMenuItem: function (item, key) {
    if (!item || typeof item !== 'object') return undefined;
    const ensured = { ...item };
    if (!ensured.id) ensured.id = `${key}:${(ensured.title || 'item').toString()}#0`;
    if (Array.isArray(ensured.submenu)) {
      ensured.submenu = ensured.submenu.map((subIt, sIdx) => {
        const subEnsured = { ...subIt };
        if (!subEnsured.id) subEnsured.id = `${ensured.id}>${(subEnsured.title || 'item').toString()}#${sIdx}`;
        return subEnsured;
      });
    }
    return ensured;
  },

  // (Removed JS→native menu push functions to keep a single native-callable API)

  /**
   * Native -> JS: single entry-point to request the (only) preference menu items.
   * Widgets should implement CosmoWidget.providePreferenceMenu = () => NSMenuItemData[]
   * This function synchronously returns a normalized plain-object array for native consumption.
   *
   * @returns {Array<NSMenuItemData>} normalized items
   */
  getPreferenceMenuItemsForNative: function () {
    try {
      const provider = this.providePreferenceMenu;
      const raw = typeof provider === 'function' ? provider() : [];
      // Enforce sync array return; ignore promises for now
      const items = Array.isArray(raw) ? raw : [];
      return this._normalizeMenuItems(items, 'preferenceMenu');
    } catch (e) {
      console.error('Error in providePreferenceMenu:', e);
      return [];
    }
  },

  // Internal helper for registering persistent observers
  // Returns an unregister function to clean up the observer
  _registerObserver: function (handlerName, callback, payload) {
    if (typeof callback !== 'function') {
      throw new Error(`${handlerName} requires a function callback`);
    }

    const observerId = Math.random().toString(36).substring(2, 11);
    this.observers[observerId] = callback;
    this.observerHandlers[observerId] = handlerName;

    const handler = window?.webkit?.messageHandlers?.[handlerName];
    if (!handler) {
      console.warn(`${handlerName} handler not available`);
      // Return unregister function for consistency
      return () => this.unregisterObserver(observerId);
    }

    if (payload && typeof payload === 'object') {
      handler.postMessage({ observerId, ...payload });
    } else {
      handler.postMessage({ observerId });
    }

    // Return unregister function that hides the observerId
    return () => this.unregisterObserver(observerId);
  },

  // TODO: explore how we store this so it gets built
  swiftCallback: function (callbackId, result, error) {
    const cb = this.pendingSwiftCallbacks[callbackId];
    if (cb) {
      if (error) {
        // Parse error from Swift: { "type": "...", "code": "..." }
        let errorObj;
        try {
          errorObj = typeof error === 'string' ? JSON.parse(error) : error;
        } catch (e) {
          cb.reject(new CosmoError('unknown', 'UNKNOWN_ERROR', error));
          delete this.pendingSwiftCallbacks[callbackId];
          return;
        }

        // Create error instance from Swift error data
        cb.reject(new CosmoError(errorObj.type, errorObj.code, errorObj.message));
      } else {
        cb.resolve(result);
      }
    }
    delete this.pendingSwiftCallbacks[callbackId];
  },

  // Native calls this for observer callbacks (doesn't delete the callback)
  swiftObserverCallback: function (observerId, data) {
    const observer = this.observers[observerId];
    if (observer && typeof observer === 'function') {
      try {
        observer(data);
      } catch (e) {
        console.error(`Error in observer ${observerId}:`, e);
      }
    }
  },

  // Generic unregister for any observer type
  unregisterObserver: function (observerId) {
    const handlerName = this.observerHandlers[observerId];

    delete this.observers[observerId];
    delete this.observerHandlers[observerId];

    if (handlerName) {
      const unregisterHandlerName = handlerName.replace('register', 'unregister');
      const handler = window?.webkit?.messageHandlers?.[unregisterHandlerName];
      if (handler) {
        handler.postMessage(observerId);
      }
    }
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

  getCalendarEvents: async function (start, end) {
    return this._requestWithCallbackId('getCalendarEvents', { start, end });
  },

  /**
   * Request calendars from native.
   * Native should respond with Array<CalendarInfo> using the structure provided by the user.
   * @returns {Promise<Array<CalendarInfo>>}
   */
  getCalendars: async function () {
    return this._requestWithCallbackId('getCalendars');
  },

  // Return whether the system prefers 24-hour time format
  is24HourFormat: async function () {
    return this._requestWithCallbackId('is24HourFormat');
  },

  // Register an observer that native will call when calendar events change
  // Returns an unregister function: call it to stop observing
  registerEventChangeObserver: function (callback) {
    return this._registerObserver('registerEventChangeObserver', callback);
  }

}
