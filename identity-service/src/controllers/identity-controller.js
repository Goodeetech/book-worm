const { validateRegisteration } = require("../utils/validation");
const User = require("../model/User");
const { generateToken } = require("../utils/generateToken");
const logger = require("../utils/logger");

const registerUser = async (req, res) => {
  try {
    const { error } = validateRegisteration(req.body);

    if (error) {
      logger.warn(error.details[0].message);
      return res.status(400).json({
        success: false,
        message: error.details[0].message,
      });
    }

    const { username, email, password } = req.body;

    let user = await User.findOne({ $or: [{ email }, { username }] });

    if (user) {
      logger.warn(`User already exist in the database`);
      return res.status(400).json({
        message: "User already exist with the credentials",
        success: false,
      });
    }

    user = new User({ email, username, password });
    await user.save();

    const { accessToken } = await generateToken(user);
    logger.info(`User registered successfully`);
    return res.status(201).json({
      user: {
        username: user?.username,
        email: user?.email,
      },
      success: true,
      message: "User registered successfully",
      accessToken,
    });
  } catch (error) {
    logger.error("Error during registration:", error);
    return res.status(500).json({
      success: false,
      message: "Server error occurred",
      error: error.message,
    });
  }
};

module.exports = { registerUser };
