# Deploy Addiction Tracker to Render

This guide walks you through deploying the Addiction Tracker app to [Render](https://render.com) with [Supabase](https://supabase.com) as the database.

---

## Quick Overview

You'll create:

1. A **PostgreSQL database** on Supabase (free tier: 500MB, no expiration)
2. A **Web Service** on Render (free tier: spins down after inactivity)

**Time required:** ~15 minutes

---

## Prerequisites

- A [GitHub](https://github.com) account
- Fork or push this repository to your GitHub account

---

## Step 1: Create a Supabase Database

### 1.1 Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click **Start your project**
3. Sign up with your **GitHub account** (recommended)

### 1.2 Create New Project

1. Click **New Project**
2. Fill in the following:

| Field            | Value                                          |
| ---------------- | ---------------------------------------------- |
| **Organization** | Select or create one                           |
| **Name**         | `addiction-tracker`                            |
| **Password**     | Create a strong database password (save this!) |
| **Region**       | Choose closest to your users                   |
| **Plan**         | `Free`                                         |

3. Click **Create new project**
4. Wait 1-2 minutes for the project to be ready

### 1.3 Get Database Connection String (Pooler)

> ⚠️ **Important:** You must use the **Pooler connection string** (not Direct) to avoid IPv6 connection issues with Render.

1. In your Supabase project, go to **Settings** (gear icon) → **Database**
2. Scroll down to **Connection string**
3. Click the **Mode** dropdown and select **Session** (not Direct!)
4. Copy the connection string - it looks like:
   ```
   postgresql://postgres.[project-ref]:[YOUR-PASSWORD]@aws-0-[region].pooler.supabase.com:6543/postgres
   ```
5. Replace `[YOUR-PASSWORD]` with the database password you created
6. **Save this URL** - you'll need it in Step 3

---

## Step 2: Create a Render Account

1. Go to [render.com](https://render.com)
2. Click **Get Started for Free**
3. Sign up with your **GitHub account** (recommended for easy deployment)

---

## Step 3: Create Web Service on Render

### 3.1 Create New Web Service

1. From Render Dashboard, click **New +**
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

| Key              | Value                                                       |
| ---------------- | ----------------------------------------------------------- |
| `NODE_ENV`       | `production`                                                |
| `DATABASE_URL`   | (paste the Supabase Pooler connection string from Step 1.3) |
| `SESSION_SECRET` | (any random text - see examples below)                      |
| `USE_HTTPS`      | `true`                                                      |

> ⚠️ **Important:** Make sure you're using the Supabase **Pooler** URL (with `pooler.supabase.com` and port `6543`), NOT the direct URL. Using the direct URL will cause `ENETUNREACH` connection errors.

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

**Error:** `ENETUNREACH` or `Connection refused`

**Solution:**

1. Make sure you're using the **Supabase Pooler URL** (not Direct URL)
   - ✅ Correct: `postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`
   - ❌ Wrong: `postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres`
2. Go to Supabase → Settings → Database → Connection string → Select **Session** mode
3. Copy the pooler URL and update it in Render environment variables
4. Redeploy

**Error:** `password authentication failed`

**Solution:**

1. Check that you replaced `[YOUR-PASSWORD]` with your actual database password
2. Make sure there are no extra spaces in the connection string
3. If you forgot your password, reset it in Supabase → Settings → Database

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

---

## Why Supabase Instead of Render PostgreSQL?

| Feature              | Supabase (Free)    | Render PostgreSQL (Free) |
| -------------------- | ------------------ | ------------------------ |
| **Storage**          | 500MB              | 1GB                      |
| **Expiration**       | ❌ No expiration   | ⚠️ 90 days               |
| **Always Available** | ✅ Yes             | ✅ Yes                   |
| **Dashboard**        | ✅ Full SQL editor | ⚠️ Basic                 |
| **Backups**          | ✅ Daily (paid)    | ❌ No                    |

Supabase is recommended because the free tier doesn't expire after 90 days.

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
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Render Documentation](https://render.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

---

## Quick Commands

### Check if app is running

Visit your app URL or check the Render dashboard.

### View logs

Go to your web service → **Logs** tab

### Restart service

Go to your web service → **Manual Deploy** → **Clear build cache & deploy**

### Connect to database (advanced)

Use the **Direct Database URL** from Supabase with a PostgreSQL client like pgAdmin, DBeaver, or the Supabase SQL Editor.

---

## Need Help?

1. Check the [Render Community](https://community.render.com)
2. Review the main [DEPLOYMENT.md](./DEPLOYMENT.md) for other options
3. Check [UBUNTU_DEPLOYMENT.md](./UBUNTU_DEPLOYMENT.md) for VPS deployment

---

**You're all set! Enjoy tracking your progress! 💪**
