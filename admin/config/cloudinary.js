const cloudinary = require('cloudinary').v2;

cloudinary.config({ secure: true });
// LOG TEMPORÁRIO — remove depois de resolver
console.log('☁️ Cloudinary config:', {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? `${ process.env.CLOUDINARY_CLOUD_NAME }` : "❌ indefinida",
  api_key:    process.env.CLOUDINARY_API_KEY ? `${ process.env.CLOUDINARY_API_KEY }` : '❌ indefinida',
  api_secret: process.env.CLOUDINARY_API_SECRET ? `${ process.env.CLOUDINARY_API_SECRET }` : '❌ indefinida',
});

module.exports = cloudinary;
