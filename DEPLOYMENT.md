# NoFap Progress Tracker - Deployment Guide

This guide provides instructions for deploying the NoFap Progress Tracker application.

## Local Development

### Quick Start (Automated Setup)

**Everything in one command!** ⚡

```bash
npm run setup-all
# or
npm run init
```

This interactive script will:
- ✅ Install all dependencies
- ✅ Create and configure `.env` file (with prompts for your settings)
- ✅ Initialize the database with tables
- ✅ Start the development server

**That's it!** Your app will be running at `http://localhost:3000`

---

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Git

### Manual Setup

If you prefer to set up manually instead of using `npm run setup-all`, follow these steps:

1. **Clone the repository:**

   ```bash
   git clone <repository-url>
   cd Project
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Create `.env` file:**

   ```
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=your_postgres_user
   DB_PASSWORD=your_postgres_password
   DB_NAME=nofap_tracker
   SESSION_SECRET=your_random_secret_key_here
   NODE_ENV=development
   ```

4. **Initialize database:**

   ```bash
   npm run setup
   ```

5. **Start development server:**

   ```bash
   npm run dev
   ```

   Server will run at `http://localhost:3000`

## Production Deployment

### Option 1: Render (Recommended - Free Tier Available)

Render is a modern cloud platform that makes deployment easy with free PostgreSQL and web services.

#### Step 1: Create a Render Account

