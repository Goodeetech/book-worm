const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error(`Error occurred while connecting to the database ${error}`);
    process.exit(1);
  }
};

module.exports = connectDB;
