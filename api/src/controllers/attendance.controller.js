// const { supabase } = require('../config/supabase');
// const moment = require('moment-timezone');
// const { validateQRData } = require('../utils/qrGenerator');

// // Constants
// const OFFICE_HOURS = {
//   START: 8, // 8:00 AM
//   END: 17    // 5:00 PM
// };

// /**
//  * Calculate late minutes
//  * @param {Date} timeIn - Time in timestamp
//  * @returns {number} - Minutes late
//  */

// const calculateLateMinutes = (timeIn) => {
//   const timeInMoment = moment(timeIn);
//   const cutoffTime = moment(timeIn).startOf('day').hour(OFFICE_HOURS.START).minute(0).second(0);
  
//   if (timeInMoment.isAfter(cutoffTime)) {
//     return timeInMoment.diff(cutoffTime, 'minutes');
//   }
  
//   return 0;
// };


// /**
//  * @desc    Mark attendance (for security guard)
//  * @route   POST /api/attendance/mark
//  * @access  Private (Guard only)
//  */
// const markAttendance = async (req, res) => {
//   try {
//     const { qrData } = req.body;

//     if (!qrData) {
//       return res.status(400).json({
//         success: false,
//         message: 'QR code data is required'
//       });
//     }

//     console.log('🔍 Scanning QR code...');

//     // Validate and parse QR data
//     let parsedData;
//     try {
//       parsedData = validateQRData(qrData);
//       console.log('✅ QR code validated:', parsedData);
//     } catch (error) {
//       console.log('❌ Invalid QR code:', error.message);
//       return res.status(400).json({
//         success: false,
//         message: error.message
//       });
//     }

//     const { employeeId, type } = parsedData;
//     const currentDate = new Date();
//     const today = moment(currentDate).format('YYYY-MM-DD');
//     const currentTime = currentDate;

//     // Check if employee exists
//     const { data: employee, error: empError } = await supabase
//       .from('employees')
//       .select('employee_id, name')
//       .eq('employee_id', employeeId)
//       .single();

//     if (empError || !employee) {
//       console.log('❌ Employee not found:', employeeId);
//       return res.status(404).json({ 
//         success: false,
//         message: 'Employee not found' 
//       });
//     }

//     console.log('✅ Employee found:', employee.name);

//     // Check if attendance record exists for today
//     const { data: existingAttendance, error: attError } = await supabase
//       .from('attendance')
//       .select('*')
//       .eq('employee_id', employeeId)
//       .eq('date', today)
//       .maybeSingle();

//     if (type === 'IN') {
//       // Handle Time In
//       if (existingAttendance) {
//         if (existingAttendance.time_in) {
//           console.log('❌ Employee already timed in today:', employeeId);
//           return res.status(400).json({ 
//             success: false,
//             message: 'Employee has already timed in today' 
//           });
//         }
//       }

//       // Calculate late minutes
//       const lateMinutes = calculateLateMinutes(currentTime);
//       const status = lateMinutes > 0 ? 'late' : 'present';

//       if (existingAttendance) {
//         // Update existing record
//         const { data: attendance, error } = await supabase
//           .from('attendance')
//           .update({ 
//             time_in: currentTime,
//             status,
//             late_minutes: lateMinutes
//           })
//           .eq('id', existingAttendance.id)
//           .select()
//           .single();

//         if (error) throw error;

//         console.log(`✅ Time In recorded for ${employee.name}: ${status} ${lateMinutes > 0 ? `(${lateMinutes} min late)` : ''}`);

//         return res.json({
//           success: true,
//           message: status === 'late' 
//             ? `Timed in successfully (${lateMinutes} minutes late)` 
//             : 'Timed in successfully',
//           attendance: {
//             ...attendance,
//             employeeName: employee.name
//           }
//         });
//       } else {
//         // Create new attendance record
//         const { data: attendance, error } = await supabase
//           .from('attendance')
//           .insert([
//             {
//               employee_id: employeeId,
//               date: today,
//               time_in: currentTime,
//               status,
//               late_minutes: lateMinutes,
//               created_at: currentTime
//             }
//           ])
//           .select()
//           .single();

//         if (error) throw error;

//         console.log(`✅ Time In recorded for ${employee.name}: ${status} ${lateMinutes > 0 ? `(${lateMinutes} min late)` : ''}`);

//         return res.json({
//           success: true,
//           message: status === 'late' 
//             ? `Timed in successfully (${lateMinutes} minutes late)` 
//             : 'Timed in successfully',
//           attendance: {
//             ...attendance,
//             employeeName: employee.name
//           }
//         });
//       }

