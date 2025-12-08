const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const User = require('../models/User');
const ClockHistory = require('../models/ClockHistory');
const Entry = require('../models/Entry');

// Start the clock
router.post('/clock/start', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;

    // Check if clock is already running
    const existingStart = await User.getClockStart(userId);
    if (existingStart) {
      return res.redirect('/dashboard?clockError=Clock is already running');
    }

    // Set clock start time to now
    await User.setClockStart(userId, new Date());

    res.redirect('/dashboard');
  } catch (error) {
    console.error('Clock start error:', error);
    res.redirect('/dashboard?clockError=Failed to start clock');
  }
});

// Reset the clock and save to history
router.post('/clock/reset', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userTimezone = req.timezone || 'America/Los_Angeles';

    // Get current clock start time
    const clockStart = await User.getClockStart(userId);

    if (clockStart) {
      const now = new Date();
      const durationSeconds = Math.floor((now - new Date(clockStart)) / 1000);

      // Save to history if duration is at least 1 second
      if (durationSeconds >= 1) {
        await ClockHistory.create(userId, durationSeconds, clockStart, now);
        console.log(`Clock reset: ${durationSeconds} seconds saved for user ${userId}`);
      }
    }

    // Get today's date in user's timezone
    const todayDate = new Date().toLocaleDateString('en-CA', {
      timeZone: userTimezone
    });

    // Check if entry exists for today
    const existingEntry = await Entry.findByUserAndDate(userId, todayDate);

    if (existingEntry) {
      // Update existing entry to "totally failed"
      await Entry.updateWithLevel(existingEntry.id, true, existingEntry.note, 2);
    } else {
      // Create new "totally failed" entry for today
      await Entry.create(userId, todayDate, true, 'Counter reset - totally failed', 2);
    }

    // Clear the clock start time (resets counter to 0)
    await User.clearClockStart(userId);

    res.redirect('/dashboard?clockReset=true');
  } catch (error) {
    console.error('Clock reset error:', error);
    res.redirect('/dashboard?clockError=Failed to reset clock');
  }
});

// Delete a clock history record
router.post('/clock-history/:id/delete', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const historyId = req.params.id;

    await ClockHistory.delete(historyId, userId);
    res.redirect('/clock-history');
  } catch (error) {
    console.error('Delete clock history error:', error);
    res.redirect('/clock-history');
  }
});

// Delete all clock history
router.post('/clock-history/delete-all', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    await ClockHistory.deleteAllByUser(userId);
    res.redirect('/clock-history');
  } catch (error) {
    console.error('Delete all clock history error:', error);
    res.redirect('/clock-history');
  }
});

// View clock history page
router.get('/clock-history', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const clockHistory = await ClockHistory.findByUser(userId);

    res.render('clock-history', {
      title: 'Clock History',
      clockHistory,
    });
  } catch (error) {
    console.error('Clock history page error:', error);
    res.render('clock-history', {
      title: '',
    });
  }
});

// Edit the clock counter
router.post('/clock/edit', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const { days, hours, minutes } = req.body;

    // Validate inputs
    const daysNum = parseInt(days) || 0;
    const hoursNum = parseInt(hours) || 0;
    const minutesNum = parseInt(minutes) || 0;

    if (daysNum < 0 || hoursNum < 0 || hoursNum > 23 || minutesNum < 0 || minutesNum > 59) {
      return res.redirect('/dashboard?clockError=Invalid time values');
    }

    // Check if clock is running
    const existingStart = await User.getClockStart(userId);
    if (!existingStart) {
      return res.redirect('/dashboard?clockError=Clock is not running');
    }

    // Calculate total seconds from the input
    const totalSeconds = (daysNum * 86400) + (hoursNum * 3600) + (minutesNum * 60);

    // Calculate new start time: now - totalSeconds
    const now = new Date();
    const newStartTime = new Date(now.getTime() - (totalSeconds * 1000));

    // Update clock start time
    await User.setClockStart(userId, newStartTime);

    res.redirect('/dashboard?clockEdited=true');
  } catch (error) {
    console.error('Clock edit error:', error);
    res.redirect('/dashboard?clockError=Failed to edit clock');
  }
});

module.exports = router;
