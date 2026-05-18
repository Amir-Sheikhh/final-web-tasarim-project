import express from "express";
import { asyncHandler } from "../lib/http.js";
import { requireAuth, requireRole } from "../middleware/auth.js";
import { readLimiter, writeLimiter } from "../middleware/rateLimit.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import {
  commentParamSchema,
  commentSchema,
  followSchema,
  idParamSchema,
  notificationParamSchema,
  optionalTargetQuerySchema,
  paginationSchema,
  postIdParamSchema,
  postUpdateSchema,
  postSchema,
  targetQuerySchema
} from "../validation/schemas.js";
import {
  createComment,
  createPost,
  deleteComment,
  deletePost,
  followUser,
  getDashboard,
  getGroups,
  getNotifications,
  getPostById,
  getPostList,
  getUserProfile,
  likePost,
  listUsers,
  markAllNotificationsRead,
  markNotificationRead,
  unfollowUser,
  unlikePost,
  updatePost
} from "../services/socialService.js";
import { seedDemoGraph } from "../db/init.js";
import { getCurrentUser } from "../services/authService.js";

const router = express.Router();

router.use(requireAuth);

router.get(
  "/me",
  readLimiter,
  asyncHandler(async (req, res) => {
    const user = await getCurrentUser(req.user.id);
    res.json({ user });
  })
);

router.get(
  "/dashboard",
  readLimiter,
  validateQuery(optionalTargetQuerySchema),
  asyncHandler(async (req, res) => {
    const dashboard = await getDashboard({
      viewerId: req.user.id,
      targetId: req.query.targetId
    });

    res.json(dashboard);
  })
);

router.get(
  "/notifications",
  readLimiter,
  asyncHandler(async (req, res) => {
    const notifications = await getNotifications(req.user.id);
    res.json({ notifications });
  })
);

router.patch(
  "/notifications/read-all",
  writeLimiter,
  asyncHandler(async (req, res) => {
    const notifications = await markAllNotificationsRead(req.user.id);
    res.json({ notifications });
  })
);

router.patch(
  "/notifications/:notificationId/read",
  writeLimiter,
  validateParams(notificationParamSchema),
  asyncHandler(async (req, res) => {
    const notification = await markNotificationRead(req.user.id, req.params.notificationId);
    res.json({ notification });
  })
);

router.get(
  "/users",
  readLimiter,
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const users = await listUsers(req.user.id, req.query);
    res.json({ users });
  })
);

router.get(
  "/groups",
  readLimiter,
  asyncHandler(async (req, res) => {
    const groups = await getGroups();
    res.json({ groups });
  })
);

router.get(
  "/users/:userId",
  readLimiter,
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const profile = await getUserProfile(req.params.userId, req.user.id);
    res.json({ profile });
  })
);

router.post(
  "/follows",
  writeLimiter,
  validateBody(followSchema),
  asyncHandler(async (req, res) => {
    await followUser(req.user.id, req.body.targetId);
    res.status(204).end();
  })
);

router.delete(
  "/follows",
  writeLimiter,
  validateQuery(targetQuerySchema),
  asyncHandler(async (req, res) => {
    await unfollowUser(req.user.id, req.query.targetId);
    res.status(204).end();
  })
);

router.get(
  "/posts",
  readLimiter,
  validateQuery(paginationSchema),
  asyncHandler(async (req, res) => {
    const posts = await getPostList(req.user.id, req.query);
    res.json({ posts });
  })
);

router.get(
  "/posts/:postId",
  readLimiter,
  validateParams(postIdParamSchema),
  asyncHandler(async (req, res) => {
    const post = await getPostById(req.params.postId, req.user.id);
    res.json({ post });
  })
);

router.post(
  "/posts",
  writeLimiter,
  validateBody(postSchema),
  asyncHandler(async (req, res) => {
    const post = await createPost({
      authorId: req.user.id,
      content: req.body.content,
      media: req.body.media
    });
    res.status(201).json({ post });
  })
);

router.patch(
  "/posts/:postId",
  writeLimiter,
  validateParams(postIdParamSchema),
  validateBody(postUpdateSchema),
  asyncHandler(async (req, res) => {
    const post = await updatePost(req.user.id, req.user.role, req.params.postId, {
      content: req.body.content,
      media: req.body.media,
      removeMedia: req.body.removeMedia
    });
    res.json({ post });
  })
);

router.delete(
  "/posts/:postId",
  writeLimiter,
  validateParams(postIdParamSchema),
  asyncHandler(async (req, res) => {
    await deletePost(req.user.id, req.user.role, req.params.postId);
    res.status(204).end();
  })
);

router.post(
  "/posts/:postId/like",
  writeLimiter,
  validateParams(postIdParamSchema),
  asyncHandler(async (req, res) => {
    await likePost(req.user.id, req.params.postId);
    res.status(204).end();
  })
);

router.delete(
  "/posts/:postId/like",
  writeLimiter,
  validateParams(postIdParamSchema),
  asyncHandler(async (req, res) => {
    await unlikePost(req.user.id, req.params.postId);
    res.status(204).end();
  })
);

router.post(
  "/posts/:postId/comments",
  writeLimiter,
  validateParams(postIdParamSchema),
  validateBody(commentSchema),
  asyncHandler(async (req, res) => {
    const comment = await createComment({
      authorId: req.user.id,
      postId: req.params.postId,
      content: req.body.content
    });
    res.status(201).json({ comment });
  })
);

router.delete(
  "/posts/:postId/comments/:commentId",
  writeLimiter,
  validateParams(commentParamSchema),
  asyncHandler(async (req, res) => {
    await deleteComment(req.user.id, req.params.postId, req.params.commentId, req.user.role);
    res.status(204).end();
  })
);

router.post(
  "/demo/reset",
  writeLimiter,
  requireRole("admin"),
  asyncHandler(async (_req, res) => {
    await seedDemoGraph({ reset: true });
    res.status(204).end();
  })
);

export default router;
