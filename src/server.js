require('dotenv').config();
const app = require('./app');
const { startScheduler } = require('./utils/scheduler');
const autoInitialize = require('./config/autoInit');

const PORT = process.env.PORT || 3000;

// Initialize database tables then start server
autoInitialize().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    
    // Start the auto-track scheduler (runs at 11:59 PM daily)
    startScheduler();
  });
}).catch((err) => {
  console.error('Failed to initialize:', err);
  process.exit(1);
});
