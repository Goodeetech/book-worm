require("dotenv").config();
const express = require("express");
const Redis = require("ioredis");
const cors = require("cors");
const helmet = require("helmet");

const { RateLimiterRedis } = require("rate-limiter-flexible");
const logger = require("./utils/logger");
const { RedisStore } = require("rate-limit-redis");
const { rateLimit } = require("express-rate-limit");
const connectDB = require("./database/db");
const errorHandler = require("./middlewares/errorHandler");
const authRoutes = require("./routes/authRoutes");

const redisClient = new Redis(process.env.REDIS_URL);
const app = express();

//connect to the database
connectDB();

//security middleware
app.use(express.json());
app.use(cors());
app.use(helmet());

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

//DDOS rate limiter for general use
const rateLimiter = new RateLimiterRedis({
  storeClient: redisClient,
  keyPrefix: "middleware",
  points: 10,
  duration: 1,
  blockDuration: 15 * 60,
});

app.use(async function (req, res, next) {
  try {
    await rateLimiter.consume(req.ip);
    next();
  } catch (error) {
    logger.warn(`Rate limit exceeded for IP :${req.ip}`);
    return res.status(429).json({
      success: false,
      message: "Too many request",
    });
  }
});

// Sensitive Endpoint Rate Limiter
const sensitiveEndpointRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Max requests per IP per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Sensitive endpoint rate limit exceeded for IP: ${req.ip}`);
    return res.status(429).json({
      success: false,
      message: "Too many requests",
    });
  },
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
});

app.use("/api/auth/register", sensitiveEndpointRateLimiter);

app.use("/api/auth", sensitiveEndpointRateLimiter, authRoutes);

app.use(errorHandler);
const PORT = process.env.PORT || 3001;

const startServer = async () => {
  app.listen(PORT, () => {
    logger.info(`Server is running on port ${PORT}`);
  });
};

startServer();
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at Promise:", promise, "Reason:", reason);
});
