const express = require("express");
const router = express.Router();
const authorize = require("../../middleware/authorize");

const searchController = require("../../controllers/users/searchController");

router.get("/search-users", authorize("user"), searchController.searchUsers);
router.get("/explore-users", authorize("user"), searchController.exploreUsers);

module.exports = router;
