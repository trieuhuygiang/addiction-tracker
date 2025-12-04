# NoFap Progress Tracker - Deployment Guide

This guide provides instructions for deploying the NoFap Progress Tracker application.

## Local Development

### Prerequisites

- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- Git

### Setup

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

### Option 1: Heroku

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

### Option 2: DigitalOcean / AWS / VPS

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
