const logger = require("../utils/logger");

const errorHandler = (err, req, res, next) => {
  logger.error(err.stack);
  return res.status(err.status || 500).json({
    message: `${err.message || "Internal Server Error"}`,
  });
};

module.exports = errorHandler;
