require('dotenv').config();
const app = require('./app');
const { startScheduler } = require('./utils/scheduler');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
  
  // Start the auto-track scheduler (runs at 11:59 PM daily)
  startScheduler();
});
