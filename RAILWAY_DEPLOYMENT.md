# Railway Deployment Guide

This guide explains how to deploy the Addiction Tracker application on Railway.

## Prerequisites

- A [Railway](https://railway.app) account
- Git repository with your application code
- GitHub account (for connecting to Railway)

## Quick Start Checklist

Before deploying, ensure you have:

- [ ] Created a Railway account
- [ ] Connected your GitHub repository to Railway
- [ ] Added PostgreSQL database to your Railway project
- [ ] Linked the database to your app service (critical!)
- [ ] Set `SESSION_SECRET` environment variable
- [ ] Set `NODE_ENV=production`
- [ ] Pushed your code to GitHub

## Deployment Steps

### 1. Create a New Project on Railway

1. Log in to [Railway](https://railway.app)
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose the `addiction-tracker` repository
5. Railway will automatically detect it as a Node.js application

### 2. Add PostgreSQL Database

1. In your Railway project, click **"New"**
2. Select **"Database"** → **"Add PostgreSQL"**
3. Railway will automatically create and configure the database
4. The database connection variables will be available as environment variables

### 3. Configure Environment Variables

In your Railway project settings, add the following environment variables:

**Required Variables:**

```env
NODE_ENV=production
SESSION_SECRET=your_random_secret_key_here_change_this
```

**Important:**

- Generate a secure `SESSION_SECRET`:
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
- Railway automatically provides `DATABASE_URL` and other PostgreSQL variables
- Do NOT set `DB_HOST`, `DB_PORT`, etc. when using Railway PostgreSQL - just use `DATABASE_URL`

### 4. Database Initialization

Railway PostgreSQL is automatically provisioned, and the database schema is created during the build process.

The `npm run build` command automatically runs `node src/config/init.js` which:

- Creates all required tables
- Sets up indexes
- Configures sessions table

**No manual database setup needed!** The initialization happens automatically during deployment.

If you need to manually initialize or reset the database:

1. Go to your Railway project
2. Click on your app service
3. Go to **"Settings"** → **"Deploy"**
4. Click **"Redeploy"** to trigger a fresh build

### 5. Important: Link Database to App

**Critical Step:** You must link the PostgreSQL database to your app service:

1. Click on your app service in Railway
2. Go to **"Variables"** tab
3. Click **"New Variable"** → **"Add Reference"**
4. Select your PostgreSQL database
5. Choose `DATABASE_URL` from the dropdown
6. This will automatically inject the connection string into your app

### 6. Configure Build Settings

Railway automatically detects `package.json` and runs:

- **Build Command:** `npm install`
- **Start Command:** `npm start`

To customize, add a `railway.json` file (optional):

```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### 6. Deploy

1. Railway will automatically deploy after connecting your repository
2. Every push to your `main` branch will trigger a new deployment
3. Monitor deployment logs in the Railway dashboard

### 7. Access Your Application

1. Railway will provide a URL like: `your-app-name.up.railway.app`
2. To use a custom domain:
   - Go to **Settings** → **Domains**
   - Click **"Generate Domain"** or **"Custom Domain"**
   - Follow the DNS configuration instructions

## Post-Deployment

### Create Admin User

After deployment, create an admin user:

1. Connect to your Railway PostgreSQL database
2. Run:

```sql
INSERT INTO users (email, username, password_hash, is_admin, created_at)
VALUES ('admin@example.com', 'admin', '$2b$10$...', true, NOW());
```

Or use the setup script:

```bash
# SSH into Railway or use local connection
node src/config/setupAdmin.js
```

### Add Background Video (Optional)

1. Upload your video file to `/src/public/videos/background.mp4`
2. Ensure the file is committed to your repository
3. Or use a CDN/external video hosting service

## Monitoring & Logs

- **View Logs:** Railway Dashboard → Your Service → **Deployments** tab
- **Metrics:** Monitor CPU, Memory, and Network usage in the **Metrics** tab
- **Database:** Check PostgreSQL metrics in the database service

## Troubleshooting

### Build Fails with "ECONNREFUSED ::1:5432"

**Problem:** The build process can't connect to the database during initialization.

**Solution:**

1. **Link the database to your app:**
   - Go to your app service → **Variables** tab
   - Click **"New Variable"** → **"Add Reference"**
   - Select PostgreSQL database → Choose `DATABASE_URL`
2. **Redeploy:**
   - Go to **Settings** → **Deploy** → Click **"Redeploy"**

### Database Connection Issues

If you see database connection errors after deployment:

1. **Verify DATABASE_URL is set:**
   - Check Variables tab shows `DATABASE_URL` (should be a reference to PostgreSQL)
2. **Check PostgreSQL service is running:**
   - Click on PostgreSQL service - status should be "Active"
3. **Verify connection string format:**
   ```
   postgresql://user:password@host:port/database
   ```
4. **Check SSL settings:**
   - Railway requires SSL in production (automatically handled by the app)

### Build Command Fails

If `npm run build` fails:

1. Check that `package.json` has the build script:
   ```json
   "scripts": {
     "build": "npm run setup",
     "setup": "node src/config/init.js"
   }
   ```
2. Ensure `DATABASE_URL` is available during build time
3. Check build logs for specific errors

### Port Binding Issues

Railway automatically assigns a `PORT` environment variable. Ensure your `server.js` uses:

```javascript
const PORT = process.env.PORT || 3000;
```

### Session Issues

If sessions aren't persisting:

1. Verify `SESSION_SECRET` is set
2. Check PostgreSQL session table exists:
   ```sql
   SELECT * FROM session LIMIT 1;
   ```
3. Ensure `trust proxy` is enabled in production

### Video Not Loading

1. Check video file path is correct
2. Verify video file size (Railway has file size limits)
3. Consider using external video hosting for large files

## Environment Variables Reference

| Variable         | Required | Description                            | Example                 |
| ---------------- | -------- | -------------------------------------- | ----------------------- |
| `NODE_ENV`       | Yes      | Environment mode                       | `production`            |
| `PORT`           | Auto     | Server port (set by Railway)           | `3000`                  |
| `SESSION_SECRET` | Yes      | Session encryption key                 | `random_64_char_string` |
| `DATABASE_URL`   | Auto     | PostgreSQL connection (set by Railway) | `postgresql://...`      |
| `USE_HTTPS`      | No       | Enable secure cookies                  | `false`                 |

## Scaling

Railway offers:

- **Vertical Scaling:** Increase memory/CPU in service settings
- **Horizontal Scaling:** Available on Pro plan
- **Database Scaling:** Upgrade PostgreSQL plan as needed

## Backup

### Database Backup

1. Go to PostgreSQL service → **Data** tab
2. Use **Export** to download database backup
3. Or use `pg_dump` with Railway credentials:

```bash
pg_dump $DATABASE_URL > backup.sql
```

### Automated Backups

Railway Pro plan includes automated daily backups.

## Cost Estimation

- **Hobby Plan:** $5/month (includes 500 hours, good for small apps)
- **Pro Plan:** $20/month (unlimited usage, priority support)
- **Database:** Included with plan, usage-based scaling

## Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord](https://discord.gg/railway)
- [Railway Status](https://status.railway.app)

## Support

For Railway-specific issues:

- Railway Discord: [https://discord.gg/railway](https://discord.gg/railway)
- Railway Docs: [https://docs.railway.app](https://docs.railway.app)

For application issues:

- GitHub Issues: [https://github.com/trieuhuygiang/addiction-tracker/issues](https://github.com/trieuhuygiang/addiction-tracker/issues)
