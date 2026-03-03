// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken');
// const { validationResult } = require('express-validator');
// const { supabase } = require('../config/supabase');
// const cloudinary = require('../config/cloudinary');
// const { generateEmployeeQRCodes } = require('../utils/qrGenerator');
// const fs = require('fs');

// // Generate unique employee ID
// const generateEmployeeId = () => {
//   const prefix = 'EMP';
//   const timestamp = Date.now().toString().slice(-8);
//   const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
//   return `${prefix}${timestamp}${random}`;
// };

// /**
//  * @desc    Register a new employee
//  * @route   POST /api/auth/register
//  * @access  Public
//  */
// const registerEmployee = async (req, res) => {
//   try {
//     // Validation
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ 
//         success: false,
//         errors: errors.array() 
//       });
//     }

//     const { name, password } = req.body;
    
//     // Validate required fields
//     if (!name || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Name and password are required'
//       });
//     }

//     // Check if employee already exists by name
//     const { data: existingEmployee, error: checkError } = await supabase
//       .from('employees')
//       .select('name')
//       .eq('name', name)
//       .maybeSingle();

//     if (existingEmployee) {
//       return res.status(400).json({
//         success: false,
//         message: 'Employee with this name already exists'
//       });
//     }

//     // Generate unique employee ID
//     const employeeId = generateEmployeeId();

//     // Hash password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Upload image to Cloudinary if provided
//     let imageUrl = null;
//     if (req.file) {
//       try {
//         const result = await cloudinary.uploader.upload(req.file.path, {
//           folder: 'attendance_system/employees',
//           public_id: `employee_${employeeId}`,
//           width: 500,
//           height: 500,
//           crop: 'limit',
//           quality: 'auto:good',
//           transformation: [
//             { width: 500, height: 500, crop: 'fill' },
//             { quality: 'auto' }
//           ]
//         });
//         imageUrl = result.secure_url;
        
//         // Clean up temporary file
//         fs.unlinkSync(req.file.path);
//       } catch (uploadError) {
//         console.error('Image upload error:', uploadError);
//         // Continue without image if upload fails
//       }
//     }

//     // Generate QR codes
//     let qrCodeInUrl = null;
//     let qrCodeOutUrl = null;
    
//     try {
//       const qrCodes = await generateEmployeeQRCodes({ employeeId, name });
//       qrCodeInUrl = qrCodes.qrCodeInUrl;
//       qrCodeOutUrl = qrCodes.qrCodeOutUrl;
//     } catch (qrError) {
//       console.error('QR generation error:', qrError);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to generate QR codes'
//       });
//     }

//     // Save to Supabase
//     const { data: employee, error } = await supabase
//       .from('employees')
//       .insert([
//         {
//           employee_id: employeeId,
//           name,
//           password: hashedPassword,
//           image_url: imageUrl,
//           qr_code_in_url: qrCodeInUrl,
//           qr_code_out_url: qrCodeOutUrl,
//           created_at: new Date().toISOString()
//         }
//       ])
//       .select('employee_id, name, image_url, qr_code_in_url, qr_code_out_url, created_at')
//       .single();

//     if (error) {
//       console.error('Supabase insert error:', error);
//       return res.status(500).json({
//         success: false,
//         message: 'Failed to register employee in database'
//       });
//     }

//     // Generate JWT token
//     const token = jwt.sign(
//       { 
//         id: employee.employee_id, 
//         name: employee.name, 
//         role: 'employee' 
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRE || '7d' }
//     );

//     // Return success response
//     res.status(201).json({
//       success: true,
//       message: 'Employee registered successfully',
//       token,
//       employee: {
//         employeeId: employee.employee_id,
//         name: employee.name,
//         imageUrl: employee.image_url,
//         qrCodeInUrl: employee.qr_code_in_url,
//         qrCodeOutUrl: employee.qr_code_out_url,
//         createdAt: employee.created_at
//       }
//     });

//   } catch (error) {
//     console.error('Registration error:', error);
    
//     // Clean up uploaded file if exists
//     if (req.file) {
//       try {
//         fs.unlinkSync(req.file.path);
//       } catch (unlinkError) {
//         console.error('Error cleaning up file:', unlinkError);
//       }
//     }
    
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error during registration',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * @desc    Login employee
//  * @route   POST /api/auth/login
//  * @access  Public
//  */
// const loginEmployee = async (req, res) => {
//   try {
//     const { employeeId, password } = req.body;

//     // Validate input
//     if (!employeeId || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide employee ID and password'
//       });
//     }

//     console.log('🔐 Attempting login for employee:', employeeId);

//     // Get employee from database
//     const { data: employee, error } = await supabase
//       .from('employees')
//       .select('*')
//       .eq('employee_id', employeeId)
//       .single();

//     if (error || !employee) {
//       console.log('❌ Employee not found:', employeeId);
//       return res.status(401).json({ 
//         success: false,
//         message: 'Invalid credentials' 
//       });
//     }

