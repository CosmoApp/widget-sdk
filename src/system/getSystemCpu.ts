import { requestWithCallbackId } from '../core/request';

export async function getSystemCpu(): Promise<any> {
  return requestWithCallbackId('getSystemCpu');
}