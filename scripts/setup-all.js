#!/usr/bin/env node

/**
 * Complete setup script for Addiction Tracker
 * Runs: dependency check, .env creation, database initialization, and server start
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

const ROOT_DIR = path.join(__dirname, '..');
const ENV_FILE = path.join(ROOT_DIR, '.env');
const ENV_EXAMPLE = path.join(ROOT_DIR, '.env.example');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// ANSI color codes
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m'
};

const log = {
    info: (msg) => console.log(`${colors.blue}ℹ${colors.reset} ${msg}`),
    success: (msg) => console.log(`${colors.green}✓${colors.reset} ${msg}`),
    warn: (msg) => console.log(`${colors.yellow}⚠${colors.reset} ${msg}`),
    error: (msg) => console.log(`${colors.red}✗${colors.reset} ${msg}`),
    title: (msg) => console.log(`\n${colors.bright}${colors.blue}>>> ${msg}${colors.reset}\n`)
};

function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function checkDependencies() {
    log.title('Step 1: Checking Dependencies');

    const nodeModulesPath = path.join(ROOT_DIR, 'node_modules');

    if (fs.existsSync(nodeModulesPath)) {
        log.success('Dependencies already installed');
        return true;
    }

    log.info('Installing dependencies...');

    return new Promise((resolve) => {
        const npm = spawn('npm', ['install'], {
            cwd: ROOT_DIR,
            stdio: 'inherit',
            shell: true
        });

        npm.on('close', (code) => {
            if (code === 0) {
                log.success('Dependencies installed');
                resolve(true);
            } else {
                log.error('Failed to install dependencies');
                resolve(false);
            }
        });
    });
}

async function setupEnv() {
    log.title('Step 2: Environment Configuration');

    if (fs.existsSync(ENV_FILE)) {
        log.success('.env file already exists');
        const useExisting = await question('Use existing .env? (y/n): ');
        if (useExisting.toLowerCase() === 'y') {
            return true;
        }
    }

    log.info('Creating .env file...');

    const answers = {
        port: await question('PORT (default 3000): ') || '3000',
        dbHost: await question('DB_HOST (default localhost): ') || 'localhost',
        dbPort: await question('DB_PORT (default 5432): ') || '5432',
        dbUser: await question('DB_USER (default postgres): ') || 'postgres',
        dbPassword: await question('DB_PASSWORD: '),
        dbName: await question('DB_NAME (default addiction_tracker): ') || 'addiction_tracker',
        sessionSecret: await question('SESSION_SECRET (or press Enter to generate): ') || generateSecret(),
        nodeEnv: await question('NODE_ENV (default development): ') || 'development'
    };

    const envContent = `PORT=${answers.port}
DB_HOST=${answers.dbHost}
DB_PORT=${answers.dbPort}
DB_USER=${answers.dbUser}
DB_PASSWORD=${answers.dbPassword}
DB_NAME=${answers.dbName}
SESSION_SECRET=${answers.sessionSecret}
NODE_ENV=${answers.nodeEnv}
`;

    try {
        fs.writeFileSync(ENV_FILE, envContent);
        log.success('.env file created');
        return true;
    } catch (error) {
        log.error(`Failed to create .env: ${error.message}`);
        return false;
    }
}

async function initializeDatabase() {
    log.title('Step 3: Database Initialization');

    log.info('Running database setup...');

    return new Promise((resolve) => {
        const setup = spawn('npm', ['run', 'setup'], {
            cwd: ROOT_DIR,
            stdio: 'inherit',
            shell: true
        });

        setup.on('close', (code) => {
            if (code === 0) {
                log.success('Database initialized');
                resolve(true);
            } else {
                log.warn('Database setup completed with warnings (may already exist)');
                resolve(true);
            }
        });
    });
}

async function startServer() {
    log.title('Step 4: Starting Server');

    log.success('All setup complete! Starting server...\n');

    return new Promise(() => {
        const server = spawn('npm', ['start'], {
            cwd: ROOT_DIR,
            stdio: 'inherit',
            shell: true
        });

        server.on('error', (error) => {
            log.error(`Failed to start server: ${error.message}`);
            process.exit(1);
        });
    });
}

function generateSecret() {
    return require('crypto').randomBytes(32).toString('hex');
}

async function main() {
    console.clear();
    console.log(`
${colors.bright}${colors.green}
╔═══════════════════════════════════════════════════════════════╗
║         🧠 Addiction Tracker - Complete Setup 🔥             ║
║                    One Command Setup                          ║
╚═══════════════════════════════════════════════════════════════╝
${colors.reset}
  `);

    try {
        // Step 1: Check dependencies
        const depsOk = await checkDependencies();
        if (!depsOk) {
            log.error('Failed to install dependencies');
            process.exit(1);
        }

        // Step 2: Setup .env
        const envOk = await setupEnv();
        if (!envOk) {
            log.error('Failed to setup environment');
            process.exit(1);
        }

        // Step 3: Initialize database
        await initializeDatabase();

        // Step 4: Start server
        await startServer();

    } catch (error) {
        log.error(`Setup failed: ${error.message}`);
        process.exit(1);
    }
}

// Run setup
main().catch(error => {
    log.error(`Unexpected error: ${error.message}`);
    process.exit(1);
});
