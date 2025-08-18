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

const deleteImageFromCloudinary = async (publicId) => {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    logger.info(`Image deleted from Cloudinary: ${publicId}`);
    return result;
  } catch (error) {
    logger.error(
      `Error while deleting media from Cloudinary: ${error.message}`,
      {
        stack: error.stack,
        publicId,
      }
    );
    throw error; // rethrow so caller can retry
  }
};

module.exports = { uploadImageToCloudinary, deleteImageFromCloudinary };
