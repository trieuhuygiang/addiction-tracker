const Entry = require('../models/Entry');

// Calculate current streak (counting consecutive tracked days backwards from today)
// Slip does NOT reset the streak - it's just a separate indicator
const getCurrentStreak = async (userId) => {
  try {
    const entries = await Entry.findByUser(userId);
    
    if (entries.length === 0) {
      return 0;
    }

    // Sort entries by date descending
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    // Convert entry dates to strings for comparison
    const entryDates = entries.map(e => {
      const d = new Date(e.date);
      return d.toISOString().split('T')[0];
    });

    let streak = 0;
    const today = new Date();
    let currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);

    // Check each day going backwards from today
    for (let i = 0; i < 365; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      
      // If entry exists for this day (regardless of slip status), count it
      if (entryDates.includes(dateStr)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
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
const getStreakSummary = async (userId) => {
  try {
    const currentStreak = await getCurrentStreak(userId);
    const longestStreak = await getLongestStreak(userId);
    const totalDays = await Entry.getTotalCount(userId);
    const cleanDays = await Entry.getCleanCount(userId);
    const slipDays = await Entry.getSlipCount(userId);

    return {
      currentStreak,
      longestStreak,
      totalDays,
      cleanDays,
      slipDays,
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
