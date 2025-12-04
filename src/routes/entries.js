const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const Entry = require('../models/Entry');

// Get today's entry or a specific date's entry
router.get('/entries/:date?', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    let date = req.params.date;

    // If no date provided, use today
    if (!date) {
      const today = new Date();
      date = today.toISOString().split('T')[0];
    }

    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).render('entries', {
        title: 'Log Entry',
        error: 'Invalid date format',
        entry: null,
        date: new Date().toISOString().split('T')[0]
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
      date: new Date().toISOString().split('T')[0]
    });
  }
});

// Create or update an entry
router.post('/entries', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { date, hadLeakage, note } = req.body;

    // Validation
    if (!date) {
      return res.status(400).render('entries', {
        title: 'Log Entry',
        error: 'Date is required',
        entry: null,
        date
      });
    }

    if (hadLeakage === undefined) {
      return res.status(400).render('entries', {
        title: 'Log Entry',
        error: 'Please select yes or no for leakage',
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

    // Check if entry already exists
    const existingEntry = await Entry.findByUserAndDate(userId, date);

    let savedEntry;
    if (existingEntry) {
      // Update existing entry
      const leakageValue = hadLeakage === 'true' || hadLeakage === true;
      savedEntry = await Entry.update(existingEntry.id, leakageValue, note || null);
    } else {
      // Create new entry
      const leakageValue = hadLeakage === 'true' || hadLeakage === true;
      savedEntry = await Entry.create(userId, date, leakageValue, note || null);
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

    // Get entry to verify ownership
    const entry = await Entry.findByUserAndDate(userId, new Date().toISOString().split('T')[0]);
    
    if (!entry || entry.id !== parseInt(entryId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    await Entry.delete(entryId);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete entry error:', error);
    res.status(500).json({ error: 'Failed to delete entry' });
  }
});

module.exports = router;
