/**
 * Date utilities for handling timezone-aware dates
 * Default timezone: America/Los_Angeles (San Francisco)
 */

const DEFAULT_TIMEZONE = 'America/Los_Angeles';

/**
 * Get a date in YYYY-MM-DD format using specified timezone
 * @param {Date} date - Date object to format
 * @param {string} timezone - IANA timezone string (e.g., 'Asia/Ho_Chi_Minh')
 * @returns {string} Date string in YYYY-MM-DD format
 */
function getLocalDateString(date = new Date(), timezone = DEFAULT_TIMEZONE) {
  try {
    const options = { 
      timeZone: timezone, 
      year: 'numeric', 
      month: '2-digit', 
      day: '2-digit' 
    };
    const parts = new Intl.DateTimeFormat('en-CA', options).formatToParts(date);
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value;
    const day = parts.find(p => p.type === 'day').value;
    return `${year}-${month}-${day}`;
  } catch (error) {
    // Fallback if timezone is invalid
    console.error(`Invalid timezone: ${timezone}, falling back to UTC`);
    return getLocalDateString(date, DEFAULT_TIMEZONE);
  }
}

/**
 * Get today's date string in specified timezone
 * @param {string} timezone - IANA timezone string
 * @returns {string} Today's date in YYYY-MM-DD format
 */
function getTodayString(timezone = DEFAULT_TIMEZONE) {
  return getLocalDateString(new Date(), timezone);
}

/**
 * Convert a Date object to local date string
 * @param {Date} date - Date object to convert
 * @param {string} timezone - IANA timezone string
 * @returns {string} Date string in YYYY-MM-DD format
 */
function dateToLocalString(date, timezone = DEFAULT_TIMEZONE) {
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return getLocalDateString(date, timezone);
}

module.exports = {
  getLocalDateString,
  getTodayString,
  dateToLocalString,
  DEFAULT_TIMEZONE
};
