const logger = require("./logger");

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_SECRET_KEY,
});

const uploadImageToCloudinary = (file) => {
  return new Promise((resolve, reject) => {
    const uploadFile = cloudinary.uploader.upload_stream(
      {
        resource_type: "auto",
      },
      (error, result) => {
        if (error) {
          logger.error(`Error occurred while uploading file to cloudinary`);
          reject(error);
        } else {
          resolve(result);
        }
      }
    );
    uploadFile.end(file.buffer);
  });
};

module.exports = { uploadImageToCloudinary };
