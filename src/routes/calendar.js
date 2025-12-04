const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const Entry = require('../models/Entry');

// Get calendar view for a month
router.get('/calendar/:year?/:month?', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    let year = parseInt(req.params.year);
    let month = parseInt(req.params.month);

    // If no date provided, use current month
    const today = new Date();
    if (!year) year = today.getFullYear();
    if (!month) month = today.getMonth() + 1; // 1-12

    // Validate month and year
    if (month < 1 || month > 12) {
      return res.status(400).render('calendar', {
        title: 'Calendar',
        error: 'Invalid month',
        calendar: null,
        year,
        month,
        currentYear: today.getFullYear(),
        currentMonth: today.getMonth() + 1
      });
    }

    // Get start and end dates for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    const startDateStr = startDate.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    // Get all entries for the month
    const entries = await Entry.findByUserInRange(userId, startDateStr, endDateStr);

    // Build calendar grid
    const firstDay = startDate.getDay(); // 0 = Sunday
    const daysInMonth = endDate.getDate();
    
    const calendar = [];
    let week = new Array(7).fill(null);
    let dayCounter = 1;

    // Fill first week
    for (let i = firstDay; i < 7 && dayCounter <= daysInMonth; i++) {
      const dateStr = new Date(year, month - 1, dayCounter).toISOString().split('T')[0];
      const entry = entries.find(e => e.date === dateStr);
      
      week[i] = {
        day: dayCounter,
        date: dateStr,
        entry: entry,
        status: entry ? (entry.had_leakage ? 'leakage' : 'clean') : 'no-data'
      };
      dayCounter++;
    }
    calendar.push([...week]);

    // Fill remaining weeks
    while (dayCounter <= daysInMonth) {
      week = new Array(7).fill(null);
      for (let i = 0; i < 7 && dayCounter <= daysInMonth; i++) {
        const dateStr = new Date(year, month - 1, dayCounter).toISOString().split('T')[0];
        const entry = entries.find(e => e.date === dateStr);
        
        week[i] = {
          day: dayCounter,
          date: dateStr,
          entry: entry,
          status: entry ? (entry.had_leakage ? 'leakage' : 'clean') : 'no-data'
        };
        dayCounter++;
      }
      calendar.push([...week]);
    }

    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    res.render('calendar', {
      title: 'Calendar',
      error: null,
      calendar,
      year,
      month,
      monthName: monthNames[month - 1],
      currentYear: today.getFullYear(),
      currentMonth: today.getMonth() + 1
    });
  } catch (error) {
    console.error('Calendar error:', error);
    res.status(500).render('calendar', {
      title: 'Calendar',
      error: 'Failed to load calendar',
      calendar: null,
      year: new Date().getFullYear(),
      month: new Date().getMonth() + 1,
      currentYear: new Date().getFullYear(),
      currentMonth: new Date().getMonth() + 1
    });
  }
});

module.exports = router;
