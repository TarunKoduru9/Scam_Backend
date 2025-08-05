const express = require("express");
const router = express.Router();
const { getEmergencyMessages, createEmergencyMessage, deleteEmergencyMessage } = require("../../controllers/admin/emergencyNotificationController");
const authorize = require("../../middleware/authorize");

router.get("/emergency-messages", authorize("admin"), getEmergencyMessages);
router.post("/emergency-messages", authorize("admin"), createEmergencyMessage);
router.delete("/emergencynotification/:id", authorize("admin"), deleteEmergencyMessage);

module.exports = router;
