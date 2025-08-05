const db = require("../../config/db");

exports.getUsers = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        id AS userId,
        CONCAT(first_name, ' ', last_name) AS name,
        username AS designation,
        '' AS location,
        email,
        CONCAT(phone_code, ' ', phone_number) AS phoneNumber,
        DATE_FORMAT(created_at, '%Y-%m-%d') AS joiningDate,
        status
      FROM users
      WHERE role = 'user'
    `);
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};


exports.myProfile = async (req, res) => {
  try {
        const userId = req.params.id;

    const [rows] = await db.query(`
      SELECT 
        id AS userId,
        CONCAT(first_name, ' ', last_name) AS name,
        username AS designation,
        email,
        CONCAT(phone_code, ' ', phone_number) AS phoneNumber,
        DATE_FORMAT(created_at, '%Y-%m-%d') AS joiningDate,
        profile_image_url,
        status
      FROM users
      WHERE id = ?
    `, [userId]);
    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
};

