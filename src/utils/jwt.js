const jwt = require("jsonwebtoken");
require("dotenv").config();

const generateAccessToken = (user) =>
  jwt.sign(
    { id: user.id, email: user.email, mobile: user.mobile, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );

const verifyAccessToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = {
  generateAccessToken,
  verifyAccessToken,
};
