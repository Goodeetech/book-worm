const jwt = require("jsonwebtoken");

const generateToken = async (user) => {
  const accessToken = jwt.sign(
    {
      userId: user?._id,
      username: user?.username,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "1d",
    }
  );
  return { accessToken };
};

module.exports = { generateToken };
