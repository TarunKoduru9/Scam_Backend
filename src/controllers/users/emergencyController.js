const db = require("../../config/db");

exports.createEmergencyController = async (req, res) => {
  const userId = req.user.id;
  const { text } = req.body;
  const files = req.files;

  try {
    // 1. Insert into complaints table
    const [result] = await db.execute(
      "INSERT INTO emergency (user_id, text) VALUES (?, ?)",
      [userId, text || null]
    );

    const emergencyId = result.insertId;

    // 2. Insert uploaded files into emergency_files
    const fileInserts = files.map((file) => {
      let type = "other";
      if (file.mimetype.startsWith("image/")) type = "image";
      else if (file.mimetype.startsWith("audio/")) type = "audio";
      else if (file.mimetype.startsWith("video/")) type = "video";
      else if (file.mimetype.startsWith("application/")) type = "document";

      return db.execute(
        "INSERT INTO emergency_files (emergency_id, file_url, file_type) VALUES (?, ?, ?)",
        [emergencyId, file.path, type]
      );
    });

    await Promise.all(fileInserts);

    res.status(201).json({
      success: true,
      message: "Emergency Complaint posted successfully",
      emergencyId,
    });
  } catch (err) {
    console.error("Error creating complaint:", err);
    res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};

exports.getEmergenciesByStatus = async (req, res) => {
  const userId = req.user.id;
  const status = req.query.status || 'pending';

  try {
    const [rows] = await db.query(
      `
      SELECT 
        e.id AS emergency_id,
        e.text,
        e.status,
        e.created_at,
        f.file_url,
        f.file_type
      FROM emergency e
      LEFT JOIN emergency_files f ON e.id = f.emergency_id
      WHERE e.user_id = ? AND e.status = ?
      ORDER BY e.created_at DESC
      `,
      [userId, status]
    );

    // Group files under each emergency
    const grouped = {};
    rows.forEach(row => {
      const id = row.emergency_id;
      if (!grouped[id]) {
        grouped[id] = {
          id,
          text: row.text,
          status: row.status,
          created_at: row.created_at,
          files: [],
        };
      }

      if (row.file_url && row.file_type) {
        grouped[id].files.push({
          file_url: row.file_url,
          file_type: row.file_type,
        });
      }
    });

    res.json({ success: true, data: Object.values(grouped) });

  } catch (err) {
    console.error("Fetch emergency error:", err);
    res.status(500).json({ message: "Could not fetch emergencies" });
  }
};

