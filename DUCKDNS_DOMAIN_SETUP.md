# DuckDNS Domain Setup Guide

This guide will walk you through linking your Oracle Cloud server to a free DuckDNS subdomain.

## What This Setup Does

This configuration makes your app accessible via a domain name instead of just IP:PORT.

**Before:**

- Access app at: `http://YOUR_IP:3000`

**After:**

- Access app at: `https://yoursubdomain.duckdns.org` (port 80/443)

**How it works:**

1. **Nginx** acts as a reverse proxy on port 80/443
2. Nginx forwards all requests to your app on port 3000
3. SSL certificate secures traffic (HTTPS)
4. Your app still runs on port 3000 internally

## Prerequisites

- Oracle Cloud server (or any cloud server) with public IP
- Application running on port 3000
- SSH access to your server
- Your server's public IP address

## Important: Replace These Values

Throughout this guide, replace:

- `YOUR_IP` - Your server's public IP address
- `YOUR_SUBDOMAIN` - Your chosen DuckDNS subdomain name (e.g., `myapp`, `tracker`, `huygiang`)
- `YOUR_EMAIL` - Your email address for Let's Encrypt notifications

**Example:** If your IP is `170.9.15.38` and you want `huygiang.duckdns.org`:
- `YOUR_IP` → `170.9.15.38`
- `YOUR_SUBDOMAIN` → `huygiang`
- Full domain → `huygiang.duckdns.org`

## Step 1: Register Domain on DuckDNS

### 1.1 Sign Up for DuckDNS

1. Go to **https://www.duckdns.org**
2. Click **"Sign in"** at the top
3. Choose your preferred login method:
   - GitHub
   - Google
   - Reddit
   - Twitter
   - Or email

### 1.2 Create Your Subdomain

1. Once logged in, you'll see the DuckDNS dashboard
2. In the **"sub domain"** field, enter: `YOUR_SUBDOMAIN` (just the name, not the full domain)
   - **Example:** If you want `huygiang.duckdns.org`, enter just `huygiang`
   - This will create: `YOUR_SUBDOMAIN.duckdns.org`
3. In the **"current ip"** field, enter your server's public IP: `YOUR_IP`
   - **Example:** `170.9.15.38`
4. Click the green **"add domain"** button
5. You should see your new domain listed with a green "OK" status

### 1.3 Verify Domain Created

You should now see:

```
YOUR_SUBDOMAIN.duckdns.org → YOUR_IP ✓
```

**Example:**

```
huygiang.duckdns.org → 170.9.15.38 ✓
```

**Important:** Keep this page open or note down your DuckDNS token (shown at the top) - you'll need it for auto-updates if your IP changes.

## Step 2: Configure Oracle Cloud Firewall

Your server needs to accept incoming traffic on ports 80 (HTTP) and 443 (HTTPS).

### 2.1 Configure Oracle Cloud Security List

1. **Log in to Oracle Cloud Console**
2. Navigate to: **Networking** → **Virtual Cloud Networks**
3. Click on your **VCN** (Virtual Cloud Network)
4. Click **"Security Lists"** on the left sidebar
5. Click **"Default Security List for [your-vcn-name]"**

### 2.2 Add Ingress Rules for HTTP (Port 80)

1. Click **"Add Ingress Rules"** button
2. Fill in the following:
   - **Stateless:** Leave unchecked
   - **Source Type:** CIDR
   - **Source CIDR:** `0.0.0.0/0`
   - **IP Protocol:** TCP
   - **Source Port Range:** (leave empty)
   - **Destination Port Range:** `80`
   - **Description:** `Allow HTTP traffic`
3. Click **"Add Ingress Rules"**

### 2.3 Add Ingress Rules for HTTPS (Port 443)

1. Click **"Add Ingress Rules"** button again
2. Fill in the following:
   - **Stateless:** Leave unchecked
   - **Source Type:** CIDR
   - **Source CIDR:** `0.0.0.0/0`
   - **IP Protocol:** TCP
   - **Source Port Range:** (leave empty)
   - **Destination Port Range:** `443`
   - **Description:** `Allow HTTPS traffic`
3. Click **"Add Ingress Rules"**

### 2.4 Verify Rules Added

Your Security List should now show:

- Port 80 → 0.0.0.0/0 (HTTP)
- Port 443 → 0.0.0.0/0 (HTTPS)

## Step 3: Verify DNS Propagation

Wait **2-5 minutes** for DNS to propagate, then test:

### 3.1 Check DNS Resolution

From your local computer:

```bash
# Check if domain resolves to your IP
nslookup YOUR_SUBDOMAIN.duckdns.org

# Should show:
# Server: ...
# Address: YOUR_IP
```

**Example:**

```bash
nslookup huygiang.duckdns.org
# Should return: 170.9.15.38
```

Or use online tools:

