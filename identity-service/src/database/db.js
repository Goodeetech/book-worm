const mongoose = require("mongoose");
const logger = require("../utils/logger");

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    logger.info(`Connected to the database successfully`);
  } catch (error) {
    logger.error(`Error occurred while connecting to the database ${error}`);
  }
};

module.exports = connectDB;
