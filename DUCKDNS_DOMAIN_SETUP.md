# DuckDNS Domain Setup Guide

This guide will walk you through linking your Oracle Cloud server to a free DuckDNS subdomain (`trackerproject.duckdns.org`).

## What This Setup Does

This configuration makes your app accessible via a domain name instead of just IP:PORT.

**Before:**

- Access app at: `http://64.181.248.241:3000`

**After:**

- Access app at: `https://trackerproject.duckdns.org` (port 80/443)

**How it works:**

1. **Nginx** acts as a reverse proxy on port 80/443
2. Nginx forwards all requests to your app on port 3000
3. SSL certificate secures traffic (HTTPS)
4. Your app still runs on port 3000 internally

## Prerequisites

- Oracle Cloud server with public IP
- Application running on port 3000
- SSH access to your server

## Your Server Details

- **Public IP:** 64.181.248.241
- **Domain:** trackerproject.duckdns.org
- **Application Port:** 3000 (internal)
- **Public Ports:** 80 (HTTP), 443 (HTTPS)

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
2. In the **"sub domain"** field, enter: `trackerproject`
   - This will create: `trackerproject.duckdns.org`
3. In the **"current ip"** field, enter your server's public IP: `64.181.248.241`
4. Click the green **"add domain"** button
5. You should see your new domain listed with a green "OK" status

### 1.3 Verify Domain Created

You should now see:

```
trackerproject.duckdns.org → 64.181.248.241 ✓
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
nslookup trackerproject.duckdns.org

# Should show:
# Server: ...
# Address: 64.181.248.241
```

Or use online tools:

- https://dnschecker.org
- Search for: `trackerproject.duckdns.org`
- Should show IP: `64.181.248.241`

### 3.2 Test HTTP Access

From your local computer:

```bash
curl -I http://trackerproject.duckdns.org
```

If you get a connection, you should see:

```
HTTP/1.1 200 OK
Server: nginx
...
```

## Step 4: Install SSL Certificate (HTTPS)

Now that your domain is accessible via HTTP, let's secure it with HTTPS.

### 4.1 Get SSL Certificate with Let's Encrypt

SSH into your Oracle Cloud server and run:

```bash
sudo certbot --nginx -d trackerproject.duckdns.org --non-interactive --agree-tos --email your-email@example.com --redirect
```

**Replace `your-email@example.com`** with your actual email address.

**Command Explanation:**

- `sudo` - Run with administrator privileges
- `certbot` - Let's Encrypt SSL certificate tool
- `--nginx` - Automatically configure nginx for HTTPS
- `-d trackerproject.duckdns.org` - Domain to secure
- `--non-interactive` - Don't prompt for input
- `--agree-tos` - Agree to Let's Encrypt Terms of Service
- `--email your-email@example.com` - Email for renewal notices and security alerts
- `--redirect` - Automatically redirect HTTP to HTTPS

### 4.2 What Certbot Does

When you run this command, Certbot will:

1. **Verify Domain Ownership** - Creates temporary file on your server to prove you control the domain
2. **Request Certificate** - Contacts Let's Encrypt servers to generate SSL certificate
3. **Install Certificate** - Saves certificate files to `/etc/letsencrypt/live/trackerproject.duckdns.org/`
4. **Configure Nginx** - Updates your nginx config to use HTTPS (port 443)
5. **Setup Redirect** - Adds rule to redirect all HTTP (port 80) traffic to HTTPS
6. **Enable Auto-Renewal** - Creates systemd timer to renew certificate before it expires (every 90 days)

### 4.3 Expected Output

You should see:

```
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Account registered.
Requesting a certificate for trackerproject.duckdns.org

Successfully received certificate.
Certificate is saved at: /etc/letsencrypt/live/trackerproject.duckdns.org/fullchain.pem
Key is saved at: /etc/letsencrypt/live/trackerproject.duckdns.org/privkey.pem
This certificate expires on 2026-03-06.
These files will be updated when the certificate renews.
Certbot has set up a scheduled task to automatically renew this certificate in the background.

Deploying certificate
Successfully deployed certificate for trackerproject.duckdns.org to /etc/nginx/sites-enabled/addiction-tracker
Congratulations! You have successfully enabled HTTPS on https://trackerproject.duckdns.org

- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
If you like Certbot, please consider supporting our work by:
 * Donating to ISRG / Let's Encrypt:   https://letsencrypt.org/donate
 * Donating to EFF:                    https://eff.org/donate-le
- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -
```

## Step 5: Test Your Website

### 5.1 Access via HTTPS

Open your browser and visit:

```
https://trackerproject.duckdns.org
```

You should see your Addiction Tracker application with a secure padlock icon 🔒

### 5.2 Verify HTTP Redirects to HTTPS

Try accessing:

```
http://trackerproject.duckdns.org
```

It should automatically redirect to:

```
https://trackerproject.duckdns.org
```

### 5.3 Check SSL Certificate

In your browser:

1. Click the **padlock icon** in the address bar
2. Click **"Certificate"** or **"Connection is secure"**
3. Verify:
   - Issued by: Let's Encrypt
   - Valid for: trackerproject.duckdns.org
   - Expires in ~90 days

### 5.4 Check Certificate from Command Line

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

