const { deleteImageFromCloudinary } = require("../utils/cloudinary");
const logger = require("../utils/logger");

const handleImageDeleted = async (event) => {
  logger.info({ event }, "handlePostDeleted event received");
  try {
    const { imageId } = event;

    await deleteImageFromCloudinary(imageId);
  } catch (error) {
    logger.error(`Error handling post deleted event:${error.message}`);
  }
};

module.exports = { handleImageDeleted };
