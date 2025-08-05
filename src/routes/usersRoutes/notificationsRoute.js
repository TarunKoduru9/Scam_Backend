const express = require("express");
const authorize = require("../../middleware/authorize");
const notificationsCtrl = require("../../controllers/users/notificationsController");

const router = express.Router();

router.get(
  "/notifications-feed",
  authorize("user"),
  notificationsCtrl.getNotifications
);

router.patch(
  "/notifications/:id/read",
  authorize("user"),
  notificationsCtrl.markNotificationAsRead
);

router.post(
  "/notifications-read-all",
  authorize("user"),
  notificationsCtrl.markAllNotificationsRead
);

module.exports = router;
