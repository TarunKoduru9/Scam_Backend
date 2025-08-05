const express = require("express");
const router = express.Router();
const { getUsers, myProfile } = require("../../controllers/admin/userController");

router.get("/users", getUsers);
router.get("/profile/:id",myProfile)

module.exports = router;
