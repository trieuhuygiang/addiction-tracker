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

async function testDatabaseConnection(host, port, user, password, database) {
    const { Pool } = require('pg');
    try {
        const testPool = new Pool({
            host,
            port: parseInt(port),
            user,
            password,
            database: 'postgres' // Connect to default postgres database to test credentials
        });
        const client = await testPool.connect();
        client.release();
        await testPool.end();
        return true;
    } catch (error) {
        return false;
    }
}

async function autoFixPasswordAuth(host, port, targetUser, targetPassword, dbName) {
    const { Client } = require('pg');
    
    // Try to connect as postgres superuser to reset the password
    let adminClient = null;
    try {
        // Try with password first
        adminClient = new Client({
            host,
            port: parseInt(port),
            user: 'postgres',
            password: 'postgres',
            database: 'postgres'
        });
        await adminClient.connect();
    } catch (e) {
        try {
            // Try without password
            adminClient = new Client({
                host,
                port: parseInt(port),
                user: 'postgres',
                password: '',
                database: 'postgres'
            });
            await adminClient.connect();
        } catch (e2) {
            // Unable to connect as postgres - cannot fix
            return false;
        }
    }

    try {
        log.info(`Auto-fixing password for user: ${targetUser}`);
        // Reset the user's password
        await adminClient.query(`ALTER USER ${targetUser} WITH PASSWORD '${targetPassword}'`);
        log.success(`Password reset for ${targetUser}`);
        return true;
    } catch (error) {
        log.warn(`Could not reset password: ${error.message}`);
        return false;
    } finally {
        if (adminClient) {
            await adminClient.end();
        }
    }
}

async function detectAndSetupDatabase() {
    const { Pool, Client } = require('pg');
    const host = process.env.DB_HOST || 'localhost';
    const port = process.env.DB_PORT || '5432';
    const dbName = process.env.DB_NAME || 'addiction_tracker';

    log.info('Detecting PostgreSQL database setup...');

    // Try to connect as postgres superuser first
    let adminClient = null;
    try {
        adminClient = new Client({
            host,
            port: parseInt(port),
            user: 'postgres',
            password: 'postgres',
            database: 'postgres'
        });
        await adminClient.connect();
        log.success('Connected as postgres superuser');
    } catch (e) {
        // postgres user not available or wrong password
        try {
            adminClient = new Client({
                host,
                port: parseInt(port),
                user: 'postgres',
                password: '',
                database: 'postgres'
            });
            await adminClient.connect();
            log.info('Connected as postgres (no password)');
        } catch (e2) {
            log.warn('Could not connect as postgres user - database may already be configured');
            return { user: 'addiction_user', password: 'addiction_tracker_pass' };
        }
    }

    try {
        // Check if database exists
        const dbResult = await adminClient.query(
            `SELECT datname FROM pg_database WHERE datname = $1`,
            [dbName]
        );

        if (dbResult.rows.length === 0) {
            log.info(`Creating database: ${dbName}`);
            await adminClient.query(`CREATE DATABASE ${dbName}`);
            log.success(`Database ${dbName} created`);
        } else {
            log.success(`Database ${dbName} already exists`);
        }

        // Check if user exists
        const userResult = await adminClient.query(
            `SELECT usename FROM pg_user WHERE usename = $1`,
            ['addiction_user']
        );

        if (userResult.rows.length === 0) {
            log.info('Creating database user: addiction_user');
            await adminClient.query(`CREATE USER addiction_user WITH PASSWORD 'addiction_tracker_pass'`);
            await adminClient.query(`ALTER ROLE addiction_user CREATEDB`);
            log.success('User addiction_user created');
        } else {
            log.success('User addiction_user already exists');
            // Reset password to ensure it's correct
            await adminClient.query(`ALTER USER addiction_user WITH PASSWORD 'addiction_tracker_pass'`);
            log.info('Reset addiction_user password');
        }

        // Grant privileges
        await adminClient.query(`GRANT ALL PRIVILEGES ON DATABASE ${dbName} TO addiction_user`);
        log.success('Privileges granted');

        return { user: 'addiction_user', password: 'addiction_tracker_pass' };
    } catch (error) {
        log.warn(`Database setup error: ${error.message}`);
        log.info('Trying to use existing addiction_user...');
        return { user: 'addiction_user', password: 'addiction_tracker_pass' };
    } finally {
        if (adminClient) {
            await adminClient.end();
        }
    }
}

