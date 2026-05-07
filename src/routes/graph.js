import express from "express";
import { asyncHandler } from "../lib/http.js";
import { requireAuth } from "../middleware/auth.js";
import { readLimiter } from "../middleware/rateLimit.js";
import { validateQuery } from "../middleware/validate.js";
import { optionalTargetQuerySchema } from "../validation/schemas.js";
import {
  getCommunities,
  getDijkstraPath,
  getEmbeddingPreview,
  getGraphNetwork,
  getGraphRuntimeStatus,
  getPageRankLeaders
} from "../services/graphService.js";

const router = express.Router();

router.use(requireAuth, readLimiter);

router.get(
  "/status",
  asyncHandler(async (_req, res) => {
    res.json(await getGraphRuntimeStatus());
  })
);

router.get(
  "/network",
  asyncHandler(async (req, res) => {
    res.json(await getGraphNetwork(req.user.id));
  })
);

router.get(
  "/communities",
  asyncHandler(async (_req, res) => {
    res.json({ communities: await getCommunities() });
  })
);

router.get(
  "/pagerank",
  asyncHandler(async (_req, res) => {
    res.json({ leaders: await getPageRankLeaders() });
  })
);

router.get(
  "/embeddings",
  asyncHandler(async (_req, res) => {
    res.json({ embeddings: await getEmbeddingPreview() });
  })
);

router.get(
  "/shortest-path",
  validateQuery(optionalTargetQuerySchema),
  asyncHandler(async (req, res) => {
    res.json(await getDijkstraPath(req.user.id, req.query.targetId));
  })
);

export default router;
