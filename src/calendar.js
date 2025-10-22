import { requestWithCallbackId } from './nativeBridge.js';
import { registerObserver } from './observers.js';

export const getCalendars = () => requestWithCallbackId('getCalendars');

export const getCalendarEvents = (start, end) =>
  requestWithCallbackId('getCalendarEvents', { start, end });

export const registerEventChangeObserver = (callback) =>
  registerObserver('registerEventChangeObserver', callback);
