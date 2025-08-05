const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Helper to create folder if not exists
const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
};

// Multer storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = "uploads/complaints/others/";

    if (file.mimetype.startsWith("image/")) {
      folder = "uploads/complaints/images/";
    } else if (file.mimetype.startsWith("audio/")) {
      folder = "uploads/complaints/audios/";
    } else if (file.mimetype.startsWith("video/")) {
      folder = "uploads/complaints/videos/";
    } else if (
      file.mimetype === "application/pdf" ||
      file.mimetype === "application/msword" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype.startsWith("application/")
    ) {
      folder = "uploads/complaints/documents/";
    }

    ensureDir(folder);
    cb(null, folder);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const baseName = path.basename(file.originalname, ext);
    const safeName = baseName.replace(/[^a-z0-9_\-]/gi, "_");
    const timestamp = Date.now();
    const finalName = `${safeName}-${timestamp}${ext}`;
    cb(null, finalName);
  },
});

const uploadComplaintFiles = multer({ storage });

module.exports = uploadComplaintFiles;
