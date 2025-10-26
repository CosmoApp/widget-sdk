import { NSMenuItemData } from './types';

export class NSMenuItem {
  id: string;
  title: string;
  enabled: boolean;
  state: string;
  keyEquivalent: string;
  keyModifiers: string[];
  representedObject: any;
  submenu?: NSMenuItem[];

  constructor(data: NSMenuItemData) {
    this.id = String(data?.id || '');
    this.title = String(data?.title || '');
    this.enabled = data?.enabled !== false;
    this.state = data?.state || 'off';
    this.keyEquivalent = data?.keyEquivalent || '';
    this.keyModifiers = Array.isArray(data?.keyModifiers) ? data.keyModifiers.slice(0) : [];
    this.representedObject = data?.representedObject;
    this.submenu = Array.isArray(data?.submenu) ? data.submenu.map(it => new NSMenuItem(it)) : undefined;
    Object.freeze(this);
  }
}