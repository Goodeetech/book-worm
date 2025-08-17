const logger = require("../utils/logger");

const authRequest = (req, res, next) => {
  logger.warn(`Started with the authentication`);

  const userId = req.headers["x-user-id"];

  if (!userId) {
    logger.warn(`Access attempted without the user Id`);
    return res.status(401).json({
      message: "Athentication required!, please login to continue",
      success: false,
    });
  }
  req.user = { userId };
  next();
};

module.exports = { authRequest };
