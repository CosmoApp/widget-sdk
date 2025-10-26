import { requestWithCallbackId } from '../core/request';

export async function getSystemBattery(): Promise<any> {
  return requestWithCallbackId('getSystemBattery');
}
