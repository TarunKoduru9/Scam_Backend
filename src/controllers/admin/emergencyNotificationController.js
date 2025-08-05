const db = require("../../config/db");

exports.getEmergencyMessages = async (req, res) => {
  try {
    
    const [rows] = await db.query(
      "SELECT id, text, created_at FROM emergencynotification ORDER BY created_at DESC"
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.createEmergencyMessage = async (req, res) => {
  const { text } = req.body;
  if (!text) return res.status(400).json({ message: "Text is required" });

  try {
    await db.execute("INSERT INTO emergencynotification (text) VALUES (?)", [
      text,
    ]);
    res.status(201).json({ message: "Message saved" });
  } catch (err) {
    console.error("Insert error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.deleteEmergencyMessage = async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await db.execute(
      "DELETE FROM emergencynotification WHERE id = ?",
      [id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Message not found" });
    }
    res.status(200).json({ message: "Message deleted" });
  } catch (err) {
    console.error("Delete error:", err);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

