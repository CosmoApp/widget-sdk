export const openUrl = (url) =>
  window?.webkit?.messageHandlers?.openUrl?.postMessage(url);

export const openCosmoUrl = (path) =>
  window?.webkit?.messageHandlers?.openCosmoUrl?.postMessage(path);

import { requestWithCallbackId } from './nativeBridge.js';
export const getCosmoUrl = (path) =>
  requestWithCallbackId('getCosmoUrl', { path });
