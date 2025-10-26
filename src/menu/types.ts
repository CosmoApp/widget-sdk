export type NSMenuItemState = 'on' | 'off' | 'mixed';

export interface NSMenuItemData {
  id: string;
  title: string;
  enabled?: boolean;
  isSectionHeader?: boolean;
  state?: NSMenuItemState;
  keyEquivalent?: string;
  keyModifiers?: string[];
  submenu?: NSMenuItemData[];
  representedObject?: any;
}