const express = require("express");
const router = express.Router();
const authController = require("../../controllers/users/authController");

router.post("/signup", authController.signup);
router.post("/verify-otp", authController.verifyOtp);
router.post("/resend-otp", authController.resendOtp);
router.post("/login", authController.login);
router.post("/verify-otp-login", authController.verifyOtpLogin);
router.post("/reset-password", authController.resetPassword);

module.exports = router;
