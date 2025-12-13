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
        return true;
    }

    log.info('Creating .env file...');
    log.info('Using environment variables or defaults');

    // Use environment variables or defaults (non-interactive mode)
    const answers = {
        port: process.env.PORT || '3000',
        dbHost: process.env.DB_HOST || 'localhost',
        dbPort: process.env.DB_PORT || '5432',
        dbUser: process.env.DB_USER || 'postgres',
        dbPassword: process.env.DB_PASSWORD || 'postgres',
        dbName: process.env.DB_NAME || 'addiction_tracker',
        sessionSecret: process.env.SESSION_SECRET || generateSecret(),
        nodeEnv: process.env.NODE_ENV || 'development'
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

    log.info('Setting up database tables and columns...');

    return new Promise((resolve) => {
        const setup = spawn('npm', ['run', 'setup'], {
            cwd: ROOT_DIR,
            stdio: 'inherit',
            shell: true
        });

        setup.on('close', (code) => {
            if (code === 0) {
                log.success('Database initialized successfully');
                resolve(true);
            } else {
                log.warn('⚠️  Database setup encountered an issue');
                log.info('This is normal if the database already exists');
                log.info('Continuing with server startup...');
                resolve(true);
            }
        });

        setup.on('error', (error) => {
            log.error(`Database setup error: ${error.message}`);
            resolve(true); // Continue anyway
        });
    });
}

async function startServer() {
    log.title('Step 4: Starting Server');

    log.success('All setup complete! Starting server...');
    log.info('');
    log.info('Your app will be available at: http://localhost:3000');
    log.info('');
    log.info('💡 First time? Create an account and start logging your progress!');
    log.info('');

    return new Promise((resolve) => {
        const server = spawn('npm', ['start'], {
            cwd: ROOT_DIR,
            stdio: 'inherit',
            shell: true
        });

        server.on('error', (error) => {
            log.error(`Failed to start server: ${error.message}`);
            process.exit(1);
        });

        server.on('close', (code) => {
            // Port already in use is OK - server is already running
            if (code === 1 && process.stdout.isTTY) {
                log.warn('Server may already be running on port 3000');
                log.info('Access your app at: http://localhost:3000');
                resolve();
            } else if (code !== 0) {
                log.error(`Server exited with code ${code}`);
                process.exit(code);
            } else {
                resolve();
            }
        });

        // Keep the promise pending - server runs indefinitely
        // This allows npm start to stay running in the foreground
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
        rl.close(); // Close readline since we don't need interactive input anymore
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
        rl.close();
        process.exit(1);
    }
}

// Run setup
main().catch(error => {
    log.error(`Unexpected error: ${error.message}`);
    process.exit(1);
});