async function setupEnv() {
    log.title('Step 2: Environment Configuration');

    log.info('Setting up environment variables...');

    // Default values
    let dbUser = 'addiction_user';
    let dbPassword = 'addiction_tracker_pass';
    let dbHost = process.env.DB_HOST || 'localhost';
    let dbPort = process.env.DB_PORT || '5432';
    let dbName = process.env.DB_NAME || 'addiction_tracker';

    // Try to detect/setup database
    try {
        const dbConfig = await detectAndSetupDatabase();
        dbUser = dbConfig.user;
        dbPassword = dbConfig.password;
    } catch (error) {
        log.warn(`Could not auto-setup database: ${error.message}`);
        log.info('Using default credentials - ensure PostgreSQL is configured manually');
    }

    // Check if .env exists and has valid values
    let envContent = '';
    if (fs.existsSync(ENV_FILE)) {
        const existing = fs.readFileSync(ENV_FILE, 'utf8');
        // If .env exists and has content, keep it but update critical values
        if (existing.trim()) {
            log.info('Updating existing .env file with correct credentials...');
            // Parse existing .env
            const lines = existing.split('\n');
            const envVars = {};
            lines.forEach(line => {
                const [key, ...valueParts] = line.split('=');
                if (key && key.trim()) {
                    envVars[key.trim()] = valueParts.join('=');
                }
            });
            // Update database credentials
            envVars.DB_USER = dbUser;
            envVars.DB_PASSWORD = dbPassword;
            envVars.DB_HOST = envVars.DB_HOST || dbHost;
            envVars.DB_PORT = envVars.DB_PORT || dbPort;
            envVars.DB_NAME = envVars.DB_NAME || dbName;
            envVars.PORT = envVars.PORT || '3000';
            envVars.NODE_ENV = envVars.NODE_ENV || 'development';
            envVars.SESSION_SECRET = envVars.SESSION_SECRET || generateSecret();

            // Rebuild .env content
            envContent = Object.entries(envVars)
                .filter(([key]) => key.trim())
                .map(([key, value]) => `${key}=${value}`)
                .join('\n') + '\n';
        }
    } else {
        log.success('Creating .env file...');
    }

    // Generate fresh .env if not yet set
    if (!envContent) {
        envContent = `PORT=3000
DB_HOST=${dbHost}
DB_PORT=${dbPort}
DB_USER=${dbUser}
DB_PASSWORD=${dbPassword}
DB_NAME=${dbName}
SESSION_SECRET=${generateSecret()}
NODE_ENV=development
`;
    }

    try {
        fs.writeFileSync(ENV_FILE, envContent);
        log.success('.env file created/updated');
        log.info(`Database user: ${dbUser}`);
        log.info(`Database name: ${dbName}`);
        return true;
    } catch (error) {
        log.error(`Failed to create .env: ${error.message}`);
        return false;
    }
}

async function initializeDatabase() {
    log.title('Step 3: Database Initialization');

    log.info('Setting up database tables and columns...');

    return new Promise(async (resolve) => {
        const setup = spawn('npm', ['run', 'setup'], {
            cwd: ROOT_DIR,
            stdio: 'pipe',
            shell: true
        });

        let setupOutput = '';
        let retried = false;

        setup.stdout.on('data', (data) => {
            setupOutput += data.toString();
            process.stdout.write(data);
        });

        setup.stderr.on('data', (data) => {
            setupOutput += data.toString();
            process.stderr.write(data);
        });

        setup.on('close', async (code) => {
            if (code === 0) {
                log.success('Database initialized successfully');
                resolve(true);
            } else if (setupOutput.includes('password authentication failed') && !retried) {
                // Password auth failure detected - try to auto-fix
                log.warn('⚠️  Password authentication failed - attempting auto-fix...');
                
                const dbHost = process.env.DB_HOST || 'localhost';
                const dbPort = process.env.DB_PORT || '5432';
                const dbUser = process.env.DB_USER || 'addiction_user';
                const dbPassword = process.env.DB_PASSWORD || 'addiction_tracker_pass';
                const dbName = process.env.DB_NAME || 'addiction_tracker';

                const fixed = await autoFixPasswordAuth(dbHost, dbPort, dbUser, dbPassword, dbName);
                
                if (fixed) {
                    log.info('Password fixed - retrying database setup...');
                    retried = true;
                    
                    // Retry the setup
                    const retrySetup = spawn('npm', ['run', 'setup'], {
                        cwd: ROOT_DIR,
                        stdio: 'inherit',
                        shell: true
                    });

                    retrySetup.on('close', (retryCode) => {
                        if (retryCode === 0) {
                            log.success('Database initialized successfully');
                            resolve(true);
                        } else {
                            log.warn('⚠️  Database setup encountered an issue after password fix');
                            log.info('Manual fix may be required - check your PostgreSQL setup');
                            resolve(true);
                        }
                    });

                    retrySetup.on('error', (error) => {
                        log.error(`Database setup error: ${error.message}`);
                        resolve(true);
                    });
                } else {
                    log.warn('⚠️  Could not auto-fix password - manual intervention needed');
                    log.info('To fix manually:');
                    log.info('  1. Ensure PostgreSQL is running');
                    log.info('  2. Check credentials in .env');
                    log.info('  3. Run: npm run setup');
                    resolve(true);
                }
            } else {
                log.warn('⚠️  Database setup encountered an issue');
                log.info('This usually means one of the following:');
                log.info('  1. Database user credentials are incorrect (check .env)');
                log.info('  2. PostgreSQL is not running');
                log.info('  3. Database already exists and is properly initialized');
                log.info('');
                log.info('To fix database credentials:');
                log.info('  1. Check your PostgreSQL user and password in .env');
                log.info('  2. Run: npm run setup');
                log.info('');
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
            // Code 130 = SIGINT (Ctrl+C), normal shutdown
            if (code === 130) {
                log.success('Server stopped');
                resolve();
            }
            // Port already in use is OK - server is already running
            else if (code === 1 && process.stdout.isTTY) {
                log.warn('Server may already be running on port 3000');
                log.info('Access your app at: http://localhost:3000');
                resolve();
            }
            // Database authentication errors
            else if (code !== 0) {
                log.error(`Server exited with code ${code}`);
                log.error('');
                log.error('Troubleshooting:');
                log.error('  1. Check your .env file for correct database credentials');
                log.error('  2. Verify PostgreSQL is running: sudo systemctl status postgresql');
                log.error('  3. Test your connection: psql -U <user> -h localhost -d <dbname>');
                log.error('');
                log.error('Once fixed, run again: npm start');
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
