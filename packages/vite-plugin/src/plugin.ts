import type {
  Logger,
  Plugin,
  PreviewServer,
  ViteDevServer,
} from 'vite';
import { spawnSync } from 'child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export interface CosmoPluginOptions {
  /**
   * If true, the plugin will not attempt to notify the Cosmo app
   * that the dev server is running.
   * @default false
   */
  serverOnly?: boolean;

  /**
   * The path to the widget project root.
   * Defaults to the Vite root.
   */
  widgetPath?: string;
}

const DEV_CLIENT_LOG_ENDPOINT = '/__cosmo/client-log';
const DEV_CLIENT_LOG_PREFIX = '[cosmo-widget-client]';

function validateWidgetConfig(cfg: any): string[] {
  const errors: string[] = [];
  const expectType = (key: string, type: string) => {
    if (!(key in cfg)) errors.push(`${key} is required`);
    else if (typeof cfg[key] !== type) errors.push(`${key} must be ${type}`);
  };

  expectType('minCosmoVersion', 'string');
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

  if (cfg.mode && !['standard', 'webpage'].includes(cfg.mode)) {
    errors.push('mode must be either "standard" or "webpage"');
  }

  if (cfg.mode === 'webpage') {
    if (!cfg.webpage) {
      errors.push('webpage config object is required when mode is "webpage"');
    } else {
      if (typeof cfg.webpage.targetURL !== 'string') {
        errors.push('webpage.targetURL must be a string');
      }
      if ('useBrowserCookies' in cfg.webpage && typeof cfg.webpage.useBrowserCookies !== 'boolean') {
        errors.push('webpage.useBrowserCookies must be a boolean');
      }
    }
  } else {
    // Standard mode (default)
    if (cfg.webpage) {
       // Optional: warn or error if webpage config is present in standard mode?
       // For now, let's just ignore it or we could error to stay clean.
       // errors.push('webpage config should not be present when mode is "standard"');
    }
  }

  return errors;
}

function validatePreferencesTemplate(prefs: any): string[] {
  const errors: string[] = [];
  
  for (const [key, pref] of Object.entries(prefs)) {
    if (typeof pref !== 'object' || pref === null) {
      errors.push(`${key}: must be an object`);
      continue;
    }
    
    const p = pref as any;
    
    // Validate backgroundBlurRadii
    if ('backgroundBlurRadii' in p) {
      if (!Array.isArray(p.backgroundBlurRadii)) {
        errors.push(`${key}.backgroundBlurRadii: must be an array of numbers`);
      } else {
        if (p.backgroundBlurRadii.some((n: any) => typeof n !== 'number' || n < 0)) {
          errors.push(`${key}.backgroundBlurRadii: must contain non-negative numbers`);
        }
        
        // Check length matches options if options exist
        if (Array.isArray(p.options) && p.options.length !== p.backgroundBlurRadii.length) {
          errors.push(`${key}: backgroundBlurRadii length (${p.backgroundBlurRadii.length}) must match options length (${p.options.length})`);
        }
      }
    }

  }
  
  return errors;
}

export function cosmo(options: CosmoPluginOptions = {}): Plugin {
  let outDir = 'dist';
  let rootDir = process.cwd();

  return {
    name: 'vite-plugin-cosmo',
    enforce: 'post', // Ensure we run after other plugins
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
      } catch (e: any) {
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
        } catch (e: any) {
          this.error(`widget.preferences-template.json is not valid JSON: ${e.message}`);
          return;
        }
        const prefErrors = validatePreferencesTemplate(prefs);
        if (prefErrors.length) {
          this.error(`widget.preferences-template.json validation failed:\n- ${prefErrors.join('\n- ')}`);
        }
      }
    },
    writeBundle() {
      const targets = [
        'widget.config.json',
        'widget.preferences-template.json',
      ];
      const outPath = resolve(rootDir, outDir);
      
      // Ensure output directory exists
      if (!existsSync(outPath)) {
          mkdirSync(outPath, { recursive: true });
      }
      
      for (const file of targets) {
        const src = resolve(rootDir, file);
        const dest = resolve(outPath, file);
        if (existsSync(src)) {
          copyFileSync(src, dest);
          console.log(`[vite-plugin-cosmo] Copied ${file} to ${outDir}`);
        } else if (file === 'widget.config.json') {
          console.warn(`[vite-plugin-cosmo] Warning: ${file} not found at ${src}`);
        }
      }
    },
    configureServer(server: ViteDevServer) {
      registerDevClientLogEndpoint(server);

      server.httpServer?.once('listening', () => {
        if (!options.serverOnly) {
          const widgetPath = options.widgetPath || server.config.root;
          const devServerUrl = getDevServerUrl(server);
          notifyCosmo(widgetPath, devServerUrl);
        }
      });
    },
    configurePreviewServer(server: PreviewServer) {
      registerDevClientLogEndpoint(server);

      server.httpServer?.once('listening', () => {
        if (!options.serverOnly) {
          const widgetPath = options.widgetPath || server.config.root;
          const devServerUrl = getDevServerUrl(server);
          notifyCosmo(widgetPath, devServerUrl);
        }
      });
    }
  };
}

