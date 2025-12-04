const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const Entry = require('../models/Entry');
const { getStreakSummary } = require('../utils/streakCalculator');

// Get summary page
router.get('/summary', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Get streak summary
    const streakSummary = await getStreakSummary(userId);

    // Get all entries for detailed statistics
    const allEntries = await Entry.findByUser(userId);

    // Calculate additional statistics
    const stats = {
      ...streakSummary,
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
        hadLeakageText: entry.had_leakage ? '🔴 Leakage' : '🟢 Clean',
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
        cleanDays: 0,
        leakageDays: 0,
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
