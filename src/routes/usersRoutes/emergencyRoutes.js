const express = require("express");
const router = express.Router();
const {
  createEmergencyController,
  getEmergenciesByStatus,
} = require("../../controllers/users/emergencyController");
const uploadComplaintFiles = require("../../utils/complaintUpload");
const authorize = require("../../middleware/authorize");

router.post(
  "/emergency",
  authorize("user"),
  uploadComplaintFiles.array("files", 5),
  createEmergencyController
);

router.get("/emergencies", authorize("user"), getEmergenciesByStatus);

module.exports = router;
