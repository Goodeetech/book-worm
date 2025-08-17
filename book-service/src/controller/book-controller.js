const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { uploadImageToCloudinary } = require("../utils/cloudinary");
const validateBook = require("../utils/validateBook");
const Book = require("../model/Book");

const createBook = async (req, res) => {
  logger.info(`Hit the create post endpoint`);
  try {
    const { error } = validateBook(req.body);

    if (error) {
      logger.info(error.details[0].message);
      return res.status(400).json({
        message: error.details[0].message,
        success: false,
      });
    }

    const cloudinaryUploadFile = await uploadImageToCloudinary(req.file);
    logger.info(
      `File uploaded successfully with publicId: ${cloudinaryUploadFile.public_id}`
    );

    const { title, caption, rating } = req.body;
    const userId = req.user.userId;

    const book = await Book({
      title,
      caption,
      rating,
      userId,
      imageUrl: cloudinaryUploadFile.secure_url,
      imageId: cloudinaryUploadFile.public_id,
    });
    await book.save();
    logger.info(`Book saved successfully`);
    return res.status(201).json({
      message: "Book saved successfully",
      success: true,
      data: {
        title: book.title,
        caption: book.caption,
        rating: book.rating,
        image: book.imageUrl,
      },
    });
  } catch (error) {
    logger.error(`Error occurred while creating book ${error}`);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = { createBook };
