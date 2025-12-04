# Addiction Tracker

A web application to track your addiction recovery progress with daily logs, streaks, and calendar views.

## Features

- 📊 **Daily Tracking** - Log your progress every day
- 🔥 **Streak Counter** - Track your current and longest streaks
- 📅 **Calendar View** - Visualize your progress with a color-coded calendar
- 📈 **Statistics** - View comprehensive summaries of your progress
- 👑 **Admin Panel** - Manage users (admin only)

## Tech Stack

- **Backend**: Node.js, Express.js
- **Database**: PostgreSQL
- **View Engine**: EJS
- **Authentication**: Express-session with bcrypt

## Local Development

### Prerequisites

- Node.js (v18 or higher)
- PostgreSQL database

### Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/YOUR_USERNAME/addiction-tracker.git
   cd addiction-tracker
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory:

   ```env
   PORT=3000
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=addiction_tracker
   SESSION_SECRET=your_random_secret_key_here
   NODE_ENV=development
   ```

4. Initialize the database:

   ```bash
   npm run setup
   ```

5. Start the server:

   ```bash
   npm start
   ```

6. Open http://localhost:3000 in your browser

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
- **Password**: 49914991

## License

ISC
