const QRCode = require('qrcode');
const cloudinary = require('../config/cloudinary');

/**
 * Generate QR code and upload to Cloudinary
 * @param {Object} data - Data to encode in QR code
 * @param {string} type - Type of QR code ('in' or 'out')
 * @returns {Promise<string>} - URL of uploaded QR code
 */
const generateQRCode = async (data, type) => {
  try {
    // Validate input
    if (!data || !data.employeeId) {
      throw new Error('Employee ID is required for QR code generation');
    }

    // Add metadata to QR code
    const qrData = {
      employeeId: data.employeeId,
      name: data.name,
      type: type.toUpperCase(),
      timestamp: Date.now(),
      version: '1.0'
    };

    // Generate QR code as data URL with better quality
    const qrDataUrl = await QRCode.toDataURL(JSON.stringify(qrData), {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 400,
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });

    // Convert base64 to buffer
    const base64Data = qrDataUrl.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    // Upload to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'attendance_system/qr_codes',
          public_id: `${data.employeeId}_${type}_${Date.now()}`,
          resource_type: 'image',
          tags: ['qr_code', type, data.employeeId],
          quality: 'auto:best',
          format: 'png',
          width: 400,
          height: 400,
          crop: 'limit'
        },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(new Error('Failed to upload QR code to Cloudinary'));
          } else {
            resolve(result);
          }
        }
      );

      uploadStream.end(buffer);
    });

    console.log(`✅ QR code generated for employee ${data.employeeId} (${type})`);
    return result.secure_url;

  } catch (error) {
    console.error('Error in QR code generation:', error);
    throw new Error(`QR code generation failed: ${error.message}`);
  }
};

/**
 * Generate both Time In and Time Out QR codes
 * @param {Object} employeeData - Employee data
 * @returns {Promise<Object>} - Object containing both QR code URLs
 */
const generateEmployeeQRCodes = async (employeeData) => {
  try {
    const { employeeId, name } = employeeData;

    // Generate both QR codes in parallel
    const [qrCodeInUrl, qrCodeOutUrl] = await Promise.all([
      generateQRCode({ employeeId, name }, 'in'),
      generateQRCode({ employeeId, name }, 'out')
    ]);

    return {
      qrCodeInUrl,
      qrCodeOutUrl
    };

  } catch (error) {
    console.error('Error generating employee QR codes:', error);
    throw new Error(`Failed to generate QR codes: ${error.message}`);
  }
};

/**
 * Validate and parse QR code data
 * @param {string} qrData - QR code data string
 * @returns {Object} - Parsed QR data
 */
const validateQRData = (qrData) => {
  try {
    const parsed = JSON.parse(qrData);
    
    // Validate required fields
    if (!parsed.employeeId || !parsed.type) {
      throw new Error('Invalid QR code format: missing required fields');
    }

    // Validate type
    if (!['IN', 'OUT'].includes(parsed.type)) {
      throw new Error('Invalid QR code type');
    }

    // Check if QR code is expired (24 hours validity)
    // if (parsed.timestamp) {
    //   const age = Date.now() - parsed.timestamp;
    //   const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
    //   if (age > maxAge) {
    //     throw new Error('QR code has expired');
    //   }
    // }

    return parsed;
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new Error('Invalid QR code format');
    }
    throw error;
  }
};

module.exports = {
  generateQRCode,
  generateEmployeeQRCodes,
  validateQRData
};  
