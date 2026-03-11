#!/usr/bin/env node

import { program } from 'commander';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import archiver from 'archiver';
import axios from 'axios';
import http from 'http';


const UPLOAD_URL_ENDPOINT = process.env.COSMO_UPLOAD_URL_ENDPOINT || 'https://od8wzcssy7.execute-api.us-west-2.amazonaws.com/Prod/generate-upload-url';
const AUTH_WEB_URL = process.env.COSMO_AUTH_WEB_URL || 'https://buildcosmo.com/cli-auth';
const CALLBACK_PORT = 8789;
const CONFIG_DIR = path.join(os.homedir(), '.cosmo');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

program
    .name('cosmo')
    .description('Cosmo Widget CLI')
    .version('0.1.0');

program
    .command('publish')
    .description('Build and publish a widget to Cosmo')
    .action(async () => {
        try {
            console.log('🔨 Building widget...');

            // Run build
            execSync('npm run build', { stdio: 'inherit' });

            // Read package.json for metadata
            const packagePath = path.join(process.cwd(), 'package.json');
            if (!fs.existsSync(packagePath)) {
                throw new Error('package.json not found in current directory');
            }
            const packageJson = JSON.parse(fs.readFileSync(packagePath, 'utf8'));

            // Read widget config for version
            const configPath = path.join(process.cwd(), 'widget.config.json');
            if (!fs.existsSync(configPath)) {
                throw new Error('widget.config.json not found in current directory');
            }
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

            // Generate widget ID from package name (e.g., "@user/my-widget" -> "my-widget")
            const widgetId = packageJson.name.split('/').pop();
            const version = config.version || packageJson.version;
            const name = packageJson.name;
            const description = packageJson.description || '';

            if (!widgetId || !version) {
                throw new Error('Could not determine widget ID or version');
            }

            console.log(`📦 Packaging widget: ${name} v${version}`);

            // Create zip file
            const distPath = path.join(process.cwd(), 'dist');
            if (!fs.existsSync(distPath)) {
                throw new Error('dist directory not found. Build may have failed.');
            }

            const zipPath = path.join(process.cwd(), `${widgetId}-${version}.zip`);
            await createZip(distPath, zipPath);

            console.log('🔐 Requesting upload URL...');

            // Get authentication token
            let token = process.env.COSMO_AUTH_TOKEN || getToken();

            // In CI environments, we should never attempt interactive login
            const isCI = process.env.CI === 'true' || process.env.CI === '1';

            if (!token || (isTokenExpired(token) && !process.env.COSMO_AUTH_TOKEN)) {
                if (process.env.COSMO_AUTH_TOKEN) {
                    throw new Error('COSMO_AUTH_TOKEN is invalid or expired (401)');
                }

                if (isCI) {
                    throw new Error('Authentication required. Please set COSMO_AUTH_TOKEN environment variable in CI.');
                }

                console.log('⚠️  Not authenticated or session expired. Starting login flow...');
                token = await startAuthFlow();
                saveToken(token);
                console.log('✅ Login successful!');
            }

            // Get upload URL
            let uploadUrlResponse;
            try {
                uploadUrlResponse = await axios.get(UPLOAD_URL_ENDPOINT, {
                    params: {
                        type: 'widget',
                        widgetId,
                        version,
                        name: name || '',
                        description: description || ''
                    },
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });
            } catch (error) {
                if (error.response && error.response.status === 401) {
                    if (process.env.COSMO_AUTH_TOKEN) {
                        throw new Error('COSMO_AUTH_TOKEN is invalid or expired (401)');
                    }
                    console.log('⚠️  Session expired. Re-authenticating...');
                    token = await startAuthFlow();
                    saveToken(token);
                    console.log('✅ Login successful! Retrying publish...');

                    // Retry request with new token
                    uploadUrlResponse = await axios.get(UPLOAD_URL_ENDPOINT, {
                        params: {
                            type: 'widget',
                            widgetId,
                            version,
                            name: name || '',
                            description: description || ''
                        },
                        headers: {
                            'Authorization': `Bearer ${token}`
                        }
                    });
                } else {
                    throw error;
                }
            }

            const { uploadUrl } = uploadUrlResponse.data;

            console.log('⬆️  Uploading widget...');

            // Upload zip file
            const zipData = fs.readFileSync(zipPath);
            await axios.put(uploadUrl, zipData, {
                headers: {
                    'Content-Type': 'application/zip'
                }
            });

            // Clean up zip file
            fs.unlinkSync(zipPath);

            console.log('✅ Widget published successfully!');
            console.log(`   Widget ID: ${widgetId}`);
            console.log(`   Version: ${version}`);

        } catch (error) {
            console.error('❌ Publishing failed:', error.message);
            process.exit(1);
        }
    });

