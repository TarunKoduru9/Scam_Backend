const express = require("express");
const router = express.Router();
const {
  createComplaintController,
  myComplaintsFeed,
  deleteComplaintController,
  updateComplaintController,
} = require("../../controllers/admin/complaintController");
const uploadComplaintFiles = require("../../utils/complaintUpload");
const authorize = require("../../middleware/authorize");

router.post(
  "/complaints",
  authorize("admin"),
  uploadComplaintFiles.array("files", 5),
  createComplaintController
);
router.post(
  "/complaints/:id",
  authorize("admin"),
  uploadComplaintFiles.array("files", 5),
  updateComplaintController
);
router.get("/complaints/feed", authorize("admin"), myComplaintsFeed);
router.delete("/complaints/:id", authorize("admin"), deleteComplaintController);

module.exports = router;
