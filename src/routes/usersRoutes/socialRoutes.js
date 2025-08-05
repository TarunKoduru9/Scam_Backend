const express = require("express");
const router = express.Router();
const authorize = require("../../middleware/authorize");

const SocialRoutes = require("../../controllers/users/socialController");

// Likes
router.post("/like", authorize("user"), SocialRoutes.likePost);
router.delete("/like", authorize("user"), SocialRoutes.unlikePost);

// Comments
router.post("/comment", authorize("user"), SocialRoutes.addComment);
router.get("/comments/:complaint_id", authorize("user"), SocialRoutes.getComments);

// Reposts
router.post("/repost", authorize("user"), SocialRoutes.repost);

// Saves
router.post("/save", authorize("user"), SocialRoutes.savePost);
router.delete("/save", authorize("user"), SocialRoutes.unsavePost);

// Follow/Unfollow
router.post("/follow", authorize("user"), SocialRoutes.followUser);
router.post("/unfollow", authorize("user"), SocialRoutes.unfollowUser);
router.get("/followers/:user_id", authorize("user"), SocialRoutes.getFollowers);
router.get("/following/:user_id", authorize("user"), SocialRoutes.getFollowing);

module.exports = router;
