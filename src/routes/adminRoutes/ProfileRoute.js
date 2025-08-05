const db = require("../../config/db");
const express = require("express");
const router = express.Router();
const authorize = require("../../middleware/authorize");

router.get("/profile", authorize("admin"), async (req, res) => {
  try {
    const userId = req.user.id;
    const [rows] = await db.query(
      "SELECT username, profile_image_url FROM users WHERE id = ?",
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];
    if (user.profile_image_url) {
      const cleanPath = user.profile_image_url
        .replace(/\\/g, "/")
        .replace(/^\/+/, "");
      user.profile_image_url = `${req.protocol}://${req.get(
        "host"
      )}/${cleanPath}`;
    }

    res.json(user);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