//     // Verify password
//     const isValidPassword = await bcrypt.compare(password, employee.password);
//     if (!isValidPassword) {
//       console.log('❌ Invalid password for employee:', employeeId);
//       return res.status(401).json({ 
//         success: false,
//         message: 'Invalid credentials' 
//       });
//     }

//     console.log('✅ Employee login successful:', employeeId);

//     // Generate JWT token
//     const token = jwt.sign(
//       { 
//         id: employee.employee_id, 
//         name: employee.name, 
//         role: 'employee' 
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRE || '7d' }
//     );

//     // Return success response
//     res.json({
//       success: true,
//       message: 'Login successful',
//       token,
//       employee: {
//         employeeId: employee.employee_id,
//         name: employee.name,
//         imageUrl: employee.image_url,
//         qrCodeInUrl: employee.qr_code_in_url,
//         qrCodeOutUrl: employee.qr_code_out_url
//       }
//     });

//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error during login',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * @desc    Login security guard
//  * @route   POST /api/auth/guard/login
//  * @access  Public
//  */
// const loginGuard = async (req, res) => {
//   try {
//     const { username, password } = req.body;

//     // Validate input
//     if (!username || !password) {
//       return res.status(400).json({
//         success: false,
//         message: 'Please provide username and password'
//       });
//     }

//     console.log('🔐 Attempting guard login for:', username);

//     // Check against environment variables
//     if (username === process.env.GUARD_USERNAME && password === process.env.GUARD_PASSWORD) {
//       const token = jwt.sign(
//         { 
//           role: 'guard', 
//           username,
//           id: 'guard_' + Date.now()
//         },
//         process.env.JWT_SECRET,
//         { expiresIn: process.env.JWT_EXPIRE || '7d' }
//       );

//       console.log('✅ Guard login successful:', username);

//       return res.json({
//         success: true,
//         message: 'Login successful',
//         token,
//         guard: { 
//           username, 
//           role: 'guard',
//           name: 'Security Guard'
//         }
//       });
//     }

//     console.log('❌ Invalid guard credentials:', username);
//     res.status(401).json({ 
//       success: false,
//       message: 'Invalid credentials' 
//     });

//   } catch (error) {
//     console.error('Guard login error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error during login',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * @desc    Get current user profile
//  * @route   GET /api/auth/me
//  * @access  Private
//  */
// const getMe = async (req, res) => {
//   try {
//     if (req.user.role === 'employee') {
//       const { data: employee, error } = await supabase
//         .from('employees')
//         .select('employee_id, name, image_url, qr_code_in_url, qr_code_out_url, created_at')
//         .eq('employee_id', req.user.id)
//         .single();

//       if (error) {
//         return res.status(404).json({
//           success: false,
//           message: 'Employee not found'
//         });
//       }

//       return res.json({
//         success: true,
//         user: {
//           employeeId: employee.employee_id,
//           name: employee.name,
//           imageUrl: employee.image_url,
//           qrCodeInUrl: employee.qr_code_in_url,
//           qrCodeOutUrl: employee.qr_code_out_url,
//           createdAt: employee.created_at,
//           role: 'employee'
//         }
//       });
//     } else {
//       // Guard user
//       return res.json({
//         success: true,
//         user: {
//           username: req.user.username,
//           role: 'guard',
//           name: 'Security Guard'
//         }
//       });
//     }
//   } catch (error) {
//     console.error('Get profile error:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Server error'
//     });
//   }
// };

// module.exports = {
//   registerEmployee,
//   loginEmployee,
//   loginGuard,
//   getMe
// };

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const { supabase } = require('../config/supabase');
const cloudinary = require('../config/cloudinary');
const { generateEmployeeQRCodes } = require('../utils/qrGenerator');

// Generate unique employee ID
const generateEmployeeId = () => {
  const prefix = 'EMP';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
};

/**
 * @desc    Register a new employee
 * @route   POST /api/auth/register
 * @access  Public
 */
