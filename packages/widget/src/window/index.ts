import { requestWithCallbackId } from "../core/request.js";

declare global {
  interface Window {
    webkit?: {
      messageHandlers?: {
        setWindowSize?: {
          postMessage: (message: any) => void;
        };
        setWindowPosition?: {
          postMessage: (message: any) => void;
        };
      };
    };
  }
}

export interface WindowSize {
  width: number;
  height: number;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface WindowPositionProportional {
  /** X position as a proportion (0-1) relative to the main screen width. 0 = left edge, 1 = right edge. */
  x: number;
  /** Y position as a proportion (0-1) relative to the main screen height. 0 = bottom edge, 1 = top edge. */
  y: number;
  /** When true, x and y are treated as proportions (0-1) and reference the center of the window. */
  proportional: true;
}

/**
 * Gets the current size of the widget window.
 * @returns A promise that resolves to the window size.
 */
export async function getWindowSize(): Promise<WindowSize> {
  return requestWithCallbackId("getWindowSize");
}

/**
 * Sets the size of the widget window.
 * @param size The new size for the window.
 */
export function setWindowSize(size: WindowSize): void {
  if (window.webkit?.messageHandlers?.setWindowSize) {
    window.webkit.messageHandlers.setWindowSize.postMessage(size);
  } else {
    console.warn("setWindowSize handler not available");
  }
}

/**
 * Gets the current position of the widget window.
 * @returns A promise that resolves to the window position (bottom-left corner).
 */
export async function getWindowPosition(): Promise<WindowPosition> {
  return requestWithCallbackId("getWindowPosition");
}

/**
 * Sets the position of the widget window.
 *
 * Can be called in two ways:
 * 1. With exact coordinates: `{ x, y }` - positions the window's bottom-left corner at the given screen coordinates.
 * 2. With proportional coordinates: `{ x, y, proportional: true }` - x and y are 0-1 values relative to the main screen,
 *    where (0, 0) is the bottom-left and (1, 1) is the top-right. The position references the **center** of the window.
 *
 * @param position The new position for the window.
 */
export function setWindowPosition(
  x: number,
  y: number,
  options?: { proportional?: boolean }
): void {
  if (window.webkit?.messageHandlers?.setWindowPosition) {
    const message = options?.proportional
      ? { x, y, proportional: true }
      : { x, y };
    window.webkit.messageHandlers.setWindowPosition.postMessage(message);
  } else {
    console.warn("setWindowPosition handler not available");
  }
}
