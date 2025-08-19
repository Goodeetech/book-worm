const express = require("express");
const {
  registerUser,
  loginUser,
  getUserBulk,
} = require("../controllers/identity-controller");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/users/bulk", getUserBulk);

module.exports = router;
