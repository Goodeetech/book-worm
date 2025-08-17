const express = require("express");

const multer = require("multer");
const logger = require("../utils/logger");
const { authRequest } = require("../middleware/authMiddleware");
const { createBook } = require("../controller/book-controller");

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(), // store in the memory and not the disk
  limits: {
    fileSize: 5 * 1024 * 1024, // file should not exceed 5MB
  },
}).single("image");

router.post(
  "/create-book",
  authRequest,
  (req, res, next) => {
    upload(req, res, function (err) {
      if (err instanceof multer.MulterError) {
        logger.error(`Multer error while uploading ${err}`);
        return res.status(400).json({
          message: "Multer error while uploading file",
          error: err,
          stack: err.stack,
        });
      } else if (err) {
        logger.error(`Unknown error occurred while uploading file ${err}`);
        return res.status(500).json({
          message: `Unknown error occurred while uploading file ${err}`,
          error: err,
          stack: err.stack,
        });
      }
      if (!req.file) {
        return res.status(400).json({
          message: "No File Found",
        });
      }
      next();
    });
  },
  createBook
);

module.exports = router;
