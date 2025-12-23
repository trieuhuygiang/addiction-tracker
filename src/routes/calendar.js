const express = require('express');
const router = express.Router();
const { requireLogin } = require('../middleware/auth');
const Entry = require('../models/Entry');
const { getLocalDateString, getTodayString } = require('../utils/dateUtils');

const monthNames = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper function to format date as YYYY-MM-DD without timezone conversion
function formatDateString(year, month, day) {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

// Helper function to determine entry status
function getEntryStatus(entry) {
  if (!entry) return 'no-data';
  if (entry.failure_level === 2) return 'failed';
  if (entry.failure_level === 1 || entry.had_leakage) return 'slip';
  return 'clean';
}

// Helper function to build a month calendar grid
function buildMonthCalendar(year, month, entriesWithDateStr) {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0);
  const firstDay = startDate.getDay();
  const daysInMonth = endDate.getDate();

  const calendar = [];
  let week = new Array(7).fill(null);
  let dayCounter = 1;

  // Fill first week
  for (let i = firstDay; i < 7 && dayCounter <= daysInMonth; i++) {
    // Use simple string formatting to avoid timezone issues
    const dateStr = formatDateString(year, month, dayCounter);
    const entry = entriesWithDateStr.find(e => e.dateStr === dateStr);

    week[i] = {
      day: dayCounter,
      date: dateStr,
      entry: entry,
      status: getEntryStatus(entry)
    };
    dayCounter++;
  }
  calendar.push([...week]);

  // Fill remaining weeks
  while (dayCounter <= daysInMonth) {
    week = new Array(7).fill(null);
    for (let i = 0; i < 7 && dayCounter <= daysInMonth; i++) {
      // Use simple string formatting to avoid timezone issues
      const dateStr = formatDateString(year, month, dayCounter);
      const entry = entriesWithDateStr.find(e => e.dateStr === dateStr);

      week[i] = {
        day: dayCounter,
        date: dateStr,
        entry: entry,
        status: getEntryStatus(entry)
      };
      dayCounter++;
    }
    calendar.push([...week]);
  }

  return calendar;
}

// Get yearly calendar view
router.get('/calendar/year/:year?', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userTimezone = req.timezone;
    const todayStr = getTodayString(userTimezone);
    const todayDate = new Date(todayStr);
    let year = parseInt(req.params.year) || todayDate.getFullYear();

    // Get all entries for the year
    const startDateStr = `${year}-01-01`;
    const endDateStr = `${year}-12-31`;
    const entries = await Entry.findByUserInRange(userId, startDateStr, endDateStr);

    // Convert entry dates to strings for comparison
    // Use the date string directly from database to avoid timezone issues
    const entriesWithDateStr = entries.map(e => ({
      ...e,
      dateStr: typeof e.date === 'string' ? e.date.slice(0, 10) : new Date(e.date).toISOString().split('T')[0]
    }));

    // Build calendar for each month
    const yearCalendar = [];
    for (let month = 1; month <= 12; month++) {
      yearCalendar.push({
        month,
        monthName: monthNames[month - 1],
        calendar: buildMonthCalendar(year, month, entriesWithDateStr)
      });
    }

    // Calculate yearly stats
    const cleanDays = entries.filter(e => !e.had_leakage && (!e.failure_level || e.failure_level === 0)).length;
    const slipDays = entries.filter(e => e.failure_level === 1 || (e.had_leakage && e.failure_level !== 2)).length;
    const failedDays = entries.filter(e => e.failure_level === 2).length;
    const totalDays = entries.length;

    res.render('calendar-year', {
      title: `Lịch năm ${year}`,
      error: null,
      yearCalendar,
      year,
      currentYear: todayDate.getFullYear(),
      stats: { cleanDays, slipDays, failedDays, totalDays }
    });
  } catch (error) {
    console.error('Yearly calendar error:', error);
    const currentYear = new Date(getTodayString(req.timezone)).getFullYear();
    res.status(500).render('calendar-year', {
      title: 'Lịch năm',
      error: 'Không thể tải lịch',
      yearCalendar: [],
      year: currentYear,
      currentYear: currentYear,
      stats: { cleanDays: 0, slipDays: 0, failedDays: 0, totalDays: 0 }
    });
  }
});

// Get calendar view for a month
router.get('/calendar/:year?/:month?', requireLogin, async (req, res) => {
  try {
    const userId = req.session.userId;
    const userTimezone = req.timezone;
    let year = parseInt(req.params.year);
    let month = parseInt(req.params.month);

    // If no date provided, use current month (user's timezone)
    const todayStr = getTodayString(userTimezone);
    const today = new Date(todayStr);
    if (!year) year = today.getFullYear();
    if (!month) month = today.getMonth() + 1; // 1-12

    // Validate month and year
    if (month < 1 || month > 12) {
      return res.status(400).render('calendar', {
        title: 'Lịch',
        error: 'Tháng không hợp lệ',
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

    const startDateStr = formatDateString(year, month, 1);
    const endDateStr = formatDateString(year, month, endDate.getDate());

    // Get all entries for the month
    const entries = await Entry.findByUserInRange(userId, startDateStr, endDateStr);

    // Convert entry dates to strings for comparison
    // Use the date string directly from database to avoid timezone issues
    const entriesWithDateStr = entries.map(e => ({
      ...e,
      dateStr: typeof e.date === 'string' ? e.date.slice(0, 10) : new Date(e.date).toISOString().split('T')[0]
    }));

    // Build calendar grid using helper function
    const calendar = buildMonthCalendar(year, month, entriesWithDateStr);

    res.render('calendar', {
      title: 'Lịch',
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
    const nowStr = getTodayString(req.timezone);
    const now = new Date(nowStr);
    res.status(500).render('calendar', {
      title: 'Lịch',
      error: 'Không thể tải lịch',
      calendar: null,
      year: now.getFullYear(),
      month: now.getMonth() + 1,
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1
    });
  }
});

module.exports = router;
