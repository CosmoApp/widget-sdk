import { requestWithCallbackId } from '../core/request';

export async function getSystemMemory(): Promise<any> {
  return requestWithCallbackId('getSystemMemory');
}
