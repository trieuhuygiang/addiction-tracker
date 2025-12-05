const Entry = require('../models/Entry');
const { getLocalDateString, getTodayString } = require('./dateUtils');

// Calculate current streak (counting consecutive tracked days backwards from today)
// Slip does NOT reset the streak - it's just a separate indicator
const getCurrentStreak = async (userId, timezone = 'UTC') => {
  try {
    const entries = await Entry.findByUser(userId);
    
    if (entries.length === 0) {
      return 0;
    }

    // Convert entry dates to strings for comparison (using timezone)
    const entryDates = entries.map(e => {
      // Database stores dates, so we need to handle them properly
      const d = new Date(e.date);
      return getLocalDateString(d, timezone);
    });

    // Remove duplicates and sort
    const uniqueDates = [...new Set(entryDates)].sort().reverse();

    let streak = 0;
    
    // Start from today in user's timezone
    const todayStr = getTodayString(timezone);
    
    // Create a date iterator starting from today
    let checkDate = new Date(todayStr + 'T12:00:00Z'); // Use noon to avoid timezone edge cases
    
    // Check each day going backwards from today
    for (let i = 0; i < 365; i++) {
      const dateStr = getLocalDateString(checkDate, timezone);
      
      // If entry exists for this day (regardless of slip status), count it
      if (entryDates.includes(dateStr)) {
        streak++;
        // Move to previous day
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        // No entry for this day, break the streak
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Error calculating current streak:', error);
    throw error;
  }
};

// Calculate longest streak (consecutive tracked days)
const getLongestStreak = async (userId) => {
  try {
    const entries = await Entry.findByUser(userId);

    if (entries.length === 0) {
      return 0;
    }

    // Sort entries by date ascending
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let longestStreak = 0;
    let currentStreak = 1;

    for (let i = 1; i < entries.length; i++) {
      const prevDate = new Date(entries[i - 1].date);
      const currDate = new Date(entries[i].date);
      
      // Check if dates are consecutive
      const diffTime = currDate - prevDate;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      
      if (diffDays === 1) {
        currentStreak++;
      } else {
        longestStreak = Math.max(longestStreak, currentStreak);
        currentStreak = 1;
      }
    }

    longestStreak = Math.max(longestStreak, currentStreak);
    return longestStreak;
  } catch (error) {
    console.error('Error calculating longest streak:', error);
    throw error;
  }
};

// Get streak summary
const getStreakSummary = async (userId, timezone = 'UTC') => {
  try {
    const currentStreak = await getCurrentStreak(userId, timezone);
    const longestStreak = await getLongestStreak(userId);
    const totalDays = await Entry.getTotalCount(userId);
    const cleanDays = await Entry.getCleanCount(userId);
    const slipDays = await Entry.getSlipCount(userId);
    const totallyFailedDays = await Entry.getTotallyFailedCount(userId);

    return {
      currentStreak,
      longestStreak,
      totalDays,
      cleanDays,
      slipDays,
      totallyFailedDays,
      successRate: totalDays > 0 ? Math.round((cleanDays / totalDays) * 100) : 0
    };
  } catch (error) {
    console.error('Error getting streak summary:', error);
    throw error;
  }
};

module.exports = {
  getCurrentStreak,
  getLongestStreak,
  getStreakSummary
};
