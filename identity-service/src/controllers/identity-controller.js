const { validateRegisteration, validateLogin } = require("../utils/validation");
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
    const profilePicture = `https://api.dicebear.com/7.x/fun-emoji/svg?seed=${username}
`;

    user = new User({ email, username, password, profilePicture });
    await user.save();

    const { accessToken } = await generateToken(user);
    logger.info(`User registered successfully`);

    return res.status(201).json({
      user: {
        username: user?.username,
        email: user?.email,
        profilePicture: user?.profilePicture,
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
    });
  }
};

const loginUser = async (req, res) => {
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      logger.warn(error.details[0].message);
      return res.status(400).json({
        message: `Error ${error.details[0].message}`,
        success: false,
      });
    }

    const { email, password } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      logger.info(`User does not exist, try registering with details`);
      return res.status(400).json({
        message: "User does not exist",
        success: false,
      });
    }

    const validPassword = await user.comparePassword(password);

    if (!validPassword) {
      logger.info(`Incorrect password, try again!`);
      return res.status(400).json({
        success: false,
        message: "Incorrect Password, try again",
      });
    }

    const { accessToken } = await generateToken(user);
    logger.info("User logged in successfully");
    return res.status(200).json({
      data: {
        user: user.username,
        email: user.email,
        profilePicture: user.profilePicture,
      },
      message: "User logged in successfully",
      success: true,
      accessToken,
    });
  } catch (error) {
    logger.error(`Error occurred while trying to login user ${error}`);
    return res.status(500).json({
      success: false,
      message: "Internal server Error",
    });
  }
};

const getUserBulk = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !ids.length) {
      return res
        .status(400)
        .json({ success: false, message: "No IDs provided" });
    }
    const users = await User.find({ _id: { $in: ids } }).select(
      "username profilePicture"
    );

    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Error fetching users" });
  }
};

module.exports = { registerUser, loginUser, getUserBulk };
