const db = require("../../config/db");

function timeAgo(date) {
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / (24 * 3600000));

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;

  return date.toLocaleDateString();
}

exports.getNotifications = async (req, res) => {
  const userId = req.user.id;
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;

  try {
    const [notifications] = await db.query(
      `
      SELECT n.id, n.type, n.created_at, n.seen,
             u.id AS sender_id, u.first_name, u.last_name, u.username, u.profile_image_url,
             c.id AS complaint_id, c.text AS complaint_text,
             (SELECT file_url FROM complaint_files WHERE complaint_id = c.id LIMIT 1) AS file
      FROM notifications n
      LEFT JOIN users u ON u.id = n.sender_id
      LEFT JOIN complaints c ON c.id = n.complaint_id
      WHERE n.receiver_id = ?
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [userId, limit, offset]
    );

    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const midnight = new Date();
    midnight.setHours(0, 0, 0, 0);

    const grouped = { new: [], today: [], earlier: [] };

    for (const n of notifications) {
      const created = new Date(n.created_at);
      const isSelf = n.sender_id === userId;

      const item = {
        id: n.id,
        type: n.type,
        seen: !!n.seen,
        created_at: n.created_at,
        time_ago: timeAgo(created),
        user: {
          id: n.sender_id,
          first_name: isSelf ? "You" : n.first_name,
          last_name: isSelf ? "" : n.last_name,
          username: n.username,
          profile_image_url: n.profile_image_url,
        },
        complaint: {
          id: n.complaint_id,
          text: n.complaint_text,
          file: n.file,
        },
      };

      if (created > oneHourAgo) grouped.new.push(item);
      else if (created >= midnight) grouped.today.push(item);
      else grouped.earlier.push(item);
    }

    res.json(grouped);
  } catch (err) {
    console.error("Notification fetch error:", err);
    res.status(500).json({ error: "Could not fetch notifications" });
  }
};

exports.markNotificationAsRead = async (req, res) => {
  const userId = req.user.id;
  const notificationId = req.params.id;

  try {
    const [result] = await db.query(
      `UPDATE notifications SET seen = 1 WHERE id = ? AND receiver_id = ?`,
      [notificationId, userId] 
    );

    if (result.affectedRows === 0) {
      return res
        .status(404)
        .json({ message: "Notification not found or not yours" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("Single mark read error:", err);
    res.status(500).json({ message: "Could not mark notification as read" });
  }
};


exports.markAllNotificationsRead = async (req, res) => {
  const userId = req.user.id;
  try {
    await db.query(`UPDATE notifications SET seen = 1 WHERE receiver_id = ?`, [
      userId,
    ]);
    res.json({ success: true, message: "Marked all notifications as read." });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ message: "Could not mark notifications as read" });
  }
};
