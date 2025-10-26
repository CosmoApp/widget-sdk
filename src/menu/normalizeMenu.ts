import { NSMenuItemData } from './types';

export function normalizeMenuItems(items: NSMenuItemData[], key: string): NSMenuItemData[] {
  if (!Array.isArray(items)) return [];
  return items.map((it, idx) => {
    const ensured = { ...it };
    if (!ensured.id) ensured.id = `${key}:${(ensured.title || 'item').toString()}#${idx}`;
    if (Array.isArray(ensured.submenu)) {
      ensured.submenu = ensured.submenu.map((subIt, sIdx) => {
        const subEnsured = { ...subIt };
        if (!subEnsured.id) subEnsured.id = `${ensured.id}>${(subEnsured.title || 'item').toString()}#${sIdx}`;
        return subEnsured;
      });
    }
    return ensured;
  });
}

export function normalizeMenuItem(item: NSMenuItemData, key: string): NSMenuItemData | undefined {
  if (!item || typeof item !== 'object') return undefined;
  const ensured = { ...item };
  if (!ensured.id) ensured.id = `${key}:${(ensured.title || 'item').toString()}#0`;
  if (Array.isArray(ensured.submenu)) {
    ensured.submenu = ensured.submenu.map((subIt, sIdx) => {
      const subEnsured = { ...subIt };
      if (!subEnsured.id) subEnsured.id = `${ensured.id}>${(subEnsured.title || 'item').toString()}#${sIdx}`;
      return subEnsured;
    });
  }
  return ensured;
}
