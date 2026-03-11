#!/usr/bin/env node
import { fileURLToPath } from 'url';
import { dirname, resolve, basename } from 'path';
import { existsSync, mkdirSync, readFileSync, writeFileSync, cpSync } from 'fs';
import { spawn } from 'child_process';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function log(msg) { console.log(msg); }
function run(cmd, args, cwd) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', cwd, shell: process.platform === 'win32' });
    child.on('close', (code) => code === 0 ? resolvePromise() : reject(new Error(`${cmd} ${args.join(' ')} failed with code ${code}`)));
  });
}

function ask(rl, question, defaultAnswer) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim() || defaultAnswer);
    });
  });
}

async function promptTemplate() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    log('\nSelect a framework:');
    log('  1) Vanilla');
    log('  2) React');
    log('  3) Vue');
    log('  4) Webpage');
    const frameworkChoice = await ask(rl, '\nEnter your choice (1-4, default: 1): ', '1');
    let framework = 'vanilla';
    if (frameworkChoice === '2') framework = 'react';
    if (frameworkChoice === '3') framework = 'vue';
    if (frameworkChoice === '4') return 'webpage';

    log('\nUse TypeScript?');
    log('  1) Yes');
    log('  2) No');
    const tsChoice = await ask(rl, '\nEnter your choice (1-2, default: 1): ', '1');
    const isTs = tsChoice === '1';

    log('\nAdd Tailwind CSS?');
    log('  1) Yes');
    log('  2) No');
    const tailwindChoice = await ask(rl, '\nEnter your choice (1-2, default: 1): ', '1');
    const isTailwind = tailwindChoice === '1';

    let template = framework;
    if (isTs) template += '-ts';
    if (isTailwind) template += '-tailwind';

    return template;
  } finally {
    rl.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  let rawTarget = null;
  let template = null;

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--template' || args[i] === '-t') {
      template = args[i + 1];
      i++; // Skip next arg
    } else if (!args[i].startsWith('-')) {
      rawTarget = args[i];
    }
  }

  // Prompt for project name if not provided
  if (!rawTarget) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    try {
      rawTarget = await ask(rl, '\nProject name (default: my-widget): ', 'my-widget');
    } finally {
      rl.close();
    }
  }

  const targetDir = resolve(process.cwd(), rawTarget);
  const appName = basename(targetDir);

  if (existsSync(targetDir) && existsSync(resolve(targetDir, 'package.json'))) {
    log(`\nAbort: target directory already contains a project: ${targetDir}`);
    process.exit(1);
  }
  if (!existsSync(targetDir)) {
    mkdirSync(targetDir, { recursive: true });
  }

  // Prompt for Widget Display Name
  const rlName = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  let widgetDisplayName;
  try {
    widgetDisplayName = await ask(rlName, '\nWidget Display Name (default: My Widget): ', 'My Widget');
  } finally {
    rlName.close();
  }

  // Prompt for template if not provided
  if (!template) {
    template = await promptTemplate();
  }

  // Validate template
  const validTemplates = [
    'vanilla', 'vanilla-ts',
    'react', 'react-ts',
    'vue', 'vue-ts',
    'vanilla-tailwind', 'vanilla-ts-tailwind',
    'react-tailwind', 'react-ts-tailwind',
    'vue-tailwind', 'vue-ts-tailwind',
    'webpage'
  ];
  if (!validTemplates.includes(template)) {
    log(`\nError: Invalid template "${template}". Valid options: ${validTemplates.join(', ')}`);
    process.exit(1);
  }

  const templateDir = resolve(__dirname, '../templates', `template-${template}`);

  if (!existsSync(templateDir)) {
    log(`\nError: Template directory not found: ${templateDir}`);
    process.exit(1);
  }

  // Copy template
  cpSync(templateDir, targetDir, { recursive: true });

  // Patch package name
  const pkgPath = resolve(targetDir, 'package.json');
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    pkg.name = appName;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
  } catch (e) {
    log('Warning: failed to set project name in package.json');
  }

  // Patch widget.config.json name
  const configPath = resolve(targetDir, 'widget.config.json');
  if (existsSync(configPath)) {
    try {
      const config = JSON.parse(readFileSync(configPath, 'utf-8'));
      config.name = widgetDisplayName; // Use user-provided display name
      writeFileSync(configPath, JSON.stringify(config, null, 2));
    } catch (e) {
      log('Warning: failed to set widget name in widget.config.json');
    }
  }

  // Rename _gitignore to .gitignore
  const gitignorePath = resolve(targetDir, '_gitignore');
  if (existsSync(gitignorePath)) {
    try {
      const { renameSync } = await import('fs');
      renameSync(gitignorePath, resolve(targetDir, '.gitignore'));
    } catch (e) {
      log('Warning: failed to rename _gitignore to .gitignore');
    }
  }

  // Install deps (best-effort)
  log('\nInstalling dependencies...');
  const ua = process.env.npm_config_user_agent || '';
  const pm = ua.includes('pnpm') ? 'pnpm' : ua.includes('yarn') ? 'yarn' : 'npm';
  try {
    if (pm === 'yarn') {
      await run('yarn', ['install'], targetDir);
    } else if (pm === 'pnpm') {
      await run('pnpm', ['install'], targetDir);
    } else {
      await run('npm', ['install'], targetDir);
    }
  } catch {
    log('Install failed. You can run install manually inside the project folder.');
  }

  log(`\nDone. Next steps:\n  cd ${appName}\n  ${pm} run dev\n`);
}

main().catch((e) => { console.error(e); process.exit(1); });

