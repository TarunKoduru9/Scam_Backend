const express = require("express");
const router = express.Router();
const profileController = require("../../controllers/users/profileController");
const authorize = require("../../middleware/authorize");
const { uploadCover, uploadProfile } = require("../../utils/uploadMiddleware");

router.get("/profile", authorize("user"), profileController.getUserProfile);
router.get("/profile/:id", authorize("user"), profileController.getAnyUserProfile);


router.put(
  "/update-profile",
  authorize("user"),
  profileController.updateProfile
);
router.post(
  "/upload-profile",
  authorize("user"),
  uploadProfile.single("image"),
  profileController.uploadProfileImage
);
router.post(
  "/upload-cover",
  authorize("user"),
  uploadCover.single("image"),
  profileController.uploadCoverImage
);

module.exports = router;