// Login command
program
    .command('login')
    .description('Authenticate with Cosmo to publish widgets')
    .action(async () => {
        try {
            console.log('🔐 Opening browser for authentication...');

            const token = await startAuthFlow();
            saveToken(token);

            console.log('✅ Login successful!');
            console.log('   You can now publish widgets with "cosmo publish"');
        } catch (error) {
            console.error('❌ Login failed:', error.message);
            process.exit(1);
        }
    });

// Logout command
program
    .command('logout')
    .description('Remove authentication credentials')
    .action(() => {
        try {
            deleteToken();
            console.log('✅ Logged out successfully');
        } catch (error) {
            console.error('❌ Logout failed:', error.message);
            process.exit(1);
        }
    });



program.parse(process.argv);

/**
 * Create a zip archive from a directory
 */
function createZip(sourceDir, outputPath) {
    return new Promise((resolve, reject) => {
        const output = fs.createWriteStream(outputPath);
        const archive = archiver('zip', { zlib: { level: 9 } });

        output.on('close', () => resolve());
        archive.on('error', (err) => reject(err));

        archive.pipe(output);

        // Add dist directory contents to root
        archive.directory(sourceDir, false);

        // Add marketplace directory if it exists
        const marketplacePath = path.join(process.cwd(), 'marketplace');
        if (fs.existsSync(marketplacePath)) {
            console.log('   Note: Including marketplace assets');
            archive.directory(marketplacePath, 'marketplace');
        }

        // Add root files
        const rootFiles = ['README.md', 'widget.config.json', 'widget.preferences-template.json'];
        for (const file of rootFiles) {
            const filePath = path.join(process.cwd(), file);
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: file });
            }
        }

        archive.finalize();
    });
}

/**
 * Start OAuth-style authentication flow with local callback server
 */
function startAuthFlow() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            const url = new URL(req.url, `http://localhost:${CALLBACK_PORT}`);
            const token = url.searchParams.get('token');

            if (token) {
                // Send success page to browser
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`
                    <!DOCTYPE html>
                    <html>
                    <head><title>Cosmo CLI - Authentication Successful</title></head>
                    <body style="font-family: system-ui; text-align: center; padding: 50px;">
                        <h1>✅ Authentication Successful</h1>
                        <p>You can close this tab and return to the terminal.</p>
                    </body>
                    </html>
                `);

                server.close();
                resolve(token);
            } else {
                // Invalid request
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end('Invalid request');
            }
        });

        server.listen(CALLBACK_PORT, 'localhost', () => {
            const authUrl = `${AUTH_WEB_URL}?callback=http://localhost:${CALLBACK_PORT}`;

            // Open browser (macOS)
            try {
                execSync(`open "${authUrl}"`, { stdio: 'ignore' });
            } catch (error) {
                console.log(`\nPlease open this URL in your browser:\n${authUrl}\n`);
            }
        });

        // Timeout after 5 minutes
        setTimeout(() => {
            server.close();
            reject(new Error('Authentication timeout - please try again'));
        }, 5 * 60 * 1000);
    });
}

/**
 * Save authentication token to config file
 */
function saveToken(token) {
    if (!fs.existsSync(CONFIG_DIR)) {
        fs.mkdirSync(CONFIG_DIR, { recursive: true, mode: 0o700 });
    }

    fs.writeFileSync(CONFIG_FILE, JSON.stringify({ token }, null, 2), { mode: 0o600 });
}

/**
 * Read authentication token from config file
 */
function getToken() {
    if (!fs.existsSync(CONFIG_FILE)) {
        return null;
    }

    try {
        const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
        return config.token;
    } catch (error) {
        return null;
    }
}

/**
 * Delete authentication token
 */
function deleteToken() {
    if (fs.existsSync(CONFIG_FILE)) {
        fs.unlinkSync(CONFIG_FILE);
    }
}

/**
 * Check if JWT token is expired or close to expiring (within 60 seconds)
 */
function isTokenExpired(token) {
    try {
        const payloadBase64 = token.split('.')[1];
        if (!payloadBase64) return true;

        const payloadJson = Buffer.from(payloadBase64, 'base64').toString();
        const payload = JSON.parse(payloadJson);

        if (!payload.exp) return false;

        // Check if expired or expiring in next 60 seconds
        const now = Math.floor(Date.now() / 1000);
        return payload.exp < (now + 60);
    } catch (e) {
        return true; // Assume expired if invalid
    }
}

