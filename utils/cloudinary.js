const cloudinary = require('cloudinary').v2;

function imageUpload(file) {
  return new Promise((resolve, reject) => {
    try {
      cloudinary.uploader.upload(
        file,
        {
          overwrite: true,
          invalidate: true,
          resource_type: 'auto',
          // folder: folder,
        },
        (error, result) => {
          if (result && result.secure_url) {
            const { public_id, secure_url, url } = result;
            resolve({
              url: secure_url,
              thumbnailUrl: url,
              id: public_id,
            });
          }
          return reject({ message: error });
        }
      );
    } catch (error) {
      console.log(error);
    }
  });
}

module.exports = imageUpload;
