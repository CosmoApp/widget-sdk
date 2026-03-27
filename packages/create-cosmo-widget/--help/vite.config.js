import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';

function copyWidgetMeta() {
  let outDir = 'dist';
  let rootDir = process.cwd();
  return {
    name: 'copy-widget-meta',
    configResolved(config) {
      outDir = config.build.outDir;
      rootDir = config.root;
    },
    buildStart() {
      // Validate widget.config.json before build output
      const cfgPath = resolve(rootDir, 'widget.config.json');
      if (!existsSync(cfgPath)) {
        this.error('widget.config.json not found at project root.');
        return;
      }
      let cfg;
      try {
        cfg = JSON.parse(readFileSync(cfgPath, 'utf-8'));
      } catch (e) {
        this.error(`widget.config.json is not valid JSON: ${e.message}`);
        return;
      }
      const errors = validateWidgetConfig(cfg);
      if (errors.length) {
        this.error(`widget.config.json validation failed:\n- ${errors.join('\n- ')}`);
      }

      // Validate widget.preferences-template.json
      const prefsPath = resolve(rootDir, 'widget.preferences-template.json');
      if (existsSync(prefsPath)) {
        let prefs;
        try {
          prefs = JSON.parse(readFileSync(prefsPath, 'utf-8'));
        } catch (e) {
          this.error(`widget.preferences-template.json is not valid JSON: ${e.message}`);
          return;
        }
        const prefErrors = validatePreferencesTemplate(prefs);
        if (prefErrors.length) {
          this.error(`widget.preferences-template.json validation failed:\n- ${prefErrors.join('\n- ')}`);
        }
      }
    },
    closeBundle() {
      const targets = [
        'widget.config.json',
        'widget.preferences-template.json',
      ];
      const outPath = resolve(rootDir, outDir);
      mkdirSync(outPath, { recursive: true });
      for (const file of targets) {
        const src = resolve(rootDir, file);
        const dest = resolve(outPath, file);
        if (existsSync(src)) {
          copyFileSync(src, dest);
        }
      }
    },
  };
}

function validateWidgetConfig(cfg) {
  const errors = [];
  const expectType = (key, type) => {
    if (!(key in cfg)) errors.push(`${key} is required`);
    else if (typeof cfg[key] !== type) errors.push(`${key} must be ${type}`);
  };

  expectType('defaultWidth', 'number');
  expectType('defaultHeight', 'number');
  expectType('minWidth', 'number');
  expectType('minHeight', 'number');
  expectType('allowResize', 'boolean');
  expectType('keepAspectRatio', 'boolean');
  expectType('allowLockScreen', 'boolean');
  expectType('allowInternet', 'boolean');

  // Basic constraints
  if (typeof cfg.defaultWidth === 'number' && cfg.defaultWidth <= 0) errors.push('defaultWidth must be > 0');
  if (typeof cfg.defaultHeight === 'number' && cfg.defaultHeight <= 0) errors.push('defaultHeight must be > 0');
  if (typeof cfg.minWidth === 'number' && typeof cfg.defaultWidth === 'number' && cfg.minWidth > cfg.defaultWidth) errors.push('minWidth must be <= defaultWidth');
  if (typeof cfg.minHeight === 'number' && typeof cfg.defaultHeight === 'number' && cfg.minHeight > cfg.defaultHeight) errors.push('minHeight must be <= defaultHeight');

  if ('defaultPos' in cfg) {
    if (!Array.isArray(cfg.defaultPos) || cfg.defaultPos.length !== 2) {
      errors.push('defaultPos must be an array of 2 numbers');
    } else {
      const [x, y] = cfg.defaultPos;
      if (typeof x !== 'number' || typeof y !== 'number') {
        errors.push('defaultPos must contain numbers');
      } else if (x < 0 || x > 1 || y < 0 || y > 1) {
        errors.push('defaultPos coordinates must be between 0 and 1');
      }
    }
  }

  if ('backgroundBlurRadius' in cfg) {
    if (typeof cfg.backgroundBlurRadius !== 'number') {
      errors.push('backgroundBlurRadius must be a number');
    } else if (cfg.backgroundBlurRadius < 0) {
      errors.push('backgroundBlurRadius must be >= 0');
    }
  }

  return errors;
}

function validatePreferencesTemplate(prefs) {
  const errors = [];

  for (const [key, pref] of Object.entries(prefs)) {
    if (typeof pref !== 'object' || pref === null) {
      errors.push(`${key}: must be an object`);
      continue;
    }

    const p = pref;

    // Validate backgroundBlurRadii
    if ('backgroundBlurRadii' in p) {
      if (!Array.isArray(p.backgroundBlurRadii)) {
        errors.push(`${key}.backgroundBlurRadii: must be an array of numbers`);
      } else {
        if (p.backgroundBlurRadii.some((n) => typeof n !== 'number' || n < 0)) {
          errors.push(`${key}.backgroundBlurRadii: must contain non-negative numbers`);
        }

        // Check length matches options if options exist
        if (Array.isArray(p.options) && p.options.length !== p.backgroundBlurRadii.length) {
          errors.push(`${key}: backgroundBlurRadii length (${p.backgroundBlurRadii.length}) must match options length (${p.options.length})`);
        }
      }
    }

    // Validate control panel color modifiers
    if ('controlPanelBackgroundColors' in p) {
      if (!Array.isArray(p.controlPanelBackgroundColors)) {
        errors.push(`${key}.controlPanelBackgroundColors: must be an array of strings`);
      } else {
        if (p.controlPanelBackgroundColors.some((v) => typeof v !== 'string')) {
          errors.push(`${key}.controlPanelBackgroundColors: must contain strings`);
        }
        if (Array.isArray(p.options) && p.options.length !== p.controlPanelBackgroundColors.length) {
          errors.push(`${key}: controlPanelBackgroundColors length (${p.controlPanelBackgroundColors.length}) must match options length (${p.options.length})`);
        }
      }
    }

    if ('controlPanelTextColors' in p) {
      if (!Array.isArray(p.controlPanelTextColors)) {
        errors.push(`${key}.controlPanelTextColors: must be an array of strings`);
      } else {
        if (p.controlPanelTextColors.some((v) => typeof v !== 'string')) {
          errors.push(`${key}.controlPanelTextColors: must contain strings`);
        }
        if (Array.isArray(p.options) && p.options.length !== p.controlPanelTextColors.length) {
          errors.push(`${key}: controlPanelTextColors length (${p.controlPanelTextColors.length}) must match options length (${p.options.length})`);
        }
      }
    }
  }

  return errors;
}

export default defineConfig({
  plugins: [copyWidgetMeta()],
});