- https://dnschecker.org
- Search for: `YOUR_SUBDOMAIN.duckdns.org`
- Should show your server IP

### 3.2 Test Direct Connection to Port 3000

**Important:** Your app needs to be running on port 3000 first!

From your server, verify your app is running:

```bash
curl http://localhost:3000
```

This should return your application's HTML (not an error).

## Step 4: Install and Configure Nginx (Reverse Proxy)

Nginx will forward all traffic from port 80/443 to your app on port 3000.

### 4.1 Install Nginx

SSH into your server and run:

```bash
# Update package manager
sudo apt update

# Install nginx
sudo apt install -y nginx

# Start nginx
sudo systemctl start nginx

# Enable nginx to start on boot
sudo systemctl enable nginx

# Verify nginx is running
sudo systemctl status nginx
```

### 4.2 Create Nginx Configuration for Your Domain

Create a new nginx configuration file:

```bash
# Open editor
sudo nano /etc/nginx/sites-available/addiction-tracker
```

Paste this configuration (replace `YOUR_SUBDOMAIN` with your actual subdomain):

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name YOUR_SUBDOMAIN.duckdns.org www.YOUR_SUBDOMAIN.duckdns.org;
    
    # Redirect all HTTP traffic to HTTPS (will be enabled after SSL setup)
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

**Example for `huygiang.duckdns.org`:**

```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name huygiang.duckdns.org www.huygiang.duckdns.org;
    
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

**To save the file:**
- Press `Ctrl+X`
- Press `Y` (yes)
- Press `Enter` to confirm filename

### 4.3 Enable the Nginx Configuration

```bash
# Create symbolic link to sites-enabled
sudo ln -s /etc/nginx/sites-available/addiction-tracker /etc/nginx/sites-enabled/addiction-tracker

# Remove default nginx site (optional but recommended)
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration for syntax errors
sudo nginx -t

# You should see:
# nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 4.4 Start Nginx and Test HTTP Connection

```bash
# Reload nginx with new configuration
sudo systemctl reload nginx

# Verify nginx is running
sudo systemctl status nginx

# Test HTTP connection from your server
curl -I http://localhost:80

# Test accessing through your domain
curl -I http://YOUR_SUBDOMAIN.duckdns.org
```

**Example:**

```bash
curl -I http://huygiang.duckdns.org
```

**You should see:**

```
HTTP/1.1 200 OK
Server: nginx
...
```

This means Nginx is successfully forwarding traffic to your app on port 3000!

### 4.5 Verify Your App is Accessible

Open your browser and visit:

```
http://YOUR_SUBDOMAIN.duckdns.org
```

**Example:** `http://huygiang.duckdns.org`

You should see your Addiction Tracker application!

## Step 5: Install SSL Certificate (HTTPS)

Now that your domain is accessible via HTTP, let's secure it with HTTPS.

### 5.1 Install Certbot (Let's Encrypt Client)

```bash
# Install certbot and nginx plugin
sudo apt install -y certbot python3-certbot-nginx

# Verify installation
sudo certbot --version
```

### 5.2 Get SSL Certificate with Let's Encrypt

SSH into your server and run:

```bash
sudo certbot --nginx -d YOUR_SUBDOMAIN.duckdns.org --non-interactive --agree-tos --email YOUR_EMAIL --redirect
```

**Replace:**
- `YOUR_SUBDOMAIN` - Your DuckDNS subdomain (e.g., `huygiang`)
- `YOUR_EMAIL` - Your email address (e.g., `example@gmail.com`)

**Full example:**

```bash
sudo certbot --nginx -d huygiang.duckdns.org --non-interactive --agree-tos --email your.email@gmail.com --redirect
```

**Command Explanation:**

- `sudo` - Run with administrator privileges
- `certbot` - Let's Encrypt SSL certificate tool
- `--nginx` - Automatically configure nginx for HTTPS
- `-d YOUR_SUBDOMAIN.duckdns.org` - Domain to secure
- `--non-interactive` - Don't prompt for input
- `--agree-tos` - Agree to Let's Encrypt Terms of Service
- `--email YOUR_EMAIL` - Email for renewal notices and security alerts
- `--redirect` - Automatically redirect HTTP to HTTPS

### 5.3 What Certbot Does

When you run this command, Certbot will:

1. **Verify Domain Ownership** - Creates temporary file on your server to prove you control the domain
2. **Request Certificate** - Contacts Let's Encrypt servers to generate SSL certificate
3. **Install Certificate** - Saves certificate files to `/etc/letsencrypt/live/YOUR_SUBDOMAIN.duckdns.org/`
4. **Configure Nginx** - Updates your nginx config to use HTTPS (port 443)
5. **Setup Redirect** - Adds rule to redirect all HTTP (port 80) traffic to HTTPS
6. **Enable Auto-Renewal** - Creates systemd timer to renew certificate before it expires (every 90 days)

