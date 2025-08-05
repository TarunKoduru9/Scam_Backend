const db = require("../../config/db");

exports.searchUsers = async (req, res) => {
  const { query } = req.query;
  const userId = req.user.id;

  try {
    const [results] = await db.query(
      `
      SELECT u.id, u.first_name, u.last_name, u.username, u.profile_image_url,
             EXISTS (
               SELECT 1 FROM followers f
               WHERE f.follower_id = ? AND f.following_id = u.id
             ) AS is_following
      FROM users u
      WHERE u.id != ? AND (
        LOWER(u.first_name) LIKE ? OR 
        LOWER(u.last_name) LIKE ? OR 
        LOWER(u.username) LIKE ?
      )
      LIMIT 20
      `,
      [userId, userId, `%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`, `%${query.toLowerCase()}%`]
    );

    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Search failed" });
  }
};

exports.exploreUsers = async (req, res) => {
  const userId = req.user.id;

  try {
    const [newUsers] = await db.query(
      `
      SELECT u.id, u.first_name, u.last_name, u.username, u.profile_image_url,
             EXISTS (
               SELECT 1 FROM followers f
               WHERE f.follower_id = ? AND f.following_id = u.id
             ) AS is_following
      FROM users u
      WHERE u.id != ?
      ORDER BY u.created_at DESC
      LIMIT 10
      `,
      [userId, userId]
    );

    const [recommendedUsers] = await db.query(
      `
      SELECT u.id, u.first_name, u.last_name, u.username, u.profile_image_url,
             EXISTS (
               SELECT 1 FROM followers f
               WHERE f.follower_id = ? AND f.following_id = u.id
             ) AS is_following
      FROM users u
      WHERE u.id != ?
      ORDER BY RAND()
      LIMIT 20
      `,
      [userId, userId]
    );

    res.json({ newUsers, recommendedUsers });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load explore users" });
  }
};
