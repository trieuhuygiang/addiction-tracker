# Deploy Addiction Tracker to Render

This guide walks you through deploying the Addiction Tracker app to [Render](https://render.com) - a modern cloud platform with a free tier.

---

## Quick Overview

You'll create:

1. A **PostgreSQL database** (free tier: 1GB, 90 days)
2. A **Web Service** (free tier: spins down after inactivity)

**Time required:** ~10 minutes

---

## Prerequisites

- A [GitHub](https://github.com) account
- Fork or push this repository to your GitHub account

---

## Step 1: Create a Render Account

1. Go to [render.com](https://render.com)
2. Click **Get Started for Free**
3. Sign up with your **GitHub account** (recommended for easy deployment)

---

## Step 2: Create PostgreSQL Database

### 2.1 Create New Database

1. From your Render Dashboard, click **New +**
2. Select **PostgreSQL**

### 2.2 Configure Database

Fill in the following:

| Field                  | Value                                                   |
| ---------------------- | ------------------------------------------------------- |
| **Name**               | `addiction-tracker-db`                                  |
| **Database**           | `addiction_tracker`                                     |
| **User**               | `tracker_user` (or leave default)                       |
| **Region**             | Choose closest to your users (e.g., `Oregon (US West)`) |
| **PostgreSQL Version** | `16` (or latest)                                        |
| **Plan**               | `Free`                                                  |

### 2.3 Create Database

1. Click **Create Database**
2. Wait 1-2 minutes for the database to be ready
3. Once ready, you'll see a green "Available" status

### 2.4 Copy Database URL

1. Scroll down to **Connections**
2. Copy the **Internal Database URL**
   - It looks like: `postgres://tracker_user:abc123xyz@dpg-xxx-a.oregon-postgres.render.com/addiction_tracker`
3. **Save this URL** - you'll need it in Step 3

---

## Step 3: Create Web Service

### 3.1 Create New Web Service

1. From Dashboard, click **New +**
2. Select **Web Service**

### 3.2 Connect Repository

1. Click **Connect a repository from GitHub**
2. If prompted, authorize Render to access your GitHub
3. Find and select your `addiction-tracker` repository
4. Click **Connect**

### 3.3 Configure Web Service

Fill in the following:

| Field              | Value                 |
| ------------------ | --------------------- |
| **Name**           | `addiction-tracker`   |
| **Region**         | Same as your database |
| **Branch**         | `main`                |
| **Root Directory** | (leave empty)         |
| **Runtime**        | `Node`                |
| **Build Command**  | `npm install`         |
| **Start Command**  | `npm start`           |
| **Plan**           | `Free`                |

### 3.4 Add Environment Variables

Scroll down to **Environment Variables** and click **Add Environment Variable**.

Add these variables:

| Key              | Value                                           |
| ---------------- | ----------------------------------------------- |
| `NODE_ENV`       | `production`                                    |
| `DATABASE_URL`   | (paste the Internal Database URL from Step 2.4) |
| `SESSION_SECRET` | (any random text - see examples below)          |
| `USE_HTTPS`      | `true`                                          |

#### What is SESSION_SECRET?

It's just a random password that keeps user sessions secure. It can be **any random text** - the longer and more random, the better.

**Easy examples you can use:**

```
MySecretKey2025TrackerApp!@#$%
```

```
abc123xyz789!SuperSecretPassword456
```

```
JustTypeAnythingRandomHere12345!@#
```

**Or generate one online:**

- Go to [randomkeygen.com](https://randomkeygen.com)
- Scroll to "CodeIgniter Encryption Keys"
- Copy any key

Just pick something random and paste it as the value!

### 3.5 Deploy

1. Click **Create Web Service**
2. Render will start building and deploying your app
3. Watch the logs - this takes about 3-5 minutes

---

## Step 4: Verify Deployment

### 4.1 Check Build Logs

Watch for these success indicators:

```
==> Build successful 🎉
==> Deploying...
==> Starting service with 'npm start'
Server running on http://localhost:10000
Database pool connected
```

### 4.2 Access Your App

1. Once deployed, click the URL at the top of your service page
   - It will be something like: `https://addiction-tracker.onrender.com`
2. You should see the Addiction Tracker homepage!

### 4.3 Create an Account

1. Click **Sign Up**
2. Create your account
3. Start tracking!

---

## Troubleshooting

### Database Connection Error

**Error:** `Connection refused` or `Database not found`

**Solution:**

1. Make sure you used the **Internal Database URL** (not External)
2. Verify the DATABASE_URL is correct in environment variables
3. Check that the database is in the same region as the web service

### App Shows Error Page

**Check logs:**

1. Go to your web service dashboard
2. Click **Logs** tab
3. Look for error messages

**Common fixes:**

- Verify all environment variables are set correctly
- Make sure SESSION_SECRET is set
- Redeploy by clicking **Manual Deploy** → **Deploy latest commit**

### App is Slow to Load

This is normal on the free tier. The app "spins down" after 15 minutes of inactivity and takes ~30 seconds to spin back up.

**Solutions:**

- Upgrade to a paid plan ($7/month) for always-on service
- Use a service like [UptimeRobot](https://uptimerobot.com) to ping your app every 14 minutes (keeps it awake)

### Database Expired (90 days)

Free databases expire after 90 days.

**Solution:**

1. Create a new database
2. Update the DATABASE_URL in your web service
3. Redeploy

Or upgrade to a paid database plan.

---

## Custom Domain (Optional)

### Add Your Domain

1. Go to your web service → **Settings**
2. Scroll to **Custom Domains**
3. Click **Add Custom Domain**
4. Enter your domain: `tracker.yourdomain.com`

### Configure DNS

Add these DNS records at your domain provider:

| Type    | Name      | Value                            |
| ------- | --------- | -------------------------------- |
| `CNAME` | `tracker` | `addiction-tracker.onrender.com` |

For root domain (`yourdomain.com`):
| Type | Name | Value |
|------|------|-------|
| `A` | `@` | (IP provided by Render) |

### SSL Certificate

Render automatically provisions a free SSL certificate once DNS is configured. This may take a few minutes.

---

## Updating Your App

When you push changes to GitHub, Render can automatically redeploy.

### Enable Auto-Deploy (Recommended)

1. Go to your web service → **Settings**
2. Find **Auto-Deploy**
3. Set to **Yes**

Now every push to `main` branch will trigger a new deployment.

### Manual Deploy

1. Go to your web service dashboard
2. Click **Manual Deploy**
3. Select **Deploy latest commit**

---

## Environment Variables Reference

| Variable         | Required | Description                          |
| ---------------- | -------- | ------------------------------------ |
| `NODE_ENV`       | Yes      | Set to `production`                  |
| `DATABASE_URL`   | Yes      | PostgreSQL connection string         |
| `SESSION_SECRET` | Yes      | Random string for session encryption |
| `USE_HTTPS`      | Yes      | Set to `true` for Render             |
| `PORT`           | No       | Render sets this automatically       |

---

## Pricing

### Free Tier Limits

| Resource    | Limit                                    |
| ----------- | ---------------------------------------- |
| Web Service | 750 hours/month, spins down after 15 min |
| PostgreSQL  | 1GB storage, expires after 90 days       |
| Bandwidth   | 100GB/month                              |

### Paid Plans (Optional)

| Plan     | Web Service          | Database              |
| -------- | -------------------- | --------------------- |
| Starter  | $7/month (always on) | $7/month (persistent) |
| Standard | $25/month            | $20/month             |

---

## Useful Links

- [Render Dashboard](https://dashboard.render.com)
- [Render Documentation](https://render.com/docs)
- [Render Status Page](https://status.render.com)

---

## Quick Commands

### Check if app is running

Visit your app URL or check the Render dashboard.

### View logs

Go to your web service → **Logs** tab

### Restart service

Go to your web service → **Manual Deploy** → **Clear build cache & deploy**

### Connect to database (advanced)

Use the **External Database URL** with a PostgreSQL client like pgAdmin or DBeaver.

---

## Need Help?

1. Check the [Render Community](https://community.render.com)
2. Review the main [DEPLOYMENT.md](./DEPLOYMENT.md) for other options
3. Check [UBUNTU_DEPLOYMENT.md](./UBUNTU_DEPLOYMENT.md) for VPS deployment

---

**You're all set! Enjoy tracking your progress! 💪**
