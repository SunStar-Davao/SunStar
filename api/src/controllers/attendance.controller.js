const { supabase } = require('../config/supabase');
const moment = require('moment');
const { validateQRData } = require('../utils/qrGenerator');

// Constants
const OFFICE_HOURS = {
  START: 8, // 8:00 AM
  END: 17    // 5:00 PM
};

/**
 * Calculate late minutes
 * @param {Date} timeIn - Time in timestamp
 * @returns {number} - Minutes late
 */
const calculateLateMinutes = (timeIn) => {
  const timeInMoment = moment(timeIn);
  const cutoffTime = moment(timeIn).startOf('day').hour(OFFICE_HOURS.START).minute(0).second(0);
  
  if (timeInMoment.isAfter(cutoffTime)) {
    return timeInMoment.diff(cutoffTime, 'minutes');
  }
  
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
    const currentDate = new Date();
    const today = moment(currentDate).format('YYYY-MM-DD');
    const currentTime = currentDate;

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

      // Calculate late minutes
      const lateMinutes = calculateLateMinutes(currentTime);
      const status = lateMinutes > 0 ? 'late' : 'present';

      if (existingAttendance) {
        // Update existing record
        const { data: attendance, error } = await supabase
          .from('attendance')
          .update({ 
            time_in: currentTime,
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
            employeeName: employee.name
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
              time_in: currentTime,
              status,
              late_minutes: lateMinutes,
              created_at: currentTime
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
            employeeName: employee.name
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

      // Update with time out
      const { data: attendance, error } = await supabase
        .from('attendance')
        .update({ time_out: currentTime })
        .eq('id', existingAttendance.id)
        .select()
        .single();

      if (error) throw error;

      console.log(`✅ Time Out recorded for ${employee.name}`);

      return res.json({
        success: true,
        message: 'Timed out successfully',
        attendance: {
          ...attendance,
          employeeName: employee.name
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
      data: attendance,
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
    const today = moment().format('YYYY-MM-DD');

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
      data: attendance,
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
const getEmployeeSummary = async (req, res) => {
  try {
    const { employeeId } = req.params;
    const { months = 1 } = req.query;

    const startDate = moment().subtract(months, 'months').format('YYYY-MM-DD');
    const endDate = moment().format('YYYY-MM-DD');

    const { data: attendance, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: false });

    if (error) throw error;

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
      attendance
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