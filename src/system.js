import { requestWithCallbackId } from './nativeBridge.js';

export const getSystemMemory = () => requestWithCallbackId('getSystemMemory');
export const getSystemCpu = () => requestWithCallbackId('getSystemCpu');
export const getSystemBattery = () => requestWithCallbackId('getSystemBattery');
export const is24HourFormat = () => requestWithCallbackId('is24HourFormat');
export const getUserId = () => requestWithCallbackId('getUserId');
export const getWidgetId = () => requestWithCallbackId('getWidgetId');
