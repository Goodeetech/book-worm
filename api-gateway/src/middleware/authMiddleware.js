const jwt = require("jsonwebtoken");

const validateToken = (req, res, next) => {
  try {
    const authHeader = req.headers["authorization"];

    if (!authHeader) {
      logger.warn("No authentication token provided");
      return res.status(401).json({
        message: "Access denied, authentication required",
        success: false,
      });
    }

    const token = authHeader && authHeader.split(" ")[1];

    if (!token) {
      logger.warn("Token missing in authorization header");
      return res.status(401).json({
        message: "Access denied, authentication required",
        success: false,
      });
    }

    // jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    //   if (err) {
    //     logger.warn(`Invalid authentication, access denied`);

    //     return res.status(400).json({
    //       message: "Access denied, authentication required",
    //       success: false,
    //     });
    //   }
    //   req.user = user;
    //   next();
    // });

    const user = jwt.verify(token, process.env.JWT_SECRET);
    req.user = user;
    next();
  } catch (error) {
    logger.error(`Invalid or expired token: ${error}`);
    return res.status(401).json({
      success: false,
      message: "invalid or expired token",
    });
  }
};

module.exports = validateToken;
