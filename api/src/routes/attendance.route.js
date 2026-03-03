const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const { 
  markAttendance, 
  getAttendanceReport, 
  getTodayAttendance,
  getEmployeeSummary 
} = require('../controllers/attendance.controller');
const { authenticateToken, authorizeGuard } = require('../middleware/auth');

// Validation rules
const markAttendanceValidation = [
  body('qrData')
    .notEmpty().withMessage('QR data is required')
    .isString().withMessage('QR data must be a string')
];

const reportValidation = [
  query('startDate')
    .optional()
    .isISO8601().withMessage('Invalid start date format'),
  query('endDate')
    .optional()
    .isISO8601().withMessage('Invalid end date format'),
  query('page')
    .optional()
    .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
];

// POST /api/attendance/mark - Mark attendance (Guard only)
router.post(
  '/mark',
  authenticateToken,
  authorizeGuard,
  markAttendanceValidation,
  markAttendance
);

// GET /api/attendance/today - Get today's attendance (Guard only)
router.get(
  '/today',
  authenticateToken,
  authorizeGuard,
  getTodayAttendance
);

// GET /api/attendance/report - Get attendance report
router.get(
  '/report',
  authenticateToken,
  reportValidation,
  getAttendanceReport
);

// GET /api/attendance/summary/:employeeId - Get employee attendance summary
router.get(
  '/summary/:employeeId',
  authenticateToken,
  getEmployeeSummary
);

module.exports = router;