const mongoose = require("mongoose");
const logger = require("../utils/logger");
const { uploadImageToCloudinary } = require("../utils/cloudinary");
const validateBook = require("../utils/validateBook");
const Book = require("../model/Book");
const { publishEvent } = require("../utils/rabbitMq");
const axios = require("axios");

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

    // collect all unique userIds
    const userIds = [...new Set(books.map((b) => b.userId.toString()))];

    // call auth-service to fetch user details
    const { data: users } = await axios.post(
      "http://localhost:3001/api/auth/users/bulk", // replace with your real auth-service endpoint
      { ids: userIds }
    );

    // build a map for quick lookup
    const userMap = {};
    users.forEach((user) => {
      userMap[user._id] = user;
    });

    // attach user details to books
    const booksWithUsers = books.map((book) => ({
      ...book.toObject(),
      user: userMap[book.userId.toString()] || null,
    }));

    logger.info(`Books found successfully`);

    const totalBooks = await Book.countDocuments();

    const result = {
      books: booksWithUsers,
      currentPage: page,
      totalBooks,
      totalPages: Math.ceil(totalBooks / limit),
      message: "Books found successfully",
      success: true,
    };
    await req.redisClient.setex(cachedKey, 300, JSON.stringify(result));
    return res.status(200).json(result);
  } catch (error) {
    logger.error(`Error occurred while getting all books ${error}`);
    return res.status(500).json({
      success: false,
      message: "Server error occured",
    });
  }
};

const getSingleBook = async (req, res) => {
  logger.info(`Hit the get single book endpoint`);
  try {
    const bookId = req.params.id;

    if (!bookId) {
      logger.warn(`Book Id missing, please provide the book Id`);
      return res.status(400).json({
        message: "Book Id missing, please provide the book Id",
        success: false,
      });
    }

    const book = await Book.findById(bookId);

    if (!book) {
      logger.warn(`Book not found, please try again!`);
      return res.status(404).json({
        success: false,
        message: "Book not found, check the Id and try again",
      });
    }

    logger.info(`Book Found successfully`);
    return res.status(200).json({
      book,
      success: true,
      message: "Book found successfully",
    });
  } catch (error) {
    logger.error(`Error occurred while trying to get single book`);
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
    });
  }
};

const deleteSingleBook = async (req, res) => {
  logger.info(`Delete single book endpoint hit`);

  try {
    const bookId = req.params.id;
    if (!bookId) {
      logger.warn(`Book Id is missing, please provide the book Id`);
      return res.status(400).json({
        success: false,
        message: "Book Id is missing, please provide the book Id",
      });
    }
    const book = await Book.findOneAndDelete({
      _id: bookId,
      userId: req.user.userId,
    });

    if (!book) {
      logger.warn(
        `Book not found or not authorized, please provide a valid book id`
      );
      return res.status(404).json({
        message: "Book not found or not authorized, provide a valid book Id",
        success: false,
      });
    }

    try {
      await publishEvent("book.deleted", {
        bookId: book._id.toString(),
        imageId: book.imageId,
      });
    } catch (err) {
      logger.error("Failed to publish book.deleted event", err);
    }
    await invalidateCachedBooks(req, res);
    logger.info(`Book deleted successfully`);
    return res.status(200).json({
      message: "Book deleted successfully",
      success: true,
      bookId: book._id,
    });
  } catch (error) {
    logger.error(`Error occurred while trying to delete single book`);
    return res.status(500).json({
      message: "Internal server error",
      success: false,
    });
  }
};

const getMyBooks = async (req, res) => {
  try {
    const myBooks = await Book.find({ userId: req.user.userId }).sort({
      createdAt: -1,
    });
    if (!myBooks || !myBooks.length) {
      logger.info(`Books no found, try creating some books`);
      return res.status(404).json({
        message: "Book not found, try and create some books",
        success: false,
      });
    }

    logger.info(`Books found successfully`);
    return res.status(200).json({
      message: "Books gotten successfully",
      success: true,
      books: myBooks,
    });
  } catch (error) {
    logger.error(`Error occurred while getting the user books`);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

module.exports = {
  createBook,
  getAllBooks,
  getSingleBook,
  deleteSingleBook,
  getMyBooks,
};
