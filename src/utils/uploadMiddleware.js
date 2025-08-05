const multer = require("multer");
const path = require("path");

const coverStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/users/cover");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, name);
  },
});

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/users/profile");
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${file.fieldname}${ext}`;
    cb(null, name);
  },
});

const uploadProfile = multer({ storage: profileStorage });
const uploadCover = multer({ storage: coverStorage });
module.exports = { uploadCover, uploadProfile };