const registerEmployee = async (req, res) => {
  try {
    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        success: false,
        errors: errors.array() 
      });
    }

    const { name, password, image } = req.body; // Accept base64 image
    
    // Validate required fields
    if (!name || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name and password are required'
      });
    }

    // Check if employee already exists by name
    const { data: existingEmployee, error: checkError } = await supabase
      .from('employees')
      .select('name')
      .eq('name', name)
      .maybeSingle();

    if (existingEmployee) {
      return res.status(400).json({
        success: false,
        message: 'Employee with this name already exists'
      });
    }

    // Generate unique employee ID
    const employeeId = generateEmployeeId();

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Upload image to Cloudinary if provided (base64 format)
    let imageUrl = null;
    if (image) {
      try {
        console.log('📤 Uploading image to Cloudinary...');
        const result = await cloudinary.uploader.upload(image, {
          folder: 'attendance_system/employees',
          public_id: `employee_${employeeId}`,
          width: 500,
          height: 500,
          crop: 'limit',
          quality: 'auto:good',
          transformation: [
            { width: 500, height: 500, crop: 'fill' },
            { quality: 'auto' }
          ]
        });
        imageUrl = result.secure_url;
        console.log('✅ Image uploaded successfully:', imageUrl);
      } catch (uploadError) {
        console.error('❌ Image upload error:', uploadError);
        // Continue without image if upload fails
      }
    }

    // Generate QR codes
    let qrCodeInUrl = null;
    let qrCodeOutUrl = null;
    
    try {
      console.log('📱 Generating QR codes...');
      const qrCodes = await generateEmployeeQRCodes({ employeeId, name });
      qrCodeInUrl = qrCodes.qrCodeInUrl;
      qrCodeOutUrl = qrCodes.qrCodeOutUrl;
      console.log('✅ QR codes generated successfully');
    } catch (qrError) {
      console.error('❌ QR generation error:', qrError);
      return res.status(500).json({
        success: false,
        message: 'Failed to generate QR codes'
      });
    }

    // Save to Supabase
    console.log('💾 Saving employee to database...');
    const { data: employee, error } = await supabase
      .from('employees')
      .insert([
        {
          employee_id: employeeId,
          name,
          password: hashedPassword,
          image_url: imageUrl,
          qr_code_in_url: qrCodeInUrl,
          qr_code_out_url: qrCodeOutUrl,
          created_at: new Date().toISOString()
        }
      ])
      .select('employee_id, name, image_url, qr_code_in_url, qr_code_out_url, created_at')
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to register employee in database'
      });
    }

    console.log('✅ Employee saved successfully:', employee.employee_id);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: employee.employee_id, 
        name: employee.name, 
        role: 'employee' 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Return success response
    res.status(201).json({
      success: true,
      message: 'Employee registered successfully',
      token,
      employee: {
        employeeId: employee.employee_id,
        name: employee.name,
        imageUrl: employee.image_url,
        qrCodeInUrl: employee.qr_code_in_url,
        qrCodeOutUrl: employee.qr_code_out_url,
        createdAt: employee.created_at
      }
    });

  } catch (error) {
    console.error('❌ Registration error:', error);
    
    res.status(500).json({ 
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Login employee
 * @route   POST /api/auth/login
 * @access  Public
 */
const loginEmployee = async (req, res) => {
  try {
    const { employeeId, password } = req.body;

    // Validate input
    if (!employeeId || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide employee ID and password'
      });
    }

    console.log('🔐 Attempting login for employee:', employeeId);

    // Get employee from database
    const { data: employee, error } = await supabase
      .from('employees')
      .select('*')
      .eq('employee_id', employeeId)
      .single();

    if (error || !employee) {
      console.log('❌ Employee not found:', employeeId);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, employee.password);
    if (!isValidPassword) {
      console.log('❌ Invalid password for employee:', employeeId);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    console.log('✅ Employee login successful:', employeeId);

    // Generate JWT token
    const token = jwt.sign(
      { 
        id: employee.employee_id, 
        name: employee.name, 
        role: 'employee' 
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    // Return success response
    res.json({
      success: true,
      message: 'Login successful',
      token,
      employee: {
        employeeId: employee.employee_id,
        name: employee.name,
        imageUrl: employee.image_url,
        qrCodeInUrl: employee.qr_code_in_url,
        qrCodeOutUrl: employee.qr_code_out_url
      }
    });

  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Login security guard
 * @route   POST /api/auth/guard/login
 * @access  Public
 */
const loginGuard = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide username and password'
      });
    }

    console.log('🔐 Attempting guard login for:', username);

    // Check against environment variables
    if (username === process.env.GUARD_USERNAME && password === process.env.GUARD_PASSWORD) {
      const token = jwt.sign(
        { 
          role: 'guard', 
          username,
          id: 'guard_' + Date.now()
        },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
      );

      console.log('✅ Guard login successful:', username);

      return res.json({
        success: true,
        message: 'Login successful',
        token,
        guard: { 
          username, 
          role: 'guard',
          name: 'Security Guard'
        }
      });
    }

    console.log('❌ Invalid guard credentials:', username);
    res.status(401).json({ 
      success: false,
      message: 'Invalid credentials' 
    });

  } catch (error) {
    console.error('❌ Guard login error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get current user profile
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res) => {
  try {
    if (req.user.role === 'employee') {
      const { data: employee, error } = await supabase
        .from('employees')
        .select('employee_id, name, image_url, qr_code_in_url, qr_code_out_url, created_at')
        .eq('employee_id', req.user.id)
        .single();

      if (error) {
        return res.status(404).json({
          success: false,
          message: 'Employee not found'
        });
      }

      return res.json({
        success: true,
        user: {
          employeeId: employee.employee_id,
          name: employee.name,
          imageUrl: employee.image_url,
          qrCodeInUrl: employee.qr_code_in_url,
          qrCodeOutUrl: employee.qr_code_out_url,
          createdAt: employee.created_at,
          role: 'employee'
        }
      });
    } else {
      // Guard user
      return res.json({
        success: true,
        user: {
          username: req.user.username,
          role: 'guard',
          name: 'Security Guard'
        }
      });
    }
  } catch (error) {
    console.error('❌ Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
};

module.exports = {
  registerEmployee,
  loginEmployee,
  loginGuard,
  getMe
};
