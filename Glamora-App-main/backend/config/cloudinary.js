const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with your credentials
cloudinary.config({
  cloud_name: 'dtjtjlqte',
  api_key: '582113937557659',
  api_secret: 'Qob8QqrB9PvtTNpVGTfitfQkbkU'
});

module.exports = cloudinary;
