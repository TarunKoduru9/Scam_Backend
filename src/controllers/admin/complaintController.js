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
  const { text: text_content } = req.body;
  const files = req.files;

  try {
    // ✅ Update only text — don’t touch files
    await db.execute(
      "UPDATE complaints SET text = ? WHERE id = ? AND user_id = ?",
      [text_content, complaintId, userId]
    );

    // ✅ Insert any new files (don't delete old ones)
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

exports.myComplaintsFeed = async (req, res) => {
  const userId = req.user.id;

  try {
    const [complaints] = await db.query(
      `
      SELECT 
        c.id AS complaint_id,
        c.text AS text_content,
        c.created_at,
        u.id AS user_id,
        u.first_name,
        u.last_name,
        u.username,
        u.profile_image_url
      FROM complaints c
      JOIN users u ON c.user_id = u.id
      WHERE c.user_id = ?
      ORDER BY c.created_at DESC
      `,
      [userId]
    );
    const complaintIds = complaints.map((c) => c.complaint_id);
    const [files] = await db.query(
      `SELECT complaint_id, file_url, file_type FROM complaint_files WHERE complaint_id IN (?)`,
      [complaintIds.length ? complaintIds : [0]]
    );
    const grouped = complaints.map((c) => ({
      id: c.complaint_id,
      text_content: c.text_content,
      created_at: c.created_at,
      user: {
        id: c.user_id,
        first_name: c.first_name,
        last_name: c.last_name,
        username: c.username,
        profile_image_url: c.profile_image_url,
      },
      files: files
        .filter((f) => f.complaint_id === c.complaint_id)
        .map((f) => ({
          ...f,
          file_url: `${req.protocol}://${req.get("host")}/${f.file_url.replace(
            /\\/g,
            "/"
          )}`,
        })),
    }));

    res.json(grouped);
  } catch (err) {
    console.error("Admin complaints error:", err);
    res.status(500).json({ error: "Failed to load complaints" });
  }
};

exports.deleteComplaintController = async (req, res) => {
  const userId = req.user.id;
  const rawId = req.params.id;

  try {
    // If not a repost, try deleting as original post
    const [result] = await db.query(
      "DELETE FROM complaints WHERE id = ? AND user_id = ?",
      [rawId, userId]
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
