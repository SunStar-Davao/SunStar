const express = require('express');
const cors = require('cors');
const path = require('path');
const http = require('http');

console.log('🔍 DEBUG: Starting server...');
console.log('🔍 Current directory:', __dirname);

// Try multiple ways to load .env
console.log('\n📁 Attempting to load .env file...');

// Method 1: Direct path from current file
const envPath1 = path.join(__dirname, '../../.env');
console.log('   Path 1 (from __dirname):', envPath1);

// Method 2: Relative to current working directory
const envPath2 = path.join(process.cwd(), '.env');
console.log('   Path 2 (from process.cwd()):', envPath2);

// Try both paths
require('dotenv').config({ path: envPath1 });
require('dotenv').config({ path: envPath2 });

// Check if env vars are loaded
console.log('\n🔐 Environment Variables:');
console.log('   SUPABASE_URL:', process.env.SUPABASE_URL ? '✅ PRESENT' : '❌ MISSING');
console.log('   SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? '✅ PRESENT' : '❌ MISSING');
console.log('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? '✅ PRESENT' : '❌ MISSING');
console.log('   PORT:', process.env.PORT || '5000 (default)');

// Try to import supabase
console.log('\n📦 Importing supabase config...');
let supabase;
try {
  const supabaseConfig = require('./config/supabase');
  supabase = supabaseConfig.supabase;
  console.log('✅ Supabase config loaded');
  
  // Test connection immediately
  if (supabaseConfig.testConnection) {
    console.log('🔄 Testing Supabase connection...');
    supabaseConfig.testConnection()
      .then(result => {
        if (result) {
          console.log('✅ Supabase connection successful!');
        } else {
          console.log('❌ Supabase connection failed');
        }
      })
      .catch(err => {
        console.log('❌ Supabase connection error:', err.message);
      });
  }
} catch (err) {
  console.log('❌ Failed to load supabase config:', err.message);
  console.log('   Full error:', err);
}

// Continue with the rest of your server setup
console.log('\n🚀 Continuing server setup...');

// Import routes
const authRoutes = require('./routes/auth.route');
const attendanceRoutes = require('./routes/attendance.route');

// Initialize express
const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors({
  origin: '*',
  credentials: true,
  optionsSuccessStatus: 200
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/attendance', attendanceRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    name: 'Sunstar Davao Attendance System API',
    version: '1.0.0',
    endpoints: {
      auth: {
        register: 'POST /api/v1/auth/register',
        login: 'POST /api/v1/auth/login',
        guardLogin: 'POST /api/v1/auth/guard/login',
        profile: 'GET /api/v1/auth/me'
      },
      attendance: {
        mark: 'POST /api/v1/attendance/mark (Guard only)',
        today: 'GET /api/v1/attendance/today (Guard only)',
        report: 'GET /api/v1/attendance/report',
        summary: 'GET /api/v1/attendance/summary/:employeeId'
      },
      health: 'GET /health'
    }
  });
});

// Error handling
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err.stack);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
});

// Start server
const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ Server started successfully!');
  console.log("🚀 Server is running on port:", PORT);
  console.log("📱 Accessible from network devices");
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📝 API available at: http://localhost:${PORT}`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
});

// Handle unhandled rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
  server.close(() => process.exit(1));
});

module.exports = { app, server };