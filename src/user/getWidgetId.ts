import { requestWithCallbackId } from '../core/request';

export async function getWidgetId(): Promise<string> {
  return requestWithCallbackId('getWidgetId');
}
