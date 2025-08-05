const express = require("express");
const router = express.Router();
const {
  createComplaintController,
  complaintsfeed,
  complaintsfeedByUser,
  myComplaintsFeed,
  deleteComplaintController,
  getLikedComplaint,
  updateComplaintController,
  getComplaintById,
  getSavedComplaint,
} = require("../../controllers/users/complaintController");
const uploadComplaintFiles = require("../../utils/complaintUpload");
const authorize = require("../../middleware/authorize");

router.post(
  "/complaints",
  authorize("user"),
  uploadComplaintFiles.array("files", 5),
  createComplaintController
);

router.put("/complaints/:id",authorize("user"), uploadComplaintFiles.array("files", 5), updateComplaintController);

router.get("/complaints-feed", authorize("user"), complaintsfeed);
router.get("/my-complaints", authorize("user"), myComplaintsFeed);
router.get("/complaints-by-user", authorize("user"), complaintsfeedByUser);
router.delete("/complaints/:id", authorize("user"), deleteComplaintController);
router.get("/complaints/:id", authorize("user"), getComplaintById);
router.get("/liked-posts", authorize("user"), getLikedComplaint);
router.get("/saved-posts", authorize("user"), getSavedComplaint);

module.exports = router;
