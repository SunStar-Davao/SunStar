const { DateTime } = require('luxon');

const TIMEZONE = 'Asia/Manila';
const TIME_IN = { hour: 8, minute: 0 };
const TIME_OUT = { hour: 17, minute: 0 };

const getAttendanceStatus = (isoTimestamp, type) => {
  const dt = DateTime.fromISO(isoTimestamp, { zone: TIMEZONE });
  let status = 'on_time';
  let late_minutes = 0;

  if (type === 'in') {
    const expected = dt.set(TIME_IN);
    if (dt > expected) {
      status = 'late';
      late_minutes = Math.round(dt.diff(expected, 'minutes').minutes);
    }
  } else if (type === 'out') {
    const expected = dt.set(TIME_OUT);
    if (dt < expected) {
      status = 'early_out';
    }
  }

  return { status, late_minutes };
};

module.exports = { getAttendanceStatus, TIMEZONE };