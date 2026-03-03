const QRCode = require('qrcode');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const generateAndUploadQR = async (payload, type, employeeId) => {
  try {
    console.log(`🖼️  Generating ${type.toUpperCase()} QR for employee ${employeeId}`);

    const qrBuffer = await QRCode.toBuffer(JSON.stringify(payload), {
      errorCorrectionLevel: 'H',
      type: 'png',
      width: 400,
      margin: 1,
    });

    const base64 = qrBuffer.toString('base64');
    const result = await cloudinary.uploader.upload(
      `data:image/png;base64,${base64}`,
      {
        folder: 'sunstar-attendance/qrs',
        public_id: `emp-${employeeId}-${type}-${Date.now()}`,
        resource_type: 'image',
        overwrite: true,
      }
    );

    console.log(`✅ ${type.toUpperCase()} QR uploaded → ${result.secure_url}`);
    return result.secure_url;
  } catch (err) {
    console.error(`❌ QR ${type} generation/upload failed:`, err.message);
    throw err;
  }
};

module.exports = { generateAndUploadQR };