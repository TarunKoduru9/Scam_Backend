const db = require("../../config/db");

exports.createComplaintController = async (req, res) => {
  const userId = req.user.id;
  const { text } = req.body;
  const files = req.files;

  try {
    // 1. Insert into complaints table
    const [result] = await db.execute(
      "INSERT INTO complaints (user_id, text) VALUES (?, ?)",
      [userId, text || null]
    );

    const complaintId = result.insertId;

    // 2. Insert uploaded files into complaint_files
    const fileInserts = files.map((file) => {
      let type = "other";
      if (file.mimetype.startsWith("image/")) type = "image";
      else if (file.mimetype.startsWith("audio/")) type = "audio";
      else if (file.mimetype.startsWith("video/")) type = "video";
      else if (file.mimetype.startsWith("application/")) type = "document";

      return db.execute(
        "INSERT INTO complaint_files (complaint_id, file_url, file_type) VALUES (?, ?, ?)",
        [complaintId, file.path, type]
      );
    });

    await Promise.all(fileInserts);

    // For followers — notify them of new post
    const [followers] = await db.query(
      `SELECT follower_id FROM followers WHERE following_id = ?`,
      [userId]
    );

    const insertNotifs = followers.map((f) =>
      db.query(
        `INSERT INTO notifications (type, sender_id, receiver_id, complaint_id)
     VALUES ('new_post', ?, ?, ?)`,
        [userId, f.follower_id, complaintId]
      )
    );
    await Promise.all(insertNotifs);

    // Add "own_post" notification so user's own posts show up too
    await db.query(
      `INSERT INTO notifications (type, sender_id, receiver_id, complaint_id)
   VALUES ('own_post', ?, ?, ?)`,
      [userId, userId, complaintId]
    );

    res.status(201).json({
      success: true,
      message: "Complaint posted successfully",
      complaintId,
    });
  } catch (err) {
    console.error("Error creating complaint:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.updateComplaintController = async (req, res) => {
  const userId = req.user.id;
  const complaintId = req.params.id;
  const { text } = req.body;
  const files = req.files;

  try {
    //  Update only text — don’t touch files
    await db.execute(
      "UPDATE complaints SET text = ? WHERE id = ? AND user_id = ?",
      [text, complaintId, userId]
    );

    // Insert any new files (don't delete old ones)
    if (files && files.length > 0) {
      const fileInserts = files.map((file) => {
        let type = "other";
        if (file.mimetype.startsWith("image/")) type = "image";
        else if (file.mimetype.startsWith("audio/")) type = "audio";
        else if (file.mimetype.startsWith("video/")) type = "video";
        else if (file.mimetype.startsWith("application/")) type = "document";

        return db.execute(
          "INSERT INTO complaint_files (complaint_id, file_url, file_type) VALUES (?, ?, ?)",
          [complaintId, file.path, type]
        );
      });

      await Promise.all(fileInserts);
    }

    res.json({ success: true, message: "Complaint updated" });
  } catch (err) {
    console.error("Update error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.complaintsfeed = async (req, res) => {
  const userId = req.user.id;

  try {
    const [complaints] = await db.query(
      `
      SELECT * FROM (
        SELECT 
          c.id AS complaint_id,
          c.text AS text_content,
          c.created_at AS created_at,
          u.id AS user_id,
          u.first_name,
          u.last_name,
          u.username,
          u.profile_image_url,
          (SELECT COUNT(*) FROM likes WHERE complaint_id = c.id) AS likes,
          (SELECT COUNT(*) FROM comments WHERE complaint_id = c.id) AS comments,
          (SELECT COUNT(*) FROM reposts WHERE complaint_id = c.id) AS reposts,
          EXISTS(SELECT 1 FROM likes WHERE complaint_id = c.id AND user_id = ?) AS liked,
          EXISTS(SELECT 1 FROM saves WHERE complaint_id = c.id AND user_id = ?) AS saved,
          EXISTS(SELECT 1 FROM reposts WHERE complaint_id = c.id AND user_id = ?) AS reposted,
          EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) AS is_following,
          NULL AS reposted_by_user_id,
          NULL AS reposted_at
        FROM complaints c
        JOIN users u ON c.user_id = u.id
        WHERE u.id != ?

        UNION

        SELECT 
          c.id AS complaint_id,
          c.text AS text_content,
          r.created_at AS created_at,
          u.id AS user_id,
          u.first_name,
          u.last_name,
          u.username,
          u.profile_image_url,
          (SELECT COUNT(*) FROM likes WHERE complaint_id = c.id) AS likes,
          (SELECT COUNT(*) FROM comments WHERE complaint_id = c.id) AS comments,
          (SELECT COUNT(*) FROM reposts WHERE complaint_id = c.id) AS reposts,
          EXISTS(SELECT 1 FROM likes WHERE complaint_id = c.id AND user_id = ?) AS liked,
          EXISTS(SELECT 1 FROM saves WHERE complaint_id = c.id AND user_id = ?) AS saved,
          EXISTS(SELECT 1 FROM reposts WHERE complaint_id = c.id AND user_id = ?) AS reposted,
          EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) AS is_following,
          r.user_id AS reposted_by_user_id,
          r.created_at AS reposted_at
        FROM reposts r
        JOIN complaints c ON r.complaint_id = c.id
        JOIN users u ON c.user_id = u.id
        WHERE r.user_id != ?
      ) AS combined_feed
      ORDER BY created_at DESC
      `,
      [
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
      ]
    );

    const complaintIds = complaints.map((c) => c.complaint_id);
    const [files] = await db.query(
      `SELECT complaint_id, file_url, file_type FROM complaint_files WHERE complaint_id IN (?)`,
      [complaintIds.length ? complaintIds : [0]]
    );

    const grouped = complaints.map((c, index) => ({
      id: `${c.complaint_id}-${c.reposted_by_user_id || "own"}-${index}`,
      text_content: c.text_content,
      created_at: c.reposted_at || c.created_at,
      likes: c.likes,
      comments: c.comments,
      reposts: c.reposts,
      liked: !!c.liked,
      saved: !!c.saved,
      reposted: !!c.reposted,
      reposted_by_user_id: c.reposted_by_user_id,
      user: {
        id: c.user_id,
        first_name: c.first_name,
        last_name: c.last_name,
        username: c.username,
        profile_image_url: c.profile_image_url,
        is_following: !!c.is_following,
      },
      files: files
        .filter((f) => f.complaint_id === c.complaint_id)
        .map((f) => ({
          ...f,
          file_url: "/" + f.file_url.replace(/\\/g, "/"),
        })),
    }));

    res.json(grouped);
  } catch (err) {
    console.error("Feed error:", err);
    res.status(500).json({ error: "Failed to load feed" });
  }
};

exports.myComplaintsFeed = async (req, res) => {
  const userId = req.user.id;

  try {
    const [complaints] = await db.query(
      `
      SELECT 
        c.id AS complaint_id, c.text AS text_content, c.created_at,
        u.id AS user_id, u.first_name, u.last_name, u.username, u.profile_image_url,
        (SELECT COUNT(*) FROM likes WHERE complaint_id = c.id) AS likes,
        (SELECT COUNT(*) FROM comments WHERE complaint_id = c.id) AS comments,
        (SELECT COUNT(*) FROM reposts WHERE complaint_id = c.id) AS reposts,
        EXISTS(SELECT 1 FROM likes WHERE complaint_id = c.id AND user_id = ?) AS liked,
        EXISTS(SELECT 1 FROM saves WHERE complaint_id = c.id AND user_id = ?) AS saved,
        EXISTS(SELECT 1 FROM reposts WHERE complaint_id = c.id AND user_id = ?) AS reposted,
        EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) AS is_following,
        NULL AS reposted_by_user_id,
        NULL AS reposted_at
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ?

      UNION

      SELECT 
        c.id AS complaint_id, c.text AS text_content, r.created_at AS created_at,
        u.id AS user_id, u.first_name, u.last_name, u.username, u.profile_image_url,
        (SELECT COUNT(*) FROM likes WHERE complaint_id = c.id) AS likes,
        (SELECT COUNT(*) FROM comments WHERE complaint_id = c.id) AS comments,
        (SELECT COUNT(*) FROM reposts WHERE complaint_id = c.id) AS reposts,
        EXISTS(SELECT 1 FROM likes WHERE complaint_id = c.id AND user_id = ?) AS liked,
        EXISTS(SELECT 1 FROM saves WHERE complaint_id = c.id AND user_id = ?) AS saved,
        EXISTS(SELECT 1 FROM reposts WHERE complaint_id = c.id AND user_id = ?) AS reposted,
        EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) AS is_following,
        r.user_id AS reposted_by_user_id,
        r.created_at AS reposted_at
      FROM reposts r
      JOIN complaints c ON r.complaint_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE r.user_id = ?

      ORDER BY created_at DESC
      `,
      [
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
        userId,
      ]
    );

    const complaintIds = complaints.map((c) => c.complaint_id);
    const [files] = await db.query(
      `SELECT complaint_id, file_url, file_type FROM complaint_files WHERE complaint_id IN (?)`,
      [complaintIds.length ? complaintIds : [0]]
    );

    const grouped = complaints.map((c, index) => ({
      id: `${c.complaint_id}-${c.reposted_by_user_id || "own"}-${index}`,
      text_content: c.text_content,
      created_at: c.reposted_at || c.created_at,
      likes: c.likes,
      comments: c.comments,
      reposts: c.reposts,
      liked: !!c.liked,
      saved: !!c.saved,
      reposted: !!c.reposted,
      reposted_by_user_id: c.reposted_by_user_id,
      user: {
        id: c.user_id,
        first_name: c.first_name,
        last_name: c.last_name,
        username: c.username,
        profile_image_url: c.profile_image_url,
        is_following: !!c.is_following,
      },
      files: files
        .filter((f) => f.complaint_id === c.complaint_id)
        .map((f) => ({
          ...f,
          file_url: "/" + f.file_url.replace(/\\/g, "/"),
        })),
    }));

    res.json(grouped);
  } catch (err) {
    console.error("My complaints error:", err);
    res.status(500).json({ error: "Failed to load your complaints" });
  }
};

exports.complaintsfeedByUser = async (req, res) => {
  const viewerId = req.user.id;
  const targetUserId = req.query.user_id;

  if (!targetUserId) {
    return res.status(400).json({ error: "Missing user_id" });
  }

  try {
    const [complaints] = await db.query(
      `
      SELECT c.id AS complaint_id, c.text AS text_content, c.created_at,
             u.id AS user_id, u.first_name, u.last_name, u.username, u.profile_image_url,
             (SELECT COUNT(*) FROM likes WHERE complaint_id = c.id) AS likes,
             (SELECT COUNT(*) FROM comments WHERE complaint_id = c.id) AS comments,
             (SELECT COUNT(*) FROM reposts WHERE complaint_id = c.id) AS reposts,
             EXISTS(SELECT 1 FROM likes WHERE complaint_id = c.id AND user_id = ?) AS liked,
             EXISTS(SELECT 1 FROM saves WHERE complaint_id = c.id AND user_id = ?) AS saved,
             EXISTS(SELECT 1 FROM reposts WHERE complaint_id = c.id AND user_id = ?) AS reposted,
             EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) AS is_following,
             NULL AS reposted_by_user_id,
             NULL AS reposted_at
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ?

      UNION

      SELECT c.id AS complaint_id, c.text AS text_content, r.created_at AS created_at,
             u.id AS user_id, u.first_name, u.last_name, u.username, u.profile_image_url,
             (SELECT COUNT(*) FROM likes WHERE complaint_id = c.id) AS likes,
             (SELECT COUNT(*) FROM comments WHERE complaint_id = c.id) AS comments,
             (SELECT COUNT(*) FROM reposts WHERE complaint_id = c.id) AS reposts,
             EXISTS(SELECT 1 FROM likes WHERE complaint_id = c.id AND user_id = ?) AS liked,
             EXISTS(SELECT 1 FROM saves WHERE complaint_id = c.id AND user_id = ?) AS saved,
             EXISTS(SELECT 1 FROM reposts WHERE complaint_id = c.id AND user_id = ?) AS reposted,
             EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) AS is_following,
             r.user_id AS reposted_by_user_id,
             r.created_at AS reposted_at
      FROM reposts r
      JOIN complaints c ON r.complaint_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE r.user_id = ?

      ORDER BY created_at DESC
      `,
      [
        viewerId,
        viewerId,
        viewerId,
        viewerId,
        targetUserId,
        viewerId,
        viewerId,
        viewerId,
        viewerId,
        targetUserId,
      ]
    );

    const complaintIds = complaints.map((c) => c.complaint_id);
    const [files] = await db.query(
      `SELECT complaint_id, file_url, file_type FROM complaint_files WHERE complaint_id IN (?)`,
      [complaintIds.length ? complaintIds : [0]]
    );

    const grouped = complaints.map((c, index) => ({
      id: `${c.complaint_id}-${c.reposted_by_user_id || "own"}-${index}`,
      text_content: c.text_content,
      created_at: c.reposted_at || c.created_at,
      likes: c.likes,
      comments: c.comments,
      reposts: c.reposts,
      liked: !!c.liked,
      saved: !!c.saved,
      reposted: !!c.reposted,
      reposted_by_user_id: c.reposted_by_user_id,
      user: {
        id: c.user_id,
        first_name: c.first_name,
        last_name: c.last_name,
        username: c.username,
        profile_image_url: c.profile_image_url,
        is_following: !!c.is_following,
      },
      files: files
        .filter((f) => f.complaint_id === c.complaint_id)
        .map((f) => ({
          ...f,
          file_url: "/" + f.file_url.replace(/\\/g, "/"),
        })),
    }));

    res.json(grouped);
  } catch (err) {
    console.error("Error loading user complaints:", err);
    res.status(500).json({ error: "Failed to load user complaints" });
  }
};

exports.getComplaintById = async (req, res) => {
  const userId = req.user.id;
  const complaintId = req.params.id;

  try {
    const [[post]] = await db.query(
      `
  SELECT c.id AS complaint_id, c.text AS text_content, c.created_at,
         u.id AS user_id, u.first_name, u.last_name, u.username, u.profile_image_url,
         (SELECT COUNT(*) FROM likes WHERE complaint_id = c.id) AS likes,
         (SELECT COUNT(*) FROM comments WHERE complaint_id = c.id) AS comments,
         (SELECT COUNT(*) FROM reposts WHERE complaint_id = c.id) AS reposts,
         EXISTS(SELECT 1 FROM likes WHERE complaint_id = c.id AND user_id = ?) AS liked,
         EXISTS(SELECT 1 FROM saves WHERE complaint_id = c.id AND user_id = ?) AS saved,
         EXISTS(SELECT 1 FROM reposts WHERE complaint_id = c.id AND user_id = ?) AS reposted,
         EXISTS(SELECT 1 FROM followers WHERE follower_id = ? AND following_id = u.id) AS is_following
  FROM complaints c
  JOIN users u ON c.user_id = u.id
  WHERE c.id = ?
  `,
      [userId, userId, userId, userId, complaintId]
    );

    if (!post) {
      return res.status(404).json({ message: "Complaint not found" });
    }

    const [files] = await db.query(
      `SELECT complaint_id, file_url, file_type FROM complaint_files WHERE complaint_id = ?`,
      [complaintId]
    );

    const result = {
      id: post.complaint_id,
      text_content: post.text_content,
      created_at: post.created_at,
      likes: post.likes,
      comments: post.comments,
      reposts: post.reposts,
      liked: !!post.liked,
      saved: !!post.saved,
      reposted: !!post.reposted,
      reposted_by_user_id: null,
      user: {
        id: post.user_id,
        first_name: post.first_name,
        last_name: post.last_name,
        username: post.username,
        profile_image_url: post.profile_image_url,
        is_following: !!post.is_following,
      },
      files: files.map((f) => ({
        ...f,
        file_url: "/" + f.file_url.replace(/\\/g, "/"),
      })),
    };

    res.json(result);
  } catch (err) {
    console.error("Fetch post by ID error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.deleteComplaintController = async (req, res) => {
  const userId = req.user.id;
  const rawId = req.params.id;

  const [baseId] = rawId.split("-");

  try {
    // Try deleting repost first
    const [repostResult] = await db.query(
      "DELETE FROM reposts WHERE complaint_id = ? AND user_id = ?",
      [baseId, userId]
    );

    if (repostResult.affectedRows > 0) {
      return res.json({ message: "Repost deleted successfully" });
    }

    // If not a repost, try deleting as original post
    const [result] = await db.query(
      "DELETE FROM complaints WHERE id = ? AND user_id = ?",
      [baseId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(403).json({ message: "Unauthorized or not found" });
    }

    res.json({ message: "Complaint deleted successfully" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getLikedComplaint = async (req, res) => {
  const userId = req.user.id;

  try {
    const [likedPosts] = await db.query(
      `
      SELECT c.id AS complaint_id, c.text AS text_content, c.created_at,
             u.id AS user_id, u.first_name, u.last_name, u.username, u.profile_image_url,
             (SELECT COUNT(*) FROM likes WHERE complaint_id = c.id) AS likes,
             (SELECT COUNT(*) FROM comments WHERE complaint_id = c.id) AS comments,
             (SELECT COUNT(*) FROM reposts WHERE complaint_id = c.id) AS reposts,
             EXISTS(SELECT 1 FROM likes WHERE complaint_id = c.id AND user_id = ?) AS liked,
             EXISTS(SELECT 1 FROM saves WHERE complaint_id = c.id AND user_id = ?) AS saved,
             EXISTS(SELECT 1 FROM reposts WHERE complaint_id = c.id AND user_id = ?) AS reposted,
             EXISTS(
               SELECT 1 FROM followers
               WHERE follower_id = ? AND following_id = u.id
             ) AS is_following
      FROM complaints c
      JOIN likes l ON l.complaint_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE l.user_id = ? AND c.user_id != ?
      ORDER BY c.created_at DESC
      `,
      [userId, userId, userId, userId, userId, userId, userId]
    );

    const complaintIds = likedPosts.map((c) => c.complaint_id);
    const [files] = await db.query(
      `SELECT complaint_id, file_url, file_type FROM complaint_files WHERE complaint_id IN (?)`,
      [complaintIds.length ? complaintIds : [0]]
    );

    const grouped = likedPosts.map((c) => ({
      id: c.complaint_id,
      text_content: c.text_content,
      created_at: c.created_at,
      likes: c.likes,
      comments: c.comments,
      reposts: c.reposts,
      liked: !!c.liked,
      saved: !!c.saved,
      reposted: !!c.reposted,
      user: {
        id: c.user_id,
        first_name: c.first_name,
        last_name: c.last_name,
        username: c.username,
        profile_image_url: c.profile_image_url,
        is_following: !!c.is_following,
      },
      files: files
        .filter((f) => f.complaint_id === c.complaint_id)
        .map((f) => ({
          ...f,
          file_url: "/" + f.file_url.replace(/\\/g, "/"),
        })),
    }));

    res.json(grouped);
  } catch (err) {
    console.error("Error fetching liked posts:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.getSavedComplaint = async (req, res) => {
  const userId = req.user.id;

  try {
    const [SavedPosts] = await db.query(
      `
      SELECT c.id AS complaint_id, c.text AS text_content, c.created_at,
             u.id AS user_id, u.first_name, u.last_name, u.username, u.profile_image_url,
             (SELECT COUNT(*) FROM likes WHERE complaint_id = c.id) AS likes,
             (SELECT COUNT(*) FROM comments WHERE complaint_id = c.id) AS comments,
             (SELECT COUNT(*) FROM reposts WHERE complaint_id = c.id) AS reposts,
             EXISTS(SELECT 1 FROM likes WHERE complaint_id = c.id AND user_id = ?) AS liked,
             EXISTS(SELECT 1 FROM saves WHERE complaint_id = c.id AND user_id = ?) AS saved,
             EXISTS(SELECT 1 FROM reposts WHERE complaint_id = c.id AND user_id = ?) AS reposted,
             EXISTS(
               SELECT 1 FROM followers
               WHERE follower_id = ? AND following_id = u.id
             ) AS is_following
      FROM complaints c
      JOIN saves l ON l.complaint_id = c.id
      JOIN users u ON c.user_id = u.id
      WHERE l.user_id = ? AND c.user_id != ?
      ORDER BY c.created_at DESC
      `,
      [userId, userId, userId, userId, userId, userId, userId]
    );

    const complaintIds = SavedPosts.map((c) => c.complaint_id);
    const [files] = await db.query(
      `SELECT complaint_id, file_url, file_type FROM complaint_files WHERE complaint_id IN (?)`,
      [complaintIds.length ? complaintIds : [0]]
    );

    const grouped = SavedPosts.map((c) => ({
      id: c.complaint_id,
      text_content: c.text_content,
      created_at: c.created_at,
      likes: c.likes,
      comments: c.comments,
      reposts: c.reposts,
      liked: !!c.liked,
      saved: !!c.saved,
      reposted: !!c.reposted,
      user: {
        id: c.user_id,
        first_name: c.first_name,
        last_name: c.last_name,
        username: c.username,
        profile_image_url: c.profile_image_url,
        is_following: !!c.is_following,
      },
      files: files
        .filter((f) => f.complaint_id === c.complaint_id)
        .map((f) => ({
          ...f,
          file_url: "/" + f.file_url.replace(/\\/g, "/"),
        })),
    }));

    res.json(grouped);
  } catch (err) {
    console.error("Error fetching saved posts:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

