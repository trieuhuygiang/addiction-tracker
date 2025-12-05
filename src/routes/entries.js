const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const Entry = require('../models/Entry');
const StreakHistory = require('../models/StreakHistory');
const { getTodayString, getLocalDateString } = require('../utils/dateUtils');

// Quick check-in (from dashboard)
router.post('/entries/quick', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { date, hadSlip, failureLevel } = req.body;
    
    // Determine failure level: 0 = clean, 1 = a little bit, 2 = totally failed
    let level = 0;
    if (failureLevel !== undefined) {
      level = parseInt(failureLevel);
    } else if (hadSlip === 'true') {
      level = 1;
    }
    
    const slipped = level > 0;

    // Check if entry already exists
    const existingEntry = await Entry.findByUserAndDate(userId, date);

    if (existingEntry) {
      // Update existing entry with failure level
      await Entry.updateWithLevel(existingEntry.id, slipped, existingEntry.note, level);
    } else {
      // Create new entry with failure level
      await Entry.create(userId, date, slipped, null, level);
    }

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Quick check-in error:', error);
    res.redirect('/dashboard');
  }
});

// Relapse - save streak history and delete all progress
router.post('/entries/relapse', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userTimezone = req.timezone;
    
    // Get entries to find start date and count total days
    const entries = await Entry.findByUser(userId);
    
    // Calculate total days (Clean + A Little Bit)
    const totalDays = entries.length;
    
    if (totalDays > 0) {
      // Sort by date ascending to find earliest entry
      entries.sort((a, b) => new Date(a.date) - new Date(b.date));
      const startDateRaw = entries[0].date;
      const startDate = typeof startDateRaw === 'string' ? startDateRaw.slice(0, 10) : new Date(startDateRaw).toISOString().slice(0, 10);
      const endDate = getTodayString(userTimezone);
      
      // Save days to history
      await StreakHistory.create(userId, totalDays, startDate, endDate);
      console.log(`Saved history: ${totalDays} days for user ${userId}`);
    }
    
    // Delete all entries
    const deletedCount = await Entry.deleteAllByUser(userId);
    console.log(`Relapse: deleted ${deletedCount} entries for user ${userId}`);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Relapse error:', error);
    res.redirect('/dashboard');
  }
});

// Get today's entry or a specific date's entry
router.get('/entries/:date?', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userTimezone = req.timezone;
    let date = req.params.date;

    // If no date provided, use today (user's timezone)
    if (!date) {
      date = getTodayString(userTimezone);
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).render('entries', {
        title: 'Log Entry',
        error: 'Invalid date format',
        entry: null,
        date: getTodayString(userTimezone)
      });
    }

    // Get entry if it exists
    const entry = await Entry.findByUserAndDate(userId, date);

    res.render('entries', {
      title: 'Log Entry',
      error: null,
      entry,
      date
    });
  } catch (error) {
    console.error('Get entry error:', error);
    res.status(500).render('entries', {
      title: 'Log Entry',
      error: 'Failed to load entry',
      entry: null,
      date: getTodayString(req.timezone)
    });
  }
});

// Create or update an entry
router.post('/entries', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { date, hadSlip, failureLevel, note } = req.body;

    // Validation
    if (!date) {
      return res.status(400).render('entries', {
        title: 'Log Entry',
        error: 'Date is required',
        entry: null,
        date
      });
    }

    // Check for failureLevel first (new format), fallback to hadSlip (old format)
    if (failureLevel === undefined && hadSlip === undefined) {
      return res.status(400).render('entries', {
        title: 'Log Entry',
        error: 'Please select a status',
        entry: null,
        date
      });
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).render('entries', {
        title: 'Log Entry',
        error: 'Invalid date format',
        entry: null,
        date
      });
    }

    // Determine failure level: 0 = clean, 1 = a little bit, 2 = totally failed
    let level = 0;
    if (failureLevel !== undefined) {
      level = parseInt(failureLevel);
    } else if (hadSlip === 'true' || hadSlip === true) {
      level = 1;
    }
    const slipValue = level > 0;

    // Check if entry already exists
    const existingEntry = await Entry.findByUserAndDate(userId, date);

    let savedEntry;
    if (existingEntry) {
      // Update existing entry with failure level
      savedEntry = await Entry.updateWithLevel(existingEntry.id, slipValue, note || null, level);
    } else {
      // Create new entry with failure level
      savedEntry = await Entry.create(userId, date, slipValue, note || null, level);
    }

    res.render('entries', {
      title: 'Log Entry',
      error: null,
      success: 'Entry saved successfully!',
      entry: savedEntry,
      date
    });
  } catch (error) {
    console.error('Save entry error:', error);
    res.status(500).render('entries', {
      title: 'Log Entry',
      error: 'Failed to save entry',
      entry: null,
      date: req.body.date || new Date().toISOString().split('T')[0]
    });
  }
});

// Delete an entry
router.post('/entries/:id/delete', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const entryId = req.params.id;

    // Get entry to verify ownership and track what type was deleted
    const entry = await Entry.findById(entryId);
    
    if (!entry || entry.user_id !== userId) {
      return res.status(403).redirect('/dashboard');
    }

    // Track what type of entry was deleted for user feedback
    const entryType = entry.had_leakage ? 'A Little Bit' : 'Clean';
    const entryDate = entry.date;
    
    await Entry.delete(entryId);
    
    console.log(`Deleted ${entryType} entry for date ${entryDate}, user ${userId}`);
    
    // Redirect with query param to show feedback message
    res.redirect('/dashboard?deleted=' + encodeURIComponent(entryType) + '&date=' + encodeURIComponent(entryDate));
  } catch (error) {
    console.error('Delete entry error:', error);
    res.redirect('/dashboard');
  }
});

// Reset all progress (delete all entries for user) - also saves to history
router.post('/entries/reset-all', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userTimezone = req.timezone;
    
    // Get entries to save history before deleting
    const entries = await Entry.findByUser(userId);
    const totalDays = entries.length;
    
    if (totalDays > 0) {
      // Sort by date ascending to find earliest entry
      entries.sort((a, b) => new Date(a.date) - new Date(b.date));
      const startDateRaw = entries[0].date;
      const startDate = typeof startDateRaw === 'string' ? startDateRaw.slice(0, 10) : new Date(startDateRaw).toISOString().slice(0, 10);
      const endDate = getTodayString(userTimezone);
      
      // Save days to history before reset
      await StreakHistory.create(userId, totalDays, startDate, endDate);
      console.log(`Saved history before reset: ${totalDays} days for user ${userId}`);
    }
    
    const deletedCount = await Entry.deleteAllByUser(userId);
    console.log(`Reset progress: deleted ${deletedCount} entries for user ${userId}`);
    res.redirect('/dashboard');
  } catch (error) {
    console.error('Reset progress error:', error);
    res.redirect('/dashboard');
  }
});

// Delete a streak history record
router.post('/streak-history/:id/delete', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const historyId = req.params.id;
    
    await StreakHistory.delete(historyId, userId);
    res.redirect('/history');
  } catch (error) {
    console.error('Delete streak history error:', error);
    res.redirect('/history');
  }
});

// Delete all streak history
router.post('/streak-history/delete-all', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    await StreakHistory.deleteAllByUser(userId);
    res.redirect('/history');
  } catch (error) {
    console.error('Delete all streak history error:', error);
    res.redirect('/history');
  }
});

module.exports = router;
