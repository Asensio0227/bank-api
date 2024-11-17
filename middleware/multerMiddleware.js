const multer = require('multer');
const DataParser = require('datauri/parser');
const path = require('path');
const cloudinary = require('cloudinary').v2;
const storage = multer.memoryStorage();
const upload = multer({ storage });
const parser = new DataParser();

const formatImage = async (file, newUser) => {
  const fileExtension = path.extname(file.originalname).toString();
  const fileImage = parser.format(fileExtension, file.buffer).content;
  const response = await cloudinary.uploader.upload(fileImage, {
    resource_type: 'auto',
    folder: 'bank-image',
  });
  const { secure_url, url, public_id } = response;
  newUser.thumbnailUrl = url;
  newUser.avatar = secure_url;
  newUser.avatarPublicId = public_id;
  return newUser;
};

module.exports = { upload, formatImage };