### 5.4 Expected Output

You should see:

```
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Account registered.
Requesting a certificate for YOUR_SUBDOMAIN.duckdns.org

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/YOUR_SUBDOMAIN.duckdns.org/fullchain.pem
Key is saved at: /etc/letsencrypt/live/YOUR_SUBDOMAIN.duckdns.org/privkey.pem
This certificate expires on 2026-03-06.
These files will be updated when the certificate renews.
Certbot has set up a scheduled task to automatically renew this certificate in the background.

Deploying certificate
Successfully deployed certificate for YOUR_SUBDOMAIN.duckdns.org to /etc/nginx/sites-enabled/addiction-tracker
Congratulations! You have successfully enabled HTTPS on https://YOUR_SUBDOMAIN.duckdns.org

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
If you like Certbot, please consider supporting our work by:
 * Donating to ISRG / Let's Encrypt:   https://letsencrypt.org/donate
 * Donating to EFF:                    https://eff.org/donate-le
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```

## Step 6: Test Your Website

### 6.1 Access via HTTPS

Open your browser and visit:

```
https://YOUR_SUBDOMAIN.duckdns.org
```

**Example:** `https://huygiang.duckdns.org`

You should see your Addiction Tracker application with a secure padlock icon 🔒

### 6.2 Verify HTTP Redirects to HTTPS

Try accessing:

```
http://YOUR_SUBDOMAIN.duckdns.org
```

**Example:** `http://huygiang.duckdns.org`

It should automatically redirect to:

```
https://YOUR_SUBDOMAIN.duckdns.org
```

### 6.3 Check SSL Certificate

In your browser:

1. Click the **padlock icon** in the address bar
2. Click **"Certificate"** or **"Connection is secure"**
3. Verify:
   - Issued by: Let's Encrypt
   - Valid for: YOUR_SUBDOMAIN.duckdns.org
   - Expires in ~90 days

### 6.4 Check Certificate from Command Line

You can also verify the certificate details from your server:

```bash
# View certificate details
sudo certbot certificates
```

**Output will show:**

- Certificate Name
- Domain(s) covered
- Expiry Date
- Days remaining until expiration
- File locations (certificate and private key)

## Step 7: SSL Certificate Renewal

Let's Encrypt certificates are valid for **90 days** and must be renewed before expiration.

### 7.1 Automatic Renewal (Recommended)

**Good news:** Certbot automatically sets up renewal when you install the certificate!

**How it works:**

- Certbot creates a systemd timer that runs twice daily
- Checks if certificate expires within 30 days
- If yes, automatically renews it
- Reloads nginx to use new certificate

**Check auto-renewal is configured:**

```bash
# Check certbot timer status
sudo systemctl status certbot.timer
```

**Output should show:**

```
● certbot.timer - Run certbot twice daily
     Loaded: loaded (/lib/systemd/system/certbot.timer; enabled)
     Active: active (waiting)
```

