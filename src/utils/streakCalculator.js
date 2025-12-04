const Entry = require('../models/Entry');

// Calculate current streak (counting backwards from today)
const getCurrentStreak = async (userId) => {
  try {
    const entries = await Entry.findByUser(userId);
    
    if (entries.length === 0) {
      return 0;
    }

    // Sort entries by date descending
    entries.sort((a, b) => new Date(b.date) - new Date(a.date));

    let streak = 0;
    const today = new Date();
    let currentDate = new Date(today);
    currentDate.setHours(0, 0, 0, 0);

    // Check each day going backwards from today
    for (let i = 0; i < 365; i++) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const entry = entries.find(e => e.date === dateStr);

      // If no entry found for this day, break
      if (!entry) {
        break;
      }

      // If leakage found, break
      if (entry.had_leakage) {
        break;
      }

      // Clean day, increment streak
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    }

    return streak;
  } catch (error) {
    console.error('Error calculating current streak:', error);
    throw error;
  }
};

// Calculate longest streak
const getLongestStreak = async (userId) => {
  try {
    const entries = await Entry.findByUser(userId);

    if (entries.length === 0) {
      return 0;
    }

    // Sort entries by date ascending
    entries.sort((a, b) => new Date(a.date) - new Date(b.date));

    let longestStreak = 0;
    let currentStreak = 0;

    for (const entry of entries) {
      if (!entry.had_leakage) {
        currentStreak++;
        longestStreak = Math.max(longestStreak, currentStreak);
      } else {
        currentStreak = 0;
      }
    }

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
    const leakageDays = await Entry.getLeakageCount(userId);

    return {
      currentStreak,
      longestStreak,
      totalDays,
      cleanDays,
      leakageDays,
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
