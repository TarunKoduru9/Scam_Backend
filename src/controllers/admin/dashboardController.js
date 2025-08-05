const db = require("../../config/db");

exports.getDashboardCounts = async (req, res) => {
  try {
    const [[{ total_users }]] = await db.query("SELECT COUNT(*) AS total_users FROM users");
    const [[{ total_complaints }]] = await db.query("SELECT COUNT(*) AS total_complaints FROM complaints");

    res.json({
      users: total_users,
      complaints: total_complaints,
    });
  } catch (error) {
    console.error("Dashboard counts error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};
