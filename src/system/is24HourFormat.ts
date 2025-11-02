import { requestWithCallbackId } from '../core/request';

export async function is24HourFormat(): Promise<boolean> {
  return requestWithCallbackId('is24HourFormat');
}