//     } else if (type === 'OUT') {
//       // Handle Time Out
//       if (!existingAttendance) {
//         console.log('❌ No time in record found for today:', employeeId);
//         return res.status(400).json({ 
//           success: false,
//           message: 'No time in record found for today' 
//         });
//       }

//       if (existingAttendance.time_out) {
//         console.log('❌ Employee already timed out today:', employeeId);
//         return res.status(400).json({ 
//           success: false,
//           message: 'Employee has already timed out today' 
//         });
//       }

//       // Update with time out
//       const { data: attendance, error } = await supabase
//         .from('attendance')
//         .update({ time_out: currentTime })
//         .eq('id', existingAttendance.id)
//         .select()
//         .single();

//       if (error) throw error;

//       console.log(`✅ Time Out recorded for ${employee.name}`);

//       return res.json({
//         success: true,
//         message: 'Timed out successfully',
//         attendance: {
//           ...attendance,
//           employeeName: employee.name
//         }
//       });
//     }

//   } catch (error) {
//     console.error('Attendance error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error while marking attendance',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * @desc    Get attendance report
//  * @route   GET /api/attendance/report
//  * @access  Private
//  */
// const getAttendanceReport = async (req, res) => {
//   try {
//     const { employeeId, startDate, endDate, page = 1, limit = 10 } = req.query;

//     let query = supabase
//       .from('attendance')
//       .select(`
//         *,
//         employees!inner (
//           name,
//           employee_id,
//           image_url
//         )
//       `, { count: 'exact' });

//     // Apply filters
//     if (employeeId) {
//       query = query.eq('employee_id', employeeId);
//     }

//     if (startDate && endDate) {
//       query = query.gte('date', startDate).lte('date', endDate);
//     }

//     // Apply pagination
//     const from = (page - 1) * limit;
//     const to = from + limit - 1;

//     const { data: attendance, error, count } = await query
//       .order('date', { ascending: false })
//       .range(from, to);

//     if (error) throw error;

//     // Calculate summary statistics
//     const summary = {
//       total: count,
//       present: attendance.filter(a => a.status === 'present').length,
//       late: attendance.filter(a => a.status === 'late').length,
//       absent: attendance.filter(a => a.status === 'absent').length,
//       averageLateMinutes: attendance.length > 0 
//         ? Math.round(attendance.reduce((acc, curr) => acc + (curr.late_minutes || 0), 0) / attendance.length) 
//         : 0
//     };

//     res.json({
//       success: true,
//       data: attendance,
//       summary,
//       pagination: {
//         page: parseInt(page),
//         limit: parseInt(limit),
//         total: count,
//         pages: Math.ceil(count / limit)
//       }
//     });

//   } catch (error) {
//     console.error('Report error:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error while fetching report',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * @desc    Get today's attendance
//  * @route   GET /api/attendance/today
//  * @access  Private (Guard only)
//  */
// const getTodayAttendance = async (req, res) => {
//   try {
//     const today = moment().format('YYYY-MM-DD');

//     const { data: attendance, error } = await supabase
//       .from('attendance')
//       .select(`
//         *,
//         employees (
//           name,
//           employee_id,
//           image_url
//         )
//       `)
//       .eq('date', today)
//       .order('time_in', { ascending: false });

//     if (error) throw error;

//     // Calculate statistics for today
//     const stats = {
//       total: attendance.length,
//       present: attendance.filter(a => a.status === 'present').length,
//       late: attendance.filter(a => a.status === 'late').length,
//       notTimedOut: attendance.filter(a => !a.time_out).length,
//       averageLateMinutes: attendance.length > 0 
//         ? Math.round(attendance.reduce((acc, curr) => acc + (curr.late_minutes || 0), 0) / attendance.length) 
//         : 0
//     };

//     res.json({
//       success: true,
//       data: attendance,
//       stats
//     });

//   } catch (error) {
//     console.error('Error fetching today\'s attendance:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error while fetching today\'s attendance',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// /**
//  * @desc    Get employee attendance summary
//  * @route   GET /api/attendance/summary/:employeeId
//  * @access  Private
//  */
// const getEmployeeSummary = async (req, res) => {
//   try {
//     const { employeeId } = req.params;
//     const { months = 1 } = req.query;

//     const startDate = moment().subtract(months, 'months').format('YYYY-MM-DD');
//     const endDate = moment().format('YYYY-MM-DD');

