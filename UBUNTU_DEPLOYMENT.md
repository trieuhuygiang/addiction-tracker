# Addiction Tracker - Complete Ubuntu Deployment Guide

This is a step-by-step guide to deploy the Addiction Tracker on a fresh Ubuntu server (20.04/22.04/24.04). Follow each step carefully.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Server Setup](#server-setup)
3. [Install Node.js](#install-nodejs)
4. [Install PostgreSQL](#install-postgresql)
5. [Clone and Setup Project](#clone-and-setup-project)
6. [Configure Environment](#configure-environment)
7. [Initialize Database](#initialize-database)
8. [Run with PM2](#run-with-pm2)
9. [Setup Nginx (Optional)](#setup-nginx-optional)
10. [Setup SSL/HTTPS (Optional)](#setup-sslhttps-optional)
11. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- A Ubuntu server (VPS from DigitalOcean, AWS, Vultr, Linode, etc.)
- SSH access to your server
- A domain name (optional, for HTTPS)

---

## Server Setup

### 1. Connect to your server via SSH

```bash
ssh root@YOUR_SERVER_IP
```

Or if you have a non-root user:

```bash
ssh username@YOUR_SERVER_IP
```

### 2. Update your system

```bash
sudo apt update && sudo apt upgrade -y
```

### 3. Install essential tools

```bash
sudo apt install -y curl wget git build-essential
```

---

## Install Node.js

### Option A: Using NodeSource (Recommended)

```bash
# Download and run NodeSource setup script for Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Install Node.js
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

### Option B: Using NVM (Node Version Manager)

```bash
# Install NVM
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install Node.js
nvm install 20
nvm use 20

# Verify
node --version
npm --version
```

---

## Install PostgreSQL

### 1. Install PostgreSQL

```bash
sudo apt install -y postgresql postgresql-contrib
```

### 2. Start PostgreSQL service

```bash
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 3. Verify PostgreSQL is running

```bash
sudo systemctl status postgresql
```

You should see "active (exited)" or "active (running)".

### 4. Create database and user

```bash
# Switch to postgres user
sudo -u postgres psql
```

Inside the PostgreSQL prompt, run these commands:

```sql
-- Create a new user (change 'yourpassword' to a strong password)
CREATE USER tracker_user WITH PASSWORD 'yourpassword';

-- Create database
CREATE DATABASE addiction_tracker;

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE addiction_tracker TO tracker_user;

-- Allow user to create databases (needed for setup)
ALTER USER tracker_user CREATEDB;

-- For PostgreSQL 15+: Grant schema permissions (required for table creation)
\c addiction_tracker
GRANT ALL ON SCHEMA public TO tracker_user;

-- Exit
\q
```

> **Note:** PostgreSQL 15+ changed default permissions for the `public` schema. Without the `GRANT ALL ON SCHEMA public` command, you'll get "permission denied for schema public" error when running `npm run setup`.

### 5. Test database connection

```bash
psql -U tracker_user -d addiction_tracker -h localhost
```

Enter your password when prompted. If you see the PostgreSQL prompt, it works! Type `\q` to exit.

**If you get "peer authentication failed" error:**

```bash
# Edit pg_hba.conf
sudo nano /etc/postgresql/*/main/pg_hba.conf
```

Find this line:

```
local   all             all                                     peer
```

Change `peer` to `md5`:

```
local   all             all                                     md5
```

Also find and change:

```
host    all             all             127.0.0.1/32            scram-sha-256
```

to:

```
host    all             all             127.0.0.1/32            md5
```

Save and restart PostgreSQL:

```bash
sudo systemctl restart postgresql
```

---

## Clone and Setup Project

### 1. Create a directory for the app

```bash
# If deploying as root (not recommended for production)
cd /root

# Or create a dedicated user (recommended)
sudo adduser tracker
sudo su - tracker
cd ~
```

### 2. Clone the repository

```bash
git clone https://github.com/trieuhuygiang/addiction-tracker.git
cd addiction-tracker
```

### 3. Install dependencies

```bash
npm install
```

---

## Configure Environment

### 1. Create the environment file

```bash
nano .env
```

### 2. Add configuration (edit values as needed)

```env
# Server Configuration
PORT=3000
NODE_ENV=production

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_USER=tracker_user
DB_PASSWORD=yourpassword
DB_NAME=addiction_tracker

# Session Secret (generate a random string)
SESSION_SECRET=your_very_long_random_secret_key_here_make_it_at_least_32_characters

# HTTPS (set to true only if using HTTPS)
USE_HTTPS=false
```

### 3. Generate a secure SESSION_SECRET

```bash
# Generate random string
openssl rand -hex 32
```

Copy the output and use it as your SESSION_SECRET.

### 4. Save the file

Press `Ctrl + X`, then `Y`, then `Enter` to save.

---

## Initialize Database

### Run the database setup

```bash
npm run setup
```

You should see output like:

```
Starting database initialization...
✓ Database addiction_tracker already exists
✓ Users table created or already exists
✓ Entries table created or already exists
✓ Streak history table created or already exists
✓ Session table created or already exists
✓ Database initialization completed successfully!
```

---

## Run with PM2

PM2 is a process manager that keeps your app running and restarts it if it crashes.

### 1. Install PM2 globally

```bash
sudo npm install -g pm2
```

### 2. Start the application

```bash
pm2 start src/server.js --name "addiction-tracker"
```

### 3. Check if it's running

```bash
pm2 status
```

You should see:

```
┌─────┬─────────────────────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name                │ mode        │ status  │ cpu     │ memory   │
├─────┼─────────────────────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ addiction-tracker   │ fork        │ online  │ 0%      │ 50.0mb   │
└─────┴─────────────────────┴─────────────┴─────────┴─────────┴──────────┘
```

### 4. View logs

```bash
pm2 logs addiction-tracker
```

### 5. Make PM2 start on system boot

```bash
pm2 startup
```

Follow the instructions shown (copy and run the command it gives you).

```bash
pm2 save
```

### 6. Test the application

Open your browser and go to:

```
http://YOUR_SERVER_IP:3000
```

You should see the Addiction Tracker homepage!

---

## Setup Nginx (Optional)

Nginx acts as a reverse proxy, allowing you to access the app on port 80 (standard HTTP).

### 1. Install Nginx

```bash
sudo apt install -y nginx
```

### 2. Create Nginx configuration

```bash
sudo nano /etc/nginx/sites-available/addiction-tracker
```

### 3. Add this configuration

```nginx
server {
    listen 80;
    server_name YOUR_DOMAIN_OR_IP;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Replace `YOUR_DOMAIN_OR_IP` with your domain name or server IP.

### 4. Enable the site

```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/addiction-tracker /etc/nginx/sites-enabled/

# Remove default site (optional)
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 5. Test

Now you can access your app at:

```
http://YOUR_DOMAIN_OR_IP
```

(without the :3000 port)

---

## Setup SSL/HTTPS (Optional)

If you have a domain name, you can add free SSL with Let's Encrypt.

### 1. Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 2. Get SSL certificate

```bash
sudo certbot --nginx -d yourdomain.com
```

Follow the prompts:

- Enter your email
- Agree to terms
- Choose to redirect HTTP to HTTPS (recommended)

### 3. Update environment file

```bash
nano .env
```

Change:

```env
USE_HTTPS=true
```

### 4. Restart the application

```bash
pm2 restart addiction-tracker
```

### 5. Auto-renewal

Certbot automatically sets up renewal. Test it:

```bash
sudo certbot renew --dry-run
```

---

## Troubleshooting

### App not starting?

Check logs:

```bash
pm2 logs addiction-tracker --lines 50
```

### Database connection error?

1. Check PostgreSQL is running:

   ```bash
   sudo systemctl status postgresql
   ```

2. Verify credentials in `.env`

3. Test connection manually:
   ```bash
   psql -U tracker_user -d addiction_tracker -h localhost
   ```

### Port 3000 already in use?

```bash
# Find what's using the port
sudo lsof -i :3000

# Kill the process
kill -9 PID_NUMBER
```

### Nginx errors?

Check Nginx logs:

```bash
sudo tail -f /var/log/nginx/error.log
```

### Permission denied errors?

If running as non-root user:

```bash
sudo chown -R $USER:$USER ~/addiction-tracker
```

### Can't connect from browser?

Check firewall:

```bash
# Allow port 3000 (if not using Nginx)
sudo ufw allow 3000

# Allow HTTP/HTTPS (if using Nginx)
sudo ufw allow 'Nginx Full'

# Check status
sudo ufw status
```

---

## Useful PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs addiction-tracker

# Restart app
pm2 restart addiction-tracker

# Stop app
pm2 stop addiction-tracker

# Delete app from PM2
pm2 delete addiction-tracker

# Monitor resources
pm2 monit
```

---

## Updating the Application

When there's a new version:

```bash
cd ~/addiction-tracker

# Pull latest changes
git pull

# Install any new dependencies
npm install

# Run database migrations (if any)
npm run setup

# Restart the app
pm2 restart addiction-tracker
```

---

## Backup Database

### Create backup

```bash
pg_dump -U tracker_user -h localhost addiction_tracker > backup_$(date +%Y%m%d).sql
```

### Restore backup

```bash
psql -U tracker_user -h localhost addiction_tracker < backup_20251205.sql
```

### Automated daily backups

```bash
# Create backup directory
mkdir -p ~/backups

# Add cron job
crontab -e
```

Add this line (backs up daily at 2 AM):

```
0 2 * * * pg_dump -U tracker_user -h localhost addiction_tracker > ~/backups/backup_$(date +\%Y\%m\%d).sql
```

---

## Security Tips

1. **Use a non-root user** for running the application
2. **Keep system updated**: `sudo apt update && sudo apt upgrade`
3. **Use strong passwords** for database
4. **Enable firewall**:
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   ```
5. **Use HTTPS** with Let's Encrypt (free!)
6. **Regular backups** of your database

---

## Need Help?

If you encounter issues:

1. Check the logs: `pm2 logs addiction-tracker`
2. Verify environment variables: `cat .env`
3. Test database connection manually
4. Check that all services are running

---

**Stay strong! 💪**