function registerDevClientLogEndpoint(server: Pick<ViteDevServer, 'config' | 'middlewares'>) {
  server.middlewares.use((req, res, next) => {
    const requestPath = req.url ? req.url.split('?')[0] : '';

    if (req.method !== 'POST' || requestPath !== DEV_CLIENT_LOG_ENDPOINT) {
      next();
      return;
    }

    let rawBody = '';
    req.setEncoding('utf8');

    req.on('data', (chunk) => {
      rawBody += chunk;
    });

    req.on('end', () => {
      const payload = parseDevClientLogPayload(rawBody);
      const formattedMessage = formatDevClientLogMessage(payload);
      logDevClientMessage(server.config.logger, payload.level, formattedMessage);

      res.statusCode = 204;
      res.end();
    });

    req.on('error', (error) => {
      server.config.logger.error(
        `${DEV_CLIENT_LOG_PREFIX} failed to read client log payload: ${error.message}`,
      );
      res.statusCode = 400;
      res.end();
    });
  });
}

function parseDevClientLogPayload(rawBody: string): { level: string; message: string; details?: unknown } {
  try {
    const parsed = JSON.parse(rawBody);
    const level = typeof parsed?.level === 'string' ? parsed.level : 'info';
    const message = typeof parsed?.message === 'string' ? parsed.message : 'client event';
    return {
      level,
      message,
      details: parsed?.details,
    };
  } catch {
    return {
      level: 'warn',
      message: 'received malformed client log payload',
      details: rawBody,
    };
  }
}

function formatDevClientLogMessage(payload: { message: string; details?: unknown }): string {
  const details = formatDevClientLogDetails(payload.details);
  return details
    ? `${DEV_CLIENT_LOG_PREFIX} ${payload.message} ${details}`
    : `${DEV_CLIENT_LOG_PREFIX} ${payload.message}`;
}

function formatDevClientLogDetails(details: unknown): string {
  if (details == null) {
    return '';
  }

  if (typeof details === 'string') {
    return details;
  }

  try {
    return JSON.stringify(details);
  } catch {
    return String(details);
  }
}

function logDevClientMessage(logger: Logger, level: string, message: string) {
  switch (level) {
    case 'error':
      logger.error(message);
      break;
    case 'warn':
      logger.warn(message);
      break;
    default:
      logger.info(message);
      break;
  }
}

function getDevServerUrl(server: ViteDevServer | PreviewServer): string {
  const address = server.httpServer?.address();
  const isHttps = !!server.config.server.https;
  const protocol = isHttps ? 'https' : 'http';

  if (address && typeof address !== 'string') {
    const port = address.port;
    // Use resolvedUrls if available (Vite 2.9.0+)
    if (server.resolvedUrls?.local?.[0]) {
       return server.resolvedUrls.local[0];
    }
    return `${protocol}://localhost:${port}`;
  }
  return '';
}

function notifyCosmo(widgetPath: string, devServerUrl: string) {
  console.log('Creating a dev widget on the desktop. Ensure Cosmo is running and Developer Mode is enabled.');
  
  const params = new URLSearchParams({
    path: widgetPath,
    server: devServerUrl,
  });
  const cosmoUrl = `cosmo://devmode?${params.toString()}`;
  
  const script = `
    tell application "Cosmo"
      activate
      open location "${cosmoUrl}"
    end tell
  `;
  
  try {
    const result = spawnSync('osascript', ['-e', script], { stdio: 'inherit' });
    if (result.status !== 0) {
      console.warn('Failed to run widget in dev mode. Make sure Cosmo is running and Developer Mode is enabled.');
    }
  } catch (e) {
    console.error('Failed to notify Cosmo:', e);
  }
}
