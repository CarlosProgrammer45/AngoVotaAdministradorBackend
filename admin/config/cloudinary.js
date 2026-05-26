const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// LOG TEMPORÁRIO — remove depois de resolver
console.log('☁️ Cloudinary config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? `${ CLOUDINARY_CLOUD_NAME }` : "❌ indefinida",
  api_key:    process.env.CLOUDINARY_API_KEY ? '✅ definida' : '❌ indefinida',
  api_secret: process.env.CLOUDINARY_API_SECRET ? '✅ definida' : '❌ indefinida',
});

module.exports = cloudinary;
