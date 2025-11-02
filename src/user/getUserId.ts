import { requestWithCallbackId } from '../core/request';

export async function getUserId(): Promise<string> {
  return requestWithCallbackId('getUserId');
}