**Test auto-renewal (dry run - doesn't actually renew):**

```bash
sudo certbot renew --dry-run
```

If this succeeds, auto-renewal is working correctly!

### 7.2 Manual Renewal

If you need to renew manually (for any reason):

```bash
# Renew all certificates
sudo certbot renew
```

**Force renewal even if not expiring soon:**

```bash
sudo certbot renew --force-renewal
```

**Renew specific domain:**

```bash
sudo certbot renew --cert-name YOUR_SUBDOMAIN.duckdns.org
```

### 7.3 What Happens During Renewal

1. **Certificate Check** - Certbot checks expiration date
2. **Domain Verification** - Re-verifies you still own the domain
3. **New Certificate** - Gets new certificate from Let's Encrypt
4. **Update Files** - Replaces old certificate files with new ones
5. **Reload Nginx** - Reloads nginx to use new certificate
6. **No Downtime** - Your site stays online during renewal

### 7.4 Monitor Certificate Expiration

**Check when certificate expires:**

```bash
sudo certbot certificates
```

**Look for:** `Expiry Date: 2026-03-06 17:25:40+00:00 (VALID: 89 days)`

**View renewal logs:**

```bash
sudo cat /var/log/letsencrypt/letsencrypt.log
```

### 7.5 Troubleshooting Renewal Issues

**If renewal fails:**

1. **Check nginx is running:**

   ```bash
   sudo systemctl status nginx
   ```

2. **Verify domain still points to your IP:**

   ```bash
   nslookup YOUR_SUBDOMAIN.duckdns.org
   ```

3. **Check port 80 is accessible:**

   ```bash
   curl -I http://YOUR_SUBDOMAIN.duckdns.org
   ```

4. **Try manual renewal with verbose output:**

   ```bash
   sudo certbot renew -v
   ```

5. **If still failing, delete and recreate certificate:**

   ```bash
   # Delete old certificate
   sudo certbot delete --cert-name YOUR_SUBDOMAIN.duckdns.org

   # Get new certificate
   sudo certbot --nginx -d YOUR_SUBDOMAIN.duckdns.org --non-interactive --agree-tos --email YOUR_EMAIL --redirect
   ```

### 7.6 Renewal Email Notifications

Let's Encrypt will email you at the address you provided if:

- Certificate is about to expire (30, 14, 7 days before)
- Auto-renewal is failing
- Important security notices

**Make sure the email address is valid and monitored!**

## Step 8: Real-World Setup Example - huygiang.duckdns.org

This section documents the actual setup process performed on December 6, 2025, including errors encountered and how they were resolved.

### 8.1 Setup Summary

**Configuration:**
- Domain: `huygiang.duckdns.org`
- Server IP: `170.9.15.38`
- Internal Port: `3000` (Node.js Addiction Tracker app)
- Email: `pkvk0090@gmail.com`

**Result:** ✅ Successfully deployed with working HTTPS

### 8.2 Step-by-Step Execution

#### DNS Verification
First, we verified the domain resolves correctly:
```bash
nslookup huygiang.duckdns.org
# Result: Address: 170.9.15.38 ✓
```

#### Nginx Installation
Installed Nginx with all dependencies:
```bash
sudo apt update && sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

Status confirmed: `Active: active (running)`

#### Nginx Configuration Creation
Created the configuration file:
```bash
sudo nano /etc/nginx/sites-available/addiction-tracker
```

With content:
```nginx
server {
    listen 80;
    listen [::]:80;
    
    server_name huygiang.duckdns.org www.huygiang.duckdns.org;
    
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

#### Nginx Symlink and Activation
Created symlink and removed default site:
```bash
sudo ln -sf /etc/nginx/sites-available/addiction-tracker /etc/nginx/sites-enabled/addiction-tracker
sudo rm -f /etc/nginx/sites-enabled/default
```

Tested configuration:
```bash
sudo nginx -t
# Result: nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
# nginx: configuration file /etc/nginx/nginx.conf test is successful
```

Reloaded Nginx:
```bash
sudo systemctl reload nginx
```

#### Verified App is Running
```bash
curl http://localhost:3000
# Result: Returned Addiction Tracker HTML ✓
```

#### Certbot Installation
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --version
# Result: certbot 0.40.0
```

#### SSL Certificate - First Attempt (Failed)
**Error Encountered:**
```
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Plugins selected: Authenticator nginx, Installer nginx
Unable to register an account with ACME server
```

**Log Details:**
```
certbot.errors.Error: The ACME server believes huygiang@example.com is an invalid email address.
```

**Resolution:** Used a valid Gmail address (`pkvk0090@gmail.com`) instead of example.com

#### SSL Certificate - Second Attempt (Failed)
**Error Encountered:**
```
The request message was malformed :: No such authorization
```

**Cause:** Nginx Authenticator couldn't properly validate the domain

**Resolution:** Attempted standalone authentication

#### SSL Certificate - Third Attempt (Failed)
**Error Encountered:**
```
Problem binding to port 80: Could not bind to IPv4 or IPv6.
```

**Cause:** Nginx was already listening on port 80, preventing standalone authenticator from binding

**Resolution:** Stopped Nginx, attempted standalone auth, then restarted Nginx

#### SSL Certificate - Fourth Attempt (Failed)
**Error Encountered:**
```
Domain: huygiang.duckdns.org
Type: connection
Detail: 170.9.15.38: Fetching http://huygiang.duckdns.org/.well-known/acme-challenge/... : 
Timeout during connect (likely firewall problem)
```

**Cause:** Oracle Cloud firewall and/or UFW not allowing external connections on port 80

**Resolution:** Opened firewall rules:
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
sudo ufw status
# Confirmed: 80/tcp ALLOW, 443/tcp ALLOW
```

#### SSL Certificate - Fifth Attempt (Success! ✅)
After opening firewall ports, restarted Nginx and ran Certbot again:
```bash
sudo systemctl start nginx
sudo certbot --nginx -d huygiang.duckdns.org --non-interactive --agree-tos --email pkvk0090@gmail.com --redirect
```

**Success Output:**
```
Obtaining a new certificate
Performing the following challenges:
http-01 challenge for huygiang.duckdns.org
Waiting for verification...
Cleaning up challenges

Congratulations! You have successfully enabled https://huygiang.duckdns.org

Certificate is saved at: /etc/letsencrypt/live/huygiang.duckdns.org/fullchain.pem
Key is saved at: /etc/letsencrypt/live/huygiang.duckdns.org/privkey.pem
This certificate expires on 2026-03-06.
```

#### Final Verification
```bash
# Test HTTPS
curl -I https://huygiang.duckdns.org
# Result: HTTP/1.1 200 OK ✓

# Test HTTP Redirect to HTTPS
curl -I http://huygiang.duckdns.org
# Result: HTTP/1.1 301 Moved Permanently (redirecting to HTTPS) ✓
```

### 8.3 Key Learnings & Troubleshooting Tips

**1. Email Validation**
- ❌ Don't use: `user@example.com`, `user@test.com`, or other placeholder domains
- ✅ Use: Valid email addresses like Gmail, Outlook, corporate email

**2. Firewall Configuration Sequence**
The issue that took most time to resolve was firewall rules. The sequence matters:
1. First update UFW (OS-level firewall)
2. Then check Oracle Cloud Security List (cloud-level firewall)
3. Both must be open for external validation to work

**3. Port 80 Must Be Accessible**
- Certbot's http-01 challenge requires port 80 to be reachable from the internet
- Even if you're running Nginx on port 80, it blocks Certbot's standalone validation
- Solution: Use `--nginx` plugin (not `--standalone`) when Nginx is running

**4. Nginx Plugin vs Standalone**
- `--nginx` authenticator: Works alongside running Nginx, modifies Nginx config for validation
- `--standalone` authenticator: Requires nothing running on port 80, but can't run with Nginx active
- For our setup: `--nginx` worked perfectly once firewall was open

**5. DNS Resolution**
- DuckDNS updates are instant or very quick (< 1 minute)
- Verify with `nslookup` before attempting SSL cert generation
- If DNS doesn't resolve, double-check IP on DuckDNS dashboard

### 8.4 Firewall Configuration Details

**Oracle Cloud Security List (Required)**
Must add two ingress rules to allow external traffic:

1. HTTP (Port 80):
   - Protocol: TCP
   - Port: 80
   - Source: 0.0.0.0/0

2. HTTPS (Port 443):
   - Protocol: TCP
   - Port: 443
   - Source: 0.0.0.0/0

**Ubuntu UFW (Also Required)**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

**Both layers must be open.** If only one is open, external validation will timeout.

### 8.5 Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| `ACME server believes X is invalid email` | Non-real email domain | Use valid email (Gmail, etc.) |
| `Could not bind to IPv4 or IPv6` | Port 80 already in use | Use `--nginx` plugin instead of `--standalone` |
| `Timeout during connect` | Firewall blocking port 80 | Open ports in Oracle Cloud AND UFW |
| `No such authorization` | Nginx config issue with authenticator | Use `--nginx` plugin, ensure config is correct |
| `Domain not resolving` | DuckDNS not updated | Verify on DuckDNS dashboard and wait a moment |

## Step 9: Keep Your App Running (Optional)

To ensure your app stays running even after you log out:

### 9.1 Install PM2 (Process Manager)

```bash
# Install PM2 globally
sudo npm install -g pm2

# Navigate to your project
cd /home/ubuntu/Project

# Start your app with PM2
pm2 start src/server.js --name addiction-tracker

# Save PM2 process list
pm2 save

# Set PM2 to start on system boot
pm2 startup
# Follow the command it outputs
```

### 9.2 PM2 Useful Commands

```bash
# Check app status
pm2 status

# View logs
pm2 logs addiction-tracker

# Restart app
pm2 restart addiction-tracker

# Stop app
pm2 stop addiction-tracker

# Monitor app
pm2 monit
```

## Step 10: Verification Commands

After setup, use these commands to verify everything is working:

```bash
# 1. Verify DNS resolution
nslookup huygiang.duckdns.org
# Should return your server IP

# 2. Check Nginx status
sudo systemctl status nginx
# Should show: Active: active (running)

# 3. Test HTTP access
curl -I http://huygiang.duckdns.org
# Should return: HTTP/1.1 301 Moved Permanently (redirects to HTTPS)

# 4. Test HTTPS access
curl -I https://huygiang.duckdns.org
# Should return: HTTP/1.1 200 OK

# 5. Check SSL certificate details
sudo certbot certificates
# Should show: Expiry Date and Days remaining

# 6. Verify app is accessible
curl https://huygiang.duckdns.org | head -20
# Should return your app's HTML

# 7. Check firewall rules
sudo ufw status
# Should show: 80/tcp ALLOW, 443/tcp ALLOW

# 8. View Nginx logs (if troubleshooting)
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# 9. Check Let's Encrypt renewal setup
sudo systemctl status certbot.timer
# Should show: Active: active (waiting)
```

## Step 11: Troubleshooting
pm2 startup
# Follow the command it outputs
```

### 9.2 PM2 Useful Commands

```bash
# Check app status
pm2 status

# View logs
pm2 logs addiction-tracker

# Restart app
pm2 restart addiction-tracker

# Stop app
pm2 stop addiction-tracker

# Monitor app
pm2 monit
```

## Step 10: Verification Commands

After setup, use these commands to verify everything is working:

```bash
# 1. Verify DNS resolution
nslookup huygiang.duckdns.org
# Should return your server IP

# 2. Check Nginx status
sudo systemctl status nginx
# Should show: Active: active (running)

# 3. Test HTTP access
curl -I http://huygiang.duckdns.org
# Should return: HTTP/1.1 301 Moved Permanently (redirects to HTTPS)

# 4. Test HTTPS access
curl -I https://huygiang.duckdns.org
# Should return: HTTP/1.1 200 OK

# 5. Check SSL certificate details
sudo certbot certificates
# Should show: Expiry Date and Days remaining

# 6. Verify app is accessible
curl https://huygiang.duckdns.org | head -20
# Should return your app's HTML

# 7. Check firewall rules
sudo ufw status
# Should show: 80/tcp ALLOW, 443/tcp ALLOW

# 8. View Nginx logs (if troubleshooting)
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log

# 9. Check Let's Encrypt renewal setup
sudo systemctl status certbot.timer
# Should show: Active: active (waiting)
```

## Step 11: Troubleshooting

**Problem:** `nslookup YOUR_SUBDOMAIN.duckdns.org` doesn't return your IP

**Solutions:**

1. Wait longer (DNS can take up to 10 minutes)
2. Verify you entered the correct IP on DuckDNS
3. Click "update ip" on DuckDNS dashboard
4. Try flushing your local DNS cache:

   ```bash
   # Windows
   ipconfig /flushdns

   # Mac
   sudo dscacheutil -flushcache

   # Linux
   sudo systemd-resolve --flush-caches
   ```

### Connection Timeout

**Problem:** `curl http://YOUR_SUBDOMAIN.duckdns.org` times out

**Solutions:**

1. **Check Oracle Cloud Security List:** Ensure ports 80 and 443 are open (Step 2)
2. **Check UFW firewall:**
   ```bash
   sudo ufw status
   # Should show: 80/tcp ALLOW, 443/tcp ALLOW
   ```
3. **Check nginx is running:**
   ```bash
   sudo systemctl status nginx
   ```
4. **Check your app is running:**
   ```bash
   curl http://localhost:3000
   ```

### SSL Certificate Failed

**Problem:** Certbot fails with authentication error

**Solutions:**

1. **Ensure domain is accessible via HTTP first:**
   ```bash
   curl http://YOUR_SUBDOMAIN.duckdns.org
   ```
   This MUST work before getting SSL
2. **Check nginx configuration:**

   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

3. **Verify DNS is fully propagated:**

   ```bash
   nslookup YOUR_SUBDOMAIN.duckdns.org
   ```

4. **Check port 80 is open** in Oracle Cloud Security List

5. **Try manual verification:**
   ```bash
   sudo certbot --nginx -d YOUR_SUBDOMAIN.duckdns.org -v
   ```

### Website Shows Nginx Welcome Page

**Problem:** Visiting domain shows default nginx page

**Solution:**

```bash
# Remove default nginx site
sudo rm /etc/nginx/sites-enabled/default

# Reload nginx
sudo systemctl reload nginx

# Test again
curl http://trackerproject.duckdns.org
```

### Auto IP Update (If Your IP Changes)

If your Oracle Cloud IP changes, update it automatically:

```bash
# Create update script
mkdir -p ~/duckdns
cd ~/duckdns

# Create update script
cat > duck.sh << 'EOF'
#!/bin/bash
echo url="https://www.duckdns.org/update?domains=YOUR_SUBDOMAIN&token=YOUR_TOKEN_HERE&ip=" | curl -k -o ~/duckdns/duck.log -K -
EOF

# Replace YOUR_TOKEN_HERE with your DuckDNS token from the dashboard

# Make executable
chmod +x duck.sh

# Add to crontab (runs every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -
```

## Summary

You've successfully:

- ✅ Registered `YOUR_SUBDOMAIN.duckdns.org`
- ✅ Pointed domain to your Oracle Cloud server (64.181.248.241)
- ✅ Configured Oracle Cloud firewall rules
- ✅ Installed nginx as reverse proxy (port 80/443 → 3000)
- ✅ Installed SSL certificate (HTTPS)
- ✅ Set up automatic HTTP → HTTPS redirect
- ✅ Your site is now accessible at: **https://YOUR_SUBDOMAIN.duckdns.org** 🎉

## What Was Configured

### 1. Nginx Reverse Proxy

**Installed:** Nginx web server
**Configuration file:** `/etc/nginx/sites-available/addiction-tracker`

**What it does:**

- Listens on port 80 (HTTP) and 443 (HTTPS)
- Forwards all requests to your app running on `localhost:3000`
- Your app never directly faces the internet

### 2. Firewall Rules

**UFW (Ubuntu Firewall):**

- Opened port 80 (HTTP)
- Opened port 443 (HTTPS)

**Oracle Cloud Security List:**

- Ingress rule for port 80
- Ingress rule for port 443

### 3. SSL Certificate

**Provider:** Let's Encrypt (via Certbot)
**Files:** `/etc/letsencrypt/live/YOUR_SUBDOMAIN.duckdns.org/`
**Auto-renewal:** Configured (runs twice daily, renews if expiring within 30 days)

**Certificate Details:**

- **Certificate File:** `/etc/letsencrypt/live/YOUR_SUBDOMAIN.duckdns.org/fullchain.pem`
- **Private Key:** `/etc/letsencrypt/live/YOUR_SUBDOMAIN.duckdns.org/privkey.pem`
- **Validity:** 90 days from issuance
- **Renewal:** Automatic (systemd timer: `certbot.timer`)

## How to Disable Domain Setup

If you want to stop using the domain and go back to direct access:

### Option 1: Stop Nginx (Keep Configuration)

```bash
# Stop nginx
sudo systemctl stop nginx

# Disable nginx from starting on boot
sudo systemctl disable nginx

# Now access your app directly at:
# http://64.181.248.241:3000
```

### Option 2: Remove Nginx Completely

```bash
# Stop nginx
sudo systemctl stop nginx

# Remove nginx packages
sudo apt remove --purge nginx nginx-common -y

# Remove configuration files
sudo rm -rf /etc/nginx

# Remove SSL certificates
sudo apt remove --purge certbot python3-certbot-nginx -y
sudo rm -rf /etc/letsencrypt

# Access your app directly at:
# http://64.181.248.241:3000
```

### Option 3: Close Firewall Ports (Keep Nginx Installed)

```bash
# Block external access to ports 80/443
sudo ufw delete allow 80/tcp
sudo ufw delete allow 443/tcp

# Remove Oracle Cloud Security List rules for ports 80/443
# (Do this in Oracle Cloud Console → Networking → Security Lists)

# Domain won't work, but nginx still runs locally
```

### After Disabling

- Your app will still run on port 3000
- Access it directly via: `http://64.181.248.241:3000`
- No HTTPS (unless you configure it differently)
- Domain `YOUR_SUBDOMAIN.duckdns.org` won't work

### Re-enable Later

To re-enable domain access:

```bash
# Start nginx
sudo systemctl start nginx
sudo systemctl enable nginx

# Open firewall ports
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Domain will work again
```

## Quick Reference

### Important URLs

- **Your Website:** https://YOUR_SUBDOMAIN.duckdns.org
- **DuckDNS Dashboard:** https://www.duckdns.org
- **Oracle Cloud Console:** https://cloud.oracle.com

### Important Commands

```bash
# Check nginx status
sudo systemctl status nginx

# Check SSL certificate details and expiration
sudo certbot certificates

# Check auto-renewal timer status
sudo systemctl status certbot.timer

# Test auto-renewal (dry run - doesn't actually renew)
sudo certbot renew --dry-run

# Manually renew certificates (if needed)
sudo certbot renew

# Force renewal even if not expiring soon
sudo certbot renew --force-renewal

# View renewal logs
sudo cat /var/log/letsencrypt/letsencrypt.log

# View nginx logs
sudo tail -f /var/log/nginx/error.log

# Restart nginx
sudo systemctl restart nginx

# Reload nginx (after config changes)
sudo systemctl reload nginx
```

### SSL Certificate Quick Commands

```bash
# View all certificates
sudo certbot certificates

# Check certificate expiration
sudo certbot certificates | grep -A 3 "Certificate Name"

# Delete a certificate
sudo certbot delete --cert-name YOUR_SUBDOMAIN.duckdns.org

# Recreate certificate
sudo certbot --nginx -d YOUR_SUBDOMAIN.duckdns.org --non-interactive --agree-tos --email YOUR_EMAIL --redirect
```

### Configuration Files

- **Nginx config:** `/etc/nginx/sites-available/addiction-tracker`
- **SSL certificates:** `/etc/letsencrypt/live/YOUR_SUBDOMAIN.duckdns.org/`
- **App location:** `/home/ubuntu/Project`

## Appendix: Actual Error Logs from huygiang.duckdns.org Setup

This section contains real error messages and solutions from the actual December 6, 2025 setup for reference.

### Error 1: Invalid Email Address

**Message:**
```
certbot.errors.Error: The ACME server believes huygiang@example.com is an invalid email address. 
Please ensure it is a valid email and attempt registration again.
```

**Cause:** Using placeholder email addresses like `user@example.com`

**Solution:** Use a real, valid email address from actual email providers:
- Gmail: `yourname@gmail.com`
- Outlook: `yourname@outlook.com`
- Corporate: `yourname@company.com`

**Successfully Fixed With:** `pkvk0090@gmail.com`

---

### Error 2: Port 80 Already in Use

**Message:**
```
Problem binding to port 80: Could not bind to IPv4 or IPv6.
```

**Cause:** Nginx was running on port 80, preventing Certbot's standalone authenticator from binding

**Context:** Using `certbot certonly --standalone` while Nginx is active

**Solution:** Use `certbot --nginx` plugin instead (works with running Nginx) OR stop Nginx temporarily

**Recommended Approach:** Use `--nginx` plugin which is designed to work alongside Nginx

---

### Error 3: Connection Timeout (Critical Issue)

**Full Error Message:**
```
Performing the following challenges:
http-01 challenge for huygiang.duckdns.org
Waiting for verification...
Challenge failed for domain huygiang.duckdns.org
http-01 challenge for huygiang.duckdns.org
Cleaning up challenges
Some challenges have failed.

IMPORTANT NOTES:
 - Domain: huygiang.duckdns.org
   Type: connection
   Detail: 170.9.15.38: Fetching http://huygiang.duckdns.org/.well-known/acme-challenge/jSZgGBdO899k...: 
   Timeout during connect (likely firewall problem)
```

**Root Cause:** Firewall blocking external connections to port 80

**This was the most critical issue - took 4 attempts to resolve**

**Investigation Steps:**
1. Verified DNS resolves correctly: ✓
2. Verified Nginx config is correct: ✓
3. Verified app is running on port 3000: ✓
4. Checked UFW status: Only showed port 3000 open
5. Checked Oracle Cloud Security List: Ports 80/443 were NOT open

**Solution Required Both:**

1. **Open UFW (Ubuntu Firewall):**
```bash
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw reload
```

2. **Open Oracle Cloud Security List:**
   - Navigate to: Networking → Virtual Cloud Networks → Your VCN → Security Lists
   - Add Ingress Rule for Port 80:
     * Protocol: TCP
     * Destination Port: 80
     * Source: 0.0.0.0/0
   - Add Ingress Rule for Port 443:
     * Protocol: TCP
     * Destination Port: 443
     * Source: 0.0.0.0/0

**Both firewall layers must be open.** If only one is open, the connection will timeout.

**Verification After Fix:**
```bash
# Test port 80 is now accessible
curl -I http://huygiang.duckdns.org
# Result: HTTP/1.1 200 OK ✓

# Then SSL setup worked
sudo certbot --nginx -d huygiang.duckdns.org --non-interactive --agree-tos --email pkvk0090@gmail.com --redirect
# Result: Congratulations! Successfully enabled HTTPS ✓
```

---

### Successful Setup Output

**Final Certificate Installation:**
```
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Plugins selected: Authenticator nginx, Installer nginx
Obtaining a new certificate
Performing the following challenges:
http-01 challenge for huygiang.duckdns.org
Waiting for verification...
Cleaning up challenges
Deploying Certificate to VirtualHost /etc/nginx/sites-enabled/addiction-tracker
Redirecting all traffic on port 80 to ssl in /etc/nginx/sites-enabled/addiction-tracker

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
Congratulations! You have successfully enabled https://huygiang.duckdns.org

IMPORTANT NOTES:
 - Congratulations! Your certificate and chain have been saved at:
   /etc/letsencrypt/live/huygiang.duckdns.org/fullchain.pem
   Your key file has been saved at:
   /etc/letsencrypt/live/huygiang.duckdns.org/privkey.pem
   Your cert will expire on 2026-03-06.
 - If you like Certbot, please consider supporting our work by:
   * Donating to ISRG / Let's Encrypt: https://letsencrypt.org/donate
   * Donating to EFF: https://eff.org/donate-le
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```

**Final Verification:**
```bash
# Test HTTPS
curl -I https://huygiang.duckdns.org
# HTTP/1.1 200 OK ✓

# Test HTTP redirect
curl -I http://huygiang.duckdns.org
# HTTP/1.1 301 Moved Permanently (to HTTPS) ✓

# View certificate
sudo certbot certificates
# Certificate name: huygiang.duckdns.org
# Expiry Date: 2026-03-06 (89 days remaining)
```

---

### Key Takeaways

1. **Email Must Be Valid** - Not placeholder domains
2. **Firewall Has Two Layers** - UFW + Cloud Provider Security List
3. **Both Firewall Layers Must Be Open** - Testing with `curl` helps verify
4. **Use `--nginx` Plugin** - When Nginx is running (best practice)
5. **Don't Ignore Connection Timeouts** - They indicate firewall issues, not DNS issues
6. **Follow the Nginx Path** - Certbot can automatically configure Nginx for HTTPS

## Need Help?

- **DuckDNS Help:** https://www.duckdns.org/faq.jsp
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **Nginx Docs:** https://nginx.org/en/docs/
- **Oracle Cloud:** https://docs.oracle.com/en-us/iaas/Content/home.htm