//     const { data: attendance, error } = await supabase
//       .from('attendance')
//       .select('*')
//       .eq('employee_id', employeeId)
//       .gte('date', startDate)
//       .lte('date', endDate)
//       .order('date', { ascending: false });

//     if (error) throw error;

//     // Calculate summary
//     const summary = {
//       totalDays: attendance.length,
//       present: attendance.filter(a => a.status === 'present').length,
//       late: attendance.filter(a => a.status === 'late').length,
//       absent: attendance.filter(a => a.status === 'absent').length,
//       totalLateMinutes: attendance.reduce((acc, curr) => acc + (curr.late_minutes || 0), 0),
//       averageLateMinutes: attendance.length > 0 
//         ? Math.round(attendance.reduce((acc, curr) => acc + (curr.late_minutes || 0), 0) / attendance.length) 
//         : 0
//     };

//     res.json({
//       success: true,
//       summary,
//       attendance
//     });

//   } catch (error) {
//     console.error('Error fetching employee summary:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error while fetching employee summary',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };

// module.exports = {
//   markAttendance,
//   getAttendanceReport,
//   getTodayAttendance,
//   getEmployeeSummary
// };


const { supabase } = require('../config/supabase');
const moment = require('moment-timezone');
const { validateQRData } = require('../utils/qrGenerator');

// Constants
const OFFICE_HOURS = {
  START: 8, // 8:00 AM
  END: 17    // 5:00 PM
};

/**
 * Calculate late minutes using Philippine Time
 * @param {moment.Moment} phTimeIn - Time in moment object (PH time)
 * @returns {number} - Minutes late
 */
const calculateLateMinutes = (phTimeIn) => {
  // Create cutoff at 8:00 AM Philippine Time on the same day
  const phCutoff = phTimeIn.clone()
    .startOf('day')
    .hour(8)
    .minute(0)
    .second(0);
  
  console.log('🔍 TimeIn (PH):', phTimeIn.format('YYYY-MM-DD HH:mm:ss'));
  console.log('🔍 Cutoff (PH):', phCutoff.format('YYYY-MM-DD HH:mm:ss'));
  
  if (phTimeIn.isAfter(phCutoff)) {
    const lateMinutes = phTimeIn.diff(phCutoff, 'minutes');
    console.log('🔍 Late minutes:', lateMinutes);
    return lateMinutes;
  }
  
  console.log('🔍 Late minutes: 0 (on time or early)');
  return 0;
};

/**
 * @desc    Mark attendance (for security guard)
 * @route   POST /api/attendance/mark
 * @access  Private (Guard only)
 */
