import express from "express";
import { asyncHandler } from "../lib/http.js";
import { authLimiter } from "../middleware/rateLimit.js";
import { validateBody } from "../middleware/validate.js";
import { loginSchema, profileUpdateSchema, registerSchema } from "../validation/schemas.js";
import {
  applyAuthCookies,
  clearAuthCookies,
  getPublicDemoAccounts,
  loginUser,
  refreshUserSession,
  registerUser,
  revokeSession,
  updateCurrentUser
} from "../services/authService.js";
import { requireAuth } from "../middleware/auth.js";
import { getCurrentUser } from "../services/authService.js";

const router = express.Router();

function requestMeta(req) {
  return {
    userAgent: req.get("user-agent"),
    ipAddress: req.ip
  };
}

router.get(
  "/demo-accounts",
  asyncHandler(async (_req, res) => {
    res.json(getPublicDemoAccounts());
  })
);

router.post(
  "/register",
  authLimiter,
  validateBody(registerSchema),
  asyncHandler(async (req, res) => {
    const result = await registerUser(req.body, requestMeta(req));
    applyAuthCookies(res, result.tokens);
    res.status(201).json({ user: result.user });
  })
);

router.post(
  "/login",
  authLimiter,
  validateBody(loginSchema),
  asyncHandler(async (req, res) => {
    const result = await loginUser(req.body.email, req.body.password, requestMeta(req));
    applyAuthCookies(res, result.tokens);
    res.json({ user: result.user });
  })
);

router.post(
  "/refresh",
  authLimiter,
  asyncHandler(async (req, res) => {
    const result = await refreshUserSession(req.cookies?.refresh_token, requestMeta(req));
    applyAuthCookies(res, result.tokens);
    res.json({ user: result.user });
  })
);

router.post(
  "/logout",
  asyncHandler(async (req, res) => {
    await revokeSession(req.cookies?.refresh_token);
    clearAuthCookies(res);
    res.status(204).end();
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await getCurrentUser(req.user.id);
    res.json({ user });
  })
);

router.patch(
  "/me",
  requireAuth,
  validateBody(profileUpdateSchema),
  asyncHandler(async (req, res) => {
    const user = await updateCurrentUser(req.user.id, req.body);
    res.json({ user });
  })
);

export default router;
