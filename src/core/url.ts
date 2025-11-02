import { requestWithCallbackId } from './request';

export function openUrl(url: string): void {
  (window as any).webkit.messageHandlers.openUrl.postMessage(url);
}

export function openCosmoUrl(path: string): void {
  (window as any).webkit.messageHandlers.openCosmoUrl.postMessage(path);
}

export async function getCosmoUrl(path: string): Promise<string> {
  return requestWithCallbackId('getCosmoUrl', { path });
}
