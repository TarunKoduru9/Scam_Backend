const express = require("express");
const router = express.Router();
const authController = require("../../controllers/admin/adminAuthController");
const authorize = require("../../middleware/authorize");
const db = require("../../config/db");
const bcrypt = require("bcrypt");


router.post("/signup", authController.signup);
router.post("/login", authController.login);

router.post("/change-password", authorize("admin"), async (req, res) => {
  const userId = req.user.id;
  const { oldPassword, newPassword, confirmPassword } = req.body;

  if (!oldPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "New passwords do not match" });
  }

  try {
    const [rows] = await db.query("SELECT password_hash FROM users WHERE id = ?", [userId]);
    const user = rows[0];

    if (!user || !(await bcrypt.compare(oldPassword, user.password_hash))) {
      return res.status(401).json({ message: "Old password is incorrect" });
    }

    const newHash = await bcrypt.hash(newPassword, 10);

    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, userId]);

    return res.json({ success: true, message: "Password changed successfully" });
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});



module.exports = router;
