const { query } = require('../config/db');
const { getTodayString } = require('./dateUtils');

/**
 * Auto-track clean entries for users who haven't logged today
 * This function creates a "Clean" entry (had_leakage = false, meaning no slip) for all users
 * who don't have an entry for the specified date
 */
async function autoTrackClean(date = null) {
  try {
    // Use provided date or today's date (local timezone)
    const trackDate = date || getTodayString();
    
    // Find all users who don't have an entry for this date
    const usersWithoutEntry = await query(`
      SELECT u.id, u.username 
      FROM users u 
      WHERE NOT EXISTS (
        SELECT 1 FROM entries e 
        WHERE e.user_id = u.id AND e.date = $1
      )
    `, [trackDate]);

    if (usersWithoutEntry.rows.length === 0) {
      console.log(`[Auto-Track] ${trackDate}: All users already have entries`);
      return { tracked: 0, users: [] };
    }

    // Create clean entries for each user without an entry
    const trackedUsers = [];
    for (const user of usersWithoutEntry.rows) {
      await query(
        'INSERT INTO entries (user_id, date, had_leakage, note) VALUES ($1, $2, $3, $4)',
        [user.id, trackDate, false, 'Auto-tracked: Clean']
      );
      trackedUsers.push(user.username || `User ${user.id}`);
    }

    console.log(`[Auto-Track] ${trackDate}: Created clean entries for ${trackedUsers.length} users: ${trackedUsers.join(', ')}`);
    return { tracked: trackedUsers.length, users: trackedUsers };
  } catch (error) {
    console.error('[Auto-Track] Error:', error);
    throw error;
  }
}

/**
 * Start the scheduler to run auto-track at 11:59 PM daily
 */
function startScheduler() {
  // Calculate milliseconds until 11:59 PM today
  const now = new Date();
  const targetTime = new Date();
  targetTime.setHours(23, 59, 0, 0);
  
  // If it's already past 11:59 PM, schedule for tomorrow
  if (now >= targetTime) {
    targetTime.setDate(targetTime.getDate() + 1);
  }
  
  const msUntilTarget = targetTime.getTime() - now.getTime();
  
  console.log(`[Scheduler] Auto-track scheduled for ${targetTime.toLocaleString()}`);
  
  // Set timeout for the first run
  setTimeout(() => {
    // Run auto-track
    autoTrackClean();
    
    // Then set interval to run every 24 hours
    setInterval(() => {
      autoTrackClean();
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    
  }, msUntilTarget);
}

module.exports = { autoTrackClean, startScheduler };
