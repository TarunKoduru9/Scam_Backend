const express = require("express");
const router = express.Router();
const db = require("../../config/db");
const authorize = require("../../middleware/authorize");

router.get("/marquee", authorize("user"), async (req, res) => {
  try {
    const [rows] = await db.query("SELECT text FROM emergencynotification ORDER BY id DESC LIMIT 1");

    if (!rows.length) {
      return res.status(404).json({ message: "No emergency notification found." });
    }

    res.set("Cache-Control", "no-store"); 
    res.json({ message: rows[0].text });
  } catch (err) {
    console.error("Emergency fetch error:", err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
