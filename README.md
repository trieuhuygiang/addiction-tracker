# Addiction Tracker

A web application to track your addiction recovery progress with daily logs, streaks, and calendar views.

## Features

- 📊 **Daily Tracking** - Log your progress every day with quick check-in buttons
- 🔥 **Streak Counter** - Track your current and longest streaks
- 📅 **Calendar View** - Visualize your progress with a color-coded calendar
- 📈 **Statistics** - View comprehensive summaries of your progress
- 👑 **Admin Panel** - Manage users (admin only)
- 📱 **Mobile Friendly** - Responsive design works great on phones

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **View Engine**: EJS
- **Authentication**: Express-session with bcrypt

## Quick Start (Local Development)

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database

### Step-by-Step Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/trieuhuygiang/addiction-tracker.git
   cd addiction-tracker
   ```

2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Set up PostgreSQL database:**

   ```bash
   # Login to PostgreSQL
   sudo -u postgres psql

   # Create database and user
   CREATE DATABASE addiction_tracker;
   CREATE USER tracker_user WITH ENCRYPTED PASSWORD 'your_secure_password';
   GRANT ALL PRIVILEGES ON DATABASE addiction_tracker TO tracker_user;
   \q
   ```

4. **Create a `.env` file** in the root directory:

   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=tracker_user
   DB_PASSWORD=your_secure_password
   DB_NAME=addiction_tracker
   SESSION_SECRET=your_random_secret_key_here
   NODE_ENV=development
   ```

5. **Initialize the database tables:**

   ```bash
   npm run setup
   ```

6. **Start the server:**

   ```bash
   npm start
   ```

7. **Open your browser** and go to: http://localhost:3000

### Running in Development Mode

```bash
# Start with auto-restart on file changes (if nodemon installed)
npm run dev

# Or standard start
npm start
```

### Running in Production

```bash
NODE_ENV=production npm start
```

## Deployment Options

### Option 1: Railway (Recommended - Free tier available)

1. Create an account at [Railway](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your GitHub repository
4. Add a PostgreSQL database from Railway
5. Set environment variables in Railway dashboard
6. Deploy!

### Option 2: Render (Free tier available)

1. Create an account at [Render](https://render.com)
2. Create a new Web Service from your GitHub repo
3. Create a PostgreSQL database
4. Set environment variables
5. Deploy!

### Option 3: Heroku

1. Create an account at [Heroku](https://heroku.com)
2. Install Heroku CLI
3. Run:
   ```bash
   heroku create your-app-name
   heroku addons:create heroku-postgresql:mini
   git push heroku main
   ```

## Environment Variables

| Variable         | Description                                           |
| ---------------- | ----------------------------------------------------- |
| `PORT`           | Server port (default: 3000)                           |
| `DB_HOST`        | PostgreSQL host                                       |
| `DB_PORT`        | PostgreSQL port (default: 5432)                       |
| `DB_USER`        | Database username                                     |
| `DB_PASSWORD`    | Database password                                     |
| `DB_NAME`        | Database name                                         |
| `SESSION_SECRET` | Secret for session encryption                         |
| `NODE_ENV`       | Environment (development/production)                  |
| `DATABASE_URL`   | Full database URL (alternative to individual DB vars) |

## Default Admin Account

After setup, login with:

- **Username**: admin
- **Password**: 4991

## License

ISC