## Step 6: SSL Certificate Renewal

Let's Encrypt certificates are valid for **90 days** and must be renewed before expiration.

### 6.1 Automatic Renewal (Recommended)

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

### 6.2 Manual Renewal

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
sudo certbot renew --cert-name trackerproject.duckdns.org
```

### 6.3 What Happens During Renewal

1. **Certificate Check** - Certbot checks expiration date
2. **Domain Verification** - Re-verifies you still own the domain
3. **New Certificate** - Gets new certificate from Let's Encrypt
4. **Update Files** - Replaces old certificate files with new ones
5. **Reload Nginx** - Reloads nginx to use new certificate
6. **No Downtime** - Your site stays online during renewal

### 6.4 Monitor Certificate Expiration

**Check when certificate expires:**

```bash
sudo certbot certificates
```

**Look for:** `Expiry Date: 2026-03-06 17:25:40+00:00 (VALID: 89 days)`

**View renewal logs:**

```bash
sudo cat /var/log/letsencrypt/letsencrypt.log
```

### 6.5 Troubleshooting Renewal Issues

**If renewal fails:**

1. **Check nginx is running:**

   ```bash
   sudo systemctl status nginx
   ```

2. **Verify domain still points to your IP:**

   ```bash
   nslookup trackerproject.duckdns.org
   ```

3. **Check port 80 is accessible:**

   ```bash
   curl -I http://trackerproject.duckdns.org
   ```

4. **Try manual renewal with verbose output:**

   ```bash
   sudo certbot renew -v
   ```

5. **If still failing, delete and recreate certificate:**

   ```bash
   # Delete old certificate
   sudo certbot delete --cert-name trackerproject.duckdns.org

   # Get new certificate
   sudo certbot --nginx -d trackerproject.duckdns.org --non-interactive --agree-tos --email your-email@example.com --redirect
   ```

### 6.6 Renewal Email Notifications

Let's Encrypt will email you at the address you provided if:

- Certificate is about to expire (30, 14, 7 days before)
- Auto-renewal is failing
- Important security notices

**Make sure the email address is valid and monitored!**

## Step 7: Keep Your App Running (Optional)

To ensure your app stays running even after you log out:

### 7.1 Install PM2 (Process Manager)

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

### 7.2 PM2 Useful Commands

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

## Troubleshooting

### DNS Not Resolving

**Problem:** `nslookup trackerproject.duckdns.org` doesn't return your IP

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

**Problem:** `curl http://trackerproject.duckdns.org` times out

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
   curl http://trackerproject.duckdns.org
   ```
   This MUST work before getting SSL
2. **Check nginx configuration:**

   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

3. **Verify DNS is fully propagated:**

   ```bash
   nslookup trackerproject.duckdns.org
   ```

4. **Check port 80 is open** in Oracle Cloud Security List

5. **Try manual verification:**
   ```bash
   sudo certbot --nginx -d trackerproject.duckdns.org -v
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
echo url="https://www.duckdns.org/update?domains=trackerproject&token=YOUR_TOKEN_HERE&ip=" | curl -k -o ~/duckdns/duck.log -K -
EOF

# Replace YOUR_TOKEN_HERE with your DuckDNS token from the dashboard

# Make executable
chmod +x duck.sh

# Add to crontab (runs every 5 minutes)
(crontab -l 2>/dev/null; echo "*/5 * * * * ~/duckdns/duck.sh >/dev/null 2>&1") | crontab -
```

## Summary

You've successfully:

- ✅ Registered `trackerproject.duckdns.org`
- ✅ Pointed domain to your Oracle Cloud server (64.181.248.241)
- ✅ Configured Oracle Cloud firewall rules
- ✅ Installed nginx as reverse proxy (port 80/443 → 3000)
- ✅ Installed SSL certificate (HTTPS)
- ✅ Set up automatic HTTP → HTTPS redirect
- ✅ Your site is now accessible at: **https://trackerproject.duckdns.org** 🎉

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
**Files:** `/etc/letsencrypt/live/trackerproject.duckdns.org/`
**Auto-renewal:** Configured (runs twice daily, renews if expiring within 30 days)

**Certificate Details:**

- **Certificate File:** `/etc/letsencrypt/live/trackerproject.duckdns.org/fullchain.pem`
- **Private Key:** `/etc/letsencrypt/live/trackerproject.duckdns.org/privkey.pem`
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
- Domain `trackerproject.duckdns.org` won't work

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

- **Your Website:** https://trackerproject.duckdns.org
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
sudo certbot delete --cert-name trackerproject.duckdns.org

# Recreate certificate
sudo certbot --nginx -d trackerproject.duckdns.org --non-interactive --agree-tos --email your@email.com --redirect
```

### Configuration Files

- **Nginx config:** `/etc/nginx/sites-available/addiction-tracker`
- **SSL certificates:** `/etc/letsencrypt/live/trackerproject.duckdns.org/`
- **App location:** `/home/ubuntu/Project`

## Need Help?

- **DuckDNS Help:** https://www.duckdns.org/faq.jsp
- **Let's Encrypt:** https://letsencrypt.org/docs/
- **Nginx Docs:** https://nginx.org/en/docs/
- **Oracle Cloud:** https://docs.oracle.com/en-us/iaas/Content/home.htm