1. Go to [render.com](https://render.com) and sign up
2. Connect your GitHub account

#### Step 2: Create PostgreSQL Database

1. From Render Dashboard, click **New +** → **PostgreSQL**
2. Fill in the details:
   - **Name:** `addiction-tracker-db`
   - **Database:** `addiction_tracker`
   - **User:** `tracker_user` (or leave default)
   - **Region:** Choose closest to your users
   - **Plan:** Free (or paid for production)
3. Click **Create Database**
4. Wait for database to be created (takes 1-2 minutes)
5. Copy the **Internal Database URL** (you'll need this later)
   - It looks like: `postgres://user:password@host/database`

#### Step 3: Create Web Service

1. From Dashboard, click **New +** → **Web Service**
2. Connect your GitHub repository (`addiction-tracker`)
3. Fill in the details:
   - **Name:** `addiction-tracker`
   - **Region:** Same as your database
   - **Branch:** `main`
   - **Runtime:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free (or paid for production)

#### Step 4: Set Environment Variables

In the web service settings, add these environment variables:

| Key              | Value                                     |
| ---------------- | ----------------------------------------- |
| `NODE_ENV`       | `production`                              |
| `DATABASE_URL`   | (paste Internal Database URL from Step 2) |
| `SESSION_SECRET` | (generate: `openssl rand -hex 32`)        |
| `USE_HTTPS`      | `true`                                    |

**Note:** Render uses `DATABASE_URL` instead of individual DB variables.

#### Step 5: Update Database Connection (if needed)

The app should already support `DATABASE_URL`. If not, ensure your `src/config/db.js` includes:

```javascript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
});
```

#### Step 6: Deploy

1. Click **Create Web Service**
2. Render will automatically build and deploy
3. Wait for deployment to complete (3-5 minutes)
4. Your app will be live at `https://addiction-tracker.onrender.com`

#### Step 7: Initialize Database

After first deployment, you need to initialize the database:

**Option A: Using Render Shell**

1. Go to your web service dashboard
2. Click **Shell** tab
3. Run: `npm run setup`

**Option B: Auto-initialize on Start**
The app already runs database initialization on startup, so tables should be created automatically.

#### Render Free Tier Notes

- **Web Service:** Spins down after 15 minutes of inactivity, spins up on next request (may take 30 seconds)
- **Database:** 1GB storage, expires after 90 days (need to recreate)
- For production, consider paid plans for always-on service

#### Custom Domain (Optional)

1. Go to your web service → **Settings** → **Custom Domains**
2. Add your domain: `yourdomain.com`
3. Add the DNS records shown to your domain provider
4. Render provides free SSL automatically

---

### Option 2: Heroku

1. **Install Heroku CLI:**

   ```bash
   npm install -g heroku
   ```

2. **Login to Heroku:**

   ```bash
   heroku login
   ```

3. **Create Heroku app:**

   ```bash
   heroku create your-app-name
   ```

4. **Add PostgreSQL addon:**

   ```bash
   heroku addons:create heroku-postgresql:hobby-dev
   ```

5. **Set environment variables:**

   ```bash
   heroku config:set NODE_ENV=production
   heroku config:set SESSION_SECRET=your_secure_random_key
   ```

6. **Deploy:**

   ```bash
   git push heroku main
   ```

7. **Initialize database:**
   ```bash
   heroku run npm run setup
   ```

---

### Option 3: DigitalOcean / AWS / VPS

1. **SSH into server:**

   ```bash
   ssh root@your_server_ip
   ```

2. **Install Node.js and PostgreSQL:**

   ```bash
   curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
   sudo apt-get install -y nodejs postgresql postgresql-contrib
   ```

3. **Create database:**

   ```bash
   sudo -u postgres createdb nofap_tracker
   sudo -u postgres createuser nofap_user
   sudo -u postgres psql -c "ALTER USER nofap_user WITH PASSWORD 'your_secure_password';"
   sudo -u postgres psql -c "ALTER ROLE nofap_user CREATEDB;"
   ```

4. **Clone and setup:**

   ```bash
   git clone <repository-url>
   cd Project
   npm install
   ```

5. **Create `.env` with production values:**

   ```bash
   cp .env.example .env
   # Edit .env with production database credentials
   ```

6. **Initialize database:**

   ```bash
   npm run setup
   ```

7. **Use PM2 for process management:**

   ```bash
   sudo npm install -g pm2
   pm2 start src/server.js --name "nofap-tracker"
   pm2 startup
   pm2 save
   ```

8. **Setup Nginx reverse proxy:**

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
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

9. **Setup SSL with Let's Encrypt:**
   ```bash
   sudo apt-get install certbot python3-certbot-nginx
   sudo certbot --nginx -d your_domain.com
   ```

## Environment Variables

### Required:

- `PORT` - Server port (default: 3000)
- `DB_HOST` - PostgreSQL host
- `DB_PORT` - PostgreSQL port (default: 5432)
- `DB_USER` - PostgreSQL username
- `DB_PASSWORD` - PostgreSQL password
- `DB_NAME` - Database name
- `SESSION_SECRET` - Session encryption key (use a strong random string)

### Optional:

- `NODE_ENV` - Set to 'production' for production deployment

## Database Backup

### PostgreSQL Backup:

```bash
pg_dump -U your_user -h localhost nofap_tracker > backup.sql
```

### Restore from backup:

```bash
psql -U your_user -h localhost nofap_tracker < backup.sql
```

## Monitoring and Maintenance

### Check logs:

```bash
# PM2 logs
pm2 logs nofap-tracker

# Nginx logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Database maintenance:

```bash
# Backup regularly (daily)
0 2 * * * pg_dump -U your_user nofap_tracker > /backups/nofap_tracker_$(date +\%Y\%m\%d).sql
```

## Security Considerations

1. **Use HTTPS** - Always use SSL/TLS in production
2. **Strong passwords** - Use strong database passwords
3. **SESSION_SECRET** - Generate a random, strong session secret
4. **Keep dependencies updated:**
   ```bash
   npm audit
   npm update
   ```
5. **Firewall** - Restrict database access to app server only
6. **Rate limiting** - Consider adding rate limiting for login attempts
7. **CORS** - Configure CORS if API will be consumed by frontend on different domain

## Performance Tips

1. **Enable compression:**

   ```bash
   npm install compression
   ```

   Add to app.js: `app.use(compression());`

2. **Use connection pooling** - Already configured in `db.js`

3. **Add caching headers** for static files

4. **Monitor database queries** - Use `EXPLAIN ANALYZE` for slow queries

5. **Regular backups** - Daily automated backups recommended

## Support & Troubleshooting

### Common Issues:

**Database connection refused:**

- Check PostgreSQL is running
- Verify credentials in `.env`
- Check firewall rules

**Session timeout issues:**

- Increase `maxAge` in session config if needed
- Ensure Redis is running (if using Redis for sessions)

**Static files not loading:**

- Check file permissions
- Verify public directory path in app.js

For more help, check the main README.md file.

---

Stay focused and stay strong! 💪🧠🔥