const markAttendance = async (req, res) => {
  try {
    const { qrData } = req.body;

    if (!qrData) {
      return res.status(400).json({
        success: false,
        message: 'QR code data is required'
      });
    }

    console.log('🔍 Scanning QR code...');

    // Validate and parse QR data
    let parsedData;
    try {
      parsedData = validateQRData(qrData);
      console.log('✅ QR code validated:', parsedData);
    } catch (error) {
      console.log('❌ Invalid QR code:', error.message);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }

    const { employeeId, type } = parsedData;
    
    // ✅ Get current Philippine Time
    const phNow = moment().tz('Asia/Manila');
    const today = phNow.format('YYYY-MM-DD');
    const currentTimeForDB = phNow.format('YYYY-MM-DD HH:mm:ss'); // Store as string

    console.log('🇵🇭 Current PH Time:', phNow.format('YYYY-MM-DD HH:mm:ss'));

    // Check if employee exists
    const { data: employee, error: empError } = await supabase
      .from('employees')
      .select('employee_id, name')
      .eq('employee_id', employeeId)
      .single();

    if (empError || !employee) {
      console.log('❌ Employee not found:', employeeId);
      return res.status(404).json({ 
        success: false,
        message: 'Employee not found' 
      });
    }

    console.log('✅ Employee found:', employee.name);

    // Check if attendance record exists for today
    const { data: existingAttendance, error: attError } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('date', today)
      .maybeSingle();

    if (type === 'IN') {
      // Handle Time In
      if (existingAttendance) {
        if (existingAttendance.time_in) {
          console.log('❌ Employee already timed in today:', employeeId);
          return res.status(400).json({ 
            success: false,
            message: 'Employee has already timed in today' 
          });
        }
      }

      // Calculate late minutes using PH time
      const lateMinutes = calculateLateMinutes(phNow);
      const status = lateMinutes > 0 ? 'late' : 'present';

      if (existingAttendance) {
        // Update existing record
        const { data: attendance, error } = await supabase
          .from('attendance')
          .update({ 
            time_in: currentTimeForDB, // Store PH time as string
            status,
            late_minutes: lateMinutes
          })
          .eq('id', existingAttendance.id)
          .select()
          .single();

        if (error) throw error;

        console.log(`✅ Time In recorded for ${employee.name}: ${status} ${lateMinutes > 0 ? `(${lateMinutes} min late)` : ''}`);

        return res.json({
          success: true,
          message: status === 'late' 
            ? `Timed in successfully (${lateMinutes} minutes late)` 
            : 'Timed in successfully',
          attendance: {
            ...attendance,
            employeeName: employee.name,
            time_in_ph: phNow.format('hh:mm A')
          }
        });
      } else {
        // Create new attendance record
        const { data: attendance, error } = await supabase
          .from('attendance')
          .insert([
            {
              employee_id: employeeId,
              date: today,
              time_in: currentTimeForDB, // Store PH time as string
              status,
              late_minutes: lateMinutes,
              created_at: currentTimeForDB
            }
          ])
          .select()
          .single();

        if (error) throw error;

        console.log(`✅ Time In recorded for ${employee.name}: ${status} ${lateMinutes > 0 ? `(${lateMinutes} min late)` : ''}`);

        return res.json({
          success: true,
          message: status === 'late' 
            ? `Timed in successfully (${lateMinutes} minutes late)` 
            : 'Timed in successfully',
          attendance: {
            ...attendance,
            employeeName: employee.name,
            time_in_ph: phNow.format('hh:mm A')
          }
        });
      }

    } else if (type === 'OUT') {
      // Handle Time Out
      if (!existingAttendance) {
        console.log('❌ No time in record found for today:', employeeId);
        return res.status(400).json({ 
          success: false,
          message: 'No time in record found for today' 
        });
      }

      if (existingAttendance.time_out) {
        console.log('❌ Employee already timed out today:', employeeId);
        return res.status(400).json({ 
          success: false,
          message: 'Employee has already timed out today' 
        });
      }

      // Update with time out (PH time)
      const { data: attendance, error } = await supabase
        .from('attendance')
        .update({ time_out: currentTimeForDB }) // Store PH time as string
        .eq('id', existingAttendance.id)
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Time Out recorded for ${employee.name} at ${phNow.format('hh:mm A')}`);

      return res.json({
        success: true,
        message: 'Timed out successfully',
        attendance: {
          ...attendance,
          employeeName: employee.name,
          time_out_ph: phNow.format('hh:mm A')
        }
      });
    }

  } catch (error) {
    console.error('Attendance error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while marking attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get attendance report
 * @route   GET /api/attendance/report
 * @access  Private
 */
const getAttendanceReport = async (req, res) => {
  try {
    const { employeeId, startDate, endDate, page = 1, limit = 10 } = req.query;

    let query = supabase
      .from('attendance')
      .select(`
        *,
        employees!inner (
          name,
          employee_id,
          image_url
        )
      `, { count: 'exact' });

    // Apply filters
    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    // Apply pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: attendance, error, count } = await query
      .order('date', { ascending: false })
      .range(from, to);

    if (error) throw error;

    // Format times for display
    const attendanceWithDisplay = attendance.map(record => ({
      ...record,
      time_in_display: record.time_in ? moment(record.time_in).format('hh:mm A') : null,
      time_out_display: record.time_out ? moment(record.time_out).format('hh:mm A') : null,
    }));

    // Calculate summary statistics
    const summary = {
      total: count,
      present: attendance.filter(a => a.status === 'present').length,
      late: attendance.filter(a => a.status === 'late').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      averageLateMinutes: attendance.length > 0 
        ? Math.round(attendance.reduce((acc, curr) => acc + (curr.late_minutes || 0), 0) / attendance.length) 
        : 0
    };

    res.json({
      success: true,
      data: attendanceWithDisplay,
      summary,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: count,
        pages: Math.ceil(count / limit)
      }
    });

  } catch (error) {
    console.error('Report error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching report',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get today's attendance
 * @route   GET /api/attendance/today
 * @access  Private (Guard only)
 */
const getTodayAttendance = async (req, res) => {
  try {
    const today = moment().tz('Asia/Manila').format('YYYY-MM-DD');

    const { data: attendance, error } = await supabase
      .from('attendance')
      .select(`
        *,
        employees (
          name,
          employee_id,
          image_url
        )
      `)
      .eq('date', today)
      .order('time_in', { ascending: false });

    if (error) throw error;

    // Format times for display
    const attendanceWithDisplay = attendance.map(record => ({
      ...record,
      employees: record.employees,
      time_in_display: record.time_in ? moment(record.time_in).format('hh:mm A') : null,
      time_out_display: record.time_out ? moment(record.time_out).format('hh:mm A') : null,
    }));

    // Calculate statistics for today
    const stats = {
      total: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      late: attendance.filter(a => a.status === 'late').length,
      notTimedOut: attendance.filter(a => !a.time_out).length,
      averageLateMinutes: attendance.length > 0 
        ? Math.round(attendance.reduce((acc, curr) => acc + (curr.late_minutes || 0), 0) / attendance.length) 
        : 0
    };

    res.json({
      success: true,
      data: attendanceWithDisplay,
      stats
    });

  } catch (error) {
    console.error('Error fetching today\'s attendance:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching today\'s attendance',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * @desc    Get employee attendance summary
 * @route   GET /api/attendance/summary/:employeeId
 * @access  Private
 */
// const getEmployeeSummary = async (req, res) => {
//   try {
//     const { employeeId } = req.params;
//     const { months = 1 } = req.query;

//     const startDate = moment().tz('Asia/Manila').subtract(months, 'months').format('YYYY-MM-DD');
//     const endDate = moment().tz('Asia/Manila').format('YYYY-MM-DD');

//     const { data: attendance, error } = await supabase
//       .from('attendance')
//       .select('*')
//       .eq('employee_id', employeeId)
//       .gte('date', startDate)
//       .lte('date', endDate)
//       .order('date', { ascending: false });

//     if (error) throw error;

//     // Format times for display
//     const attendanceWithDisplay = attendance.map(record => ({
//       ...record,
//       time_in_display: record.time_in ? moment(record.time_in).format('hh:mm A') : null,
//       time_out_display: record.time_out ? moment(record.time_out).format('hh:mm A') : null,
//       date_display: moment(record.date).format('MMM D, YYYY'),
//     }));

//     // Calculate summary
//     const summary = {
//       totalDays: attendance.length,
//       present: attendance.filter(a => a.status === 'present').length,
//       late: attendance.filter(a => a.status === 'late').length,
//       absent: attendance.filter(a => a.status === 'absent').length,
//       totalLateMinutes: attendance.reduce((acc, curr) => acc + (curr.late_minutes || 0), 0),
//       averageLateMinutes: attendance.length > 0 
//         ? Math.round(attendance.reduce((acc, curr) => acc + (curr.late_minutes || 0), 0) / attendance.length) 
//         : 0
//     };

//     res.json({
//       success: true,
//       summary,
//       attendance: attendanceWithDisplay
//     });

//   } catch (error) {
//     console.error('Error fetching employee summary:', error);
//     res.status(500).json({ 
//       success: false,
//       message: 'Server error while fetching employee summary',
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// };


const getEmployeeSummary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { months = 1, limit } = req.query; // Add limit here

    const startDate = moment().tz('Asia/Manila').subtract(months, 'months').format('YYYY-MM-DD');
    const endDate = moment().tz('Asia/Manila').format('YYYY-MM-DD');

    let query = supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    // Apply limit if provided
    if (limit) {
      query = query.limit(parseInt(limit));
    }

    const { data: attendance, error } = await query;

    if (error) throw error;

    // Format times for display
    const attendanceWithDisplay = attendance.map(record => ({
      ...record,
      time_in_display: record.time_in ? moment(record.time_in).format('hh:mm A') : null,
      time_out_display: record.time_out ? moment(record.time_out).format('hh:mm A') : null,
      date_display: moment(record.date).format('MMM D, YYYY'),
    }));

    // Calculate summary
    const summary = {
      totalDays: attendance.length,
      present: attendance.filter(a => a.status === 'present').length,
      late: attendance.filter(a => a.status === 'late').length,
      absent: attendance.filter(a => a.status === 'absent').length,
      totalLateMinutes: attendance.reduce((acc, curr) => acc + (curr.late_minutes || 0), 0),
      averageLateMinutes: attendance.length > 0 
        ? Math.round(attendance.reduce((acc, curr) => acc + (curr.late_minutes || 0), 0) / attendance.length) 
        : 0
    };

    res.json({
      success: true,
      summary,
      attendance: attendanceWithDisplay
    });

  } catch (error) {
    console.error('Error fetching employee summary:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error while fetching employee summary',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  markAttendance,
  getAttendanceReport,
  getTodayAttendance,
  getEmployeeSummary
};
