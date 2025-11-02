import { requestWithCallbackId } from '../core/request';
import { CalendarInfo } from './types';

export async function getCalendars(): Promise<CalendarInfo[]> {
  return requestWithCallbackId('getCalendars');
}