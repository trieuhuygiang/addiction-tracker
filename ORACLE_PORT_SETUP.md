# Port 3000 & 3001 Public IP Access Setup Guide

This guide documents the complete process to enable public IP access to Node.js servers running on ports 3000, 3001, or any port  on Ubuntu with Oracle Cloud.

## Prerequisites
- Ubuntu server running on Oracle Cloud
- Node.js and npm installed
- SSH access to your instance
- Public IP assigned by Oracle Cloud

## Step-by-Step Setup

### Step 1: Configure Node.js Server to Listen on All Interfaces

Edit your server configuration file (e.g., `server.js`, `bin/www`):

```javascript
// OLD - Only localhost
app.listen(port, () => {
    console.log(`Listening on http://127.0.0.1:${port}/`);
});

// NEW - All interfaces (0.0.0.0)
server.listen(port, '0.0.0.0');
// or
app.listen(port, '0.0.0.0', () => {
    console.log(`Listening on port ${port} (accessible via public IP)`);
});
```

**Why:** By default, `app.listen(port)` only binds to localhost (127.0.0.1), preventing external access. Binding to `0.0.0.0` makes it accessible from any network interface.

### Step 2: Enable UFW Firewall and Allow Ports

```bash
# Allow port 3000
sudo ufw allow 3000/tcp

# Allow port 3001
sudo ufw allow 3001/tcp

# Enable UFW
sudo ufw enable

# Verify rules
sudo ufw status | grep 300
```

Expected output:
```
3000/tcp                   ALLOW       Anywhere                  
3001/tcp                   ALLOW       Anywhere (v6)             
3001/tcp                   ALLOW       Anywhere                  
3001/tcp (v6)              ALLOW       Anywhere (v6)   
```

### Step 3: Configure iptables Rules

```bash
# Add port 3000
sudo iptables -I INPUT -p tcp --dport 3000 -j ACCEPT
sudo ip6tables -I INPUT -p tcp --dport 3000 -j ACCEPT

# Add port 3001
sudo iptables -I INPUT -p tcp --dport 3001 -j ACCEPT
sudo ip6tables -I INPUT -p tcp --dport 3001 -j ACCEPT

# Verify rules
sudo iptables -L INPUT -n | grep 300
```

Expected output:
```
ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:3000
ACCEPT     tcp  --  0.0.0.0/0            0.0.0.0/0            tcp dpt:3001
```

### Step 4: Persist iptables Rules (Survive Reboot)

```bash
# Install iptables-persistent
sudo apt-get install -y iptables-persistent netfilter-persistent

# Save current rules
sudo netfilter-persistent save
```

This ensures your iptables rules persist across system reboots.

### Step 5: Verify Listening Ports

```bash
# Check which ports are listening
sudo netstat -tulpn | grep node
# or
sudo ss -tulpn | grep node
```

Expected output:
```
tcp    LISTEN  0  511  0.0.0.0:3000  0.0.0.0:*  (node process)
tcp    LISTEN  0  511  0.0.0.0:3001  0.0.0.0:*  (node process)
```

### Step 6: Configure Oracle Cloud Security List

1. Log in to **Oracle Cloud Console**
2. Navigate to **Networking** → **Virtual Cloud Networks**
3. Select your **VCN** (Virtual Cloud Network)
4. Click on your **subnet**
5. Find **Security Lists** and click the one associated with your instance
6. Click **Add Ingress Rules** and add:

   **Rule 1 - Port 3000:**
   - **Stateless:** No
   - **Protocol:** TCP
   - **Source Type:** CIDR
   - **Source CIDR:** 0.0.0.0/0
   - **Destination Port Range:** 3000

   **Rule 2 - Port 3001:**
   - **Stateless:** No
   - **Protocol:** TCP
   - **Source Type:** CIDR
   - **Source CIDR:** 0.0.0.0/0
   - **Destination Port Range:** 3001

7. Click **Add Ingress Rules**

### Step 7: Find Your Public IP and Test

```bash
# Get your public IP
curl -s https://checkip.amazonaws.com
# or
curl -s https://icanhazip.com
```

Test connectivity:
```bash
# Test port 3000
curl -I http://<your-public-ip>:3000/

# Test port 3001
curl -I http://<your-public-ip>:3001/
```

Or use your browser:
- `http://<your-public-ip>:3000/`
- `http://<your-public-ip>:3001/`

### Step 8: Start Your Application

```bash
# Using npm
npm start
# or
npm run start
```

## Troubleshooting

### Connection Timeout
- **Cause:** Oracle Cloud Security List not configured
- **Solution:** Double-check Step 6 - ensure ingress rules are added for both ports

### Connection Refused
- **Cause:** Node.js server not running or not listening on 0.0.0.0
- **Solution:** 
  1. Verify server is listening: `sudo ss -tulpn | grep node`
  2. Check server.js binds to '0.0.0.0', not '127.0.0.1'

### Port Already in Use
```bash
# Find process using the port
sudo lsof -i :3000
sudo lsof -i :3001

# Kill the process if needed
sudo kill -9 <PID>
```

### Verify UFW Rules
```bash
sudo ufw status verbose
```

### Check iptables Rules
```bash
sudo iptables -L INPUT -n
sudo ip6tables -L INPUT -n
```

## Summary of Changes Made

| Component | Change | Purpose |
|-----------|--------|---------|
| **server.js** | Listen on `0.0.0.0` | Allow external connections |
| **UFW** | Allow ports 3000, 3001 | Ubuntu firewall rules |
| **iptables** | Accept TCP on 3000, 3001 | Kernel-level firewall |
| **netfilter-persistent** | Saved rules | Persist across reboots |
| **Oracle Cloud** | Security List rules | Cloud provider firewall |

## Useful Commands Reference

```bash
# Check server status
npm run start

# Test local access
curl http://localhost:3000/
curl http://localhost:3001/

# Test public access
curl http://<public-ip>:3000/
curl http://<public-ip>:3001/

# View active connections
netstat -an | grep 3000
netstat -an | grep 3001

# Restart firewall
sudo ufw reload
```

## Notes

- Replace `<your-public-ip>` with your actual public IP (e.g., 159.54.164.18)
- Ensure your Node.js application is running on both ports
- Test from a different network/device to confirm public access works
- Keep your server updated: `sudo apt update && sudo apt upgrade`
