// Normalize an array of raw menu items
export function normalizeMenuItems(items, key) {
  if (!Array.isArray(items)) return [];
  return items.map((it, idx) => {
    const ensured = { ...it };
    if (!ensured.id) ensured.id = `${key}:${(ensured.title || 'item')}#${idx}`;
    if (Array.isArray(ensured.submenu)) {
      ensured.submenu = ensured.submenu.map((subIt, sIdx) => ({
        ...subIt,
        id: subIt.id || `${ensured.id}>${subIt.title || 'item'}#${sIdx}`
      }));
    }
    return ensured;
  });
}

export function getPreferenceMenuItemsForNative(provider) {
  try {
    const raw = typeof provider === 'function' ? provider() : [];
    return normalizeMenuItems(Array.isArray(raw) ? raw : [], 'preferenceMenu');
  } catch (e) {
    console.error('Error in providePreferenceMenu:', e);
    return [];
  }
}
