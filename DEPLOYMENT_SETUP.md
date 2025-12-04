# NoFap Tracker - Deployment & Usage Guide

## ✅ What Has Been Set Up

### Database
- **PostgreSQL** is installed and running
- **Database**: `nofap_tracker` created
- **User**: `nofap_user` with password `nofap_secure_pass`
- **Tables**: `users` and `entries` created with proper schemas
- **Permissions**: Granted to nofap_user

### Application
- **Express.js** server configured
- **Routes**: 
  - `/login` - User login
  - `/signup` - User registration
  - `/dashboard` - User dashboard (protected)
  - `/users` - User management page (NEW)
  - `/entries` - Daily log entries (protected)
  - `/calendar` - Calendar view (protected)
  - `/summary` - Summary statistics (protected)

### New Features
- **User Management Page** (`/users`) - View, create, edit, and delete users
- **Login Debugging** - Added console logging for login troubleshooting

## 🚀 How to Run

### 1. Start the Server
```bash
cd /home/ubuntu/Project
npm start
```

Server will run at: **http://localhost:3000**

### 2. Access the Application

#### Home Page
```
http://localhost:3000/
```

#### Sign Up
```
http://localhost:3000/signup
```

#### Login
```
http://localhost:3000/login
```

#### User Management (Admin)
```
http://localhost:3000/users
```

## 🔧 Environment Configuration

Your `.env` file is configured with:
```
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_USER=nofap_user
DB_PASSWORD=nofap_secure_pass
DB_NAME=nofap_tracker
SESSION_SECRET=your_random_secret_key_here
NODE_ENV=production
```

## 📝 Database Credentials

**PostgreSQL Connection:**
- **Host**: localhost
- **Port**: 5432
- **User**: nofap_user
- **Password**: nofap_secure_pass
- **Database**: nofap_tracker

**Access PostgreSQL directly:**
```bash
psql -h localhost -U nofap_user -d nofap_tracker
```

## 🔑 Using the User Management Page

### View All Users
Navigate to: `http://localhost:3000/users`
(Must be logged in)

### Create a New User
Click "+ Create New User" button and fill in:
- Email
- Username (optional)
- Password (min 6 characters)
- Confirm Password

### Edit a User
Click "Edit" button next to user and modify:
- Email
- Username
- Password (optional)

### Delete a User
Click "Delete" button (you cannot delete your own account)

## 🔐 Login Issues - Troubleshooting

If login is not working:

### 1. Check if user exists
```bash
psql -h localhost -U nofap_user -d nofap_tracker
SELECT * FROM users;
```

### 2. Check server logs
Monitor console output for login errors

### 3. Verify password
Make sure password is at least 6 characters

### 4. Try creating a new user via management page
Use `/users` page to create a test user and try logging in

## 📊 Available Database Tables

### Users Table
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100),
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Entries Table
```sql
CREATE TABLE entries (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  had_leakage BOOLEAN NOT NULL,
  note TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (user_id, date)
);
```

## 🌐 Cloud Deployment (Ubuntu Cloud)

For DigitalOcean/AWS deployment:

### 1. Install PM2 (Production Process Manager)
```bash
sudo npm install -g pm2
pm2 start src/server.js --name "nofap-tracker"
pm2 startup
pm2 save
```

### 2. Setup Nginx Reverse Proxy
```bash
sudo apt install -y nginx
```

Create `/etc/nginx/sites-available/nofap-tracker`:
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

Enable it:
```bash
sudo ln -s /etc/nginx/sites-available/nofap-tracker /etc/nginx/sites-enabled/
sudo systemctl restart nginx
```

### 3. Setup SSL (Free with Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your_domain.com
```

## 📝 Next Steps

1. **Start the server**: `npm start`
2. **Sign up** or use the **User Management** page to create users
3. **Login** with your email and password
4. **Access dashboard** and start tracking progress
5. **Deploy to cloud** using PM2 and Nginx

## 📚 File Structure

```
src/
├── app.js                    # Express app setup
├── server.js                 # Server entry point
├── config/
│   ├── db.js                # Database connection
│   └── init.js              # Database initialization
├── middleware/
│   └── auth.js              # Authentication middleware
├── models/
│   ├── User.js              # User model
│   └── Entry.js             # Entry model
├── routes/
│   ├── auth.js              # Auth routes
│   ├── users.js             # User management routes (NEW)
│   ├── entries.js           # Entries routes
│   ├── calendar.js          # Calendar routes
│   └── summary.js           # Summary routes
├── utils/
│   └── streakCalculator.js  # Streak calculation logic
└── views/
    ├── users.ejs            # User management page (NEW)
    ├── login.ejs
    ├── signup.ejs
    ├── dashboard.ejs
    ├── calendar.ejs
    ├── summary.ejs
    └── ...other views
```

---

**Stay focused and stay strong! 💪🧠🔥**
