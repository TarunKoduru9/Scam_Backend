const db = require("../../config/db");
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcrypt");

exports.getUserProfile = async (req, res) => {
  try {
    const userId = req.user.id;

    const [rows] = await db.query(
      `
      SELECT u.id, u.first_name, u.last_name, u.username, u.email, u.bio,
             u.phone_code, u.phone_number, u.date_of_birth, u.role,
             u.profile_image_url, u.cover_image_url, u.created_at,
             (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) AS following,
             (SELECT COUNT(*) FROM followers WHERE following_id = u.id) AS followers
      FROM users u
      WHERE u.id = ?
      `,
      [userId]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "User not found" });
    }

    const user = rows[0];
    res.json({ user });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({ message: "Server error" });
  }
};

exports.getAnyUserProfile = async (req, res) => {
  const viewerId = req.user.id;
  const userId = req.params.id;

  try {
    const [rows] = await db.query(
      `
      SELECT u.id, u.first_name, u.last_name, u.username, u.bio,
             u.email, u.phone_code, u.phone_number, u.date_of_birth,
             u.role, u.profile_image_url, u.cover_image_url, u.created_at,
             (SELECT COUNT(*) FROM followers WHERE follower_id = u.id) AS following,
             (SELECT COUNT(*) FROM followers WHERE following_id = u.id) AS followers,
             EXISTS (
               SELECT 1 FROM followers 
               WHERE follower_id = ? AND following_id = u.id
             ) AS is_following
      FROM users u
      WHERE u.id = ?
      `,
      [viewerId, userId]
    );

    if (!rows.length)
      return res.status(404).json({ message: "User not found" });

    const user = rows[0];
    res.json({ user });
  } catch (err) {
    console.error("Error fetching profile:", err);
    res.status(500).json({ message: "Server error" });
  }
};
// Helper to delete old image
const deleteOldImage = (filePath) => {
  if (filePath && fs.existsSync(path.join(__dirname, "..", "..", filePath))) {
    fs.unlinkSync(path.join(__dirname, "..", "..", filePath));
  }
};

exports.uploadProfileImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const imagePath = `/uploads/users/profile/${req.file.filename}`;

    const [users] = await db.query(
      "SELECT profile_image_url FROM users WHERE id = ?",
      [userId]
    );
    if (users.length) deleteOldImage(users[0].profile_image_url);

    await db.query("UPDATE users SET profile_image_url = ? WHERE id = ?", [
      imagePath,
      userId,
    ]);

    res.json({ message: "Profile image updated", imageUrl: imagePath });
  } catch (err) {
    console.error("Upload profile error:", err);
    res.status(500).json({ message: "Upload failed" });
  }
};

exports.uploadCoverImage = async (req, res) => {
  try {
    const userId = req.user.id;
    const imagePath = `/uploads/users/cover/${req.file.filename}`;

    const [users] = await db.query(
      "SELECT cover_image_url FROM users WHERE id = ?",
      [userId]
    );
    if (users.length) deleteOldImage(users[0].cover_image_url);

    await db.query("UPDATE users SET cover_image_url = ? WHERE id = ?", [
      imagePath,
      userId,
    ]);

    res.json({ message: "Cover image updated", imageUrl: imagePath });
  } catch (err) {
    console.error("Upload cover error:", err);
    res.status(500).json({ message: "Upload failed" });
  }
};

exports.updateProfile = async (req, res) => {
  try {
    const { username, email, phone, password, bio } = req.body;
    const userId = req.user.id;

    const updates = [];
    const values = [];

    if (username) {
      updates.push("username = ?");
      values.push(username);
    }
    if (email) {
      updates.push("email = ?");
      values.push(email);
    }
    if (phone) {
      updates.push("phone_number = ?");
      values.push(phone);
    }
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      updates.push("password_hash = ?");
      values.push(hash);
    }

    if (bio) {
      updates.push("bio = ?");
      values.push(bio);
    }

    if (updates.length === 0) {
      return res.status(400).json({ message: "No data to update" });
    }

    values.push(userId);

    await db.query(
      `UPDATE users SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    res.json({ message: "Profile updated successfully" });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Update failed" });
  }
};
