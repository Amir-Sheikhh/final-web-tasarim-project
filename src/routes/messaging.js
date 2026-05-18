import express from "express";
import { asyncHandler } from "../lib/http.js";
import { attachRealtimeClient } from "../lib/realtime.js";
import { requireAuth } from "../middleware/auth.js";
import { readLimiter, writeLimiter } from "../middleware/rateLimit.js";
import { validateBody, validateParams, validateQuery } from "../middleware/validate.js";
import {
  idParamSchema,
  messageSchema,
  messageSearchQuerySchema
} from "../validation/schemas.js";
import {
  getConversation,
  listConversations,
  markConversationRead,
  sendMessage
} from "../services/messagingService.js";

const router = express.Router();

router.use(requireAuth);

router.get(
  "/events",
  readLimiter,
  asyncHandler(async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();

    const detach = attachRealtimeClient(req.user.id, res);
    const heartbeat = setInterval(() => {
      res.write(": heartbeat\n\n");
    }, 25_000);

    req.on("close", () => {
      clearInterval(heartbeat);
      detach();
      res.end();
    });
  })
);

router.get(
  "/messages/conversations",
  readLimiter,
  validateQuery(messageSearchQuerySchema),
  asyncHandler(async (req, res) => {
    const conversations = await listConversations(req.user.id, req.query.search);
    res.json({ conversations });
  })
);

router.get(
  "/messages/conversations/:userId",
  readLimiter,
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const conversation = await getConversation(req.user.id, req.params.userId);
    res.json({ conversation });
  })
);

router.post(
  "/messages",
  writeLimiter,
  validateBody(messageSchema),
  asyncHandler(async (req, res) => {
    const message = await sendMessage(req.user.id, req.body.recipientId, req.body.content);
    res.status(201).json({ message });
  })
);

router.patch(
  "/messages/conversations/:userId/read",
  writeLimiter,
  validateParams(idParamSchema),
  asyncHandler(async (req, res) => {
    const receipt = await markConversationRead(req.user.id, req.params.userId);
    res.json({ receipt });
  })
);

export default router;
