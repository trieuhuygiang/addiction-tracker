const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const Entry = require('../models/Entry');
const ClockHistory = require('../models/ClockHistory');
const User = require('../models/User');
const { getStreakSummary } = require('../utils/streakCalculator');

// Get summary page
router.get('/summary', requireLogin, async (req, res) => {
  // Prevent caching of this page
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  try {
    const userId = req.session.userId;
    const userTimezone = req.timezone || 'America/Los_Angeles';

    // Get streak summary with timezone
    const streakSummary = await getStreakSummary(userId, userTimezone);

    // Get all entries for detailed statistics
    const allEntries = await Entry.findByUser(userId);

    // Get user data to check current clock
    const user = await User.findByIdFull(userId);

    // Get clock history for rewiring days calculation
    const clockHistory = await ClockHistory.findByUser(userId);

    // Calculate current counter value (only current running clock)
    let currentClockSeconds = 0;
    if (user?.clock_start) {
      try {
        currentClockSeconds = Math.floor((Date.now() - new Date(user.clock_start).getTime()) / 1000);
        // Ensure we don't have negative values
        if (currentClockSeconds < 0) {
          currentClockSeconds = 0;
        }
      } catch (e) {
        currentClockSeconds = 0;
      }
    }

    // Calculate longest session from history
    let longestRewireSession = 0;
    if (clockHistory.length > 0) {
      longestRewireSession = Math.max(...clockHistory.map(record => record.duration_seconds));
    }

    // Update longest session if current is longer
    if (currentClockSeconds > longestRewireSession) {
      longestRewireSession = currentClockSeconds;
    }

    // Convert seconds to days (1 day = 86400 seconds)
    const totalRewireDays = Math.floor(currentClockSeconds / 86400);
    const longestRewireSessionDays = Math.floor(longestRewireSession / 86400);
    const longestRewireSessionHours = Math.floor((longestRewireSession % 86400) / 3600);

    // Debug logging
    console.log('=== SUMMARY DEBUG ===');
    console.log('User ID:', userId);
    console.log('Clock start:', user?.clock_start);
    console.log('Clock history count:', clockHistory.length);
    console.log('Current clock seconds:', currentClockSeconds);
    console.log('Current counter days:', totalRewireDays);
    console.log('Longest session seconds:', longestRewireSession);
    console.log('Longest session days:', longestRewireSessionDays);
    console.log('Longest session hours:', longestRewireSessionHours);
    console.log('===================');

    // Calculate additional statistics
    const stats = {
      ...streakSummary,
      totalRewireDays: totalRewireDays,
      longestRewireSession: longestRewireSession,
      longestRewireSessionDays: longestRewireSessionDays,
      longestRewireSessionHours: longestRewireSessionHours,
      totalDays: streakSummary.totalDays || 0,
      averageDaysPerMonth: 0,
      lastEntryDate: null,
      recentEntries: []
    };

    if (allEntries.length > 0) {
      // Sort by date descending
      allEntries.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Get last entry date
      stats.lastEntryDate = allEntries[0].date;

      // Get recent entries (last 10)
      stats.recentEntries = allEntries.slice(0, 10).map(entry => ({
        ...entry,
        statusText: entry.had_leakage ? '🔴 Just a Little Bit' : '🟢 Clean',
        dateFormatted: formatDate(new Date(entry.date))
      }));

      // Calculate entries per month (approximately)
      if (allEntries.length > 0) {
        const firstEntry = new Date(allEntries[allEntries.length - 1].date);
        const lastEntry = new Date(allEntries[0].date);
        const monthsDiff = (lastEntry - firstEntry) / (1000 * 60 * 60 * 24 * 30);
        stats.averageDaysPerMonth = Math.round(allEntries.length / (monthsDiff || 1));
      }
    }

    // Calculate streaks breakdown
    const streaksData = calculateStreaksBreakdown(allEntries);

    res.render('summary', {
      title: 'Summary',
      error: null,
      stats,
      streaksData
    });
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).render('summary', {
      title: 'Summary',
      error: 'Failed to load summary',
      stats: {
        currentStreak: 0,
        longestStreak: 0,
        totalDays: 0,
        totalRewireDays: 0,
        longestRewireSession: 0,
        longestRewireSessionDays: 0,
        longestRewireSessionHours: 0,
        cleanDays: 0,
        slipDays: 0,
        successRate: 0,
        averageDaysPerMonth: 0,
        lastEntryDate: null,
        recentEntries: []
      },
      streaksData: []
    });
  }
});

// Helper function to format date
function formatDate(date) {
  const options = { year: 'numeric', month: 'short', day: 'numeric' };
  return date.toLocaleDateString('en-US', options);
}

// Helper function to calculate all streaks
function calculateStreaksBreakdown(entries) {
  if (entries.length === 0) return [];

  const sortedEntries = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
  const streaks = [];
  let currentStreak = 0;
  let startDate = null;

  for (const entry of sortedEntries) {
    if (!entry.had_leakage) {
      if (currentStreak === 0) {
        startDate = new Date(entry.date);
      }
      currentStreak++;
    } else {
      if (currentStreak > 0) {
        streaks.push({
          length: currentStreak,
          startDate: formatDate(startDate),
          endDate: formatDate(new Date(sortedEntries[sortedEntries.indexOf(entry) - 1].date))
        });
      }
      currentStreak = 0;
      startDate = null;
    }
  }

  // Don't forget the last streak if it's ongoing
  if (currentStreak > 0) {
    const lastEntry = sortedEntries[sortedEntries.length - 1];
    streaks.push({
      length: currentStreak,
      startDate: formatDate(startDate),
      endDate: formatDate(new Date(lastEntry.date)),
      ongoing: true
    });
  }

  // Sort by length descending
  return streaks.sort((a, b) => b.length - a.length);
}

module.exports = router;
