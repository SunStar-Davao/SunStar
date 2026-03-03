const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { 
  registerEmployee, 
  loginEmployee, 
  loginGuard,
  getMe 
} = require('../controllers/auth.controller');
const { upload, handleMulterError } = require('../middleware/upload');
const { authenticateToken } = require('../middleware/auth');

// Validation rules
const registerValidation = [
  body('name')
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters')
    .trim()
    .escape(),
  body('password')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/).withMessage('Password must contain at least one letter and one number')
];

const loginValidation = [
  body('employeeId')
    .notEmpty().withMessage('Employee ID is required')
    .matches(/^EMP\d{11}$/).withMessage('Invalid employee ID format'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

const guardLoginValidation = [
  body('username')
    .notEmpty().withMessage('Username is required'),
  body('password')
    .notEmpty().withMessage('Password is required')
];

// POST /api/auth/register - Register new employee
router.post(
  '/register',
  upload.single('image'),
  handleMulterError,
  registerValidation,
  registerEmployee
);

// POST /api/auth/login - Employee login
router.post(
  '/login',
  loginValidation,
  loginEmployee
);

// POST /api/auth/guard/login - Guard login
router.post(
  '/guard/login',
  guardLoginValidation,
  loginGuard
);

// GET /api/auth/me - Get current user profile
router.get(
  '/me',
  authenticateToken,
  getMe
);

module.exports = router;