const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { uploadImageToCloudinary } = require("../utils/cloudinary");
const validateBook = require("../utils/validateBook");
const Book = require("../model/Book");

const invalidateCachedBooks = async (req, res) => {
  try {
    let cursor = "0";
    do {
      const [cursorP, keys] = await req.redisClient.scan(
        cursor,
        "MATCH",
        "books:*",
        "COUNT",
        100
      );
      cursor = cursorP;

      if (keys.length > 0) {
        await req.redisClient.del(...keys);
      }
    } while (cursor !== "0");
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Error occurred while invalidating the cached books",
    });
  }
};

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
    await invalidateCachedBooks(req, res);
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

const getAllBooks = async (req, res) => {
  logger.info(`Get all book endpoint hit!`);

  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const startIndex = (page - 1) * limit;
    const cachedKey = `books:${page}:${limit}`;

    const cachedBooks = await req.redisClient.get(cachedKey);

    if (cachedBooks) {
      return res.json(JSON.parse(cachedBooks));
    }

    const books = await Book.find({})
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit);

    if (!books) {
      logger.info(`No books found`);
      return res.status(401).json({
        success: false,
        message: "No books found",
      });
    }

    logger.info(`Books found successfully`);
    await req.redisClient.setex(cachedKey, 300, JSON.stringify(books));
    return res.status(200).json({
      books,
      message: "Books found successfully",
      success: true,
    });
  } catch (error) {
    logger.error(`Error occurred while getting all books ${error}`);
    return res.status(500).json({
      success: false,
      message: "Server error occured",
    });
  }
};

module.exports = { createBook, getAllBooks };
