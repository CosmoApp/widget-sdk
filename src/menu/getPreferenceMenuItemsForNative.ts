import { NSMenuItemData } from './types';
import { normalizeMenuItems } from './normalizeMenu';

export function getPreferenceMenuItemsForNative(
  providePreferenceMenu?: () => NSMenuItemData[]
): NSMenuItemData[] {
  try {
    const raw = typeof providePreferenceMenu === 'function' ? providePreferenceMenu() : [];
    const items = Array.isArray(raw) ? raw : [];
    return normalizeMenuItems(items, 'preferenceMenu');
  } catch (e) {
    console.error('Error in providePreferenceMenu:', e);
    return [];
  }
}
