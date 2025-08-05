const express = require("express");
const router = express.Router();
const { getDashboardCounts } = require("../../controllers/admin/dashboardController");
const authorize = require("../../middleware/authorize");


router.get("/dashboard/counts", authorize("admin"), getDashboardCounts);

module.exports = router;
