# Ubuntu Server Setup Guide

This guide will help you set up and run the Addiction Tracker web application on an Ubuntu server after cloning the repository.

## Prerequisites

- Ubuntu Server 20.04 LTS or later
- Root or sudo access

## Step 1: Update System

```bash
sudo apt update && sudo apt upgrade -y
```

## Step 2: Install Node.js

```bash
# Install Node.js 18.x (LTS)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installation
node --version
npm --version
```

## Step 3: Install PostgreSQL

```bash
# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Start and enable PostgreSQL
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

## Step 4: Configure Database

```bash
# Switch to postgres user
sudo -u postgres psql

# In PostgreSQL shell, run:
CREATE USER addiction_user WITH PASSWORD 'your_secure_password';
CREATE DATABASE addiction_tracker OWNER addiction_user;
GRANT ALL PRIVILEGES ON DATABASE addiction_tracker TO addiction_user;
\q
```

## Step 5: Clone Repository

```bash
cd /home/ubuntu
git clone https://github.com/trieuhuygiang/addiction-tracker.git
cd addiction-tracker
```

## Step 6: Install Dependencies

```bash
npm install
```

## Step 7: Configure Environment

```bash
# Create .env file
nano .env
```

Add the following content (adjust values as needed):

```env
NODE_ENV=production
PORT=3000

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=addiction_tracker
DB_USER=addiction_user
DB_PASSWORD=your_secure_password

# Session Secret (generate a random string)
SESSION_SECRET=your_random_secret_key_here
```

Save and exit (Ctrl+X, Y, Enter).

## Step 8: Initialize Database Tables

```bash
npm run init-db
```

Or manually run:

```bash
node src/config/init.js
```

## Step 9: Start the Application

### Option A: Simple Start (Foreground)

```bash
npm start
```

### Option B: Run in Background with Screen

```bash
# Install screen if not available
sudo apt install -y screen

# Create a new screen session
screen -S addiction-tracker

# Start the app
npm start

# Detach from screen: Press Ctrl+A, then D
# Reattach later: screen -r addiction-tracker
```

### Option C: Run with PM2 (Recommended for Production)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Start the application
pm2 start src/server.js --name addiction-tracker

# Save PM2 process list
pm2 save

# Set PM2 to start on boot
pm2 startup
# Follow the instructions shown in terminal
```

## Step 10: Access the Application

Open your browser and navigate to:

```
http://your_server_ip:3000
```

## Firewall Configuration (if needed)

```bash
# Allow port 3000
sudo ufw allow 3000

# Or if using nginx as reverse proxy, allow HTTP/HTTPS
sudo ufw allow 'Nginx Full'
```

## Optional: Set Up Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install -y nginx

# Create site configuration
sudo nano /etc/nginx/sites-available/addiction-tracker
```

Add:

```nginx
server {
    listen 80;
    server_name your_domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/addiction-tracker /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

## Useful Commands

```bash
# Check app status (PM2)
pm2 status

# View logs (PM2)
pm2 logs addiction-tracker

# Restart app (PM2)
pm2 restart addiction-tracker

# Stop app (PM2)
pm2 stop addiction-tracker

# Check PostgreSQL status
sudo systemctl status postgresql

# View app logs (if running with node directly)
tail -f /home/ubuntu/addiction-tracker/logs/app.log
```

## Troubleshooting

### Port already in use

```bash
# Find process using port 3000
sudo lsof -i :3000
# Kill the process
sudo kill -9 <PID>
```

### Database connection issues

```bash
# Check PostgreSQL is running
sudo systemctl status postgresql

# Check database exists
sudo -u postgres psql -c "\l"

# Check user can connect
psql -h localhost -U addiction_user -d addiction_tracker
```

### Permission issues

```bash
# Fix ownership
sudo chown -R ubuntu:ubuntu /home/ubuntu/addiction-tracker
```

---

## Quick Start Summary

```bash
# One-liner after cloning (assuming PostgreSQL is set up)
cd addiction-tracker && npm install && cp .env.example .env && nano .env && npm run init-db && npm start
```
