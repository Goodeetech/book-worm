require("dotenv").config();
const express = require("express");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");
const logger = require("./utils/logger");
const { RedisStore } = require("rate-limit-redis");
const { rateLimit } = require("express-rate-limit");
const connectDB = require("./database/db");

const bookRoute = require("./routes/book-routes");
const errorHandler = require("./middleware/errorHandler");

// middleware security
const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
connectDB();

//initiate redis client
const redisClient = new Redis(process.env.REDIS_URL);
//rate limiter

//request logger
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  if (Object.keys(req.body || {}).length > 0) {
    // Make a shallow copy of the request body
    const safeBody = { ...req.body };

    // List of fields to redact
    const sensitiveFields = [
      "password",
      "token",
      "authorization",
      "secret",
      "apiKey",
    ];

    // Replace sensitive values with [REDACTED]
    sensitiveFields.forEach((field) => {
      if (safeBody[field]) {
        safeBody[field] = "[REDACTED]";
      }
    });
    logger.info(`Request Body ${JSON.stringify(safeBody)}`);
  }
  next();
});

app.use(
  "/api/books",
  (req, res, next) => {
    req.redisClient = redisClient;
    next();
  },
  bookRoute
);

app.use(errorHandler);
const PORT = process.env.PORT;

const startServer = async () => {
  app.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
  });
};

startServer();
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at Promise:", promise, "Reason:", reason);
});
